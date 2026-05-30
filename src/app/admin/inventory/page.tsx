"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  active: boolean;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [quantity, setQuantity] = useState("");
  const [minStock, setMinStock] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [showModal, setShowModal] = useState(false);

  const availableBranches = useAuthStore((s) => s.availableBranches);
  const availableBoothEvents = useAuthStore((s) => s.availableBoothEvents);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);
  const currentBooth = availableBoothEvents.find((b) => b.id === currentBoothEventId);

  const loadData = useCallback(async () => {
    const res = await apiFetch("/api/inventory");
    setItems(await res.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!name) return;
    await apiFetch("/api/inventory", {
      method: "POST",
      body: JSON.stringify({
        name,
        unit,
        quantity: parseFloat(quantity) || 0,
        minStock: parseFloat(minStock) || 0,
        costPrice: parseFloat(costPrice) || 0,
      }),
    });
    setName("");
    setUnit("ชิ้น");
    setQuantity("");
    setMinStock("");
    setCostPrice("");
    setShowModal(false);
    loadData();
  };

  const handleUpdateQty = async (item: InventoryItem, newQty: number) => {
    await apiFetch("/api/inventory", {
      method: "PUT",
      body: JSON.stringify({ id: item.id, quantity: newQty }),
    });
    loadData();
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`ลบ "${item.name}" ออกจากสต็อก?`)) return;
    await apiFetch(`/api/inventory?id=${item.id}`, { method: "DELETE" });
    loadData();
  };

  const totalItems = items.length;
  const lowStock = items.filter((i) => i.quantity <= i.minStock).length;
  const warningStock = items.filter(
    (i) => i.quantity > i.minStock && i.quantity <= i.minStock * 2
  ).length;
  const totalStockValue = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 inline-block mb-2">
            {isInBoothMode
              ? `🎪 ${currentBooth?.name ?? "บูธ"}`
              : `🏪 ${currentBranch?.name ?? ""}`}
          </span>
          <h1 className="text-2xl font-bold">จัดการสต็อกวัตถุดิบ</h1>
          <p className="text-slate-500 text-sm">
            {isInBoothMode
              ? "สต็อกของบูธนี้เท่านั้น (ลงทุนแยกจากสาขา)"
              : "สต็อกของสาขานี้เท่านั้น"}
          </p>
        </div>
        <Button
          onClick={() => { setName(""); setUnit("ชิ้น"); setQuantity(""); setMinStock(""); setCostPrice(""); setShowModal(true); }}
          className="h-10 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
        >
          + เพิ่มวัตถุดิบ
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">วัตถุดิบทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900">
              {totalItems} <span className="text-sm font-normal text-slate-400">รายการ</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">⚠️ ใกล้หมด/หมด</p>
            <p className="text-2xl font-bold text-red-600">
              {lowStock} <span className="text-sm font-normal text-slate-400">รายการ</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">เหลือน้อย</p>
            <p className="text-2xl font-bold text-amber-600">
              {warningStock} <span className="text-sm font-normal text-slate-400">รายการ</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">มูลค่าสต็อกรวม</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalStockValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            ยังไม่มีวัตถุดิบ
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const status =
                item.quantity <= item.minStock
                  ? { label: "ใกล้หมด!", variant: "destructive" as const }
                  : item.quantity <= item.minStock * 2
                  ? { label: "เหลือน้อย", variant: "warning" as const }
                  : { label: "ปกติ", variant: "success" as const };
              return (
                <li
                  key={item.id}
                  className="group grid grid-cols-[1fr_auto] md:grid-cols-[1.5fr_6rem_6rem_7rem_5rem_auto] items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="md:hidden text-xs text-slate-500 mt-0.5">
                      คงเหลือ <span className="font-semibold text-slate-700">{item.quantity} {item.unit}</span> · ขั้นต่ำ {item.minStock}
                    </p>
                  </div>
                  <span className="hidden md:block text-center font-bold tabular-nums">
                    {item.quantity} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                  </span>
                  <span className="hidden md:block text-center text-sm text-slate-500 tabular-nums">
                    {item.minStock} <span className="text-xs text-slate-400">{item.unit}</span>
                  </span>
                  <span className="hidden md:block text-right text-sm tabular-nums">
                    {formatCurrency(item.costPrice)}<span className="text-xs text-slate-400">/{item.unit}</span>
                  </span>
                  <div className="hidden md:flex justify-center">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleUpdateQty(item, Math.max(0, item.quantity - 1))}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer flex items-center justify-center"
                      aria-label="ลดจำนวน"
                    >
                      −
                    </button>
                    <button
                      onClick={() => handleUpdateQty(item, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer flex items-center justify-center"
                      aria-label="เพิ่มจำนวน"
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        const qty = prompt("ใส่จำนวนใหม่:");
                        if (qty) handleUpdateQty(item, parseFloat(qty));
                      }}
                      className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer flex items-center justify-center text-xs"
                      aria-label="กำหนดจำนวน"
                    >
                      #
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      aria-label="ลบวัตถุดิบ"
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">เพิ่มวัตถุดิบ</h3>
                  <p className="text-sm text-slate-500 mt-0.5">เพิ่มรายการวัตถุดิบใหม่เข้าสต็อก</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-slate-700">ชื่อวัตถุดิบ</label>
                  <Input placeholder="เช่น นมกล่อง" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">หน่วย</label>
                  <Input placeholder="เช่น กล่อง, กก., ถุง" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">จำนวนเริ่มต้น</label>
                  <Input type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">สต็อกขั้นต่ำ</label>
                  <Input type="number" placeholder="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">ราคาต้นทุน/หน่วย</label>
                  <Input type="number" placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setShowModal(false)} variant="outline" className="flex-1 h-12 rounded-xl">ยกเลิก</Button>
              <Button onClick={handleAdd} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30">เพิ่มวัตถุดิบ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
