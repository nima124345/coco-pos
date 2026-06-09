import { prisma } from "@/lib/db";

let ensured: Promise<void> | null = null;

/**
 * Idempotently ensure the Attendance table exists.
 *
 * The production Turso DB is seeded from `turso-schema.sql` via a destructive
 * full redeploy, so an additive table can't be rolled out that way without
 * wiping data. This guard creates the table on demand (once per process) using
 * the runtime DB connection — safe and instant when the table already exists.
 */
export function ensureAttendanceTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Attendance" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "staffId" TEXT NOT NULL,
        "clockIn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "clockOut" DATETIME,
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "note" TEXT NOT NULL DEFAULT '',
        "clockInPhoto" TEXT NOT NULL DEFAULT '',
        "clockOutPhoto" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )`);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "Attendance_staffId_idx" ON "Attendance"("staffId")`
      );
      // Additive columns for tables that predate the photo feature. SQLite has no
      // "ADD COLUMN IF NOT EXISTS", so attempt each and swallow "duplicate column".
      for (const col of ["clockInPhoto", "clockOutPhoto"]) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "Attendance" ADD COLUMN "${col}" TEXT NOT NULL DEFAULT ''`
          );
        } catch (e) {
          const msg = (e as Error).message?.toLowerCase() ?? "";
          if (!msg.includes("duplicate column")) throw e;
        }
      }
    })().catch((e) => {
      ensured = null; // allow a retry on the next request if this failed
      throw e;
    });
  }
  return ensured;
}
