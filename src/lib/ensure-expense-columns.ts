import { prisma } from "@/lib/db";

let ensured: Promise<void> | null = null;

/**
 * Idempotently add the owner-paid / recurring / slip columns to the Expense
 * table. The production Turso DB predates these fields and is seeded via a
 * destructive full redeploy, so additive columns are rolled out here at runtime
 * instead. SQLite has no "ADD COLUMN IF NOT EXISTS", so each ALTER is attempted
 * and the "duplicate column" error is swallowed.
 */
export function ensureExpenseColumns(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      const cols: [string, string][] = [
        ["paidByOwner", `ALTER TABLE "Expense" ADD COLUMN "paidByOwner" BOOLEAN NOT NULL DEFAULT 0`],
        ["recurring", `ALTER TABLE "Expense" ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT 0`],
        ["slipUrl", `ALTER TABLE "Expense" ADD COLUMN "slipUrl" TEXT NOT NULL DEFAULT ''`],
      ];
      for (const [, sql] of cols) {
        try {
          await prisma.$executeRawUnsafe(sql);
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
