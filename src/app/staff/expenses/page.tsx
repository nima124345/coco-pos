"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  note: string;
  date: string;
  category: ExpenseCategory;
}

export default function StaffExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const availableBranches = useAuthStore((s) => s.availableBranches);
  const availableBoothEvents = useAuthStore((s) => s.availableBoothEvents);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);
  const currentBooth = availableBoothEvents.find((b) => b.id === currentBoothEventId);

  const filterMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    const [expRes, catRes] = await Promise.all([
      apiFetch(`/api/expenses?month=${filterMonth}`),
      apiFetch("/api/expenses/categories"),
    ]);
    setExpenses(await expRes.json());
    const catData = await catRes.json();
    setCategories(catData);
    setCategoryId((prev) => prev || (catData.length > 0 ? catData[0].id : ""));
  }, [filterMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!title || !amount || !categoryId || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          categoryId,
          note,
          date,
        }),
      });
      if (res.ok) {
        setTitle("");
        setAmount("");
        setNote("");
        setDate(new Date().toISOString().split("T")[0]);
        loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            {isInBoothMode
              ? `🎪 ${currentBooth?.name ?? ""}`
              : `🏪 ${currentBranch?.name ?? ""}`}
          </span>
        </div>
        <h2 className="text-2xl font-bold">บันทึกรายจ่าย</h2>
        <p className="text-slate-500 text-sm">
          {isInBoothMode
            ? "บันทึกค่าใช้จ่ายของบูธนี้"
            : "บันทึกค่าใช้จ่ายของสาขานี้"}
        </p>
      </div>

      {/* Add expense form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">หมวดหมู่</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">รายการ</label>
            <Input
              placeholder="เช่น ซื้อนมกล่อง"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                จำนวนเงิน (บาท)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 rounded-xl text-lg font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">วันที่</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">หมายเหตุ</label>
            <Textarea
              placeholder="หมายเหตุ (ถ้ามี)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!title || !amount || !categoryId || saving}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกรายจ่าย"}
          </Button>
        </CardContent>
      </Card>

      {/* This month total */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3">
        <span className="text-sm text-slate-500">รวมรายจ่ายเดือนนี้</span>
        <span className="text-xl font-bold text-red-600">
          {formatCurrency(totalExpenses)}
        </span>
      </div>

      {/* List */}
      <div>
        <h3 className="text-lg font-bold mb-3">รายจ่ายเดือนนี้</h3>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              ยังไม่มีรายจ่ายในเดือนนี้
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span
                    className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-white truncate max-w-[6rem]"
                    style={{ backgroundColor: expense.category.color }}
                  >
                    {expense.category.name}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {expense.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(expense.date)}
                      {expense.note ? ` · ${expense.note}` : ""}
                    </p>
                  </div>
                  <span className="text-right font-bold text-red-600 tabular-nums whitespace-nowrap">
                    -{formatCurrency(expense.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    aria-label="ลบรายการ"
                    className="shrink-0 w-8 h-8 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
