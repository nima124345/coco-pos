import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const boothId = searchParams.get("boothId");
  if (!boothId) {
    return NextResponse.json({ error: "Missing boothId" }, { status: 400 });
  }

  const booth = await prisma.boothEvent.findUnique({
    where: { id: boothId },
    select: { id: true, name: true, location: true, cashIncome: true, transferIncome: true },
  });
  if (!booth) {
    return NextResponse.json({ error: "Booth not found" }, { status: 404 });
  }

  const expenses = await prisma.expense.findMany({
    where: { boothEventId: boothId },
    include: { category: true },
  });

  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ booth, expenses, categories });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const { boothId, name, location, cashIncome, transferIncome, expenses } = body as {
    boothId: string;
    name?: string;
    location?: string;
    cashIncome: number;
    transferIncome: number;
    expenses: { categoryId: string; categoryName: string; amount: number }[];
  };

  if (!boothId) {
    return NextResponse.json({ error: "Missing boothId" }, { status: 400 });
  }

  const rows = (expenses || [])
    .map((exp) => ({
      boothEventId: boothId,
      title: exp.categoryName,
      amount: Number(exp.amount),
      categoryId: exp.categoryId,
    }))
    .filter((r) => Number.isFinite(r.amount) && r.amount > 0);

  // Delete-then-recreate must be atomic: a partial failure here would otherwise
  // wipe the booth's expenses without writing the replacements back.
  await prisma.$transaction(async (tx) => {
    await tx.boothEvent.update({
      where: { id: boothId },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        cashIncome: Number(cashIncome) || 0,
        transferIncome: Number(transferIncome) || 0,
      },
    });
    await tx.expense.deleteMany({ where: { boothEventId: boothId } });
    if (rows.length) {
      await tx.expense.createMany({ data: rows });
    }
  });

  return NextResponse.json({ success: true });
}
