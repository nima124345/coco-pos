import { createClient } from "@libsql/client";

const url = "libsql://coco-pos-nima124345.aws-ap-northeast-1.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!authToken) {
  console.error("TURSO_AUTH_TOKEN is required");
  process.exit(1);
}

async function main() {
  const client = createClient({ url, authToken });

  console.log("Checking and adding missing columns to BoothEvent...");

  const columns = [
    { name: "cashIncome", sql: 'ALTER TABLE "BoothEvent" ADD COLUMN "cashIncome" REAL NOT NULL DEFAULT 0' },
    { name: "transferIncome", sql: 'ALTER TABLE "BoothEvent" ADD COLUMN "transferIncome" REAL NOT NULL DEFAULT 0' },
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
      }
    }
  }

  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
