import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext } from "@/lib/branch";
import { requireAdmin } from "@/lib/session";

// Inventory is per-branch OR per-booth-event. Each owner has independent stock.
// Admin-panel only (ADMIN/MANAGER); the staff POS app does not touch inventory.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const ctx = getContext(req);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (!ctx && scope !== "all") {
    return NextResponse.json([]);
  }

  const where: Record<string, unknown> = { active: true };
  if (scope !== "all" && ctx) {
    if (ctx.mode === "BRANCH") where.branchId = ctx.id;
    else where.boothEventId = ctx.id;
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { ...body };
  if (ctx.mode === "BRANCH") {
    data.branchId = ctx.id;
    data.boothEventId = null;
  } else {
    data.boothEventId = ctx.id;
    data.branchId = null;
  }

  const item = await prisma.inventoryItem.create({ data: data as never });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const { id, ...data } = body;
  const item = await prisma.inventoryItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.inventoryItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
