import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const coconutCat = await prisma.category.create({
    data: { name: "มะพร้าว", emoji: "🥥", sortOrder: 1 },
  });

  console.log("Category created:", coconutCat.name);

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

  console.log("Menu items created:", menuItems.length);

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

  console.log("Toppings created:", toppings.length);
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
