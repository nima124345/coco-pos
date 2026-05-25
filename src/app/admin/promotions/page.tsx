"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>สร้างโปรโมชั่นใหม่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">ชื่อโปรโมชั่น</label>
              <Input
                placeholder="เช่น ลด 10% วันจันทร์"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">ประเภท</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"
              >
                <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                <option value="FIXED">จำนวนเงิน (บาท)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                มูลค่า ({type === "PERCENT" ? "%" : "บาท"})
              </label>
              <Input
                type="number"
                placeholder="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">วันเริ่ม (ไม่บังคับ)</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">วันสิ้นสุด (ไม่บังคับ)</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAdd}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              สร้างโปรโมชั่น
            </Button>
          </CardContent>
        </Card>

        <div className="col-span-2 space-y-3">
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
      </div>
    </div>
  );
}
