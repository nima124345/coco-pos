import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSessionToken, setSessionCookie, Role } from "@/lib/session";
import { ensurePermissionsColumn } from "@/lib/ensure-permissions";
import { parsePermissions } from "@/lib/permissions";
import { rateLimit, rateLimitReset } from "@/lib/rate-limit";

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

  // Throttle repeated attempts per username (survives one warm instance).
  const rlKey = `login:${String(username).toLowerCase()}`;
  const rl = rateLimit(rlKey, { limit: 8, windowMs: 5 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ ${rl.retryAfterSec} วินาที` },
      { status: 429 }
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

  // Use one uniform message for "no such user", "inactive", and "wrong password"
  // so the endpoint can't be used to enumerate which usernames exist.
  const INVALID = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  if (!user || !user.active) {
    // Still run a compare against a decoy hash to keep timing roughly constant.
    await bcrypt.compare(password, "$2a$10$usesomesillystringforsalthashaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
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
  rateLimitReset(rlKey); // successful auth clears the throttle
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
