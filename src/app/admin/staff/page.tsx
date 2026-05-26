"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TodayShift {
  id: string;
  openedAt: string;
  closedAt: string | null;
  status: "OPEN" | "CLOSED";
}

interface BranchRef {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Staff {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: string;
  branches: BranchRef[];
  todayShift: TodayShift | null;
  weekMinutes: number;
}

interface BranchOption {
  id: string;
  name: string;
  active: boolean;
}

interface AttendanceRecord {
  id: string;
  staff: { id: string; name: string; username: string; role: string };
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  durationMinutes: number;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

function formatHours(minutes: number) {
  if (minutes < 60) return `${minutes} น.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ชม. ${m} น.` : `${h} ชม.`;
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [editingBranchStaff, setEditingBranchStaff] = useState<Staff | null>(null);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [historyDays, setHistoryDays] = useState(7);
  const [historyStaffId, setHistoryStaffId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [staffRes, attRes, branchRes] = await Promise.all([
        fetch("/api/staff"),
        fetch(
          `/api/staff/attendance?days=${historyDays}&scope=all-branches${
            historyStaffId ? `&staffId=${historyStaffId}` : ""
          }`
        ),
        fetch("/api/branches"),
      ]);
      setStaffList(await staffRes.json());
      setAttendance(await attRes.json());
      setBranchOptions(await branchRes.json());
    } finally {
      setLoading(false);
    }
  }, [historyDays, historyStaffId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    if (!name || !username || !password) return;
    if (selectedBranchIds.length === 0) {
      setError("กรุณาเลือกอย่างน้อย 1 สาขา");
      return;
    }
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        username,
        password,
        role,
        branchIds: selectedBranchIds,
        defaultBranchId: selectedBranchIds[0],
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    setName("");
    setUsername("");
    setPassword("");
    setRole("STAFF");
    setSelectedBranchIds([]);
    setShowAddForm(false);
    loadData();
  };

  const openBranchEditor = (s: Staff) => {
    setEditingBranchStaff(s);
    setEditBranchIds(s.branches.map((b) => b.id));
  };

