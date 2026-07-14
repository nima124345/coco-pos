import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/session";
import { inactiveUserDenied } from "@/lib/authz";
import { assertContextAccess } from "@/lib/branch";

export async function POST(req: NextRequest) {
  // Must be logged in; the admin password below is an extra confirmation so a
  // staff terminal can void with a manager's approval without an admin session.
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const inactive = await inactiveUserDenied(auth);
  if (inactive) return inactive;

  let orderId: string, adminPassword: string, voidReason: string;
  try {
    ({ orderId, adminPassword, voidReason } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!orderId) {
    return NextResponse.json({ error: "ต้องระบุออเดอร์" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, branchId: true, boothEventId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }
  if (order.status === "VOIDED") {
    return NextResponse.json(
      { error: "ออเดอร์นี้ถูกยกเลิกไปแล้ว" },
      { status: 400 }
    );
  }

  // A STAFF terminal can only void orders in its own branch (booths are shared).
  const denied = await assertContextAccess(
    auth,
    order.branchId
      ? { mode: "BRANCH", id: order.branchId }
      : order.boothEventId
      ? { mode: "BOOTH", id: order.boothEventId }
      : null
  );
  if (denied) return denied;

  // Verify admin password, and remember WHICH admin approved for the audit trail.
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true, username: true, password: true },
  });

  let approvedBy: string | null = null;
  for (const admin of admins) {
    if (await bcrypt.compare(adminPassword || "", admin.password)) {
      approvedBy = admin.username;
      break;
    }
  }

  if (!approvedBy) {
    return NextResponse.json(
      { error: "รหัสผ่านแอดมินไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  // Attribute the void: who initiated it (session), which admin approved, and
  // when — appended to voidReason so there's a trail even without extra columns.
  const initiator = await prisma.user.findUnique({
    where: { id: auth.uid },
    select: { username: true },
  });
  const reason = (voidReason || "ยกเลิกโดยแอดมิน").trim();
  const stamp = `[โดย ${initiator?.username ?? auth.uid} • อนุมัติ ${approvedBy} • ${new Date().toISOString()}]`;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "VOIDED",
      voidReason: `${reason} ${stamp}`,
    },
  });

  return NextResponse.json(updated);
}
