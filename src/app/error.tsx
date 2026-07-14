"use client";

import { useEffect } from "react";

/**
 * Route-segment error boundary. Catches render/data errors anywhere under the
 * app and shows a retry affordance instead of Next's default crash screen —
 * important on a shop floor where the cashier can't debug a blank page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="max-w-sm text-sm text-gray-500">
        ระบบทำงานผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาให้รีเฟรชหน้า
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white"
      >
        ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}
