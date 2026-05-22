import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { orderId, adminPassword, voidReason } = await req.json();

  // Verify admin password
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
  });

  let verified = false;
  for (const admin of admins) {
    if (await bcrypt.compare(adminPassword, admin.password)) {
      verified = true;
      break;
    }
  }

  if (!verified) {
    return NextResponse.json(
      { error: "รหัสผ่านแอดมินไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "VOIDED",
      voidReason: voidReason || "ยกเลิกโดยแอดมิน",
    },
  });

  return NextResponse.json(order);
}
