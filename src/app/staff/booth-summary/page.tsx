"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface ExpenseEntry {
  categoryId: string;
  categoryName: string;
  amount: number;
  color: string;
}

interface BoothHistoryItem {
  id: string;
  name: string;
  location: string;
  cashIncome: number;
  transferIncome: number;
  startDate: string;
  totalExpenses: number;
}

export default function BoothSummaryPage() {
  const boothEventId = useAuthStore((s) => s.currentBoothEventId);
  const setBoothContext = useAuthStore((s) => s.setBoothContext);

  const [boothName, setBoothName] = useState("");
  const [boothLocation, setBoothLocation] = useState("");
  const [cashIncome, setCashIncome] = useState("");
  const [transferIncome, setTransferIncome] = useState("");
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<BoothHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    if (!boothEventId) return;
    setLoading(true);
    const res = await fetch(`/api/booth-events/financials?boothId=${boothEventId}`);
    const data = await res.json();

    setBoothName(data.booth.name || "");
    setBoothLocation(data.booth.location || "");
    setCashIncome(data.booth.cashIncome > 0 ? String(data.booth.cashIncome) : "");
    setTransferIncome(data.booth.transferIncome > 0 ? String(data.booth.transferIncome) : "");

    const expEntries: ExpenseEntry[] = data.categories.map((cat: Category) => {
      const existing = data.expenses.find(
        (e: { category: { id: string }; amount: number }) => e.category.id === cat.id
      );
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        amount: existing?.amount || 0,
        color: cat.color,
      };
    });
    setExpenses(expEntries);
    setLoading(false);
  }, [boothEventId]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/booth-events?includeInactive=1");
    const data = await res.json();
    const items: BoothHistoryItem[] = data
      .filter((b: { id: string }) => b.id !== boothEventId)
      .map((b: {
        id: string;
        name: string;
        location: string;
        cashIncome: number;
        transferIncome: number;
        startDate: string;
        _count: { expenses: number };
      }) => ({
        id: b.id,
        name: b.name || "ไม่ระบุชื่อ",
        location: b.location,
        cashIncome: b.cashIncome || 0,
        transferIncome: b.transferIncome || 0,
        startDate: b.startDate,
        totalExpenses: 0,
      }));
    setHistory(items);
  }, [boothEventId]);

  useEffect(() => {
    loadData();
    loadHistory();
  }, [loadData, loadHistory]);

  const handleSave = async () => {
    if (!boothEventId) return;
    setSaving(true);
    await fetch("/api/booth-events/financials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boothId: boothEventId,
        name: boothName,
        location: boothLocation,
        cashIncome: parseFloat(cashIncome) || 0,
        transferIncome: parseFloat(transferIncome) || 0,
        expenses: expenses.map((e) => ({
          categoryId: e.categoryId,
          categoryName: e.categoryName,
          amount: e.amount,
        })),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNewBooth = async () => {
    const res = await fetch("/api/booth-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", status: "ACTIVE" }),
    });
    const booth = await res.json();
    setBoothContext(booth.id);
  };

  const handleLoadBooth = (id: string) => {
    setBoothContext(id);
    setShowHistory(false);
  };

  const updateExpense = (categoryId: string, value: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.categoryId === categoryId ? { ...e, amount: parseFloat(value) || 0 } : e
      )
    );
  };

  const totalIncome = (parseFloat(cashIncome) || 0) + (parseFloat(transferIncome) || 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalIncome - totalExpenses;

  if (!boothEventId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Card className="p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">🎪</div>
          <p className="text-lg font-bold text-slate-900">ไม่ได้อยู่ในโหมดบูธ</p>
          <p className="text-sm text-slate-500 mt-1">กรุณาเลือกออกบูธจากหน้าหลักก่อน</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-400 animate-pulse">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-2xl shadow-md shadow-orange-500/30">
            🎪
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">สรุปออกบูธ</h1>
            <p className="text-sm text-slate-500">กรอกข้อมูลรายรับ-รายจ่าย</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            📋 ประวัติ
          </button>
          <button
            onClick={handleNewBooth}
            className="px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
          >
            + ใหม่
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-bold text-slate-700 text-sm mb-2">📋 ประวัติออกบูธ</h3>
            {history.map((b) => (
              <button
                key={b.id}
                onClick={() => handleLoadBooth(b.id)}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-left transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-lg shrink-0">
                  🎪
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{b.name || "ไม่ระบุชื่อ"}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(b.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                    {b.location && ` · 📍 ${b.location}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-600">{formatCurrency(b.cashIncome + b.transferIncome)}</p>
                  <p className="text-[10px] text-slate-400">รายรับ</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Booth Info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📝</span>
            <h2 className="font-bold text-slate-900">ข้อมูลบูธ</h2>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">ชื่องาน / สถานที่</label>
              <Input
                placeholder="เช่น ตลาดนัดจตุจักร, งานมอ..."
                value={boothName}
                onChange={(e) => setBoothName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">📍 ที่อยู่/รายละเอียด</label>
              <Input
                placeholder="เช่น โซน A ล็อค 12"
                value={boothLocation}
                onChange={(e) => setBoothLocation(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit/Loss Summary Card */}
      <Card className={`border-2 ${profit >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500 mb-1">รายรับ</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">รายจ่าย</p>
              <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">{profit >= 0 ? "กำไร" : "ขาดทุน"}</p>
              <p className={`text-lg font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💰</span>
            <h2 className="font-bold text-slate-900">รายรับ</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">💵 เงินสด</label>
              <Input
                type="number"
                placeholder="0"
                value={cashIncome}
                onChange={(e) => setCashIncome(e.target.value)}
                className="h-11 rounded-xl text-right font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">📲 โอน</label>
              <Input
                type="number"
                placeholder="0"
                value={transferIncome}
                onChange={(e) => setTransferIncome(e.target.value)}
                className="h-11 rounded-xl text-right font-semibold"
              />
            </div>
          </div>
          <div className="text-right text-sm text-slate-500 pt-1">
            รวมรายรับ: <span className="font-bold text-green-600">{formatCurrency(totalIncome)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💸</span>
            <h2 className="font-bold text-slate-900">รายจ่าย</h2>
          </div>
          <div className="space-y-2.5">
            {expenses.map((exp) => (
              <div key={exp.categoryId} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: exp.color }}
                />
                <label className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">
                  {exp.categoryName}
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={exp.amount > 0 ? String(exp.amount) : ""}
                  onChange={(e) => updateExpense(exp.categoryId, e.target.value)}
                  className="h-10 rounded-xl text-right font-semibold w-32"
                />
              </div>
            ))}
          </div>
          <div className="text-right text-sm text-slate-500 pt-2 border-t">
            รวมรายจ่าย: <span className="font-bold text-red-500">{formatCurrency(totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30 disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก..." : saved ? "✓ บันทึกแล้ว!" : "💾 บันทึกข้อมูล"}
      </Button>
    </div>
  );
}
