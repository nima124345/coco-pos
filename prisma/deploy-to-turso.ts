/**
 * Deploys schema + production seed data to Turso.
 * Run with DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx prisma/deploy-to-turso.ts
 */
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith("libsql://")) {
  console.error("DATABASE_URL must be a libsql:// URL");
  process.exit(1);
}
if (!authToken) {
  console.error("TURSO_AUTH_TOKEN is required");
  process.exit(1);
}

async function main() {
  console.log("==> Connecting to Turso...");
  const raw = createClient({ url: url!, authToken });

  // 1. Apply schema (idempotent — drops existing tables first for a clean slate)
  console.log("==> Applying schema...");
  const sql = readFileSync(join(__dirname, "turso-schema.sql"), "utf-8");

  // Drop existing tables first (clean deploy)
  const tablesToDrop = [
    "OrderItemTopping", "OrderItem", "Order", "Shift", "Expense",
    "MenuItemBranch", "MenuItem", "Category", "Topping",
    "ExpenseCategory", "Promotion", "InventoryItem",
    "UserBranch", "User", "BoothEvent", "Branch",
    "_prisma_migrations",
  ];
  for (const t of tablesToDrop) {
    try {
      await raw.execute(`DROP TABLE IF EXISTS "${t}"`);
    } catch (e) {
      /* ignore */
    }
  }

  // Split SQL by statement, strip comments, keep only non-empty SQL
  const statements = sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await raw.execute(stmt);
    } catch (e: any) {
      console.error(`Failed: ${stmt.slice(0, 80)}...`);
      throw e;
    }
  }
  console.log(`    ${statements.length} statements applied`);

  // 2. Seed via Prisma client with libsql adapter
  console.log("==> Seeding production data...");
  const adapter = new PrismaLibSql({ url: url!, authToken });
  const prisma = new PrismaClient({ adapter });

  // Branches
  const saimo = await prisma.branch.create({
    data: { name: "สาขาสายมอ", address: "สายมอ" },
  });
  const jabang = await prisma.branch.create({
    data: { name: "สาขาจะบังตีกอ", address: "จะบังตีกอ" },
  });
  console.log("    Branches: สายมอ, จะบังตีกอ");

  // Users
  const adminPassword = await bcrypt.hash("1234", 10);
  const staffPassword = await bcrypt.hash("1234", 10);

  await prisma.user.create({
    data: {
      name: "เจ้าของร้าน",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
      branches: {
        create: [
          { branchId: saimo.id, isDefault: true },
          { branchId: jabang.id },
        ],
      },
    },
  });
  await prisma.user.create({
    data: {
      name: "สมชาย พนักงาน",
      username: "staff",
      password: staffPassword,
      role: "STAFF",
      branches: { create: [{ branchId: saimo.id, isDefault: true }] },
    },
  });
  await prisma.user.create({
    data: {
      name: "สมหญิง บาริสต้า",
      username: "staff2",
      password: staffPassword,
      role: "STAFF",
      branches: {
        create: [
          { branchId: saimo.id, isDefault: true },
          { branchId: jabang.id },
        ],
      },
    },
  });
  console.log("    Users: admin / staff / staff2 (password: 1234)");

  // Categories
  const cats = await Promise.all([
    prisma.category.create({ data: { name: "ชา", emoji: "🍵", sortOrder: 1 } }),
    prisma.category.create({ data: { name: "กาแฟ", emoji: "☕", sortOrder: 2 } }),
    prisma.category.create({ data: { name: "นม", emoji: "🥛", sortOrder: 3 } }),
    prisma.category.create({ data: { name: "สมูทตี้ผลไม้", emoji: "🍓", sortOrder: 4 } }),
    prisma.category.create({ data: { name: "เมนูพิเศษ", emoji: "✨", sortOrder: 5 } }),
  ]);
  const [teaCat, coffeeCat, milkCat, smoothieCat, specialCat] = cats;
  console.log("    Categories: 5");

  // Menu items
  const menuItems = [
    { name: "ชาไทยเย็น", price: 35, categoryId: teaCat.id },
    { name: "ชาเขียวปั่น", price: 45, categoryId: teaCat.id },
    { name: "ชาไทยปั่น", price: 45, categoryId: teaCat.id },
    { name: "ชามะนาว", price: 35, categoryId: teaCat.id },
    { name: "ชาพีช", price: 40, categoryId: teaCat.id },
    { name: "ชาลิ้นจี่", price: 40, categoryId: teaCat.id },
    { name: "เอสเพรสโซ่", price: 40, categoryId: coffeeCat.id },
    { name: "อเมริกาโน่เย็น", price: 45, categoryId: coffeeCat.id },
    { name: "ลาเต้เย็น", price: 50, categoryId: coffeeCat.id },
    { name: "มอคค่าปั่น", price: 55, categoryId: coffeeCat.id },
    { name: "คาราเมล มัคคิอาโต้", price: 55, categoryId: coffeeCat.id },
    { name: "นมสดเย็น", price: 30, categoryId: milkCat.id },
    { name: "โกโก้เย็น", price: 40, categoryId: milkCat.id },
    { name: "โกโก้ปั่น", price: 45, categoryId: milkCat.id },
    { name: "นมสตรอว์เบอร์รี่", price: 40, categoryId: milkCat.id },
    { name: "โอวัลติน", price: 35, categoryId: milkCat.id },
    { name: "มะม่วงปั่น", price: 50, categoryId: smoothieCat.id },
    { name: "สตรอว์เบอร์รี่ปั่น", price: 50, categoryId: smoothieCat.id },
    { name: "แตงโมปั่น", price: 45, categoryId: smoothieCat.id },
    { name: "กล้วยหอมปั่น", price: 45, categoryId: smoothieCat.id },
    { name: "เสาวรสปั่น", price: 50, categoryId: smoothieCat.id },
    { name: "มิกซ์เบอร์รี่ปั่น", price: 55, categoryId: smoothieCat.id },
    { name: "มะพร้าวปั่น", price: 45, categoryId: specialCat.id },
    { name: "ชาไข่มุก Brown Sugar", price: 55, categoryId: specialCat.id },
    { name: "มัทฉะลาเต้", price: 55, categoryId: specialCat.id },
    { name: "ดาร์กช็อคโกแลต", price: 50, categoryId: specialCat.id },
  ];
  for (const item of menuItems) await prisma.menuItem.create({ data: item });
  console.log(`    Menu items: ${menuItems.length}`);

  // Toppings
  const toppings = [
    { name: "ไข่มุก", price: 10 },
    { name: "วุ้นมะพร้าว", price: 10 },
    { name: "วิปครีม", price: 15 },
    { name: "เจลลี่", price: 10 },
    { name: "ช็อตเอสเพรสโซ่", price: 15 },
    { name: "ครีมชีส", price: 20 },
    { name: "พุดดิ้ง", price: 15 },
    { name: "อัลมอนด์", price: 10 },
  ];
  for (const t of toppings) await prisma.topping.create({ data: t });
  console.log(`    Toppings: ${toppings.length}`);

  // Expense categories
  const expCats = [
    { name: "ค่าวัตถุดิบ", color: "#EF4444" },
    { name: "ค่าเช่าร้าน", color: "#3B82F6" },
    { name: "ค่าน้ำ/ค่าไฟ", color: "#8B5CF6" },
    { name: "ค่าแรงพนักงาน", color: "#F59E0B" },
    { name: "ค่าบรรจุภัณฑ์ (แก้ว/ฝา/หลอด)", color: "#EC4899" },
    { name: "ค่าโฆษณา/การตลาด", color: "#10B981" },
    { name: "ค่าวัสดุสิ้นเปลือง", color: "#6366F1" },
    { name: "ค่าใช้จ่ายอื่นๆ", color: "#6B7280" },
  ];
  for (const c of expCats) await prisma.expenseCategory.create({ data: c });
  console.log(`    Expense categories: ${expCats.length}`);

  // Inventory (real items × 2 branches)
  const inventoryItems = [
    { name: "นมคาร์เนชั่น 1000 ml", unit: "กล่อง" },
    { name: "น้ำตาลทราย 1 kg", unit: "ถุง" },
    { name: "นมข้นฟอลคอน 2 kg", unit: "กระป๋อง" },
    { name: "นมจืดฟอลคอน 1000 ml", unit: "กล่อง" },
    { name: "นมสดโฟโมสต์ 1000 ml", unit: "กล่อง" },
    { name: "ไซรัปมะพร้าว 760 ml", unit: "ขวด" },
    { name: "ผงครีมเทียมนมสด 900 g", unit: "ถุง" },
    { name: "แก้ว 22 oz (50 ใบ/แพ็ค)", unit: "แพ็ค" },
    { name: "ฝาเรียบปาก 95 (100 ใบ/แพ็ค)", unit: "แพ็ค" },
    { name: "ฝาโดมปาก 95 (100 ใบ/แพ็ค)", unit: "แพ็ค" },
    { name: "ฝาฮาฟโดมปาก 95 (50 ใบ/แพ็ค)", unit: "แพ็ค" },
    { name: "หลอดหุ้มเขียว 8 มล. (250 เส้น/แพ็ค)", unit: "แพ็ค" },
    { name: "หลอดมุกหุ้มเขียว (100 เส้น/แพ็ค)", unit: "แพ็ค" },
    { name: "ถุงดำ 30×40 (1000 g/แพ็ค)", unit: "แพ็ค" },
    { name: "ถุงหิ้ว (200 g/แพ็ค)", unit: "แพ็ค" },
    { name: "ถุงหิ้วคู่", unit: "แพ็ค" },
    { name: "กระดาษปิดแก้ว (500 ใบ/แพ็ค)", unit: "แพ็ค" },
    { name: "ถุงแพ็คเนื้อ 4×6 (500 g/แพ็ค)", unit: "แพ็ค" },
    { name: "ทิชชู่ (12 ชิ้น/แพ็ค)", unit: "แพ็ค" },
    { name: "ยาง 1000 g", unit: "ถุง" },
    { name: "ช้อนพาย (100 ชิ้น/แพ็ค)", unit: "แพ็ค" },
    { name: "ถุงมือ (50 ชิ้น/กล่อง)", unit: "กล่อง" },
    { name: "เกลือ 220 g", unit: "ถุง" },
    { name: "ผงเฟรปเป้ 400 g", unit: "ถุง" },
    { name: "สาคูใบเตย 400 g", unit: "ถุง" },
    { name: "แมงลัก 500 g", unit: "ถุง" },
    { name: "ลอดช่อง 500 g", unit: "ถุง" },
    { name: "วุ้นมะพร้าว 900 g", unit: "ถุง" },
    { name: "ปีโป้ 700 g", unit: "ถุง" },
    { name: "โอรีโอ้ 454 g", unit: "ถุง" },
    { name: "ซอสสตรอเบอรี่สด 1000 g", unit: "ขวด" },
    { name: "ซอสสตรอเบอร์รี่แยม 1200 g", unit: "ขวด" },
    { name: "คุกกี้วานิลลา 500 g", unit: "ถุง" },
    { name: "มะพร้าวลูก", unit: "ลูก" },
    { name: "ถุง 5×9", unit: "แพ็ค" },
    { name: "ถุง 8×16 (1000 g/แพ็ค)", unit: "แพ็ค" },
    { name: "ซันไลน์ 750 ml", unit: "ขวด" },
    { name: "ฟองน้ำ", unit: "ชิ้น" },
    { name: "น้ำเชื่อม 800 ml", unit: "ขวด" },
    { name: "น้ำแข็ง", unit: "ถุง" },
    { name: "ฝาวิปครีม (50 ใบ/แพ็ค)", unit: "แพ็ค" },
    { name: "สติ๊กเกอร์ (50 แผ่น/แพ็ค)", unit: "แพ็ค" },
  ];

  for (const branch of [saimo, jabang]) {
    for (let i = 0; i < inventoryItems.length; i++) {
      const item = inventoryItems[i];
      await prisma.inventoryItem.create({
        data: {
          ...item,
          quantity: 0,
          minStock: 0,
          costPrice: 0,
          sortOrder: i + 1,
          branchId: branch.id,
        },
      });
    }
  }
  console.log(`    Inventory: ${inventoryItems.length} items × 2 branches`);

  await prisma.$disconnect();
  console.log("==> Done! Production DB is ready.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
