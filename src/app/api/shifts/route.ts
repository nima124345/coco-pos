import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const status = searchParams.get("status");
  const scope = searchParams.get("scope");
  const ctx = getContext(req);

  const where: Record<string, unknown> = {};
  if (scope === "all-branches") where.branchId = { not: null };
  else if (scope === "all-booths") where.boothEventId = { not: null };
  else if (scope !== "all" && ctx) Object.assign(where, contextWhere(ctx));
  if (staffId) where.staffId = staffId;
  if (status) where.status = status;

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      staff: { select: { name: true, username: true } },
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true, location: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(shifts);
}

export async function POST(req: NextRequest) {
  const { staffId, openingCash } = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  const existingShift = await prisma.shift.findFirst({
    where: { staffId, ...contextWhere(ctx), status: "OPEN" },
  });

  if (existingShift) {
    return NextResponse.json(
      { error: "คุณมีกะที่เปิดอยู่ในที่นี้แล้ว กรุณาปิดกะก่อน" },
      { status: 400 }
    );
  }

  const shift = await prisma.shift.create({
    data: {
      staffId,
      branchId: ctx.mode === "BRANCH" ? ctx.id : null,
      boothEventId: ctx.mode === "BOOTH" ? ctx.id : null,
      openingCash: openingCash || 0,
    },
  });

  return NextResponse.json(shift);
}

export async function PUT(req: NextRequest) {
  const { shiftId, closingCash, note } = await req.json();

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      orders: { where: { status: "COMPLETED", paymentMethod: "CASH" } },
    },
  });

  if (!shift) {
    return NextResponse.json({ error: "ไม่พบกะนี้" }, { status: 404 });
  }

  const cashSales = shift.orders.reduce((sum, o) => sum + o.netTotal, 0);
  const expectedCash = shift.openingCash + cashSales;
  const cashDifference = closingCash - expectedCash;

  const updated = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      closingCash,
      expectedCash,
      cashDifference,
      note: note || "",
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
