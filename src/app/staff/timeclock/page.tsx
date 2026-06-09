"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CurrentRecord {
  id: string;
  clockIn: string;
  durationMinutes: number;
}

interface HistoryRecord {
  id: string;
  clockIn: string;
  clockOut: string | null;
  status: "OPEN" | "CLOSED";
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
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatHours(minutes: number) {
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
}

export default function StaffTimeclockPage() {
  const user = useAuthStore((s) => s.user);
  const [current, setCurrent] = useState<CurrentRecord | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  // Live clock — ticks every second once mounted (avoids hydration mismatch).
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    const res = await apiFetch("/api/attendance");
    if (res.ok) {
      const data = await res.json();
      setCurrent(data.current);
      setHistory(data.history);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClockIn = async () => {
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/attendance", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "เข้างานไม่สำเร็จ");
    }
    setSubmitting(false);
    loadData();
  };

  const handleClockOut = async () => {
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/attendance", { method: "PUT" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "ออกงานไม่สำเร็จ");
    }
    setSubmitting(false);
    loadData();
  };

  // Live elapsed time while clocked in.
  const liveMinutes =
    current && now
      ? Math.max(
          0,
          Math.round((now.getTime() - new Date(current.clockIn).getTime()) / 60000)
        )
      : current?.durationMinutes ?? 0;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="text-center pt-2">
        <h2 className="text-2xl font-bold text-slate-900">ลงเวลาทำงาน</h2>
        <p className="text-slate-500 mt-1">สวัสดี {user?.name}</p>
        <p className="font-mono text-4xl font-bold text-slate-900 mt-4 tabular-nums">
          {now
            ? now.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "--:--:--"}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {now
            ? now.toLocaleDateString("th-TH", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : ""}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : current ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-700">กำลังทำงาน</CardTitle>
              <Badge variant="success">เข้างานอยู่</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500">เข้างานเมื่อ</p>
                <p className="font-mono text-xl font-bold text-emerald-600 mt-1">
                  {formatTime(current.clockIn)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500">ทำงานมาแล้ว</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatHours(liveMinutes)}
                </p>
              </div>
            </div>
            <Button
              onClick={handleClockOut}
              disabled={submitting}
              variant="destructive"
              size="lg"
              className="w-full h-14 text-lg"
            >
              {submitting ? "กำลังบันทึก…" : "🔴 ออกงาน"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 space-y-4 text-center">
            <p className="text-slate-500">คุณยังไม่ได้เข้างานวันนี้</p>
            <Button
              onClick={handleClockIn}
              disabled={submitting}
              size="lg"
              className="w-full h-14 text-lg bg-green-500 hover:bg-green-600 text-white"
            >
              {submitting ? "กำลังบันทึก…" : "🟢 เข้างาน"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">ประวัติการลงเวลา</h3>
        <div className="space-y-2">
          {history.length === 0 && (
            <p className="text-center text-slate-400 py-6">ยังไม่มีบันทึกการลงเวลา</p>
          )}
          {history.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {formatDateShort(r.clockIn)}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    <span className="text-emerald-600 font-medium">
                      {formatTime(r.clockIn)}
                    </span>
                    {" → "}
                    {r.clockOut ? (
                      <span className="text-red-500 font-medium">
                        {formatTime(r.clockOut)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">
                        กำลังทำงาน
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">
                    {formatHours(r.durationMinutes)}
                  </p>
                  <Badge
                    variant={r.status === "OPEN" ? "success" : "outline"}
                    className="mt-1"
                  >
                    {r.status === "OPEN" ? "เปิดอยู่" : "ปิดแล้ว"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
