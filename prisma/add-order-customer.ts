/**
 * Migration: add customerName + customerPhone columns to Order table.
 * Both optional (default empty string).
 *
 * Run with: npx tsx prisma/add-order-customer.ts
 * Idempotent: safe to run multiple times.
 */
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.production" });
config({ path: ".env", override: false });

const url = process.env.TURSO_DATABASE_URL?.replace(/^﻿/, "").trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url || !url.startsWith("libsql://")) {
  console.error("TURSO_DATABASE_URL must be a libsql:// URL");
  process.exit(1);
}
if (!authToken) {
  console.error("TURSO_AUTH_TOKEN is required");
  process.exit(1);
}

async function main() {
  const client = createClient({ url: url!, authToken });

  const columns = [
    { name: "customerName", sql: `ALTER TABLE "Order" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT ''` },
    { name: "customerPhone", sql: `ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT NOT NULL DEFAULT ''` },
  ];

  for (const col of columns) {
    try {
      await client.execute(col.sql);
      console.log(`  Added column: ${col.name}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column")) {
        console.log(`  Column ${col.name} already exists, skipping.`);
      } else {
        console.error(`  Error adding ${col.name}:`, msg);
        throw e;
      }
    }
  }

  console.log("==> Done. Order customer fields enabled.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
