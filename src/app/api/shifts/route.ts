import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere, isPrivileged } from "@/lib/branch";
import { requireAuth } from "@/lib/session";
import { inactiveUserDenied } from "@/lib/authz";
import { round2 } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const inactive = await inactiveUserDenied(auth);
  if (inactive) return inactive;
  const { openingCash } = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  // A shift is always opened for the logged-in user — never a client-supplied id,
  // which would let one user open a shift in another's name.
  const staffId = auth.uid;

  const existingShift = await prisma.shift.findFirst({
    where: { staffId, ...contextWhere(ctx), status: "OPEN" },
  });

  if (existingShift) {
    return NextResponse.json(
      { error: "คุณมีกะที่เปิดอยู่ในที่นี้แล้ว กรุณาปิดกะก่อน" },
      { status: 400 }
    );
  }

  const opening = Number(openingCash);
  const shift = await prisma.shift.create({
    data: {
      staffId,
      branchId: ctx.mode === "BRANCH" ? ctx.id : null,
      boothEventId: ctx.mode === "BOOTH" ? ctx.id : null,
      openingCash: Number.isFinite(opening) && opening > 0 ? round2(opening) : 0,
    },
  });

  return NextResponse.json(shift);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const inactive = await inactiveUserDenied(auth);
  if (inactive) return inactive;
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

  // Only the shift's own owner (or an ADMIN/MANAGER) may close it — otherwise any
  // user could close another's shift and stamp an arbitrary closing count.
  if (shift.staffId !== auth.uid && !isPrivileged(auth)) {
    return NextResponse.json(
      { error: "ไม่มีสิทธิ์ปิดกะนี้" },
      { status: 403 }
    );
  }
  if (shift.status === "CLOSED") {
    return NextResponse.json({ error: "กะนี้ถูกปิดไปแล้ว" }, { status: 400 });
  }

  const closing = Number(closingCash);
  if (!Number.isFinite(closing) || closing < 0) {
    return NextResponse.json(
      { error: "ยอดเงินปิดกะไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const cashSales = shift.orders.reduce((sum, o) => sum + o.netTotal, 0);
  const expectedCash = round2(shift.openingCash + cashSales);
  const cashDifference = round2(closing - expectedCash);

  const updated = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      closingCash: round2(closing),
      expectedCash,
      cashDifference,
      note: note || "",
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
