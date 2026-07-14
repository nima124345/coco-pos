import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";
import { logActivity, ACTIVITY } from "@/lib/activity";
import { ensureAttendanceTable } from "@/lib/ensure-attendance";
import { ensurePermissionsColumn } from "@/lib/ensure-permissions";
import { parsePermissions, serializePermissions } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "staff", "VIEW");
  if (denied) return denied;

  await ensurePermissionsColumn();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      permissions: true,
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

  // Attendance (time clock) drives the เข้างาน/ออกงาน/ชั่วโมง columns — not shifts.
  await ensureAttendanceTable();
  const recentAttendance = await prisma.attendance.findMany({
    where: {
      staffId: { in: users.map((u) => u.id) },
      clockIn: { gte: weekStart },
    },
    orderBy: { clockIn: "desc" },
  });

  const enriched = users.map((u) => {
    const userRecords = recentAttendance.filter((a) => a.staffId === u.id);
    const todayRecord = userRecords.find(
      (a) => a.clockIn >= todayStart && a.clockIn <= todayEnd
    );

    let weekMinutes = 0;
    for (const a of userRecords) {
      const end = a.clockOut ?? now;
      weekMinutes += Math.max(0, (end.getTime() - a.clockIn.getTime()) / 60000);
    }

    return {
      ...u,
      permissions: parsePermissions(u.permissions),
      branches: u.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
        isDefault: b.isDefault,
      })),
      todayShift: todayRecord
        ? {
            id: todayRecord.id,
            openedAt: todayRecord.clockIn,
            closedAt: todayRecord.clockOut,
            status: todayRecord.status,
          }
        : null,
      weekMinutes: Math.round(weekMinutes),
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "staff");
  if (denied) return denied;

  await ensurePermissionsColumn();
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
  // Only a full ADMIN may mint elevated accounts. A MANAGER (who also passes
  // requireAdmin) can only ever create plain STAFF — otherwise they could grant
  // themselves ADMIN via a second account.
  const role: string = auth.role === "ADMIN" ? body.role || "STAFF" : "STAFF";
  // Only MANAGER carries per-menu permissions; others store an empty string.
  const permissions =
    role === "MANAGER" ? serializePermissions(body.permissions || {}) : "";

  const user = await prisma.user.create({
    data: {
      name: body.name,
      username: body.username,
      password: hashedPassword,
      role,
      permissions,
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

  await logActivity({
    userId: auth.uid,
    action: ACTIVITY.STAFF_CREATE,
    entity: "user",
    entityId: user.id,
    detail: `${user.name} (${user.username}) • ${user.role}`,
  });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "staff");
  if (denied) return denied;

  await ensurePermissionsColumn();
  const body = await req.json();
  const { id, password, branchIds, defaultBranchId, permissions, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
  }

  // A non-ADMIN (MANAGER) may only edit plain STAFF and may never change roles
  // or reset another user's password — that would let them seize the ADMIN
  // account. Enforce this before applying any of the incoming fields.
  if (auth.role !== "ADMIN") {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }
    if (target.role !== "STAFF") {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์แก้ไขบัญชีนี้" },
        { status: 403 }
      );
    }
    // Silently drop any attempt to escalate role.
    delete data.role;
  }

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  // Permissions only apply to MANAGER. When a permissions map is supplied, store
  // it (serialized); when the role is being set to non-MANAGER, clear it.
  if (permissions !== undefined) {
    data.permissions = serializePermissions(permissions || {});
  }
  if (data.role && data.role !== "MANAGER") {
    data.permissions = "";
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

  try {
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
    await logActivity({
      userId: auth.uid,
      action: ACTIVITY.STAFF_UPDATE,
      entity: "user",
      entityId: user.id,
      detail: `${user.name} (${user.username})`,
    });
    return NextResponse.json(user);
  } catch (e) {
    const msg = (e as Error).message?.toLowerCase() ?? "";
    if (msg.includes("unique") && msg.includes("username")) {
      return NextResponse.json(
        { error: "Username นี้ถูกใช้แล้ว" },
        { status: 400 }
      );
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "staff");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
  }
  if (id === auth.uid) {
    return NextResponse.json(
      { error: "ไม่สามารถลบบัญชีของตัวเองได้" },
      { status: 400 }
    );
  }

  // Orders/shifts are financial records — never delete a staff who has them.
  const [orderCount, shiftCount] = await Promise.all([
    prisma.order.count({ where: { staffId: id } }),
    prisma.shift.count({ where: { staffId: id } }),
  ]);
  if (orderCount > 0 || shiftCount > 0) {
    return NextResponse.json(
      {
        error:
          "พนักงานนี้มีประวัติการขาย/กะการทำงาน ไม่สามารถลบได้ กรุณาปิดการใช้งานแทน",
      },
      { status: 400 }
    );
  }

  // Safe to remove: clear the staff's own attendance (RESTRICT), branches cascade.
  await ensureAttendanceTable();
  await prisma.attendance.deleteMany({ where: { staffId: id } });
  await prisma.user.delete({ where: { id } });

  await logActivity({
    userId: auth.uid,
    action: ACTIVITY.STAFF_DELETE,
    entity: "user",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
