import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";
import { ensureExpenseColumns } from "@/lib/ensure-expense-columns";

/**
 * Clone recurring expenses into the given month.
 *
 * Looks at the most recent prior month (within the current branch/booth context)
 * that has any recurring-flagged expenses, and copies each one into `month`
 * (dated to the 1st). Titles that already exist in `month` are skipped so the
 * action is safe to run more than once.
 */
export async function POST(req: NextRequest) {
  await ensureExpenseColumns();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }
  if (!month) {
    return NextResponse.json({ error: "Missing month" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const monthStart = new Date(year, m - 1, 1);
  const monthEnd = new Date(year, m, 0, 23, 59, 59);
  const where = contextWhere(ctx);

  // The recurring templates: latest recurring expenses from before this month.
  const templates = await prisma.expense.findMany({
    where: { ...where, recurring: true, date: { lt: monthStart } },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  if (templates.length === 0) {
    return NextResponse.json({ created: 0, reason: "no-templates" });
  }

  // Keep only the most recent occurrence of each distinct title.
  const seen = new Set<string>();
  const latest = templates.filter((t) => {
    if (seen.has(t.title)) return false;
    seen.add(t.title);
    return true;
  });

  // Skip titles already present in the target month.
  const existing = await prisma.expense.findMany({
    where: { ...where, date: { gte: monthStart, lte: monthEnd } },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((e) => e.title));
  const toCreate = latest.filter((t) => !existingTitles.has(t.title));

  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0, reason: "already-present" });
  }

  await prisma.expense.createMany({
    data: toCreate.map((t) => ({
      title: t.title,
      amount: t.amount,
      categoryId: t.categoryId,
      branchId: t.branchId,
      boothEventId: t.boothEventId,
      note: t.note,
      paidByOwner: t.paidByOwner,
      recurring: true,
      slipUrl: "",
      date: monthStart,
    })),
  });

  return NextResponse.json({ created: toCreate.length });
}
