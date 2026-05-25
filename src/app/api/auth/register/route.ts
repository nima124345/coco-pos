import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, username, password, role } = await req.json();
    const validRole = role === "ADMIN" ? "ADMIN" : "STAFF";

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

    if (password.length < 4) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" },
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

    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: validRole,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Register error:", err.message);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
