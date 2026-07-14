"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { canEdit } from "@/lib/permissions";

type Settings = Record<string, string>;

const FIELDS: { key: string; label: string; type?: "text" | "textarea"; placeholder?: string }[] = [
  { key: "shopName", label: "ชื่อร้าน", placeholder: "Coco Zone" },
  { key: "shopAddress", label: "ที่อยู่ร้าน", type: "textarea" },
  { key: "shopPhone", label: "เบอร์โทรร้าน" },
  { key: "taxId", label: "เลขประจำตัวผู้เสียภาษี" },
  { key: "receiptHeader", label: "ข้อความหัวใบเสร็จ", type: "textarea" },
  { key: "receiptFooter", label: "ข้อความท้ายใบเสร็จ", type: "textarea", placeholder: "ขอบคุณที่ใช้บริการ" },
  { key: "lowStockDefault", label: "ค่าสต็อกขั้นต่ำเริ่มต้น" },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const editable = canEdit(user?.role, user?.permissions, "settings");

  const [values, setValues] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings");
      if (res.ok) setValues(await res.json());
    } catch {
      setError("โหลดการตั้งค่าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setValues(await res.json());
        setMessage("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">ตั้งค่า</h2>
        <p className="text-sm text-slate-500">ข้อมูลร้านและข้อความบนใบเสร็จ</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลร้าน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400">กำลังโหลด...</p>
          ) : (
            FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium text-slate-700">
                  {f.label}
                </label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={values[f.key] || ""}
                    placeholder={f.placeholder}
                    disabled={!editable}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    value={values[f.key] || ""}
                    placeholder={f.placeholder}
                    disabled={!editable}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))
          )}

          {message && (
            <p className="text-sm font-medium text-green-600">{message}</p>
          )}
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          {editable && (
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              size="lg"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </Button>
          )}
          {!editable && (
            <p className="text-xs text-slate-400">
              คุณมีสิทธิ์ดูอย่างเดียว ไม่สามารถแก้ไขได้
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
