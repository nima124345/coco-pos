import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
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

  await prisma.boothEvent.update({
    where: { id: boothId },
    data: {
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location }),
      cashIncome,
      transferIncome,
    },
  });

  await prisma.expense.deleteMany({ where: { boothEventId: boothId } });

  for (const exp of expenses) {
    if (exp.amount > 0) {
      await prisma.expense.create({
        data: {
          boothEventId: boothId,
          title: exp.categoryName,
          amount: exp.amount,
          categoryId: exp.categoryId,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
