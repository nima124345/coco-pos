import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getContext,
  contextWhere,
  assertContextAccess,
  isPrivileged,
} from "@/lib/branch";
import { requireAdmin, requireAuth } from "@/lib/session";
import { managerPermissionDenied, inactiveUserDenied } from "@/lib/authz";
import { round2 } from "@/lib/utils";
import { ensureIndexes } from "@/lib/ensure-indexes";
import { logActivity, ACTIVITY } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  void ensureIndexes();
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const shiftId = searchParams.get("shiftId");
  const date = searchParams.get("date");
  const month = searchParams.get("month"); // "YYYY-MM"
  const status = searchParams.get("status"); // e.g. "COMPLETED" | "VOIDED"
  const limit = parseInt(searchParams.get("limit") || "50");
  const scope = searchParams.get("scope"); // "all" | "all-branches" | "all-booths" | null
  const ctx = getContext(req);

  // Only ADMIN/MANAGER may pull data across branches/booths. For plain STAFF the
  // "all*" scopes are ignored and the query is pinned to their branch context —
  // which we also verify they belong to (the branch header is client-supplied).
  const privileged = isPrivileged(auth);

  const where: Record<string, unknown> = {};
  if (privileged && scope === "all-branches") {
    where.branchId = { not: null };
  } else if (privileged && scope === "all-booths") {
    where.boothEventId = { not: null };
  } else if (privileged && scope === "all") {
    // unscoped — everything
  } else if (ctx) {
    const denied = await assertContextAccess(auth, ctx);
    if (denied) return denied;
    Object.assign(where, contextWhere(ctx));
  } else if (!privileged) {
    // No context and not privileged: restrict to the caller's own orders.
    where.staffId = auth.uid;
  }
  if (staffId) where.staffId = staffId;
  if (shiftId) where.shiftId = shiftId;
  if (status) where.status = status;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  } else if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, m, 0, 23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { toppings: true } },
      staff: { select: { name: true } },
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true, location: true } },
      promotion: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(orders);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "orders");
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Never destroy a live sale: a COMPLETED order must be VOIDED first (which is
  // attributable) before it can be removed. This keeps revenue/shift totals from
  // silently changing under a hard delete.
  const target = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!target) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }
  if (target.status !== "VOIDED") {
    return NextResponse.json(
      { error: "ต้องยกเลิก (void) ออเดอร์ก่อนจึงจะลบได้" },
      { status: 400 }
    );
  }

  const items = await prisma.orderItem.findMany({
    where: { orderId: id },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  await prisma.$transaction([
    prisma.orderItemTopping.deleteMany({
      where: { orderItemId: { in: itemIds } },
    }),
    prisma.orderItem.deleteMany({ where: { orderId: id } }),
    prisma.order.delete({ where: { id } }),
  ]);

  await logActivity({
    userId: auth.uid,
    action: ACTIVITY.ORDER_DELETE,
    entity: "order",
    entityId: id,
    detail: "ลบออเดอร์ที่ยกเลิกแล้ว",
  });

  return NextResponse.json({ success: true });
}

interface IncomingTopping {
  toppingId: string;
}
interface IncomingItem {
  menuItemId: string;
  sweetnessLevel?: number;
  quantity?: number;
  note?: string;
  toppings?: IncomingTopping[];
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const ctx = getContext(req);
  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  // A STAFF terminal must belong to the branch it claims (booths are shared).
  const denied = await assertContextAccess(auth, ctx);
  if (denied) return denied;

  // A deactivated staff's 30-day cookie must not be able to keep ringing sales.
  const inactive = await inactiveUserDenied(auth);
  if (inactive) return inactive;

  let body: {
    items?: IncomingItem[];
    paymentMethod?: string;
    channel?: string;
    shopeeOrderId?: string;
    customerName?: string;
    customerPhone?: string;
    shiftId?: string;
    promotionId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ" },
      { status: 400 }
    );
  }

  const channel =
    body.channel === "SHOPEE" || body.channel === "DELIVERY"
      ? body.channel
      : "DINE_IN";
  const isShopee = channel === "SHOPEE";

  try {
    // Pull authoritative prices from the DB — never trust client-sent amounts.
    const menuItemIds = [...new Set(body.items.map((i) => i.menuItemId))];
    const toppingIds = [
      ...new Set(
        body.items.flatMap((i) => (i.toppings || []).map((t) => t.toppingId))
      ),
    ];

    const [menuItems, toppings] = await Promise.all([
      prisma.menuItem.findMany({
        where: { id: { in: menuItemIds } },
        include:
          ctx.mode === "BRANCH"
            ? { branchOverrides: { where: { branchId: ctx.id } } }
            : undefined,
      }),
      toppingIds.length
        ? prisma.topping.findMany({ where: { id: { in: toppingIds } } })
        : Promise.resolve([]),
    ]);

    const menuById = new Map(menuItems.map((m) => [m.id, m]));
    const toppingById = new Map(toppings.map((t) => [t.id, t]));

    type ItemCreate = {
      menuItemId: string;
      menuItemName: string;
      menuItemPrice: number;
      sweetnessLevel: number;
      quantity: number;
      itemTotal: number;
      note: string;
      toppings: {
        create: {
          toppingId: string;
          toppingName: string;
          toppingPrice: number;
        }[];
      };
    };

    const items: ItemCreate[] = [];
    let subTotal = 0;

    for (const line of body.items) {
      const mi = menuById.get(line.menuItemId) as
        | {
            id: string;
            name: string;
            price: number;
            shopeePrice: number;
            branchOverrides?: { price: number | null; shopeePrice: number | null }[];
          }
        | undefined;
      if (!mi) {
        return NextResponse.json(
          { error: `ไม่พบสินค้า (${line.menuItemId})` },
          { status: 400 }
        );
      }
      const override = mi.branchOverrides?.[0];
      const basePrice = override?.price ?? mi.price;
      const baseShopee = override?.shopeePrice ?? mi.shopeePrice;
      const unitPrice = isShopee && baseShopee > 0 ? baseShopee : basePrice;

      const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));

      const lineToppings: {
        toppingId: string;
        toppingName: string;
        toppingPrice: number;
      }[] = [];
      let toppingSum = 0;
      for (const t of line.toppings || []) {
        const tp = toppingById.get(t.toppingId);
        if (!tp) {
          return NextResponse.json(
            { error: `ไม่พบท็อปปิ้ง (${t.toppingId})` },
            { status: 400 }
          );
        }
        toppingSum += tp.price;
        lineToppings.push({
          toppingId: tp.id,
          toppingName: tp.name,
          toppingPrice: tp.price,
        });
      }

      const itemTotal = round2((unitPrice + toppingSum) * qty);
      subTotal += itemTotal;
      items.push({
        menuItemId: mi.id,
        menuItemName: mi.name,
        menuItemPrice: unitPrice,
        sweetnessLevel: Number(line.sweetnessLevel) || 0,
        quantity: qty,
        itemTotal,
        note: (line.note || "").toString(),
        toppings: { create: lineToppings },
      });
    }

    // Discount only ever comes from a validated, active promotion.
    let discount = 0;
    let promotionId: string | null = null;
    if (body.promotionId) {
      const promo = await prisma.promotion.findUnique({
        where: { id: body.promotionId },
      });
      if (promo && promo.active) {
        promotionId = promo.id;
        discount =
          promo.type === "PERCENT" ? (subTotal * promo.value) / 100 : promo.value;
        discount = round2(Math.min(Math.max(0, discount), subTotal));
      }
    }
    subTotal = round2(subTotal);
    const netTotal = round2(subTotal - discount);

    // Only attribute the sale to a shift the caller actually owns, that is still
    // OPEN and belongs to this same branch/booth. Otherwise cash sales could be
    // hidden from a shift's expectedCash by sending a foreign or null shiftId.
    let validShiftId: string | null = null;
    if (body.shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: body.shiftId },
        select: {
          staffId: true,
          status: true,
          branchId: true,
          boothEventId: true,
        },
      });
      const matchesCtx =
        ctx.mode === "BRANCH"
          ? shift?.branchId === ctx.id
          : shift?.boothEventId === ctx.id;
      if (
        shift &&
        shift.status === "OPEN" &&
        shift.staffId === auth.uid &&
        matchesCtx
      ) {
        validShiftId = body.shiftId;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ctxWhere = contextWhere(ctx);

    const baseData = {
      subTotal,
      discount,
      netTotal,
      paymentMethod: body.paymentMethod || "CASH",
      channel,
      shopeeOrderId: isShopee ? (body.shopeeOrderId || "").trim() : "",
      customerName: (body.customerName || "").trim(),
      customerPhone: (body.customerPhone || "").trim(),
      branchId: ctx.mode === "BRANCH" ? ctx.id : null,
      boothEventId: ctx.mode === "BOOTH" ? ctx.id : null,
      staffId: auth.uid, // attribution comes from the session, not the client
      shiftId: validShiftId,
      promotionId,
    };

    // Daily order number is a read-max-then-insert, which races under concurrent
    // sales. Run it inside a single transaction (SQLite/libsql serializes the
    // write) and retry on a transient lock so two terminals can't collide.
    let order = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          const last = await tx.order.findFirst({
            where: { ...ctxWhere, createdAt: { gte: today, lt: tomorrow } },
            orderBy: { orderNumber: "desc" },
            select: { orderNumber: true },
          });
          const orderNumber = (last?.orderNumber || 0) + 1;
          return tx.order.create({
            data: { orderNumber, ...baseData, items: { create: items } },
            include: { items: { include: { toppings: true } } },
          });
        });
        break;
      } catch (e) {
        const msg = (e as Error).message?.toLowerCase() ?? "";
        if (attempt < 3 && (msg.includes("locked") || msg.includes("busy"))) {
          continue;
        }
        throw e;
      }
    }

    return NextResponse.json(order);
  } catch (e) {
    console.error("Order create failed:", (e as Error).message);
    return NextResponse.json(
      { error: "บันทึกออเดอร์ไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
