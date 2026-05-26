import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // ACTIVE | CLOSED | PLANNED | null
  const includeInactive = searchParams.get("includeInactive") === "1";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (!includeInactive) where.active = true;

  const events = await prisma.boothEvent.findMany({
    where,
    include: {
      _count: { select: { orders: true, shifts: true, expenses: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const event = await prisma.boothEvent.create({
      data: {
        name: body.name?.trim() || "บูธ " + new Date().toLocaleDateString("th-TH"),
        location: body.location?.trim() || "",
        note: body.note?.trim() || "",
        status: body.status || "ACTIVE",
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return NextResponse.json(event);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);

  const event = await prisma.boothEvent.update({
    where: { id },
    data,
  });

  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Soft-close: mark CLOSED, keep history
  await prisma.boothEvent.update({
    where: { id },
    data: { status: "CLOSED", active: false, endDate: new Date() },
  });

  return NextResponse.json({ success: true });
}
