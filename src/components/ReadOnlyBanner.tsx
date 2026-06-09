"use client";

/**
 * Shown at the top of an admin page when the current user (a MANAGER) has only
 * VIEW access to that menu — edit controls on the page are hidden/disabled.
 */
export default function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
      <span className="text-base">👁️</span>
      <span>
        คุณมีสิทธิ์ <span className="font-semibold">ดูอย่างเดียว</span> ในหน้านี้ — ไม่สามารถเพิ่ม แก้ไข หรือลบข้อมูลได้
      </span>
    </div>
  );
}
