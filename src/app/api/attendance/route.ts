import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { ensureAttendanceTable } from "@/lib/ensure-attendance";

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

/**
 * Time-clock endpoint for the logged-in user.
 *
 * GET  -> current open record (if any) + recent history for the caller.
 * POST -> clock in  (creates an OPEN record; rejects if one is already open).
 * PUT  -> clock out (closes the caller's open record).
 *
 * staffId always comes from the session — a user can only clock themselves.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  await ensureAttendanceTable();

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: { staffId: auth.uid, clockIn: { gte: start } },
    orderBy: { clockIn: "desc" },
    take: 100,
  });

  const now = new Date();
  const current = records.find((r) => r.status === "OPEN") ?? null;

  const history = records.map((r) => ({
    id: r.id,
    clockIn: r.clockIn,
    clockOut: r.clockOut,
    status: r.status,
    durationMinutes: minutesBetween(r.clockIn, r.clockOut ?? now),
  }));

  return NextResponse.json({
    current: current
      ? {
          id: current.id,
          clockIn: current.clockIn,
          durationMinutes: minutesBetween(current.clockIn, now),
        }
      : null,
    history,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  await ensureAttendanceTable();

  const body = await req.json().catch(() => ({}));
  const clockInPhoto: string =
    typeof body.photo === "string" ? body.photo : "";

  const existingOpen = await prisma.attendance.findFirst({
    where: { staffId: auth.uid, status: "OPEN" },
  });
  if (existingOpen) {
    return NextResponse.json(
      { error: "คุณเข้างานอยู่แล้ว กรุณาออกงานก่อน" },
      { status: 400 }
    );
  }

  const record = await prisma.attendance.create({
    data: { staffId: auth.uid, clockInPhoto },
  });

  return NextResponse.json(record);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  await ensureAttendanceTable();

  const body = await req.json().catch(() => ({}));
  const clockOutPhoto: string =
    typeof body.photo === "string" ? body.photo : "";

  const open = await prisma.attendance.findFirst({
    where: { staffId: auth.uid, status: "OPEN" },
    orderBy: { clockIn: "desc" },
  });
  if (!open) {
    return NextResponse.json(
      { error: "ไม่พบการเข้างานที่เปิดอยู่" },
      { status: 400 }
    );
  }

  const updated = await prisma.attendance.update({
    where: { id: open.id },
    data: { status: "CLOSED", clockOut: new Date(), clockOutPhoto },
  });

  return NextResponse.json(updated);
}
