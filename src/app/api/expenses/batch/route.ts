import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext } from "@/lib/branch";
import { ensureExpenseColumns } from "@/lib/ensure-expense-columns";
import { requireAdmin } from "@/lib/session";

interface BatchItem {
  title?: string;
  amount?: number;
  categoryId?: string;
  note?: string;
  paidByOwner?: boolean;
  recurring?: boolean;
  slipUrl?: string;
  date?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  await ensureExpenseColumns();
  const body = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  const items: BatchItem[] = Array.isArray(body.items) ? body.items : [];
  const valid = items.filter(
    (it) => it.title && it.amount && it.amount > 0 && it.categoryId
  );

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid items" }, { status: 400 });
  }

  const branchId = ctx.mode === "BRANCH" ? ctx.id : null;
  const boothEventId = ctx.mode === "BOOTH" ? ctx.id : null;

  await prisma.expense.createMany({
    data: valid.map((it) => ({
      title: it.title as string,
      amount: it.amount as number,
      categoryId: it.categoryId as string,
      branchId,
      boothEventId,
      note: it.note || "",
      paidByOwner: !!it.paidByOwner,
      recurring: !!it.recurring,
      slipUrl: it.slipUrl || "",
      date: it.date ? new Date(it.date) : new Date(),
    })),
  });

  return NextResponse.json({ success: true, count: valid.length });
}
