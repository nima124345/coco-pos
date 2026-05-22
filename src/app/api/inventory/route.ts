import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBranchId } from "@/lib/branch";

// Inventory is per-branch only. Booth context falls back to "no branch" and returns empty.
export async function GET(req: NextRequest) {
  const branchId = getBranchId(req);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (!branchId && scope !== "all") {
    return NextResponse.json([]);
  }

  const where: Record<string, unknown> = { active: true };
  if (scope !== "all" && branchId) where.branchId = branchId;

  const items = await prisma.inventoryItem.findMany({
    where,
    include: { branch: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const branchId = getBranchId(req);

  if (!branchId) {
    return NextResponse.json(
      { error: "Inventory available only in branch context" },
      { status: 400 }
    );
  }

  const item = await prisma.inventoryItem.create({
    data: { ...body, branchId },
  });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const item = await prisma.inventoryItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.inventoryItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
