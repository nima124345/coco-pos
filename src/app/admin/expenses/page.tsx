"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

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

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scope, setScope] = useState<"current" | "all" | "all-branches" | "all-booths">("current");
  const [filterMonth, setFilterMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const availableBranches = useAuthStore((s) => s.availableBranches);
  const availableBoothEvents = useAuthStore((s) => s.availableBoothEvents);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = availableBranches.find((b) => b.id === currentBranchId);
  const currentBooth = availableBoothEvents.find((b) => b.id === currentBoothEventId);

  const loadData = useCallback(async () => {
    const qs = new URLSearchParams({ month: filterMonth });
    if (scope !== "current") qs.set("scope", scope);
    const [expRes, catRes] = await Promise.all([
      apiFetch(`/api/expenses?${qs.toString()}`),
      apiFetch("/api/expenses/categories"),
    ]);
    setExpenses(await expRes.json());
    const catData = await catRes.json();
    setCategories(catData);
    if (catData.length > 0 && !categoryId) setCategoryId(catData[0].id);
  }, [filterMonth, categoryId, scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
    if (categories.length > 0) setCategoryId(categories[0].id);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setNote(expense.note ?? "");
    setCategoryId(expense.category.id);
    setDate(expense.date.slice(0, 10));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!title || !amount || !categoryId) return;
    const payload = {
      title,
      amount: parseFloat(amount),
      categoryId,
      note,
      date,
    };
    if (editingId) {
      await apiFetch(`/api/expenses?id=${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    closeModal();
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
    await apiFetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const maxExpense = expenses.reduce((max, e) => (e.amount > max ? e.amount : max), 0);
  const expenseCount = expenses.length;
  const uniqueDays = new Set(expenses.map((e) => e.date.slice(0, 10))).size;
  const avgPerDay = uniqueDays > 0 ? totalExpenses / uniqueDays : 0;
  const topCategory = (() => {
    const byCat = new Map<string, { name: string; color: string; total: number }>();
    for (const e of expenses) {
      const cur = byCat.get(e.category.id) ?? {
        name: e.category.name,
        color: e.category.color,
        total: 0,
      };
      cur.total += e.amount;
      byCat.set(e.category.id, cur);
    }
    let top: { name: string; color: string; total: number } | null = null;
    for (const c of byCat.values()) {
      if (!top || c.total > top.total) top = c;
    }
    return top;
  })();

  const handleExportCSV = () => {
    const header = "วันที่,หมวดหมู่,รายการ,จำนวนเงิน,หมายเหตุ\n";
    const rows = expenses
      .map(
        (e) =>
          `${e.date},${e.category.name},${e.title},${e.amount},${e.note}`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${filterMonth}.csv`;
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
          <h1 className="text-2xl font-bold">บันทึกรายจ่าย</h1>
          <p className="text-slate-500">
            {scope === "current"
              ? isInBoothMode
                ? "บันทึกค่าใช้จ่ายเฉพาะบูธนี้"
                : "บันทึกค่าใช้จ่ายเฉพาะสาขานี้"
              : "ดูค่าใช้จ่ายรวม"}
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
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-44"
          />
          <Button onClick={handleExportCSV} variant="outline">
            Export CSV
          </Button>
          <Button
            onClick={openAdd}
            className="h-10 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
          >
            + เพิ่มรายจ่าย
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">รวมทั้งเดือน</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">รายการสูงสุด</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(maxExpense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">จำนวนรายการ</p>
            <p className="text-2xl font-bold text-slate-900">
              {expenseCount} <span className="text-sm font-normal text-slate-400">รายการ</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">เฉลี่ย/วันที่มีรายจ่าย</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(avgPerDay)}
            </p>
          </CardContent>
        </Card>
      </div>

      {topCategory && (
        <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 flex-wrap">
          <span className="text-slate-500">หมวดที่ใช้จ่ายสูงสุด</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: topCategory.color }}
          >
            {topCategory.name}
          </span>
          <span className="font-semibold text-slate-900">
            {formatCurrency(topCategory.total)}
          </span>
        </div>
      )}

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
                className="group grid grid-cols-[5rem_8rem_1fr_auto_4rem] lg:grid-cols-[7rem_10rem_1fr_8rem_5rem] items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs md:text-sm text-slate-500 tabular-nums">
                  {formatDate(expense.date)}
                </span>
                <span
                  className="justify-self-start px-2 py-0.5 rounded-full text-xs font-medium text-white truncate max-w-full"
                  style={{ backgroundColor: expense.category.color }}
                >
                  {expense.category.name}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {expense.title}
                  </p>
                  {expense.note && (
                    <p className="text-xs text-slate-400 truncate">
                      {expense.note}
                    </p>
                  )}
                </div>
                <span className="text-right font-bold text-red-600 tabular-nums whitespace-nowrap">
                  -{formatCurrency(expense.amount)}
                </span>
                <div className="justify-self-end flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(expense)}
                    aria-label="แก้ไขรายการ"
                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center justify-center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    aria-label="ลบรายการ"
                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingId ? "แก้ไขรายจ่าย" : "เพิ่มรายจ่าย"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {editingId ? "แก้ไขค่าใช้จ่ายรายการนี้" : "บันทึกค่าใช้จ่ายใหม่"}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
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
                  autoFocus
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">จำนวนเงิน (บาท)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 rounded-xl"
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
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button
                onClick={closeModal}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
              >
                {editingId ? "บันทึกการแก้ไข" : "บันทึกรายจ่าย"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
