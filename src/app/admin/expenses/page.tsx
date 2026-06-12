"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useMenuAccess } from "@/hooks/usePermission";
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
  paidByOwner: boolean;
  recurring: boolean;
  slipUrl: string;
  category: ExpenseCategory;
}

interface BatchRow {
  categoryId: string;
  title: string;
  amount: string;
  paidByOwner: boolean;
}

export default function AdminExpensesPage() {
  const { canEdit } = useMenuAccess();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidByOwner, setPaidByOwner] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [slipUrl, setSlipUrl] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [creatingRecurring, setCreatingRecurring] = useState(false);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
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
    setPaidByOwner(false);
    setRecurring(false);
    setSlipUrl("");
    setSlipFile(null);
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
    setPaidByOwner(!!expense.paidByOwner);
    setRecurring(!!expense.recurring);
    setSlipUrl(expense.slipUrl ?? "");
    setSlipFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const uploadSlip = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url || "";
      }
    } catch {
      // upload not supported in this environment
    }
    return "";
  };

  const handleSave = async () => {
    if (!title || !amount || !categoryId) return;
    let finalSlipUrl = slipUrl;
    if (slipFile) {
      setSlipUploading(true);
      finalSlipUrl = (await uploadSlip(slipFile)) || slipUrl;
      setSlipUploading(false);
    }
    const payload = {
      title,
      amount: parseFloat(amount),
      categoryId,
      note,
      date,
      paidByOwner,
      recurring,
      slipUrl: finalSlipUrl,
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

  // ---- Batch add (multiple rows at once) ----
  const openBatch = () => {
    setBatchRows([
      {
        categoryId: categories[0]?.id ?? "",
        title: "",
        amount: "",
        paidByOwner: false,
      },
    ]);
    setShowBatchModal(true);
  };

  const addBatchRow = () =>
    setBatchRows((rows) => [
      ...rows,
      {
        categoryId: categories[0]?.id ?? "",
        title: "",
        amount: "",
        paidByOwner: false,
      },
    ]);

  const updateBatchRow = (i: number, patch: Partial<BatchRow>) =>
    setBatchRows((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );

  const removeBatchRow = (i: number) =>
    setBatchRows((rows) => rows.filter((_, idx) => idx !== i));

  const handleSaveBatch = async () => {
    const items = batchRows
      .filter((r) => r.title && r.amount && r.categoryId)
      .map((r) => ({
        title: r.title,
        amount: parseFloat(r.amount),
        categoryId: r.categoryId,
        paidByOwner: r.paidByOwner,
        date,
      }));
    if (items.length === 0) return;
    setSavingBatch(true);
    await apiFetch("/api/expenses/batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    setSavingBatch(false);
    setShowBatchModal(false);
    setBatchRows([]);
    loadData();
  };

  // ---- Recurring: clone last month's recurring items into this month ----
  const handleCreateRecurring = async () => {
    setCreatingRecurring(true);
    const res = await apiFetch(
      `/api/expenses/recurring?month=${filterMonth}`,
      { method: "POST" }
    );
    const data = await res.json().catch(() => ({ created: 0 }));
    setCreatingRecurring(false);
    if (data.created > 0) {
      loadData();
    } else if (data.reason === "no-templates") {
      alert(
        'ยังไม่มีรายการประจำให้คัดลอก — ติ๊ก "รายการประจำทุกเดือน" ในรายการที่ต้องการก่อน'
      );
    } else {
      alert("รายการประจำของเดือนนี้ถูกสร้างไว้แล้ว");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
    await apiFetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const ownerPaidTotal = expenses
    .filter((e) => e.paidByOwner)
    .reduce((sum, e) => sum + e.amount, 0);
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
          {canEdit && (
            <>
              <Button
                onClick={handleCreateRecurring}
                variant="outline"
                disabled={creatingRecurring}
              >
                {creatingRecurring ? "กำลังสร้าง..." : "↻ รายการประจำเดือนนี้"}
              </Button>
              <Button onClick={openBatch} variant="outline">
                + หลายรายการ
              </Button>
              <Button
                onClick={openAdd}
                className="h-10 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
              >
                + เพิ่มรายจ่าย
              </Button>
            </>
          )}
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
            <p className="text-xs text-slate-500 mb-1">เจ้าของโอนเอง</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(ownerPaidTotal)}
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {expense.title}
                    </p>
                    {expense.paidByOwner && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        โอนเอง
                      </span>
                    )}
                    {expense.recurring && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                        ประจำ
                      </span>
                    )}
                    {expense.slipUrl && (
                      <button
                        type="button"
                        onClick={() => setSlipPreview(expense.slipUrl)}
                        aria-label="ดูสลิป"
                        className="shrink-0 text-slate-400 hover:text-blue-600 cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {expense.note && (
                    <p className="text-xs text-slate-400 truncate">
                      {expense.note}
                    </p>
                  )}
                </div>
                <span className="text-right font-bold text-red-600 tabular-nums whitespace-nowrap">
                  -{formatCurrency(expense.amount)}
                </span>
                <div className="justify-self-end flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
                  {canEdit && (
                  <>
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
                  </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50 shrink-0">
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

            <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
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

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaidByOwner((v) => !v)}
                  className={`flex items-center gap-2 h-11 px-3 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${
                    paidByOwner
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      paidByOwner ? "bg-amber-500 border-amber-500" : "border-slate-300"
                    }`}
                  >
                    {paidByOwner && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                  </span>
                  เจ้าของโอนเอง
                </button>
                <button
                  type="button"
                  onClick={() => setRecurring((v) => !v)}
                  className={`flex items-center gap-2 h-11 px-3 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${
                    recurring
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      recurring ? "bg-violet-500 border-violet-500" : "border-slate-300"
                    }`}
                  >
                    {recurring && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                  </span>
                  รายการประจำ
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">สลิป/รูปโอน (ถ้ามี)</label>
                <div className="flex items-center gap-3">
                  {(slipFile || slipUrl) && (
                    <img
                      src={slipFile ? URL.createObjectURL(slipFile) : slipUrl}
                      alt="สลิป"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                    />
                  )}
                  <label className="flex-1 h-11 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 flex items-center justify-center cursor-pointer hover:bg-slate-100">
                    {slipUploading
                      ? "กำลังอัปโหลด..."
                      : slipFile || slipUrl
                        ? "เปลี่ยนรูป"
                        : "เลือกรูปสลิป"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {(slipFile || slipUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSlipFile(null);
                        setSlipUrl("");
                      }}
                      className="text-xs text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex gap-3 shrink-0 border-t border-slate-100">
              <Button
                onClick={closeModal}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSave}
                disabled={slipUploading}
                className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
              >
                {slipUploading
                  ? "กำลังอัปโหลด..."
                  : editingId
                    ? "บันทึกการแก้ไข"
                    : "บันทึกรายจ่าย"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {canEdit && showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowBatchModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">เพิ่มหลายรายการ</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    บันทึกรายจ่ายหลายรายการพร้อมกัน (วันที่ {date})
                  </p>
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              {batchRows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[8rem_1fr_6rem_auto_2rem] items-center gap-2 min-w-[26rem]"
                >
                  <select
                    value={row.categoryId}
                    onChange={(e) => updateBatchRow(i, { categoryId: e.target.value })}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="รายการ"
                    value={row.title}
                    onChange={(e) => updateBatchRow(i, { title: e.target.value })}
                    className="h-10 rounded-lg"
                  />
                  <Input
                    type="number"
                    placeholder="บาท"
                    value={row.amount}
                    onChange={(e) => updateBatchRow(i, { amount: e.target.value })}
                    className="h-10 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateBatchRow(i, { paidByOwner: !row.paidByOwner })}
                    title="เจ้าของโอนเอง"
                    className={`h-10 px-2 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap ${
                      row.paidByOwner
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    โอนเอง
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBatchRow(i)}
                    aria-label="ลบแถว"
                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBatchRow}
                className="text-sm font-medium text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                + เพิ่มแถว
              </button>
            </div>

            <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex items-center justify-between gap-3 border-t border-slate-100 shrink-0">
              <span className="text-sm text-slate-500">
                รวม{" "}
                {formatCurrency(
                  batchRows.reduce(
                    (s, r) => s + (parseFloat(r.amount) || 0),
                    0
                  )
                )}
              </span>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBatchModal(false)}
                  variant="outline"
                  className="h-12 rounded-xl"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleSaveBatch}
                  disabled={savingBatch}
                  className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
                >
                  {savingBatch ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {slipPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setSlipPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slipPreview}
            alt="สลิป"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
