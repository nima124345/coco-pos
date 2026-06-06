import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const shiftId = searchParams.get("shiftId");
  const date = searchParams.get("date");
  const month = searchParams.get("month"); // "YYYY-MM"
  const status = searchParams.get("status"); // e.g. "COMPLETED" | "VOIDED"
  const limit = parseInt(searchParams.get("limit") || "50");
  const scope = searchParams.get("scope"); // "all" | "all-branches" | "all-booths" | null
  const ctx = getContext(req);

  const where: Record<string, unknown> = {};
  if (scope === "all-branches") {
    where.branchId = { not: null };
  } else if (scope === "all-booths") {
    where.boothEventId = { not: null };
  } else if (scope !== "all" && ctx) {
    Object.assign(where, contextWhere(ctx));
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const lastOrder = await prisma.order.findFirst({
    where: {
      ...contextWhere(ctx),
      createdAt: { gte: today, lt: tomorrow },
    },
    orderBy: { orderNumber: "desc" },
  });

  const orderNumber = (lastOrder?.orderNumber || 0) + 1;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      subTotal: body.subTotal,
      discount: body.discount || 0,
      netTotal: body.netTotal,
      paymentMethod: body.paymentMethod,
      channel: body.channel || "DINE_IN",
      shopeeOrderId: body.shopeeOrderId || "",
      customerName: (body.customerName || "").trim(),
      customerPhone: (body.customerPhone || "").trim(),
      branchId: ctx.mode === "BRANCH" ? ctx.id : null,
      boothEventId: ctx.mode === "BOOTH" ? ctx.id : null,
      staffId: body.staffId,
      shiftId: body.shiftId || null,
      promotionId: body.promotionId || null,
      items: {
        create: body.items.map(
          (item: {
            menuItemId: string;
            menuItemName: string;
            menuItemPrice: number;
            sweetnessLevel: number;
            quantity: number;
            itemTotal: number;
            note: string;
            toppings: {
              toppingId: string;
              toppingName: string;
              toppingPrice: number;
            }[];
          }) => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            menuItemPrice: item.menuItemPrice,
            sweetnessLevel: item.sweetnessLevel,
            quantity: item.quantity,
            itemTotal: item.itemTotal,
            note: item.note || "",
            toppings: {
              create: item.toppings.map((t) => ({
                toppingId: t.toppingId,
                toppingName: t.toppingName,
                toppingPrice: t.toppingPrice,
              })),
            },
          })
        ),
      },
    },
    include: {
      items: { include: { toppings: true } },
    },
  });

  return NextResponse.json(order);
}
