import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(promotions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const promotion = await prisma.promotion.create({
    data: {
      name: body.name,
      type: body.type,
      value: body.value,
      active: body.active ?? true,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  });
  return NextResponse.json(promotion);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const promotion = await prisma.promotion.update({ where: { id }, data });
  return NextResponse.json(promotion);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.promotion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
