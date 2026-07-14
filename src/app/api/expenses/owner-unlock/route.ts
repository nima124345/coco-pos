import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";
import { ensureExpenseColumns } from "@/lib/ensure-expense-columns";
import { requireAuth } from "@/lib/session";
import { rateLimit, rateLimitReset } from "@/lib/rate-limit";

/**
 * Reveal the owner-paid (เจ้าของโอนเอง) expense total to a manager, but only
 * after an ADMIN authenticates with their own credentials. Managers can request
 * access; an admin types their username + password to unlock the figure for the
 * current period/scope. Nothing is revealed without valid ADMIN credentials.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  await ensureExpenseColumns();

  const body = await req.json().catch(() => ({}));
  const { username, password, month, date, scope } = body as {
    username?: string;
    password?: string;
    month?: string;
    date?: string;
    scope?: string;
  };

  if (!username || !password) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน Admin" },
      { status: 400 }
    );
  }

  // Limit admin-credential guessing through the unlock endpoint (per user).
  const rlKey = `unlock:${auth.uid}`;
  const rl = rateLimit(rlKey, { limit: 10, windowMs: 5 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `ลองบ่อยเกินไป กรุณารอ ${rl.retryAfterSec} วินาที` },
      { status: 429 }
    );
  }

  const admin = await prisma.user.findUnique({ where: { username } });
  if (!admin || !admin.active || admin.role !== "ADMIN") {
    return NextResponse.json(
      { error: "บัญชีนี้ไม่ใช่ Admin หรือไม่มีอยู่จริง" },
      { status: 401 }
    );
  }
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    return NextResponse.json(
      { error: "รหัสผ่าน Admin ไม่ถูกต้อง" },
      { status: 401 }
    );
  }
  rateLimitReset(rlKey); // correct credentials clear the throttle

  // Same scope/period filter as the expenses list, but owner-paid only.
  const ctx = getContext(req);
  const where: Record<string, unknown> = { paidByOwner: true };
  if (scope === "all-branches") where.branchId = { not: null };
  else if (scope === "all-booths") where.boothEventId = { not: null };
  else if (scope !== "all" && ctx) Object.assign(where, contextWhere(ctx));

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const rows = await prisma.expense.findMany({
    where,
    select: { amount: true },
  });
  const total = rows.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ ok: true, total, count: rows.length });
}
