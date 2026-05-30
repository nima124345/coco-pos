"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface Customer {
  phone: string;
  name: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  firstVisit: string;
  daysSinceLastVisit: number;
  segment: "VIP" | "REGULAR" | "NEW";
  status: "ACTIVE" | "AT_RISK" | "CHURNED";
}

interface CustomerOrderItem {
  id: string;
  menuItemName: string;
  sweetnessLevel: number;
  quantity: number;
  itemTotal: number;
  note: string;
  toppings: { id: string; toppingName: string }[];
}

interface CustomerOrder {
  id: string;
  orderNumber: number;
  netTotal: number;
  paymentMethod: string;
  channel: string;
  status: string;
  createdAt: string;
  items: CustomerOrderItem[];
  staff: { name: string };
  branch?: { id: string; name: string } | null;
  boothEvent?: { id: string; name: string } | null;
}

const SEGMENTS = {
  VIP: { label: "VIP", emoji: "👑", color: "bg-amber-100 text-amber-800 border-amber-200" },
  REGULAR: { label: "Regular", emoji: "⭐", color: "bg-blue-100 text-blue-800 border-blue-200" },
  NEW: { label: "ใหม่", emoji: "🌱", color: "bg-green-100 text-green-800 border-green-200" },
} as const;

const STATUSES = {
  ACTIVE: { label: "Active", variant: "success" as const, dot: "bg-green-500" },
  AT_RISK: { label: "เสี่ยงหาย", variant: "warning" as const, dot: "bg-amber-500" },
  CHURNED: { label: "หายไป", variant: "destructive" as const, dot: "bg-red-500" },
} as const;

