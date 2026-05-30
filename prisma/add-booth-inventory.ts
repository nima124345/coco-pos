/**
 * Migration: make InventoryItem.branchId nullable + add boothEventId column.
 * Independent booth inventory — booth events have their own stock, separate from branches.
 *
 * Run with: npx tsx prisma/add-booth-inventory.ts
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

  console.log("==> Inspecting InventoryItem schema...");
  const cols = await client.execute("PRAGMA table_info(InventoryItem)");
  const colMap = new Map(
    cols.rows.map((r) => [String(r.name), { notnull: r.notnull as number }])
  );

  const hasBoothCol = colMap.has("boothEventId");
  const branchNotNull = colMap.get("branchId")?.notnull === 1;

  if (hasBoothCol && !branchNotNull) {
    console.log("    Already migrated. Nothing to do.");
    await client.execute("CREATE INDEX IF NOT EXISTS InventoryItem_boothEventId_idx ON InventoryItem(boothEventId)");
    console.log("==> Done.");
    return;
  }

  console.log(`    Current: hasBoothCol=${hasBoothCol}, branchNotNull=${branchNotNull}`);
  console.log("==> Rebuilding InventoryItem table...");

  const rowCount = await client.execute("SELECT COUNT(*) as c FROM InventoryItem");
  console.log(`    Existing rows: ${rowCount.rows[0].c}`);

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS InventoryItem_new (
      id TEXT NOT NULL PRIMARY KEY,
      branchId TEXT,
      boothEventId TEXT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'ชิ้น',
      quantity REAL NOT NULL DEFAULT 0,
      minStock REAL NOT NULL DEFAULT 0,
      costPrice REAL NOT NULL DEFAULT 0,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branchId) REFERENCES Branch(id),
      FOREIGN KEY (boothEventId) REFERENCES BoothEvent(id)
    );
  `);

  const insertSql = hasBoothCol
    ? `INSERT INTO InventoryItem_new (id, branchId, boothEventId, name, unit, quantity, minStock, costPrice, sortOrder, active, createdAt, updatedAt)
       SELECT id, branchId, boothEventId, name, unit, quantity, minStock, costPrice, sortOrder, active, createdAt, updatedAt FROM InventoryItem;`
    : `INSERT INTO InventoryItem_new (id, branchId, boothEventId, name, unit, quantity, minStock, costPrice, sortOrder, active, createdAt, updatedAt)
       SELECT id, branchId, NULL, name, unit, quantity, minStock, costPrice, sortOrder, active, createdAt, updatedAt FROM InventoryItem;`;

  await client.execute(insertSql);

  await client.executeMultiple(`
    DROP TABLE InventoryItem;
    ALTER TABLE InventoryItem_new RENAME TO InventoryItem;
    CREATE INDEX IF NOT EXISTS InventoryItem_branchId_idx ON InventoryItem(branchId);
    CREATE INDEX IF NOT EXISTS InventoryItem_boothEventId_idx ON InventoryItem(boothEventId);
  `);

  const newCount = await client.execute("SELECT COUNT(*) as c FROM InventoryItem");
  console.log(`    New rows: ${newCount.rows[0].c}`);
  console.log("==> Done. Booth inventory enabled.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
