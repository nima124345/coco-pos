import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const url = "libsql://coco-pos-nima124345.aws-ap-northeast-1.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!authToken) {
  console.error("TURSO_AUTH_TOKEN is required");
  process.exit(1);
}

async function main() {
  console.log("Connecting to Turso production DB...");
  const adapter = new PrismaLibSQL({ url, authToken });
  const prisma = new PrismaClient({ adapter });

  // 1. Delete existing menu data (FK-safe order)
  console.log("Deleting old menu data...");
  const result = await prisma.$transaction([
    prisma.orderItemTopping.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.menuItemBranch.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.topping.deleteMany(),
    prisma.category.deleteMany(),
  ]);

  console.log(`  Deleted: ${result[4].count} menu items, ${result[5].count} toppings, ${result[6].count} categories`);

  // 2. Create category
  const coconutCat = await prisma.category.create({
    data: { name: "มะพร้าว", emoji: "🥥", sortOrder: 1 },
  });
  console.log("Category created:", coconutCat.name);

  // 3. Create menu items
  const menuItems = [
    { name: "ลูกมะพร้าว", price: 20, categoryId: coconutCat.id },
    { name: "น้ำมะพร้าวสดใส่ถุง", price: 30, categoryId: coconutCat.id },
    { name: "น้ำมะพร้าวสดใส่แก้ว", price: 20, categoryId: coconutCat.id },
    { name: "มะพร้าวปั่น", price: 25, categoryId: coconutCat.id },
    { name: "มะพร้าวปั่นนมสด", price: 30, categoryId: coconutCat.id },
    { name: "สตรอเบอร์รี่โคโคนัทมิลค์", price: 50, categoryId: coconutCat.id },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }
  console.log(`Menu items created: ${menuItems.length}`);

  // 4. Create toppings
  const toppings = [
    { name: "สาคูใบเตย", price: 5 },
    { name: "แมงลัก", price: 5 },
    { name: "ลอดช่อง", price: 5 },
    { name: "เยลลี่ปีโป้", price: 5 },
    { name: "โอริโอ้ครัมเบิ้ล", price: 10 },
    { name: "เนื้อมะพร้าว", price: 10 },
    { name: "ซอสสตรอเบอร์รี่", price: 10 },
    { name: "วุ้นมะพร้าว", price: 10 },
  ];

  for (const topping of toppings) {
    await prisma.topping.create({ data: topping });
  }
  console.log(`Toppings created: ${toppings.length}`);

  await prisma.$disconnect();
  console.log("Done! Production menu updated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
