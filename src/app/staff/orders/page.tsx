"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cn, paymentMethodMeta } from "@/lib/utils";

interface OrderTopping {
  toppingName: string;
  toppingPrice: number;
}

interface OrderItem {
  id: string;
  menuItemName: string;
  menuItemPrice: number;
  sweetnessLevel: number;
  quantity: number;
  itemTotal: number;
  note: string;
  toppings: OrderTopping[];
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
  createdAt: string;
  items: OrderItem[];
  staff: { name: string };
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showVoid, setShowVoid] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");

  const user = useAuthStore((s) => s.user);
  const shiftId = useAuthStore((s) => s.shiftId);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    const params = new URLSearchParams();
    params.set("staffId", user.id);
    if (shiftId) params.set("shiftId", shiftId);
    try {
      const res = await apiFetch(`/api/orders?${params}`);
      const data = res.ok ? await res.json() : [];
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // Keep the last-loaded orders on a transient failure.
    }
  }, [user, shiftId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleVoid = async () => {
    if (!selectedOrder) return;
    setVoidError("");

    const res = await apiFetch("/api/orders/void", {
      method: "POST",
      body: JSON.stringify({
        orderId: selectedOrder.id,
        adminPassword,
        voidReason,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setVoidError(data.error);
      return;
    }

    setShowVoid(false);
    setAdminPassword("");
    setVoidReason("");
    setSelectedOrder(null);
    loadOrders();
  };

  return (
    <div className="flex md:h-[calc(100vh-65px)] min-h-[calc(100vh-65px-64px)] md:min-h-0">
      {/* Order List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xl font-bold mb-4">
          ประวัติการขาย ({orders.length} รายการ)
        </h2>

        <div className="space-y-2">
          {orders.map((order) => (
            <Card
              key={order.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedOrder?.id === order.id
                  ? "ring-2 ring-amber-500"
                  : ""
              } ${order.status === "VOIDED" ? "opacity-60" : ""}`}
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center font-bold text-amber-600">
                    #{order.orderNumber}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {order.items.length} รายการ
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(order.netTotal)}
                  </p>
                  <div className="flex gap-1">
                    <Badge
                      variant={
                        order.status === "COMPLETED" ? "success" : "destructive"
                      }
                    >
                      {order.status === "COMPLETED" ? "สำเร็จ" : "ยกเลิก"}
                    </Badge>
                    <Badge variant="outline">
                      {paymentMethodMeta(order.paymentMethod).emoji}{" "}
                      {paymentMethodMeta(order.paymentMethod).label}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">📋</div>
              <p>ยังไม่มีรายการขาย</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile backdrop when detail open */}
      {selectedOrder && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        />
      )}

      {/* Order Detail — bottom sheet on mobile, sidebar on md+ */}
      <div
        className={cn(
          "bg-white flex flex-col shadow-xl",
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl max-h-[90vh] transform transition-transform duration-200 ease-out",
          selectedOrder ? "translate-y-0" : "translate-y-full",
          "md:relative md:translate-y-0 md:inset-auto md:w-96 md:rounded-none md:max-h-none md:border-l md:shadow-none md:transition-none md:z-auto"
        )}
      >
        {/* Mobile grab handle */}
        <div className="md:hidden flex justify-center py-2 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>
        {selectedOrder ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg">
                  ออเดอร์ #{selectedOrder.orderNumber}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedOrder.status === "COMPLETED"
                        ? "success"
                        : "destructive"
                    }
                  >
                    {selectedOrder.status === "COMPLETED" ? "สำเร็จ" : "ยกเลิก"}
                  </Badge>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="md:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
                    aria-label="ปิด"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" x2="6" y1="6" y2="18" />
                      <line x1="6" x2="18" y1="6" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {formatDate(selectedOrder.createdAt)}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.menuItemName}</span>
                    <span className="text-sm">x{item.quantity}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline">หวาน {item.sweetnessLevel}%</Badge>
                    {item.toppings.map((t, i) => (
                      <Badge key={i} variant="outline">
                        {t.toppingName}
                      </Badge>
                    ))}
                  </div>
                  {item.note && (
                    <p className="text-xs text-slate-500 mt-1">* {item.note}</p>
                  )}
                  <p className="text-right font-bold text-amber-600 mt-1">
                    {formatCurrency(item.itemTotal)}
                  </p>
                </div>
              ))}

              {selectedOrder.voidReason && (
                <div className="bg-red-50 p-3 rounded-xl">
                  <p className="text-sm font-medium text-red-700">
                    เหตุผลยกเลิก:
                  </p>
                  <p className="text-sm text-red-600">
                    {selectedOrder.voidReason}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">ยอดรวม</span>
                <span>{formatCurrency(selectedOrder.subTotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>ส่วนลด</span>
                  <span>-{formatCurrency(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>สุทธิ</span>
                <span className="text-amber-600">
                  {formatCurrency(selectedOrder.netTotal)}
                </span>
              </div>

              {selectedOrder.status === "COMPLETED" && (
                <Button
                  onClick={() => setShowVoid(true)}
                  variant="destructive"
                  className="w-full mt-2"
                >
                  ยกเลิกออเดอร์ (Void)
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-3">👆</div>
              <p>เลือกออเดอร์เพื่อดูรายละเอียด</p>
            </div>
          </div>
        )}
      </div>

      {/* Void Dialog */}
      {showVoid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-red-600 mb-4">
              ยกเลิกออเดอร์ #{selectedOrder?.orderNumber}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">เหตุผลการยกเลิก</label>
                <Input
                  placeholder="เช่น ลูกค้าเปลี่ยนใจ"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  รหัสผ่านแอดมิน (ยืนยันตัวตน)
                </label>
                <Input
                  type="password"
                  placeholder="กรอกรหัสผ่านแอดมิน"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              {voidError && (
                <p className="text-red-500 text-sm">{voidError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleVoid}
                  variant="destructive"
                  className="flex-1"
                >
                  ยืนยันยกเลิก
                </Button>
                <Button
                  onClick={() => {
                    setShowVoid(false);
                    setAdminPassword("");
                    setVoidReason("");
                    setVoidError("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  ปิด
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
