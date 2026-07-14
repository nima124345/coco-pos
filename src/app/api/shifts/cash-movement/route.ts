import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { inactiveUserDenied } from "@/lib/authz";
import { isPrivileged } from "@/lib/branch";
import { ensureSchemaExtras } from "@/lib/ensure-schema-extras";
import { logActivity, ACTIVITY } from "@/lib/activity";
import { round2 } from "@/lib/utils";

/** List cash movements for a shift (owner or ADMIN/MANAGER). */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  await ensureSchemaExtras();

  const { searchParams } = new URL(req.url);
  const shiftId = searchParams.get("shiftId");
  if (!shiftId) {
    return NextResponse.json({ error: "Missing shiftId" }, { status: 400 });
  }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { staffId: true },
  });
  if (!shift) return NextResponse.json({ error: "ไม่พบกะนี้" }, { status: 404 });
  if (shift.staffId !== auth.uid && !isPrivileged(auth)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const movements = await prisma.cashMovement.findMany({
    where: { shiftId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(movements);
}

/** Record cash paid in / out of the drawer during an OPEN shift. */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const inactive = await inactiveUserDenied(auth);
  if (inactive) return inactive;
  await ensureSchemaExtras();

  const body = await req.json().catch(() => ({}));
  const { shiftId, type, amount, reason } = body as {
    shiftId?: string;
    type?: string;
    amount?: number;
    reason?: string;
  };

  if (!shiftId) {
    return NextResponse.json({ error: "Missing shiftId" }, { status: 400 });
  }
  const movementType = type === "IN" ? "IN" : type === "OUT" ? "OUT" : null;
  if (!movementType) {
    return NextResponse.json({ error: "ประเภทไม่ถูกต้อง" }, { status: 400 });
  }
  const value = round2(Number(amount));
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "จำนวนเงินต้องมากกว่า 0" }, { status: 400 });
  }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { staffId: true, status: true, branchId: true },
  });
  if (!shift) return NextResponse.json({ error: "ไม่พบกะนี้" }, { status: 404 });
  if (shift.staffId !== auth.uid && !isPrivileged(auth)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }
  if (shift.status !== "OPEN") {
    return NextResponse.json(
      { error: "กะนี้ปิดแล้ว ไม่สามารถบันทึกเงินเข้า-ออกได้" },
      { status: 400 }
    );
  }

  const movement = await prisma.cashMovement.create({
    data: {
      shiftId,
      type: movementType,
      amount: value,
      reason: (reason || "").toString().trim(),
      staffId: auth.uid,
    },
  });

  await logActivity({
    userId: auth.uid,
    action: movementType === "IN" ? ACTIVITY.CASH_IN : ACTIVITY.CASH_OUT,
    entity: "shift",
    entityId: shiftId,
    detail: `${value} บาท${movement.reason ? " • " + movement.reason : ""}`,
    branchId: shift.branchId,
  });

  return NextResponse.json(movement);
}
