import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ensureAttendanceTable } from "@/lib/ensure-attendance";

/**
 * Admin attendance history — reads from the time-clock (Attendance), not shifts.
 * Attendance is not branch/booth scoped, so the legacy `scope` param is ignored.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  await ensureAttendanceTable();

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "14", 10);
  const staffId = searchParams.get("staffId");

  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = { clockIn: { gte: start } };
  if (staffId) where.staffId = staffId;

  const records = await prisma.attendance.findMany({
    where,
    include: {
      staff: { select: { id: true, name: true, username: true, role: true } },
    },
    orderBy: { clockIn: "desc" },
    take: 200,
  });

  const now = new Date();
  const mapped = records.map((r) => {
    const end = r.clockOut ?? now;
    const minutes = Math.max(0, (end.getTime() - r.clockIn.getTime()) / 60000);
    return {
      id: r.id,
      staff: r.staff,
      status: r.status,
      openedAt: r.clockIn,
      closedAt: r.clockOut,
      durationMinutes: Math.round(minutes),
      clockInPhoto: r.clockInPhoto,
      clockOutPhoto: r.clockOutPhoto,
    };
  });

  return NextResponse.json(mapped);
}
