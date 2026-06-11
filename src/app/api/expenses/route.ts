import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";
import { ensureExpenseColumns } from "@/lib/ensure-expense-columns";

export async function GET(req: NextRequest) {
  await ensureExpenseColumns();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const categoryId = searchParams.get("categoryId");
  const scope = searchParams.get("scope");
  const ctx = getContext(req);

  const where: Record<string, unknown> = {};
  if (scope === "all-branches") where.branchId = { not: null };
  else if (scope === "all-booths") where.boothEventId = { not: null };
  else if (scope !== "all" && ctx) Object.assign(where, contextWhere(ctx));

  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  if (categoryId) where.categoryId = categoryId;

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  await ensureExpenseColumns();
  const body = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      title: body.title,
      amount: body.amount,
      categoryId: body.categoryId,
      branchId: ctx.mode === "BRANCH" ? ctx.id : null,
      boothEventId: ctx.mode === "BOOTH" ? ctx.id : null,
      note: body.note || "",
      paidByOwner: !!body.paidByOwner,
      recurring: !!body.recurring,
      slipUrl: body.slipUrl || "",
      date: body.date ? new Date(body.date) : new Date(),
    },
    include: { category: true },
  });
  return NextResponse.json(expense);
}

export async function PUT(req: NextRequest) {
  await ensureExpenseColumns();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.categoryId !== undefined) data.categoryId = body.categoryId;
  if (body.note !== undefined) data.note = body.note || "";
  if (body.paidByOwner !== undefined) data.paidByOwner = !!body.paidByOwner;
  if (body.recurring !== undefined) data.recurring = !!body.recurring;
  if (body.slipUrl !== undefined) data.slipUrl = body.slipUrl || "";
  if (body.date !== undefined) data.date = new Date(body.date);

  const expense = await prisma.expense.update({
    where: { id },
    data,
    include: { category: true },
  });
  return NextResponse.json(expense);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
