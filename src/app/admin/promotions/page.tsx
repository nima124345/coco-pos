"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Promotion {
  id: string;
  name: string;
  type: string;
  value: number;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("PERCENT");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/promotions");
    setPromotions(await res.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!name || !value) return;
    await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        value: parseFloat(value),
        startDate: startDate || null,
        endDate: endDate || null,
      }),
    });
    setName("");
    setValue("");
    setStartDate("");
    setEndDate("");
    setShowModal(false);
    loadData();
  };

  const toggleActive = async (promo: Promotion) => {
    await fetch("/api/promotions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: promo.id, active: !promo.active }),
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/promotions?id=${id}`, { method: "DELETE" });
    loadData();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">จัดการโปรโมชั่น</h1>

      <div className="flex justify-end">
        <Button
          onClick={() => { setName(""); setValue(""); setType("PERCENT"); setStartDate(""); setEndDate(""); setShowModal(true); }}
          className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
        >
          + สร้างโปรโมชั่นใหม่
        </Button>
      </div>

      <div className="space-y-3">
        {promotions.map((promo) => (
          <Card key={promo.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{promo.name}</h3>
                  <Badge variant={promo.active ? "success" : "outline"}>
                    {promo.active ? "ใช้งาน" : "ปิด"}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {promo.type === "PERCENT"
                    ? `ลด ${promo.value}%`
                    : `ลด ${formatCurrency(promo.value)}`}
                </p>
                {(promo.startDate || promo.endDate) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {promo.startDate &&
                      new Date(promo.startDate).toLocaleDateString("th-TH")}{" "}
                    -{" "}
                    {promo.endDate &&
                      new Date(promo.endDate).toLocaleDateString("th-TH")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => toggleActive(promo)}
                  variant={promo.active ? "outline" : "secondary"}
                  size="sm"
                >
                  {promo.active ? "ปิด" : "เปิด"}
                </Button>
                <Button
                  onClick={() => handleDelete(promo.id)}
                  variant="destructive"
                  size="sm"
                >
                  ลบ
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {promotions.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🏷️</div>
            <p>ยังไม่มีโปรโมชั่น</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">สร้างโปรโมชั่นใหม่</h3>
                  <p className="text-sm text-slate-500 mt-0.5">กำหนดส่วนลดสำหรับลูกค้า</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อโปรโมชั่น</label>
                <Input placeholder="เช่น ลด 10% วันจันทร์" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">ประเภท</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm">
                    <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                    <option value="FIXED">จำนวนเงิน (บาท)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">มูลค่า ({type === "PERCENT" ? "%" : "บาท"})</label>
                  <Input type="number" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">วันเริ่ม (ไม่บังคับ)</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">วันสิ้นสุด (ไม่บังคับ)</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setShowModal(false)} variant="outline" className="flex-1 h-12 rounded-xl">ยกเลิก</Button>
              <Button onClick={handleAdd} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30">สร้างโปรโมชั่น</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
