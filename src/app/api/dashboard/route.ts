import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext, contextWhere } from "@/lib/branch";
import { requireAdmin } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";
import { ensureIndexes } from "@/lib/ensure-indexes";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "dashboard", "VIEW");
  if (denied) return denied;
  void ensureIndexes();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "today";
  const scope = searchParams.get("scope"); // "all" | "all-branches" | "all-booths" | null
  const ctx = getContext(req);

  const now = new Date();
  let startDate: Date;
  const endDate: Date = new Date(now);

  switch (period) {
    case "today":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
  }

  const ctxWhere: Record<string, unknown> = {};
  if (scope === "all-branches") ctxWhere.branchId = { not: null };
  else if (scope === "all-booths") ctxWhere.boothEventId = { not: null };
  else if (scope !== "all" && ctx) Object.assign(ctxWhere, contextWhere(ctx));

  const orderWhere: Record<string, unknown> = {
    ...ctxWhere,
    createdAt: { gte: startDate, lte: endDate },
    status: "COMPLETED",
  };
  const expenseWhere: Record<string, unknown> = {
    ...ctxWhere,
    date: { gte: startDate, lte: endDate },
  };

  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: {
      items: { include: { toppings: true } },
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true } },
    },
  });

  const totalSales = orders.reduce((sum, o) => sum + o.netTotal, 0);
  const totalOrders = orders.length;
  const cashSales = orders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const qrSales = orders
    .filter((o) => o.paymentMethod === "QR")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const thaiPlusSales = orders
    .filter((o) => o.paymentMethod === "THAI_PLUS")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const dineInSales = orders
    .filter((o) => o.channel === "DINE_IN")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const deliverySales = orders
    .filter((o) => o.channel === "DELIVERY")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const shopeeSales = orders
    .filter((o) => o.channel === "SHOPEE")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const shopeeOrderCount = orders.filter((o) => o.channel === "SHOPEE").length;

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    include: { category: true },
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Current stock value (point-in-time, not period-based) for the same scope
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { active: true, ...ctxWhere },
    select: { quantity: true, costPrice: true },
  });
  const stockValue = inventoryItems.reduce(
    (sum, i) => sum + i.quantity * i.costPrice,
    0
  );
  const stockItemCount = inventoryItems.length;

  const expenseByCategory: Record<string, { name: string; amount: number; color: string }> = {};
  expenses.forEach((e) => {
    if (!expenseByCategory[e.categoryId]) {
      expenseByCategory[e.categoryId] = {
        name: e.category.name,
        amount: 0,
        color: e.category.color,
      };
    }
    expenseByCategory[e.categoryId].amount += e.amount;
  });

  const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!itemCounts[item.menuItemName]) {
        itemCounts[item.menuItemName] = { name: item.menuItemName, quantity: 0, revenue: 0 };
      }
      itemCounts[item.menuItemName].quantity += item.quantity;
      itemCounts[item.menuItemName].revenue += item.itemTotal;
    });
  });
  const topSellers = Object.values(itemCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const toppingCounts: Record<string, { name: string; count: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      item.toppings.forEach((t) => {
        if (!toppingCounts[t.toppingName]) {
          toppingCounts[t.toppingName] = { name: t.toppingName, count: 0 };
        }
        toppingCounts[t.toppingName].count += 1;
      });
    });
  });
  const topToppings = Object.values(toppingCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const dailySales: { date: string; sales: number; expenses: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const daySales = orders
      .filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd)
      .reduce((sum, o) => sum + o.netTotal, 0);
    const dayExpenses = expenses
      .filter((e) => e.date >= dayStart && e.date <= dayEnd)
      .reduce((sum, e) => sum + e.amount, 0);

    dailySales.push({
      date: d.toISOString().split("T")[0],
      sales: daySales,
      expenses: dayExpenses,
    });
  }

  // Per-branch breakdown
  const salesByBranch: Record<string, { id: string; name: string; sales: number; orders: number }> = {};
  // Per-booth breakdown
  const salesByBooth: Record<string, { id: string; name: string; sales: number; orders: number }> = {};

  orders.forEach((o) => {
    if (o.branch) {
      if (!salesByBranch[o.branch.id]) {
        salesByBranch[o.branch.id] = { id: o.branch.id, name: o.branch.name, sales: 0, orders: 0 };
      }
      salesByBranch[o.branch.id].sales += o.netTotal;
      salesByBranch[o.branch.id].orders += 1;
    }
    if (o.boothEvent) {
      if (!salesByBooth[o.boothEvent.id]) {
        salesByBooth[o.boothEvent.id] = { id: o.boothEvent.id, name: o.boothEvent.name, sales: 0, orders: 0 };
      }
      salesByBooth[o.boothEvent.id].sales += o.netTotal;
      salesByBooth[o.boothEvent.id].orders += 1;
    }
  });

  return NextResponse.json({
    totalSales,
    totalOrders,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
    stockValue,
    stockItemCount,
    cashSales,
    qrSales,
    thaiPlusSales,
    dineInSales,
    deliverySales,
    shopeeSales,
    shopeeOrderCount,
    topSellers,
    topToppings,
    dailySales,
    expenseByCategory: Object.values(expenseByCategory),
    salesByBranch: Object.values(salesByBranch).sort((a, b) => b.sales - a.sales),
    salesByBooth: Object.values(salesByBooth).sort((a, b) => b.sales - a.sales),
  });
}
