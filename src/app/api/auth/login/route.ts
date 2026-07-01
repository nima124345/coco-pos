import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSessionToken, setSessionCookie, Role } from "@/lib/session";
import { ensurePermissionsColumn } from "@/lib/ensure-permissions";
import { parsePermissions } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
  await ensurePermissionsColumn();
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: "กรุณากรอก username และ password" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      branches: {
        include: {
          branch: {
            select: { id: true, name: true, active: true },
          },
        },
      },
    },
  });

  if (!user || !user.active) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้งานนี้" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  // Available branches
  let branches = user.branches
    .filter((ub) => ub.branch.active)
    .map((ub) => ({
      id: ub.branch.id,
      name: ub.branch.name,
      isDefault: ub.isDefault,
    }));

  if ((user.role === "ADMIN" || user.role === "MANAGER") && branches.length === 0) {
    const all = await prisma.branch.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });
    branches = all.map((b, i) => ({ ...b, isDefault: i === 0 }));
  }

  // Active booth events available to everyone
  const boothEvents = await prisma.boothEvent.findMany({
    where: { active: true, status: { in: ["ACTIVE", "PLANNED"] } },
    select: {
      id: true,
      name: true,
      location: true,
      status: true,
    },
    orderBy: { startDate: "desc" },
  });

  if (branches.length === 0 && boothEvents.length === 0) {
    return NextResponse.json(
      { error: "บัญชีนี้ยังไม่ได้กำหนดสาขา และยังไม่มีบูธเปิดอยู่" },
      { status: 403 }
    );
  }

  const res = NextResponse.json({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    permissions: parsePermissions(user.permissions),
    branches,
    boothEvents,
  });

  const token = await createSessionToken({
    uid: user.id,
    role: user.role as Role,
  });
  setSessionCookie(res, token);
  return res;
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Login error:", err.message, "TURSO_DATABASE_URL:", process.env.TURSO_DATABASE_URL ? "SET" : "NOT SET", "TURSO_AUTH_TOKEN:", process.env.TURSO_AUTH_TOKEN ? "SET" : "NOT SET");
    // Don't leak internal/DB error details to the client.
    return NextResponse.json(
      { error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
