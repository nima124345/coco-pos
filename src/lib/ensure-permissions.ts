import { prisma } from "@/lib/db";

let ensured: Promise<void> | null = null;

/**
 * Idempotently ensure the User.permissions column exists.
 *
 * Same rationale as ensureAttendanceTable: the prod Turso DB is seeded from a
 * destructive full redeploy, so an additive column is rolled out on demand via
 * the runtime connection instead. SQLite has no "ADD COLUMN IF NOT EXISTS", so
 * we attempt the ALTER once and swallow the "duplicate column" error.
 */
export function ensurePermissionsColumn(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "User" ADD COLUMN "permissions" TEXT NOT NULL DEFAULT ''`
        );
      } catch (e) {
        // Column already exists -> ignore. Re-throw anything unexpected.
        const msg = (e as Error).message?.toLowerCase() ?? "";
        if (!msg.includes("duplicate column")) throw e;
      }
    })().catch((e) => {
      ensured = null; // allow a retry on the next request if this failed
      throw e;
    });
  }
  return ensured;
}
