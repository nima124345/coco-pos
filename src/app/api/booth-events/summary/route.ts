import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Per-booth P&L summary for the admin booths page
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const booth = await prisma.boothEvent.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: "COMPLETED" },
          select: { netTotal: true, channel: true, paymentMethod: true },
        },
        expenses: { select: { amount: true } },
        _count: { select: { orders: true, shifts: true, expenses: true } },
      },
    });
    if (!booth) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sales = booth.orders.reduce((s, o) => s + o.netTotal, 0);
    const expenses = booth.expenses.reduce((s, e) => s + e.amount, 0);
    return NextResponse.json({
      id: booth.id,
      name: booth.name,
      location: booth.location,
      status: booth.status,
      startDate: booth.startDate,
      endDate: booth.endDate,
      sales,
      expenses,
      profit: sales - expenses,
      counts: booth._count,
    });
  }

  const booths = await prisma.boothEvent.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    include: {
      orders: {
        where: { status: "COMPLETED" },
        select: { netTotal: true },
      },
      expenses: { select: { amount: true } },
      _count: { select: { orders: true, shifts: true, expenses: true } },
    },
  });

  const summary = booths.map((b) => {
    const sales = b.orders.reduce((s, o) => s + o.netTotal, 0);
    const expenses = b.expenses.reduce((s, e) => s + e.amount, 0);
    return {
      id: b.id,
      name: b.name,
      location: b.location,
      note: b.note,
      status: b.status,
      active: b.active,
      startDate: b.startDate,
      endDate: b.endDate,
      sales,
      expenses,
      profit: sales - expenses,
      counts: b._count,
    };
  });

  return NextResponse.json(summary);
}
