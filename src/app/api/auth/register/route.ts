import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { name, username, password, role, branchIds } = await req.json();

    // Only an authenticated admin may create another admin. Public
    // self-registration is always demoted to STAFF.
    const session = await getSession(req);
    const isAdmin = session?.role === "ADMIN";
    const validRole = role === "ADMIN" && isAdmin ? "ADMIN" : "STAFF";
    // A publicly self-registered account is created INACTIVE and cannot log in
    // until an admin activates it. Otherwise anyone could self-register into a
    // real branch (branch ids are public) and immediately transact.
    const active = isAdmin;

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const branchConnect = Array.isArray(branchIds) && branchIds.length > 0
      ? {
          branches: {
            create: branchIds.map((branchId: string, i: number) => ({
              branchId,
              isDefault: i === 0,
            })),
          },
        }
      : {};

    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: validRole,
        active,
        ...branchConnect,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      active: user.active,
      pendingApproval: !active,
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Register error:", err.message);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
