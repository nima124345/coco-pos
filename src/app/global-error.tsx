"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself. It replaces
 * the whole document, so it must render its own <html>/<body>.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>เกิดข้อผิดพลาด</h2>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", maxWidth: "24rem" }}>
          ระบบทำงานผิดพลาด กรุณาลองใหม่อีกครั้ง
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: "0.5rem",
            background: "#000",
            color: "#fff",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            border: "none",
          }}
        >
          ลองใหม่อีกครั้ง
        </button>
      </body>
    </html>
  );
}