  const saveBranchEdit = async () => {
    if (!editingBranchStaff) return;
    await fetch("/api/staff", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingBranchStaff.id,
        branchIds: editBranchIds,
        defaultBranchId: editBranchIds[0],
      }),
    });
    setEditingBranchStaff(null);
    setEditBranchIds([]);
    loadData();
  };

  const toggleBranch = (
    bid: string,
    list: string[],
    setter: (v: string[]) => void
  ) => {
    setter(list.includes(bid) ? list.filter((x) => x !== bid) : [...list, bid]);
  };

  const toggleActive = async (staff: Staff) => {
    await fetch("/api/staff", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: staff.id, active: !staff.active }),
    });
    loadData();
  };

  const stats = useMemo(() => {
    const total = staffList.length;
    const working = staffList.filter(
      (s) => s.todayShift?.status === "OPEN"
    ).length;
    const offToday = staffList.filter((s) => !s.todayShift).length;
    return { total, working, offToday };
  }, [staffList]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">จัดการพนักงาน</h1>
          <p className="text-slate-500 mt-1">
            ดูสถานะการเข้า–ออกงานและจัดการรายชื่อพนักงาน
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md shadow-green-500/30"
        >
          {showAddForm ? "× ปิดฟอร์ม" : "+ เพิ่มพนักงาน"}
        </Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="พนักงานทั้งหมด"
          value={stats.total}
          icon="👥"
          accent="from-blue-400 to-indigo-600"
        />
        <StatCard
          label="กำลังทำงานวันนี้"
          value={stats.working}
          icon="🟢"
          accent="from-emerald-400 to-green-600"
        />
        <StatCard
          label="ยังไม่เข้างาน"
          value={stats.offToday}
          icon="⏸️"
          accent="from-slate-400 to-slate-600"
        />
      </section>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">เพิ่มพนักงานใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  ชื่อ-นามสกุล
                </label>
                <Input
                  placeholder="เช่น สมชาย ใจดี"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Username
                </label>
                <Input
                  placeholder="เช่น somchai"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  รหัสผ่าน
                </label>
                <Input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  ตำแหน่ง
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                >
                  <option value="STAFF">พนักงาน (Staff)</option>
                  <option value="ADMIN">แอดมิน (Admin)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                สาขาที่ทำงานได้ (เลือกได้หลายสาขา)
              </label>
              <div className="flex flex-wrap gap-2">
                {branchOptions.filter((b) => b.active).map((b) => {
                  const selected = selectedBranchIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        toggleBranch(b.id, selectedBranchIds, setSelectedBranchIds)
                      }
                      className={`px-3 py-2 rounded-xl text-sm font-medium border-2 cursor-pointer transition-all ${
                        selected
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {selected && "✓ "}
                      🏪 {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-3">{error}</p>
            )}
            <div className="mt-4">
              <Button
                onClick={handleAdd}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md shadow-green-500/30"
              >
                บันทึก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900">
              สถานะพนักงานวันนี้
            </CardTitle>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString("th-TH", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    พนักงาน
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ตำแหน่ง
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    สาขา
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    สถานะวันนี้
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    เข้างาน
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ออกงาน
                  </th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ชั่วโมงสัปดาห์นี้
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    บัญชี
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-slate-500">@{s.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={s.role === "ADMIN" ? "default" : "outline"}
                      >
                        {s.role === "ADMIN" ? "Admin" : "Staff"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {s.branches.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          s.branches.map((b) => (
                            <span
                              key={b.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200"
                              title={b.isDefault ? "สาขาหลัก" : ""}
                            >
                              🏪 {b.name}
                              {b.isDefault && (
                                <span className="text-[9px] opacity-60">★</span>
                              )}
                            </span>
                          ))
                        )}
                        <button
                          onClick={() => openBranchEditor(s)}
                          className="text-[11px] text-blue-500 hover:text-blue-700 cursor-pointer"
                          title="แก้ไขสาขา"
                        >
                          แก้
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <ShiftStatusBadge shift={s.todayShift} active={s.active} />
                    </td>
                    <td className="p-3 text-center">
                      {s.todayShift ? (
                        <span className="font-mono text-sm font-semibold text-emerald-600">
                          {formatTime(s.todayShift.openedAt)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {s.todayShift?.closedAt ? (
                        <span className="font-mono text-sm font-semibold text-red-500">
                          {formatTime(s.todayShift.closedAt)}
                        </span>
                      ) : s.todayShift ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          กำลังทำงาน
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-sm font-medium text-slate-700">
                        {formatHours(s.weekMinutes)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          s.active
                            ? "text-red-500 hover:bg-red-50"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {s.active ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                      </button>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-slate-400"
                    >
                      ยังไม่มีพนักงานในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-slate-900">
                ประวัติการเข้า–ออกงาน
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                บันทึกเวลาเข้างาน ออกงาน และชั่วโมงการทำงาน
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyStaffId}
                onChange={(e) => setHistoryStaffId(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="">พนักงานทั้งหมด</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setHistoryDays(d)}
                    className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                      historyDays === d
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {d} วัน
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    พนักงาน
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    เข้างาน
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ออกงาน
                  </th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    รวมเวลา
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-3 text-sm text-slate-700">
                      {formatDateShort(r.openedAt)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {r.staff.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {r.staff.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-mono text-sm font-semibold text-emerald-600">
                        {formatTime(r.openedAt)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {r.closedAt ? (
                        <span className="font-mono text-sm font-semibold text-red-500">
                          {formatTime(r.closedAt)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          กำลังทำงาน
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-sm font-medium text-slate-700">
                        {formatHours(r.durationMinutes)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={r.status === "OPEN" ? "success" : "outline"}
                      >
                        {r.status === "OPEN" ? "เปิดอยู่" : "ปิดแล้ว"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {attendance.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-slate-400"
                    >
                      ไม่มีบันทึกการเข้างานในช่วงเวลานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {editingBranchStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setEditingBranchStaff(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              แก้ไขสาขาของ {editingBranchStaff.name}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              เลือกสาขาที่พนักงานนี้สามารถทำงานได้
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {branchOptions.filter((b) => b.active).map((b) => {
                const selected = editBranchIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() =>
                      toggleBranch(b.id, editBranchIds, setEditBranchIds)
                    }
                    className={`px-3 py-2 rounded-xl text-sm font-medium border-2 cursor-pointer transition-all ${
                      selected
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {selected && "✓ "}
                    🏪 {b.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={saveBranchEdit}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
              >
                บันทึก
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingBranchStaff(null)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
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
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
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

function ShiftStatusBadge({
  shift,
  active,
}: {
  shift: TodayShift | null;
  active: boolean;
}) {
  if (!active) {
    return <Badge variant="destructive">ปิดบัญชี</Badge>;
  }
  if (!shift) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        ยังไม่เข้างาน
      </span>
    );
  }
  if (shift.status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        กำลังทำงาน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      ปิดกะแล้ว
    </span>
  );
}
