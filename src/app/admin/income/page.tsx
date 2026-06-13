"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, paymentMethodMeta } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useMenuAccess } from "@/hooks/usePermission";
interface IncomeOrder {
  id: string;
  orderNumber: number;
  subTotal: number;
  discount: number;
  netTotal: number;
  paymentMethod: string;
  channel: string;
  customerName: string;
  createdAt: string;
  staff: { name: string };
}

function channelMeta(channel: string) {
  switch (channel) {
    case "DINE_IN":
      return { emoji: "🏪", label: "หน้าร้าน", color: "#d97706" };
    case "DELIVERY":
      return { emoji: "🛵", label: "Delivery", color: "#7c3aed" };
    case "SHOPEE":
      return { emoji: "🛍️", label: "Shopee", color: "#ea580c" };
    default:
      return { emoji: "📋", label: channel, color: "#64748b" };
  }
}

export default function AdminIncomePage() {
  const { canEdit } = useMenuAccess();
  const [orders, setOrders] = useState<IncomeOrder[]>([]);
  const [scope, setScope] = useState<"current" | "all" | "all-branches" | "all-booths">("current");
  const [filterMode, setFilterMode] = useState<"month" | "day">("month");
  const [filterMonth, setFilterMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const availableBranches = useAuthStore((s) => s.availableBranches);
  const availableBoothEvents = useAuthStore((s) => s.availableBoothEvents);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);
  const currentBooth = availableBoothEvents.find((b) => b.id === currentBoothEventId);

  const loadData = useCallback(async () => {
    const qs = new URLSearchParams({
      status: "COMPLETED",
      limit: "10000",
    });
    if (filterMode === "day") qs.set("date", filterDate);
    else qs.set("month", filterMonth);
    if (scope !== "current") qs.set("scope", scope);
    const res = await apiFetch(`/api/orders?${qs.toString()}`);
    setOrders(await res.json());
  }, [filterMode, filterMonth, filterDate, scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string, orderNumber: number) => {
    if (!confirm(`ต้องการลบออเดอร์ #${orderNumber} ออกจากรายรับใช่หรือไม่?`)) return;
    await apiFetch(`/api/orders?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const totalIncome = orders.reduce((sum, o) => sum + o.netTotal, 0);
  const orderCount = orders.length;
  const cashIncome = orders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const qrIncome = orders
    .filter((o) => o.paymentMethod === "QR")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const thaiPlusIncome = orders
    .filter((o) => o.paymentMethod === "THAI_PLUS")
    .reduce((sum, o) => sum + o.netTotal, 0);
  const avgPerOrder = orderCount > 0 ? totalIncome / orderCount : 0;

  const byChannel = (() => {
    const map = new Map<string, { label: string; emoji: string; color: string; total: number; count: number }>();
    for (const o of orders) {
      const meta = channelMeta(o.channel);
      const cur = map.get(o.channel) ?? {
        label: meta.label,
        emoji: meta.emoji,
        color: meta.color,
        total: 0,
        count: 0,
      };
      cur.total += o.netTotal;
      cur.count += 1;
      map.set(o.channel, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  // จัดกลุ่มออเดอร์เป็นรายวัน (วันใหม่สุดอยู่บนสุด)
  const byDay = (() => {
    const map = new Map<string, IncomeOrder[]>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push(o);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, dayOrders]) => {
        const sorted = [...dayOrders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return {
          key,
          label: new Intl.DateTimeFormat("th-TH", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(sorted[0].createdAt)),
          orders: sorted,
          total: sorted.reduce((sum, o) => sum + o.netTotal, 0),
          count: sorted.length,
        };
      });
  })();

  const formatTime = (date: string) =>
    new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(date)
    );

  const handleExportCSV = () => {
    const header = "วันที่,ออเดอร์,ช่องทาง,การชำระเงิน,ลูกค้า,พนักงาน,ยอดสุทธิ\n";
    const rows = orders
      .map(
        (o) =>
          `${o.createdAt},#${o.orderNumber},${channelMeta(o.channel).label},${
            o.paymentMethod
          },${o.customerName},${o.staff?.name ?? ""},${o.netTotal}`
      )
      .join("\n");
    const blob = new Blob(["﻿" + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-${filterMode === "day" ? filterDate : filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">      <div className="flex items-center justify-between flex-wrap gap-3">
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
          <h1 className="text-2xl font-bold">รายรับ</h1>
          <p className="text-slate-500">
            {scope === "current"
              ? isInBoothMode
                ? "รายได้จากการขายของบูธนี้"
                : "รายได้จากการขายของสาขานี้"
              : "ดูรายได้รวมจากการขาย"}
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
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode("month")}
              className={`h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filterMode === "month"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("day")}
              className={`h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filterMode === "day"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              รายวัน
            </button>
          </div>
          {filterMode === "day" ? (
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-44"
            />
          ) : (
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-44"
            />
          )}
          <Button onClick={handleExportCSV} variant="outline">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">
              {filterMode === "day" ? "รวมทั้งวัน" : "รวมทั้งเดือน"}
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">เงินสด</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(cashIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">เงินโอน</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(qrIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">ไทยช่วยไทยพลัส</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(thaiPlusIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">จำนวนออเดอร์</p>
            <p className="text-2xl font-bold text-slate-900">
              {orderCount}{" "}
              <span className="text-sm font-normal text-slate-400">ออเดอร์</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {byChannel.length > 0 && (
        <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 flex-wrap">
          <span className="text-slate-500 mr-1">เฉลี่ย/ออเดอร์</span>
          <span className="font-semibold text-slate-900 mr-3">
            {formatCurrency(avgPerOrder)}
          </span>
          {byChannel.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200"
            >
              <span>{c.emoji}</span>
              <span className="text-slate-600">{c.label}</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(c.total)}
              </span>
              <span className="text-xs text-slate-400">({c.count})</span>
            </span>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          {filterMode === "day" ? "ยังไม่มีรายรับในวันนี้" : "ยังไม่มีรายรับในเดือนนี้"}
        </div>
      ) : (
        <div className="space-y-4">
          {byDay.map((day) => (
            <div
              key={day.key}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-semibold text-slate-900 truncate">
                    {day.label}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {day.count} ออเดอร์
                  </span>
                </div>
                <span className="font-bold text-green-600 tabular-nums whitespace-nowrap">
                  {formatCurrency(day.total)}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {day.orders.map((order) => {
                  const meta = channelMeta(order.channel);
                  return (
                    <li
                      key={order.id}
                      className="group grid grid-cols-[3.25rem_auto_1fr_auto_2rem] lg:grid-cols-[5rem_10rem_1fr_8rem_3rem] items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs md:text-sm text-slate-500 tabular-nums">
                        {formatTime(order.createdAt)}
                      </span>
                      <span
                        className="justify-self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white truncate max-w-full"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.emoji} {meta.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          ออเดอร์ #{order.orderNumber}
                          {order.customerName ? ` · ${order.customerName}` : ""}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {paymentMethodMeta(order.paymentMethod).label}
                          {order.staff?.name ? ` · ${order.staff.name}` : ""}
                          {order.discount > 0
                            ? ` · ส่วนลด ${formatCurrency(order.discount)}`
                            : ""}
                        </p>
                      </div>
                      <span className="text-right font-bold text-green-600 tabular-nums whitespace-nowrap">
                        +{formatCurrency(order.netTotal)}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(order.id, order.orderNumber)}
                          aria-label="ลบออเดอร์"
                          className="justify-self-end w-8 h-8 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 transition-opacity"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
