import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Counting existing data...");
  const [menuCount, toppingCount, categoryCount, orderCount] =
    await Promise.all([
      prisma.menuItem.count(),
      prisma.topping.count(),
      prisma.category.count(),
      prisma.order.count(),
    ]);
  console.log(
    `Found: ${menuCount} menu items, ${toppingCount} toppings, ${categoryCount} categories, ${orderCount} orders`
  );

  console.log("Deleting (FK-safe order)...");
  const result = await prisma.$transaction([
    prisma.orderItemTopping.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.menuItemBranch.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.topping.deleteMany(),
    prisma.category.deleteMany(),
  ]);

  console.log("Deleted counts:");
  console.log(`  OrderItemTopping: ${result[0].count}`);
  console.log(`  OrderItem:        ${result[1].count}`);
  console.log(`  Order:            ${result[2].count}`);
  console.log(`  MenuItemBranch:   ${result[3].count}`);
  console.log(`  MenuItem:         ${result[4].count}`);
  console.log(`  Topping:          ${result[5].count}`);
  console.log(`  Category:         ${result[6].count}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
