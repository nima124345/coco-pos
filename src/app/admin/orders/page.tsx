"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface OrderItem {
  id: string;
  menuItemName: string;
  sweetnessLevel: number;
  quantity: number;
  itemTotal: number;
  note: string;
  toppings: { toppingName: string }[];
}

interface Order {
  id: string;
  orderNumber: number;
  subTotal: number;
  discount: number;
  netTotal: number;
  paymentMethod: string;
  status: string;
  voidReason: string;
  channel: string;
  shopeeOrderId: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  items: OrderItem[];
  staff: { name: string };
  branch?: { id: string; name: string };
  boothEvent?: { id: string; name: string; location: string };
}

const CHANNEL_FILTERS = [
  { value: "ALL", label: "ทั้งหมด", emoji: "📋" },
  { value: "DINE_IN", label: "หน้าร้าน", emoji: "🏪" },
  { value: "DELIVERY", label: "Delivery", emoji: "🛵" },
  { value: "SHOPEE", label: "Shopee", emoji: "🛍️" },
];

function channelLabel(channel: string) {
  switch (channel) {
    case "DINE_IN":
      return { emoji: "🏪", label: "หน้าร้าน", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    case "DELIVERY":
      return { emoji: "🛵", label: "Delivery", cls: "bg-purple-50 text-purple-700 border-purple-200" };
    case "SHOPEE":
      return { emoji: "🛍️", label: "Shopee", cls: "bg-orange-50 text-orange-700 border-orange-200" };
    default:
      return { emoji: "📋", label: channel, cls: "bg-slate-50 text-slate-700 border-slate-200" };
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterChannel, setFilterChannel] = useState<string>("ALL");
  const [scope, setScope] = useState<"current" | "all" | "all-branches" | "all-booths">("current");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const availableBranches = useAuthStore((s) => s.availableBranches);
  const availableBoothEvents = useAuthStore((s) => s.availableBoothEvents);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);
  const currentBooth = availableBoothEvents.find((b) => b.id === currentBoothEventId);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ date: filterDate, limit: "200" });
      if (scope !== "current") qs.set("scope", scope);
      const res = await apiFetch(`/api/orders?${qs.toString()}`);
      setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filterDate, scope]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders =
    filterChannel === "ALL"
      ? orders
      : orders.filter((o) => o.channel === filterChannel);

  const completedOrders = filteredOrders.filter(
    (o) => o.status === "COMPLETED"
  );
  const voidedOrders = filteredOrders.filter((o) => o.status === "VOIDED");
  const totalSales = completedOrders.reduce((sum, o) => sum + o.netTotal, 0);
  const avgOrder =
    completedOrders.length > 0 ? totalSales / completedOrders.length : 0;

  const channelCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.channel] = (acc[o.channel] || 0) + 1;
    return acc;
  }, {});

  const handleExportCSV = () => {
    const header =
      "เลขออเดอร์,เวลา,พนักงาน,จำนวนรายการ,ยอดรวม,ส่วนลด,สุทธิ,ช่องทางชำระ,ช่องทางขาย,Shopee Order ID,สถานะ\n";
    const rows = filteredOrders
      .map(
        (o) =>
          `${o.orderNumber},${o.createdAt},${o.staff.name},${o.items.length},${o.subTotal},${o.discount},${o.netTotal},${o.paymentMethod},${o.channel},${o.shopeeOrderId || ""},${o.status}`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${filterDate}${filterChannel !== "ALL" ? `-${filterChannel.toLowerCase()}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );

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
          <h1 className="text-2xl font-bold">ออเดอร์ทั้งหมด</h1>
          <p className="text-slate-500">
            {completedOrders.length} ออเดอร์ | รวม{" "}
            {formatCurrency(totalSales)}
            {filterChannel !== "ALL" && (
              <span className="ml-2 text-xs text-orange-600">
                (กรอง: {CHANNEL_FILTERS.find((c) => c.value === filterChannel)?.label})
              </span>
            )}
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
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-44"
          />
          <Button onClick={handleExportCSV} variant="outline">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="p-6">
            <p className="text-xs text-slate-500 mb-1">ยอดขายรวม</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalSales)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-xs text-slate-500 mb-1">ออเดอร์สำเร็จ</p>
            <p className="text-2xl font-bold text-slate-900">
              {completedOrders.length}
              <span className="text-sm font-normal text-slate-400"> ออเดอร์</span>
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-xs text-slate-500 mb-1">เฉลี่ย/ออเดอร์</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(avgOrder)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-xs text-slate-500 mb-1">ยกเลิก</p>
            <p className="text-2xl font-bold text-red-600">
              {voidedOrders.length}
              <span className="text-sm font-normal text-slate-400"> ออเดอร์</span>
            </p>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHANNEL_FILTERS.map((f) => {
          const count =
            f.value === "ALL" ? orders.length : channelCounts[f.value] || 0;
          const active = filterChannel === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilterChannel(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer border-2 inline-flex items-center gap-1.5 ${
                active
                  ? f.value === "SHOPEE"
                    ? "bg-orange-50 border-orange-500 text-orange-700"
                    : "bg-green-50 border-green-500 text-green-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-white/60" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Order List */}
        <div className="flex-1 max-h-[calc(100vh-200px)] overflow-y-auto bg-white rounded-2xl border border-slate-200">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">📋</div>
              <p>ไม่มีออเดอร์ในวันที่เลือก</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const ch = channelLabel(order.channel);
                const isSelected = selectedOrder?.id === order.id;
                const isVoided = order.status === "VOIDED";
                return (
                  <li
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`grid grid-cols-[3.5rem_1fr_auto] lg:grid-cols-[3.5rem_5rem_1fr_8rem_5rem_6rem] items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-amber-50 border-l-4 border-amber-500"
                        : "hover:bg-slate-50 border-l-4 border-transparent"
                    } ${isVoided ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`font-mono font-bold text-sm tabular-nums ${
                        order.channel === "SHOPEE"
                          ? "text-orange-600"
                          : "text-amber-600"
                      }`}
                    >
                      #{order.orderNumber}
                    </span>
                    <span className="hidden lg:block text-xs text-slate-500 tabular-nums">
                      {new Date(order.createdAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {order.items.length} รายการ
                        <span className="text-slate-400 font-normal"> · </span>
                        <span className="text-slate-500 font-normal">{order.staff.name}</span>
                      </p>
                      {order.channel === "SHOPEE" && order.shopeeOrderId && (
                        <p className="text-[11px] text-orange-700 font-mono truncate">
                          🛍️ {order.shopeeOrderId}
                        </p>
                      )}
                    </div>
                    <div className="hidden lg:flex justify-center">
                      <Badge variant="outline" className={ch.cls}>
                        {ch.emoji} {ch.label}
                      </Badge>
                    </div>
                    <div className="hidden lg:flex justify-center">
                      <Badge
                        variant={order.status === "COMPLETED" ? "success" : "destructive"}
                      >
                        {order.status === "COMPLETED" ? "สำเร็จ" : "ยกเลิก"}
                      </Badge>
                    </div>
                    <p className="text-right font-bold tabular-nums whitespace-nowrap">
                      {formatCurrency(order.netTotal)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail Panel */}
        {selectedOrder && (
          <Card className="w-full lg:w-96 p-4 self-start lg:sticky lg:top-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg">
                ออเดอร์ #{selectedOrder.orderNumber}
              </h3>
              <Badge
                variant="outline"
                className={channelLabel(selectedOrder.channel).cls}
              >
                {channelLabel(selectedOrder.channel).emoji}{" "}
                {channelLabel(selectedOrder.channel).label}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mb-3">
              พนักงาน: {selectedOrder.staff.name} |{" "}
              {formatDate(selectedOrder.createdAt)}
            </p>

            {selectedOrder.channel === "SHOPEE" &&
              selectedOrder.shopeeOrderId && (
                <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                  <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">
                    Shopee Order ID
                  </p>
                  <p className="font-mono font-bold text-orange-900 text-sm break-all">
                    {selectedOrder.shopeeOrderId}
                  </p>
                </div>
              )}

            {(selectedOrder.customerName || selectedOrder.customerPhone) && (
              <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1">
                  ลูกค้า
                </p>
                {selectedOrder.customerName && (
                  <p className="text-sm text-slate-900">
                    👤 {selectedOrder.customerName}
                  </p>
                )}
                {selectedOrder.customerPhone && (
                  <p className="text-sm text-slate-900 font-mono">
                    📞{" "}
                    <a
                      href={`tel:${selectedOrder.customerPhone}`}
                      className="hover:underline"
                    >
                      {selectedOrder.customerPhone}
                    </a>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-lg p-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {item.menuItemName} x{item.quantity}
                    </span>
                    <span>{formatCurrency(item.itemTotal)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      หวาน {item.sweetnessLevel}%
                    </Badge>
                    {item.toppings.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {t.toppingName}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>ยอดรวม</span>
                <span>{formatCurrency(selectedOrder.subTotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>ส่วนลด</span>
                  <span>-{formatCurrency(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>สุทธิ</span>
                <span className="text-amber-600">
                  {formatCurrency(selectedOrder.netTotal)}
                </span>
              </div>
            </div>

            {selectedOrder.voidReason && (
              <div className="mt-3 bg-red-50 p-2 rounded-lg">
                <p className="text-xs text-red-600">
                  ยกเลิก: {selectedOrder.voidReason}
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
