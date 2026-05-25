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
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 inline-block mb-2">
          {isInBoothMode
            ? "🎪 บูธไม่มีสต็อก (ใช้ของจากสาขาหลัก)"
            : `🏪 ${currentBranch?.name ?? ""}`}
        </span>
        <h1 className="text-2xl font-bold">จัดการสต็อกวัตถุดิบ</h1>
        <p className="text-slate-500 text-sm">
          {isInBoothMode
            ? "ระบบสต็อกใช้ได้ในสาขาประจำเท่านั้น สลับโหมดเพื่อจัดการสต็อก"
            : "สต็อกของสาขานี้เท่านั้น"}
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => { setName(""); setUnit("ชิ้น"); setQuantity(""); setMinStock(""); setCostPrice(""); setShowModal(true); }}
          className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
        >
          + เพิ่มวัตถุดิบ
        </Button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-3 text-sm font-medium text-slate-500">วัตถุดิบ</th>
              <th className="text-center p-3 text-sm font-medium text-slate-500">คงเหลือ</th>
              <th className="text-center p-3 text-sm font-medium text-slate-500">สต็อกขั้นต่ำ</th>
              <th className="text-right p-3 text-sm font-medium text-slate-500">ราคาต้นทุน</th>
              <th className="text-center p-3 text-sm font-medium text-slate-500">สถานะ</th>
              <th className="text-center p-3 text-sm font-medium text-slate-500">ปรับจำนวน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-slate-50">
                <td className="p-3">
                  <p className="font-medium">{item.name}</p>
                </td>
                <td className="p-3 text-center font-bold">
                  {item.quantity} {item.unit}
                </td>
                <td className="p-3 text-center text-sm text-slate-500">
                  {item.minStock} {item.unit}
                </td>
                <td className="p-3 text-right text-sm">
                  {formatCurrency(item.costPrice)}/{item.unit}
                </td>
                <td className="p-3 text-center">
                  <Badge
                    variant={
                      item.quantity <= item.minStock
                        ? "destructive"
                        : item.quantity <= item.minStock * 2
                        ? "warning"
                        : "success"
                    }
                  >
                    {item.quantity <= item.minStock
                      ? "ใกล้หมด!"
                      : item.quantity <= item.minStock * 2
                      ? "เหลือน้อย"
                      : "ปกติ"}
                  </Badge>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleUpdateQty(item, Math.max(0, item.quantity - 1))}
                      className="w-7 h-7 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleUpdateQty(item, item.quantity + 1)}
                      className="w-7 h-7 rounded bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        const qty = prompt("ใส่จำนวนใหม่:");
                        if (qty) handleUpdateQty(item, parseFloat(qty));
                      }}
                      className="w-7 h-7 rounded bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 text-xs cursor-pointer"
                    >
                      #
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  ยังไม่มีวัตถุดิบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
