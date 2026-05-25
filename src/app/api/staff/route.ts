import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
      branches: {
        select: {
          isDefault: true,
          branch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const recentShifts = await prisma.shift.findMany({
    where: {
      staffId: { in: users.map((u) => u.id) },
      openedAt: { gte: weekStart },
    },
    orderBy: { openedAt: "desc" },
  });

  const enriched = users.map((u) => {
    const userShifts = recentShifts.filter((s) => s.staffId === u.id);
    const todayShift = userShifts.find(
      (s) => s.openedAt >= todayStart && s.openedAt <= todayEnd
    );

    let weekMinutes = 0;
    for (const s of userShifts) {
      const end = s.closedAt ?? now;
      weekMinutes += Math.max(0, (end.getTime() - s.openedAt.getTime()) / 60000);
    }

    return {
      ...u,
      branches: u.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
        isDefault: b.isDefault,
      })),
      todayShift: todayShift
        ? {
            id: todayShift.id,
            openedAt: todayShift.openedAt,
            closedAt: todayShift.closedAt,
            status: todayShift.status,
          }
        : null,
      weekMinutes: Math.round(weekMinutes),
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const hashedPassword = await bcrypt.hash(body.password, 10);

  const existing = await prisma.user.findUnique({
    where: { username: body.username },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Username นี้ถูกใช้แล้ว" },
      { status: 400 }
    );
  }

  const branchIds: string[] = Array.isArray(body.branchIds) ? body.branchIds : [];
  const defaultBranchId: string | null = body.defaultBranchId || branchIds[0] || null;

  const user = await prisma.user.create({
    data: {
      name: body.name,
      username: body.username,
      password: hashedPassword,
      role: body.role || "STAFF",
      branches: {
        create: branchIds.map((bid) => ({
          branchId: bid,
          isDefault: bid === defaultBranchId,
        })),
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, password, branchIds, defaultBranchId, ...data } = body;

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  if (Array.isArray(branchIds)) {
    await prisma.userBranch.deleteMany({ where: { userId: id } });
    const def: string | null = defaultBranchId || branchIds[0] || null;
    if (branchIds.length > 0) {
      await prisma.userBranch.createMany({
        data: branchIds.map((bid: string) => ({
          userId: id,
          branchId: bid,
          isDefault: bid === def,
        })),
      });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}
