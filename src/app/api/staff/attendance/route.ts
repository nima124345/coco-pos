import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "14", 10);
  const staffId = searchParams.get("staffId");
  const scope = searchParams.get("scope");
  const ctx = getContext(req);

  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = { openedAt: { gte: start } };
  if (staffId) where.staffId = staffId;
  if (scope === "all-branches") where.branchId = { not: null };
  else if (scope === "all-booths") where.boothEventId = { not: null };
  else if (scope !== "all" && ctx) Object.assign(where, contextWhere(ctx));

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      staff: { select: { id: true, name: true, username: true, role: true } },
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 200,
  });

  const now = new Date();
  const records = shifts.map((s) => {
    const end = s.closedAt ?? now;
    const minutes = Math.max(0, (end.getTime() - s.openedAt.getTime()) / 60000);
    return {
      id: s.id,
      staff: s.staff,
      branch: s.branch,
      boothEvent: s.boothEvent,
      status: s.status,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      durationMinutes: Math.round(minutes),
    };
  });

  return NextResponse.json(records);
}
