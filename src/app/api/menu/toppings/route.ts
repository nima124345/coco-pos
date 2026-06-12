import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const toppings = await prisma.topping.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(toppings);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const topping = await prisma.topping.create({ data: body });
  return NextResponse.json(topping);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const { id, ...data } = body;
  const topping = await prisma.topping.update({ where: { id }, data });
  return NextResponse.json(topping);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.topping.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
