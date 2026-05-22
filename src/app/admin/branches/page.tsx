"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  address: string;
  note: string;
  active: boolean;
  openedAt: string;
  closedAt: string | null;
  _count: { orders: number; shifts: number; users: number };
}

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/branches?includeInactive=1");
    setBranches(await res.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setName("");
    setAddress("");
    setNote("");
    setError("");
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("กรุณาระบุชื่อสาขา");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await fetch("/api/branches", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, name, address, note }),
        });
      } else {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, address, note }),
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

  const handleClose = async (b: Branch) => {
    if (!confirm(`ปิดสาขา "${b.name}" ?\n(ข้อมูลออเดอร์เดิมยังอยู่)`)) return;
    await fetch(`/api/branches?id=${b.id}`, { method: "DELETE" });
    loadData();
  };

  const handleReopen = async (b: Branch) => {
    await fetch("/api/branches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, active: true, closedAt: null }),
    });
    loadData();
  };

  const startEdit = (b: Branch) => {
    setEditId(b.id);
    setName(b.name);
    setAddress(b.address);
    setNote(b.note);
    setShowForm(true);
  };

  const activeBranches = branches.filter((b) => b.active);
  const closedBranches = branches.filter((b) => !b.active);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏪 สาขาประจำ</h1>
          <p className="text-slate-500 mt-1">
            จัดการสาขาที่เปิดประจำ (สำหรับบูธชั่วคราว ใช้หน้า{" "}
            <span className="text-orange-600 font-medium">ออกบูธ</span>)
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md shadow-green-500/30"
        >
          🏪 เพิ่มสาขาใหม่
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">
              {editId ? "แก้ไขข้อมูลสาขา" : "เพิ่มสาขาประจำใหม่"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  ชื่อสาขา
                </label>
                <Input
                  placeholder="เช่น สาขาตลาดน้ำ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  ที่อยู่
                </label>
                <Input
                  placeholder="ที่อยู่ / สถานที่ตั้ง"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  หมายเหตุ
                </label>
                <Input
                  placeholder="ข้อมูลเพิ่มเติม (ไม่บังคับ)"
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
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "เพิ่มสาขา"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                ยกเลิก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeBranches.map((b) => (
          <BranchCard
            key={b.id}
            branch={b}
            onClose={() => handleClose(b)}
            onEdit={() => startEdit(b)}
          />
        ))}
        {activeBranches.length === 0 && (
          <p className="text-slate-400 text-sm col-span-full text-center py-8 border border-dashed border-slate-200 rounded-2xl">
            ยังไม่มีสาขา
          </p>
        )}
      </div>

      {closedBranches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            🔒 สาขาที่ปิดแล้ว
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {closedBranches.map((b) => (
              <BranchCard
                key={b.id}
                branch={b}
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

function BranchCard({
  branch,
  onClose,
  onReopen,
  onEdit,
}: {
  branch: Branch;
  onClose?: () => void;
  onReopen?: () => void;
  onEdit: () => void;
}) {
  return (
    <Card className={cn("p-5 relative overflow-hidden", !branch.active && "opacity-60")}>
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-10 blur-2xl bg-gradient-to-br from-green-400 to-emerald-600" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl shadow-md shadow-green-500/30">
              🏪
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{branch.name}</h3>
              <p className="text-xs text-slate-500">{branch.address || "—"}</p>
            </div>
          </div>
          <Badge variant={branch.active ? "success" : "destructive"}>
            {branch.active ? "เปิดอยู่" : "ปิดแล้ว"}
          </Badge>
        </div>

        {branch.note && (
          <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg mb-3">
            📝 {branch.note}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label="ออเดอร์" value={branch._count.orders} />
          <Stat label="กะ" value={branch._count.shifts} />
          <Stat label="พนักงาน" value={branch._count.users} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 text-xs font-medium text-blue-600 hover:bg-blue-50 py-2 rounded-lg cursor-pointer transition-colors border border-blue-200"
          >
            แก้ไข
          </button>
          {branch.active && onClose && (
            <button
              onClick={onClose}
              className="flex-1 text-xs font-medium text-red-600 hover:bg-red-50 py-2 rounded-lg cursor-pointer transition-colors border border-red-200"
            >
              ปิดสาขา
            </button>
          )}
          {!branch.active && onReopen && (
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
