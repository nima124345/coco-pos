"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const handleAdd = async () => {
    if (!title || !amount || !categoryId) return;
    await apiFetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        title,
        amount: parseFloat(amount),
        categoryId,
        note,
        date,
      }),
    });
    setTitle("");
    setAmount("");
    setNote("");
    loadData();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <Card>
          <CardHeader>
            <CardTitle>เพิ่มรายจ่าย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">หมวดหมู่</label>
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
            <div>
              <label className="text-sm font-medium">รายการ</label>
              <Input
                placeholder="เช่น ซื้อนมกล่อง"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">จำนวนเงิน (บาท)</label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">วันที่</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">หมายเหตุ</label>
              <Textarea
                placeholder="หมายเหตุ (ถ้ามี)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAdd}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              บันทึกรายจ่าย
            </Button>
          </CardContent>
        </Card>

        {/* Expense List */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-slate-500">รายจ่ายทั้งหมดเดือนนี้</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-sm font-medium text-slate-500">
                    วันที่
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-slate-500">
                    หมวดหมู่
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-slate-500">
                    รายการ
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-slate-500">
                    จำนวนเงิน
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-slate-500">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm">
                      {formatDate(expense.date)}
                    </td>
                    <td className="p-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{
                          backgroundColor: expense.category.color,
                        }}
                      >
                        {expense.category.name}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {expense.title}
                      {expense.note && (
                        <p className="text-xs text-slate-400">
                          {expense.note}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-400"
                    >
                      ยังไม่มีรายจ่ายในเดือนนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
