import { prisma } from "@/lib/db";

let ensured: Promise<void> | null = null;

/**
 * Idempotently create the tables added after the original Turso deploy
 * (CashMovement, ActivityLog, Setting). Prod is seeded via a destructive full
 * redeploy, so new tables are rolled out here at runtime instead of a migration
 * — the same pattern as ensure-expense-columns.ts. Column names/types must match
 * the Prisma models exactly or client inserts will fail.
 *
 * Must run before the first Prisma query against any of these tables. Callers
 * await it at the top of the relevant route (and logActivity awaits it too).
 */
export function ensureSchemaExtras(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      const stmts = [
        `CREATE TABLE IF NOT EXISTS "CashMovement" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shiftId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "reason" TEXT NOT NULL DEFAULT '',
          "staffId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "CashMovement_shiftId_idx" ON "CashMovement"("shiftId")`,
        `CREATE TABLE IF NOT EXISTS "ActivityLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL DEFAULT '',
          "userName" TEXT NOT NULL DEFAULT '',
          "action" TEXT NOT NULL,
          "entity" TEXT NOT NULL DEFAULT '',
          "entityId" TEXT NOT NULL DEFAULT '',
          "detail" TEXT NOT NULL DEFAULT '',
          "branchId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt")`,
        `CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action")`,
        `CREATE TABLE IF NOT EXISTS "Setting" (
          "key" TEXT NOT NULL PRIMARY KEY,
          "value" TEXT NOT NULL DEFAULT '',
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      ];
      for (const sql of stmts) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch((e) => {
      ensured = null; // allow a retry on the next request if this failed
      throw e;
    });
  }
  return ensured;
}
