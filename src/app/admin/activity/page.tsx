"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_LABELS } from "@/lib/activity";

interface Log {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  createdAt: string;
}

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "ทั้งหมด" },
  { value: "ORDER_VOID", label: "ยกเลิกออเดอร์" },
  { value: "ORDER_DELETE", label: "ลบออเดอร์" },
  { value: "MENU_UPDATE", label: "แก้ไขเมนู" },
  { value: "STAFF_UPDATE", label: "แก้ไขพนักงาน" },
  { value: "CASH_OUT", label: "เงินออกลิ้นชัก" },
  { value: "SETTINGS_UPDATE", label: "แก้ไขการตั้งค่า" },
];

// Actions that represent removals / money movement get a warmer color.
const WARN = new Set([
  "ORDER_VOID",
  "ORDER_DELETE",
  "MENU_DELETE",
  "STAFF_DELETE",
  "PROMOTION_DELETE",
  "EXPENSE_DELETE",
  "CASH_OUT",
]);

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter ? `?action=${filter}` : "";
      const res = await apiFetch(`/api/activity${q}`);
      if (res.ok) setLogs(await res.json());
      else setLogs([]);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">บันทึกกิจกรรม</h2>
        <p className="text-sm text-slate-500">
          ประวัติการกระทำที่สำคัญ (ยกเลิก/ลบ/แก้ราคา/เงินลิ้นชัก/ตั้งค่า)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-green-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">ยังไม่มีบันทึก</Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        WARN.has(log.action)
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ACTIVITY_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {log.userName || log.userId || "-"}
                    </span>
                  </div>
                  {log.detail && (
                    <p className="text-sm text-slate-500 mt-1 break-words">
                      {log.detail}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {formatDate(log.createdAt)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
