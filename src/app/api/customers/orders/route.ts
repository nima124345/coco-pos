import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") || "").trim();
  const scope = searchParams.get("scope");
  const ctx = getContext(req);

  if (!phone) {
    return NextResponse.json({ error: "Missing phone" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    customerPhone: phone,
  };

  if (scope === "all-branches") {
    where.branchId = { not: null };
  } else if (scope === "all-booths") {
    where.boothEventId = { not: null };
  } else if (scope !== "all" && ctx) {
    Object.assign(where, contextWhere(ctx));
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { toppings: true } },
      staff: { select: { name: true } },
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
