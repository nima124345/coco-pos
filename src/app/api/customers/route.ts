import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";
import { requireAdmin } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";

interface OrderRow {
  netTotal: number;
  customerPhone: string;
  customerName: string;
  createdAt: Date;
}

interface CustomerAgg {
  phone: string;
  name: string;
  visits: number;
  totalSpent: number;
  lastVisit: Date;
  firstVisit: Date;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "customers", "VIEW");
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const ctx = getContext(req);

  const where: Record<string, unknown> = {
    status: "COMPLETED",
    customerPhone: { not: "" },
  };

  if (scope === "all-branches") {
    where.branchId = { not: null };
  } else if (scope === "all-booths") {
    where.boothEventId = { not: null };
  } else if (scope !== "all" && ctx) {
    Object.assign(where, contextWhere(ctx));
  }

  const orders = (await prisma.order.findMany({
    where,
    select: {
      netTotal: true,
      customerPhone: true,
      customerName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })) as OrderRow[];

  const map = new Map<string, CustomerAgg>();
  for (const o of orders) {
    const phone = o.customerPhone.trim();
    if (!phone) continue;
    const cur = map.get(phone);
    if (cur) {
      cur.visits += 1;
      cur.totalSpent += o.netTotal;
      if (o.createdAt > cur.lastVisit) cur.lastVisit = o.createdAt;
      if (o.createdAt < cur.firstVisit) cur.firstVisit = o.createdAt;
      if (!cur.name && o.customerName.trim()) cur.name = o.customerName.trim();
    } else {
      map.set(phone, {
        phone,
        name: o.customerName.trim(),
        visits: 1,
        totalSpent: o.netTotal,
        lastVisit: o.createdAt,
        firstVisit: o.createdAt,
      });
    }
  }

  const now = Date.now();
  const customers = Array.from(map.values()).map((c) => {
    const daysSinceLastVisit = Math.floor(
      (now - c.lastVisit.getTime()) / 86400000
    );
    const segment =
      c.totalSpent >= 1000 || c.visits >= 10
        ? "VIP"
        : c.visits >= 3
        ? "REGULAR"
        : "NEW";
    const status =
      daysSinceLastVisit <= 30
        ? "ACTIVE"
        : daysSinceLastVisit <= 60
        ? "AT_RISK"
        : "CHURNED";
    return {
      phone: c.phone,
      name: c.name,
      visits: c.visits,
      totalSpent: c.totalSpent,
      lastVisit: c.lastVisit.toISOString(),
      firstVisit: c.firstVisit.toISOString(),
      daysSinceLastVisit,
      segment,
      status,
    };
  });

  customers.sort((a, b) => b.totalSpent - a.totalSpent);
  return NextResponse.json(customers);
}
