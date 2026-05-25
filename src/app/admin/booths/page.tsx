"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, cn } from "@/lib/utils";

interface BoothSummary {
  id: string;
  name: string;
  location: string;
  note: string;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  active: boolean;
  startDate: string;
  endDate: string | null;
  sales: number;
  expenses: number;
  profit: number;
  counts: { orders: number; shifts: number; expenses: number };
}

export default function AdminBoothsPage() {
  const [booths, setBooths] = useState<BoothSummary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"PLANNED" | "ACTIVE">("ACTIVE");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/booth-events/summary");
    setBooths(await res.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setName("");
    setLocation("");
    setNote("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setStatus("ACTIVE");
    setError("");
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("กรุณาระบุชื่องาน/บูธ");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        name,
        location,
        note,
        status,
        startDate,
        endDate: endDate || null,
      };
      if (editId) {
        await fetch("/api/booth-events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...body }),
        });
      } else {
        const res = await fetch("/api/booth-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "บันทึกไม่สำเร็จ");
          return;
        }
      }
      resetForm();
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (b: BoothSummary) => {
    if (!confirm(`ปิดบูธ "${b.name}" ?\n(ข้อมูลออเดอร์เดิมยังอยู่)`)) return;
    await fetch(`/api/booth-events?id=${b.id}`, { method: "DELETE" });
    loadData();
  };

  const handleReopen = async (b: BoothSummary) => {
    await fetch("/api/booth-events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: b.id,
        active: true,
        status: "ACTIVE",
        endDate: null,
      }),
    });
    loadData();
  };

  const startEdit = (b: BoothSummary) => {
    setEditId(b.id);
    setName(b.name);
    setLocation(b.location);
    setNote(b.note);
    setStartDate(b.startDate.split("T")[0]);
    setEndDate(b.endDate ? b.endDate.split("T")[0] : "");
    setStatus(b.status === "CLOSED" ? "ACTIVE" : b.status);
    setShowForm(true);
  };

  const active = booths.filter((b) => b.status !== "CLOSED");
  const closed = booths.filter((b) => b.status === "CLOSED");

  const totalSales = booths.reduce((s, b) => s + b.sales, 0);
  const totalProfit = booths.reduce((s, b) => s + b.profit, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🎪 ออกบูธ / Pop-up Events</h1>
          <p className="text-slate-500 mt-1">
            จัดการบูธชั่วคราว / งานออกร้าน ที่แยกจากสาขาประจำ
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/30"
        >
          🎪 เปิดบูธใหม่
        </Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="บูธที่เปิดอยู่"
          value={active.length.toString()}
          icon="🎪"
          accent="from-orange-400 to-amber-600"
        />
        <SummaryCard
          label="ยอดขายรวมทุกบูธ"
          value={formatCurrency(totalSales)}
          icon="💰"
          accent="from-emerald-400 to-green-600"
        />
        <SummaryCard
          label="กำไรรวมทุกบูธ"
          value={formatCurrency(totalProfit)}
          icon="📈"
          accent={
            totalProfit >= 0
              ? "from-amber-400 to-orange-600"
              : "from-rose-400 to-red-600"
          }
        />
      </section>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">
              {editId ? "แก้ไขข้อมูลบูธ" : "🎪 เปิดบูธใหม่"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  ชื่อบูธ/งาน
                </label>
                <Input
                  placeholder="เช่น บูธงาน Food Fest 21 พ.ค."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  สถานที่
                </label>
                <Input
                  placeholder="เช่น ลานหน้าห้างเซ็นทรัล"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  สถานะ
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "PLANNED" | "ACTIVE")
                  }
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"
                >
                  <option value="ACTIVE">ACTIVE — เปิดขายแล้ว</option>
                  <option value="PLANNED">PLANNED — ยังไม่เริ่ม</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  วันเริ่มงาน
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  วันสิ้นสุด (ไม่บังคับ)
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  หมายเหตุ
                </label>
                <Textarea
                  placeholder="ข้อมูลเพิ่มเติม เช่น เบอร์ผู้จัดงาน, ค่าเช่าพื้นที่"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
              >
                {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เปิดบูธ"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                ยกเลิก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span>🟢</span> บูธที่กำลังเปิด/วางแผน
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            {active.length} บูธ
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((b) => (
            <BoothCard
              key={b.id}
              booth={b}
              onClose={() => handleClose(b)}
              onEdit={() => startEdit(b)}
            />
          ))}
          {active.length === 0 && (
            <p className="text-slate-400 text-sm col-span-full text-center py-8 border border-dashed border-slate-200 rounded-2xl">
              ตอนนี้ยังไม่มีบูธเปิด — กดปุ่ม &quot;🎪 เปิดบูธใหม่&quot;
            </p>
          )}
        </div>
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span>📦</span> บูธที่ปิดแล้ว
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {closed.length} บูธ
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {closed.map((b) => (
              <BoothCard
                key={b.id}
                booth={b}
                onReopen={() => handleReopen(b)}
                onEdit={() => startEdit(b)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl`}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-xl shadow-md`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function BoothCard({
  booth,
  onClose,
  onReopen,
  onEdit,
}: {
  booth: BoothSummary;
  onClose?: () => void;
  onReopen?: () => void;
  onEdit: () => void;
}) {
  const isClosed = booth.status === "CLOSED";
  return (
    <Card className={cn("p-5 relative overflow-hidden", isClosed && "opacity-75")}>
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-orange-400 to-amber-600" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-2xl shadow-md shadow-orange-500/30 shrink-0">
              🎪
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{booth.name}</h3>
              <p className="text-xs text-slate-500 truncate">
                {booth.location || "—"}
              </p>
            </div>
          </div>
          <Badge
            variant={
              booth.status === "ACTIVE"
                ? "success"
                : booth.status === "PLANNED"
                  ? "default"
                  : "outline"
            }
          >
            {booth.status === "ACTIVE"
              ? "กำลังเปิด"
              : booth.status === "PLANNED"
                ? "วางแผน"
                : "ปิดแล้ว"}
          </Badge>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          📅{" "}
          {new Date(booth.startDate).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {booth.endDate &&
            ` – ${new Date(booth.endDate).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
            })}`}
        </p>

        {booth.note && (
          <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg mb-3 line-clamp-2">
            📝 {booth.note}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat
            label="ยอดขาย"
            value={formatCurrency(booth.sales)}
            color="text-emerald-600"
          />
          <Stat
            label="รายจ่าย"
            value={formatCurrency(booth.expenses)}
            color="text-red-500"
          />
          <Stat
            label="กำไร"
            value={formatCurrency(booth.profit)}
            color={booth.profit >= 0 ? "text-amber-600" : "text-red-600"}
          />
        </div>

        <div className="grid grid-cols-3 gap-1 mb-3 text-center text-[10px] text-slate-500">
          <div>{booth.counts.orders} ออเดอร์</div>
          <div>{booth.counts.shifts} กะ</div>
          <div>{booth.counts.expenses} รายจ่าย</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 text-xs font-medium text-blue-600 hover:bg-blue-50 py-2 rounded-lg cursor-pointer transition-colors border border-blue-200"
          >
            แก้ไข
          </button>
          {!isClosed && onClose && (
            <button
              onClick={onClose}
              className="flex-1 text-xs font-medium text-red-600 hover:bg-red-50 py-2 rounded-lg cursor-pointer transition-colors border border-red-200"
            >
              ปิดบูธ
            </button>
          )}
          {isClosed && onReopen && (
            <button
              onClick={onReopen}
              className="flex-1 text-xs font-medium text-green-600 hover:bg-green-50 py-2 rounded-lg cursor-pointer transition-colors border border-green-200"
            >
              เปิดอีกครั้ง
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
