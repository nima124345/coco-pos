import { prisma } from "@/lib/db";

let ensured: Promise<void> | null = null;

/**
 * Idempotently create performance indexes on hot query columns that the
 * original schema lacked (order lists filter by staff/shift/date; expense lists
 * filter by date). Index names match Prisma's `Table_column_idx` convention so
 * they don't collide with a future `db push`. Purely additive — failures are
 * swallowed because a missing index only affects speed, never correctness.
 */
export function ensureIndexes(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      const stmts = [
        `CREATE INDEX IF NOT EXISTS "Order_staffId_idx" ON "Order"("staffId")`,
        `CREATE INDEX IF NOT EXISTS "Order_shiftId_idx" ON "Order"("shiftId")`,
        `CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt")`,
        `CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date")`,
      ];
      for (const sql of stmts) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch {
          // Index creation is best-effort (performance only).
        }
      }
    })();
  }
  return ensured;
}