function relativeDays(days: number): string {
  if (days === 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วัน`;
  if (days < 30) return `${Math.floor(days / 7)} สัปดาห์`;
  if (days < 365) return `${Math.floor(days / 30)} เดือน`;
  return `${Math.floor(days / 365)} ปี`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [scope, setScope] = useState<"current" | "all" | "all-branches" | "all-booths">("current");
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "VIP" | "REGULAR" | "NEW">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "AT_RISK" | "CHURNED">("ALL");
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailOrders, setDetailOrders] = useState<CustomerOrder[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (c: Customer) => {
    setDetailCustomer(c);
    setDetailOrders([]);
    setDetailLoading(true);
    const qs = new URLSearchParams({ phone: c.phone });
    if (scope !== "current") qs.set("scope", scope);
    const res = await apiFetch(`/api/customers/orders?${qs.toString()}`);
    setDetailOrders(await res.json());
    setDetailLoading(false);
  };
  const closeDetail = () => {
    setDetailCustomer(null);
    setDetailOrders([]);
  };

  const availableBranches = useAuthStore((s) => s.availableBranches);
  const availableBoothEvents = useAuthStore((s) => s.availableBoothEvents);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);
  const currentBooth = availableBoothEvents.find((b) => b.id === currentBoothEventId);

  const loadData = useCallback(async () => {
    const qs = new URLSearchParams();
    if (scope !== "current") qs.set("scope", scope);
    const res = await apiFetch(`/api/customers?${qs.toString()}`);
    setCustomers(await res.json());
  }, [scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let result = customers;
    if (segmentFilter !== "ALL") result = result.filter((c) => c.segment === segmentFilter);
    if (statusFilter !== "ALL") result = result.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.phone.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [customers, segmentFilter, statusFilter, search]);

  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => c.segment === "VIP").length;
  const activeCount = customers.filter((c) => c.status === "ACTIVE").length;
  const churnedCount = customers.filter((c) => c.status === "CHURNED").length;
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  const handleExportCSV = () => {
    const header =
      "เบอร์โทร,ชื่อ,จำนวนครั้ง,ยอดใช้จ่ายรวม,มาล่าสุด,ห่างหายมา (วัน),Segment,สถานะ\n";
    const rows = filtered
      .map(
        (c) =>
          `${c.phone},${c.name},${c.visits},${c.totalSpent},${c.lastVisit.slice(0, 10)},${c.daysSinceLastVisit},${c.segment},${c.status}`
      )
      .join("\n");
    const blob = new Blob(["﻿" + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {scope === "all"
                ? "🏢 ทุกสาขา + บูธ"
                : scope === "all-branches"
                  ? "🏪 ทุกสาขา"
                  : scope === "all-booths"
                    ? "🎪 ทุกบูธ"
                    : isInBoothMode
                      ? `🎪 ${currentBooth?.name ?? ""}`
                      : `🏪 ${currentBranch?.name ?? ""}`}
            </span>
          </div>
          <h1 className="text-2xl font-bold">ลูกค้า</h1>
          <p className="text-slate-500">
            รวมข้อมูลลูกค้าที่ใส่เบอร์โทรไว้ตอนสั่งซื้อ
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={scope}
            onChange={(e) =>
              setScope(e.target.value as "current" | "all" | "all-branches" | "all-booths")
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <option value="current">
              {isInBoothMode ? "🎪 บูธนี้" : "🏪 สาขานี้"}
            </option>
            <option value="all-branches">🏪 ทุกสาขา</option>
            <option value="all-booths">🎪 ทุกบูธ</option>
            <option value="all">🏢 ทุกที่</option>
          </select>
          <Button onClick={handleExportCSV} variant="outline">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">ลูกค้าทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900">
              {totalCustomers} <span className="text-sm font-normal text-slate-400">คน</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">👑 VIP</p>
            <p className="text-2xl font-bold text-amber-600">
              {vipCount} <span className="text-sm font-normal text-slate-400">คน</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">🟢 Active / 🔴 หายไป</p>
            <p className="text-2xl font-bold text-slate-900">
              <span className="text-green-600">{activeCount}</span>
              <span className="text-sm font-normal text-slate-400"> / </span>
              <span className="text-red-600">{churnedCount}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">ยอดใช้จ่ายเฉลี่ย/คน</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(avgSpend)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="ค้นหาเบอร์โทรหรือชื่อ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value as typeof segmentFilter)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <option value="ALL">ทุก Segment</option>
          <option value="VIP">👑 VIP</option>
          <option value="REGULAR">⭐ Regular</option>
          <option value="NEW">🌱 ใหม่</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <option value="ALL">ทุกสถานะ</option>
          <option value="ACTIVE">🟢 Active</option>
          <option value="AT_RISK">🟡 เสี่ยงหาย</option>
          <option value="CHURNED">🔴 หายไป</option>
        </select>
        <span className="text-sm text-slate-500 ml-auto">
          {filtered.length} / {totalCustomers} คน
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {totalCustomers === 0
              ? "ยังไม่มีข้อมูลลูกค้า (พนักงานต้องใส่เบอร์โทรตอนสั่งซื้อ)"
              : "ไม่พบลูกค้าตามที่ค้นหา"}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const seg = SEGMENTS[c.segment];
              const st = STATUSES[c.status];
              return (
                <li
                  key={c.phone}
                  className="grid grid-cols-[1fr_auto_2.5rem] md:grid-cols-[9rem_1fr_4rem_7rem_6rem_5rem_6rem_5rem_2.5rem] items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <a
                    href={`tel:${c.phone}`}
                    className="font-mono text-sm text-slate-900 hover:text-blue-600 hover:underline tabular-nums truncate"
                  >
                    {c.phone}
                  </a>
                  <span className="text-sm text-slate-700 truncate">
                    {c.name || <span className="text-slate-400">—</span>}
                  </span>
                  <span className="hidden md:block text-right text-sm font-semibold tabular-nums">
                    {c.visits}
                  </span>
                  <span className="hidden md:block text-right font-bold text-green-600 tabular-nums">
                    {formatCurrency(c.totalSpent)}
                  </span>
                  <span
                    className="hidden md:block text-sm text-slate-500 tabular-nums"
                    title={c.lastVisit}
                  >
                    {formatDateShort(c.lastVisit)}
                  </span>
                  <span
                    className={`hidden md:block text-sm tabular-nums ${
                      c.daysSinceLastVisit > 60
                        ? "text-red-600"
                        : c.daysSinceLastVisit > 30
                        ? "text-amber-600"
                        : "text-slate-500"
                    }`}
                  >
                    {relativeDays(c.daysSinceLastVisit)}
                  </span>
                  <div className="hidden md:flex justify-center">
                    <Badge variant="outline" className={seg.color}>
                      {seg.emoji} {seg.label}
                    </Badge>
                  </div>
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                      <span className="hidden md:inline text-slate-600">{st.label}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => openDetail(c)}
                    aria-label="ดูรายละเอียดลูกค้า"
                    title="ดูรายละเอียด"
                    className="justify-self-end w-9 h-9 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center justify-center transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeDetail}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={SEGMENTS[detailCustomer.segment].color}>
                      {SEGMENTS[detailCustomer.segment].emoji} {SEGMENTS[detailCustomer.segment].label}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full ${STATUSES[detailCustomer.status].dot}`} />
                      <span className="text-slate-600">{STATUSES[detailCustomer.status].label}</span>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 truncate">
                    {detailCustomer.name || "ไม่ระบุชื่อ"}
                  </h3>
                  <a
                    href={`tel:${detailCustomer.phone}`}
                    className="text-sm font-mono text-blue-600 hover:underline"
                  >
                    📞 {detailCustomer.phone}
                  </a>
                </div>
                <button
                  onClick={closeDetail}
                  className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors shrink-0"
                  aria-label="ปิด"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">จำนวนครั้ง</p>
                  <p className="text-lg font-bold text-slate-900">
                    {detailCustomer.visits} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
                  </p>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">ยอดใช้จ่ายรวม</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(detailCustomer.totalSpent)}
                  </p>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500">เฉลี่ย/ครั้ง</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(detailCustomer.totalSpent / Math.max(1, detailCustomer.visits))}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
              {detailLoading && (
                <div className="text-center text-slate-400 py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  กำลังโหลดประวัติ...
                </div>
              )}
              {!detailLoading && detailOrders.length === 0 && (
                <div className="text-center text-slate-400 py-12">ไม่มีออเดอร์</div>
              )}
              {!detailLoading && detailOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border border-slate-200 p-4 ${
                    order.status === "VOIDED" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-amber-600">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </span>
                      {order.status === "VOIDED" && (
                        <Badge variant="destructive">ยกเลิก</Badge>
                      )}
                    </div>
                    <p className="font-bold text-green-600 tabular-nums">
                      {formatCurrency(order.netTotal)}
                    </p>
                  </div>

                  <ul className="space-y-2 mb-3">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="bg-slate-50 rounded-lg p-2.5 text-sm"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-slate-900">
                            {item.menuItemName}
                            <span className="text-slate-400 font-normal"> × {item.quantity}</span>
                          </span>
                          <span className="font-semibold tabular-nums shrink-0">
                            {formatCurrency(item.itemTotal)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0">
                            หวาน {item.sweetnessLevel}%
                          </Badge>
                          {item.toppings.map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className="text-[10px] py-0 bg-green-50 border-green-200 text-green-700"
                            >
                              + {t.toppingName}
                            </Badge>
                          ))}
                        </div>
                        {item.note && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md mt-1.5 inline-block">
                            📝 {item.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <span>👤 {order.staff.name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        {order.channel === "SHOPEE"
                          ? "🛍️ Shopee"
                          : order.channel === "DELIVERY"
                          ? "🛵 Delivery"
                          : "🏪 หน้าร้าน"}
                      </span>
                      <span>·</span>
                      <span>{order.paymentMethod === "CASH" ? "💵 เงินสด" : "📱 QR"}</span>
                      {(order.branch || order.boothEvent) && (
                        <>
                          <span>·</span>
                          <span>
                            {order.branch
                              ? `🏪 ${order.branch.name}`
                              : `🎪 ${order.boothEvent?.name ?? ""}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
