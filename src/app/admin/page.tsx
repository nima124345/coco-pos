"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardData {
  totalSales: number;
  totalOrders: number;
  totalExpenses: number;
  netProfit: number;
  stockValue: number;
  stockItemCount: number;
  cashSales: number;
  qrSales: number;
  thaiPlusSales: number;
  dineInSales: number;
  deliverySales: number;
  shopeeSales: number;
  shopeeOrderCount: number;
  topSellers: { name: string; quantity: number; revenue: number }[];
  topToppings: { name: string; count: number }[];
  dailySales: { date: string; sales: number; expenses: number }[];
  expenseByCategory: { name: string; amount: number; color: string }[];
  salesByBranch: { id: string; name: string; sales: number; orders: number }[];
  salesByBooth: { id: string; name: string; sales: number; orders: number }[];
}

type ScopeMode = "current" | "all" | "all-branches" | "all-booths";

const PERIODS = [
  { value: "today", label: "วันนี้" },
  { value: "week", label: "7 วัน" },
  { value: "month", label: "เดือนนี้" },
];

const PIE_COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const availableBranches = useAuthStore((s) => s.availableBranches);
  const availableBoothEvents = useAuthStore((s) => s.availableBoothEvents);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);
  const currentBooth = availableBoothEvents.find(
    (b) => b.id === currentBoothEventId
  );

  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState("today");
  const [scope, setScope] = useState<ScopeMode>("current");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const qs = new URLSearchParams({ period });
      if (scope !== "current") qs.set("scope", scope);
      const res = await apiFetch(`/api/dashboard?${qs.toString()}`);
      const result = await res.json();
      setData(result);
    } finally {
      setRefreshing(false);
    }
  }, [period, scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const totalExpenseSum = useMemo(
    () => data?.expenseByCategory.reduce((s, e) => s + e.amount, 0) ?? 0,
    [data]
  );

  const totalPaymentSum = useMemo(
    () => (data ? data.cashSales + data.qrSales + data.thaiPlusSales : 0),
    [data]
  );

  const totalChannelSum = useMemo(
    () =>
      data ? data.dineInSales + data.deliverySales + data.shopeeSales : 0,
    [data]
  );

  const maxTopSellerQty = useMemo(
    () => Math.max(1, ...(data?.topSellers.map((s) => s.quantity) ?? [1])),
    [data]
  );

  const maxBranchSales = useMemo(
    () => Math.max(1, ...(data?.salesByBranch.map((b) => b.sales) ?? [1])),
    [data]
  );

  const maxBoothSales = useMemo(
    () => Math.max(1, ...(data?.salesByBooth.map((b) => b.sales) ?? [1])),
    [data]
  );

  const scopeLabel =
    scope === "all"
      ? "🏢 ทุกสาขา + ทุกบูธ"
      : scope === "all-branches"
        ? "🏪 ทุกสาขา"
        : scope === "all-booths"
          ? "🎪 ทุกบูธ"
          : isInBoothMode
            ? `🎪 ${currentBooth?.name ?? ""}`
            : `🏪 ${currentBranch?.name ?? ""}`;

  if (!data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
              {today}
            </span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {scopeLabel}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            สวัสดี, {user?.name} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            ภาพรวมธุรกิจของร้าน Coco Zone
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ScopeMode)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm cursor-pointer"
          >
            <option value="current">
              {isInBoothMode ? "🎪 บูธนี้" : "🏪 สาขานี้"}
            </option>
            <option value="all-branches">🏪 ทุกสาขา</option>
            <option value="all-booths">🎪 ทุกบูธ</option>
            <option value="all">🏢 ทุกสาขา + บูธ</option>
          </select>

          <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  period === p.value
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/30"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-50"
            aria-label="รีเฟรช"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? "animate-spin" : ""}
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="รายรับรวม"
          value={formatCurrency(data.totalSales)}
          icon="💰"
          accent="from-emerald-400 to-green-600"
          glow="shadow-emerald-500/20"
        />
        <KpiCard
          label="จำนวนออเดอร์"
          value={data.totalOrders.toLocaleString()}
          suffix="ออเดอร์"
          icon="🛒"
          accent="from-blue-400 to-indigo-600"
          glow="shadow-blue-500/20"
        />
        <KpiCard
          label="รายจ่ายรวม"
          value={formatCurrency(data.totalExpenses)}
          icon="💸"
          accent="from-rose-400 to-red-600"
          glow="shadow-red-500/20"
        />
        <KpiCard
          label="กำไรสุทธิ"
          value={formatCurrency(data.netProfit)}
          icon="📈"
          accent={
            data.netProfit >= 0
              ? "from-amber-400 to-orange-600"
              : "from-slate-400 to-slate-600"
          }
          glow={
            data.netProfit >= 0 ? "shadow-amber-500/20" : "shadow-slate-500/20"
          }
          valueClassName={
            data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
          }
        />
      </section>

      <section>
        <Card className="relative overflow-hidden p-6">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 opacity-10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/20 shrink-0">
                📦
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">
                  มูลค่าสต็อกคงเหลือ
                  <span className="ml-1.5 text-xs text-slate-400">(ณ ปัจจุบัน)</span>
                </p>
                <p className="text-3xl font-bold tracking-tight text-slate-900">
                  {formatCurrency(data.stockValue)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ต้นทุนวัตถุดิบคงคลัง · {data.stockItemCount.toLocaleString()} รายการ
                </p>
              </div>
            </div>
            <Link
              href="/admin/inventory"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-100 transition-colors"
            >
              จัดการสต็อก
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </Card>
      </section>

      {(data.salesByBranch.length > 1 || data.salesByBooth.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.salesByBranch.length > 0 && (
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  🏪 ยอดขายแยกสาขา
                </h2>
                <p className="text-sm text-slate-500">
                  เปรียบเทียบรายรับและจำนวนออเดอร์
                </p>
              </div>
              <div className="space-y-2.5">
                {data.salesByBranch.map((b, i) => {
                  const pct = (b.sales / maxBranchSales) * 100;
                  return (
                    <div key={b.id} className="p-3 rounded-xl hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">
                            {i < 3 ? MEDALS[i] : "🏪"}
                          </span>
                          <span className="font-medium text-slate-800">
                            {b.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(b.sales)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {b.orders} ออเดอร์
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {data.salesByBooth.length > 0 && (
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  🎪 ยอดขายแยกบูธ
                </h2>
                <p className="text-sm text-slate-500">
                  รายรับจากการออกบูธ/งานต่างๆ
                </p>
              </div>
              <div className="space-y-2.5">
                {data.salesByBooth.map((b, i) => {
                  const pct = (b.sales / maxBoothSales) * 100;
                  return (
                    <div key={b.id} className="p-3 rounded-xl hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">
                            {i < 3 ? MEDALS[i] : "🎪"}
                          </span>
                          <span className="font-medium text-slate-800">
                            {b.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(b.sales)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {b.orders} ออเดอร์
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                รายรับ–รายจ่าย
              </h2>
              <p className="text-sm text-slate-500">7 วันล่าสุด</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Legend dot="bg-emerald-500" label="รายรับ" />
              <Legend dot="bg-red-500" label="รายจ่าย" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={data.dailySales}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                  })
                }
                fontSize={12}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 30px -10px rgb(0 0 0 / 0.15)",
                }}
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "long",
                  })
                }
              />
              <Area
                type="monotone"
                dataKey="sales"
                name="รายรับ"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#salesGradient)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="รายจ่าย"
                stroke="#EF4444"
                strokeWidth={2.5}
                fill="url(#expenseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              สัดส่วนรายจ่าย
            </h2>
            <p className="text-sm text-slate-500">แยกตามหมวดหมู่</p>
          </div>
          {data.expenseByCategory.length > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.expenseByCategory}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.expenseByCategory.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-slate-500">รวม</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(totalExpenseSum)}
                </p>
              </div>
              <div className="mt-4 space-y-1.5 max-h-[120px] overflow-y-auto">
                {data.expenseByCategory.map((cat, i) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            cat.color || PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="text-slate-600 truncate">{cat.name}</span>
                    </div>
                    <span className="text-slate-900 font-medium">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <span className="text-4xl mb-2">📊</span>
              <p className="text-sm">ยังไม่มีข้อมูลรายจ่าย</p>
            </div>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              ช่องทางการชำระเงิน
            </h2>
            <p className="text-sm text-slate-500">
              สัดส่วนการรับชำระและช่องทางขาย
            </p>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              วิธีชำระเงิน
            </p>
            <div className="space-y-3">
              <PaymentRow
                icon="💵"
                label="เงินสด"
                value={data.cashSales}
                total={totalPaymentSum}
                color="bg-emerald-500"
              />
              <PaymentRow
                icon="📱"
                label="เงินโอน"
                value={data.qrSales}
                total={totalPaymentSum}
                color="bg-blue-500"
              />
              <PaymentRow
                icon="🇹🇭"
                label="ไทยช่วยไทยพลัส"
                value={data.thaiPlusSales}
                total={totalPaymentSum}
                color="bg-rose-500"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              ช่องทางขาย
            </p>
            <div className="space-y-3">
              <PaymentRow
                icon="🏪"
                label="หน้าร้าน"
                value={data.dineInSales}
                total={totalChannelSum}
                color="bg-amber-500"
              />
              <PaymentRow
                icon="🛵"
                label="Delivery"
                value={data.deliverySales}
                total={totalChannelSum}
                color="bg-purple-500"
              />
              <PaymentRow
                icon="🛍️"
                label="Shopee"
                value={data.shopeeSales}
                total={totalChannelSum}
                color="bg-orange-500"
                badge={`${data.shopeeOrderCount} ออเดอร์`}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                เมนูขายดี
              </h2>
              <p className="text-sm text-slate-500">Top 10 ของช่วงเวลาที่เลือก</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium border border-green-100">
              {data.topSellers.length} เมนู
            </span>
          </div>

          {data.topSellers.length > 0 ? (
            <div className="space-y-2">
              {data.topSellers.map((item, i) => {
                const pct = (item.quantity / maxTopSellerQty) * 100;
                return (
                  <div
                    key={item.name}
                    className="group p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">
                          {i < 3 ? (
                            MEDALS[i]
                          ) : (
                            <span className="inline-flex w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold items-center justify-center">
                              {i + 1}
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-slate-800 text-sm truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">
                          {item.quantity} แก้ว
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(item.revenue)}
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          i === 0
                            ? "bg-gradient-to-r from-amber-400 to-amber-600"
                            : i === 1
                              ? "bg-gradient-to-r from-slate-300 to-slate-500"
                              : i === 2
                                ? "bg-gradient-to-r from-orange-400 to-amber-700"
                                : "bg-gradient-to-r from-green-400 to-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <span className="text-4xl mb-2">🍹</span>
              <p className="text-sm">ยังไม่มีข้อมูลการขาย</p>
            </div>
          )}
        </Card>
      </section>

      {data.topToppings.length > 0 && (
        <section>
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                ท็อปปิ้งยอดนิยม
              </h2>
              <p className="text-sm text-slate-500">5 อันดับที่ลูกค้าสั่งมากที่สุด</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {data.topToppings.map((t, i) => (
                <div
                  key={t.name}
                  className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-green-700">
                      #{i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-full">
                      {t.count}×
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {t.name}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  icon,
  accent,
  glow,
  valueClassName,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: string;
  accent: string;
  glow: string;
  valueClassName?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5 hover:shadow-lg transition-shadow">
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl`}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-xl shadow-lg ${glow}`}
          >
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <p className={`text-3xl font-bold tracking-tight ${valueClassName ?? "text-slate-900"}`}>
            {value}
          </p>
          {suffix && (
            <p className="text-sm text-slate-500">{suffix}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function PaymentRow({
  icon,
  label,
  value,
  total,
  color,
  badge,
}: {
  icon: string;
  label: string;
  value: number;
  total: number;
  color: string;
  badge?: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {badge && (
            <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900">
            {formatCurrency(value)}
          </p>
          <p className="text-[11px] text-slate-500">{pct.toFixed(0)}%</p>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-slate-200 rounded-full" />
          <div className="h-8 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-48 bg-slate-200 rounded" />
        </div>
        <div className="h-10 w-64 bg-slate-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-white border border-slate-200 rounded-2xl" />
        <div className="h-80 bg-white border border-slate-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-white border border-slate-200 rounded-2xl" />
        <div className="h-72 bg-white border border-slate-200 rounded-2xl" />
      </div>
    </div>
  );
}
