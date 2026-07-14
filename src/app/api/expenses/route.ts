import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getContext,
  contextWhere,
  assertContextAccess,
  isPrivileged,
} from "@/lib/branch";
import { ensureExpenseColumns } from "@/lib/ensure-expense-columns";
import { requireAuth } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";
import { round2 } from "@/lib/utils";
import { ensureIndexes } from "@/lib/ensure-indexes";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  await ensureExpenseColumns();
  void ensureIndexes();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const date = searchParams.get("date"); // "YYYY-MM-DD"
  const categoryId = searchParams.get("categoryId");
  const scope = searchParams.get("scope");
  const ctx = getContext(req);

  // Cross-branch/booth scopes are ADMIN/MANAGER only. STAFF are pinned to (and
  // verified against) their branch context.
  const privileged = isPrivileged(auth);
  const where: Record<string, unknown> = {};
  if (privileged && scope === "all-branches") where.branchId = { not: null };
  else if (privileged && scope === "all-booths") where.boothEventId = { not: null };
  else if (privileged && scope === "all") {
    // unscoped
  } else if (ctx) {
    const denied = await assertContextAccess(auth, ctx);
    if (denied) return denied;
    Object.assign(where, contextWhere(ctx));
  } else if (!privileged) {
    // Not privileged and no context — return nothing rather than everything.
    where.id = "__none__";
  }

  // Managers must never see owner-paid expenses (items or amounts) — hide them
  // server-side so the data never reaches the client. (`not: true` also covers
  // legacy rows where paidByOwner is null.)
  if (auth.role === "MANAGER") where.paidByOwner = { not: true };

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (month) {
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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const permDenied = await managerPermissionDenied(auth, "expenses");
  if (permDenied) return permDenied;
  await ensureExpenseColumns();
  const body = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }
  const denied = await assertContextAccess(auth, ctx);
  if (denied) return denied;

  const amount = round2(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "จำนวนเงินต้องมากกว่า 0" },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      title: body.title,
      amount,
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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const permDenied = await managerPermissionDenied(auth, "expenses");
  if (permDenied) return permDenied;
  await ensureExpenseColumns();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { branchId: true, boothEventId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }
  const putDenied = await assertContextAccess(
    auth,
    existing.branchId
      ? { mode: "BRANCH", id: existing.branchId }
      : existing.boothEventId
      ? { mode: "BOOTH", id: existing.boothEventId }
      : null
  );
  if (putDenied) return putDenied;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.amount !== undefined) {
    const amount = round2(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "จำนวนเงินต้องมากกว่า 0" },
        { status: 400 }
      );
    }
    data.amount = amount;
  }
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
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const permDenied = await managerPermissionDenied(auth, "expenses");
  if (permDenied) return permDenied;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { branchId: true, boothEventId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }
  const delDenied = await assertContextAccess(
    auth,
    existing.branchId
      ? { mode: "BRANCH", id: existing.branchId }
      : existing.boothEventId
      ? { mode: "BOOTH", id: existing.boothEventId }
      : null
  );
  if (delDenied) return delDenied;

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
