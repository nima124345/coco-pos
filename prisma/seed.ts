import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ==================== Branches ====================
  const saimo = await prisma.branch.create({
    data: {
      name: "สาขาสายมอ",
      address: "สายมอ",
    },
  });

  const jabang = await prisma.branch.create({
    data: {
      name: "สาขาจะบังตีกอ",
      address: "จะบังตีกอ",
    },
  });

  console.log("Branches created: สายมอ, จะบังตีกอ");

  // ==================== Users ====================
  const adminPassword = await bcrypt.hash("1234", 10);
  const staffPassword = await bcrypt.hash("1234", 10);

  const admin = await prisma.user.create({
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

  const staff1 = await prisma.user.create({
    data: {
      name: "สมชาย พนักงาน",
      username: "staff",
      password: staffPassword,
      role: "STAFF",
      branches: {
        create: [{ branchId: saimo.id, isDefault: true }],
      },
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

  console.log("Users created");

  // ==================== Categories ====================
  const teaCat = await prisma.category.create({
    data: { name: "ชา", emoji: "🍵", sortOrder: 1 },
  });
  const coffeeCat = await prisma.category.create({
    data: { name: "กาแฟ", emoji: "☕", sortOrder: 2 },
  });
  const milkCat = await prisma.category.create({
    data: { name: "นม", emoji: "🥛", sortOrder: 3 },
  });
  const smoothieCat = await prisma.category.create({
    data: { name: "สมูทตี้ผลไม้", emoji: "🍓", sortOrder: 4 },
  });
  const specialCat = await prisma.category.create({
    data: { name: "เมนูพิเศษ", emoji: "✨", sortOrder: 5 },
  });

  console.log("Categories created");

  // ==================== Menu Items (global) ====================
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

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }

  console.log("Menu items created:", menuItems.length);

  // ==================== Toppings ====================
  const toppingsData = [
    { name: "ไข่มุก", price: 10 },
    { name: "วุ้นมะพร้าว", price: 10 },
    { name: "วิปครีม", price: 15 },
    { name: "เจลลี่", price: 10 },
    { name: "ช็อตเอสเพรสโซ่", price: 15 },
    { name: "ครีมชีส", price: 20 },
    { name: "พุดดิ้ง", price: 15 },
    { name: "อัลมอนด์", price: 10 },
  ];

  for (const topping of toppingsData) {
    await prisma.topping.create({ data: topping });
  }

  console.log("Toppings created:", toppingsData.length);

  // ==================== Expense Categories ====================
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

  for (const cat of expCats) {
    await prisma.expenseCategory.create({ data: cat });
  }

  console.log("Expense categories created");

  // ==================== Inventory (per branch — real items from owner) ====================
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

  console.log(`Inventory items created (${inventoryItems.length} items × 2 branches)`);

  // ==================== Sample Orders (สายมอ only — backfill rule) ====================
  const allMenuItems = await prisma.menuItem.findMany();
  const allToppings = await prisma.topping.findMany();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - dayOffset);
    const orderCount = Math.floor(Math.random() * 15) + 5;

    for (let i = 0; i < orderCount; i++) {
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const orderItems: {
        menuItemId: string;
        menuItemName: string;
        menuItemPrice: number;
        sweetnessLevel: number;
        quantity: number;
        itemTotal: number;
        toppings: { toppingId: string; toppingName: string; toppingPrice: number }[];
      }[] = [];

      let subTotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const menuItem = allMenuItems[Math.floor(Math.random() * allMenuItems.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const sweetness = [0, 25, 50, 100][Math.floor(Math.random() * 4)];

        const itemToppings: { toppingId: string; toppingName: string; toppingPrice: number }[] = [];
        if (Math.random() > 0.5) {
          const t = allToppings[Math.floor(Math.random() * allToppings.length)];
          itemToppings.push({ toppingId: t.id, toppingName: t.name, toppingPrice: t.price });
        }

        const toppingTotal = itemToppings.reduce((s, t) => s + t.toppingPrice, 0);
        const itemTotal = (menuItem.price + toppingTotal) * qty;
        subTotal += itemTotal;

        orderItems.push({
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          menuItemPrice: menuItem.price,
          sweetnessLevel: sweetness,
          quantity: qty,
          itemTotal,
          toppings: itemToppings,
        });
      }

      const hour = 8 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);
      const createdAt = new Date(orderDate);
      createdAt.setHours(hour, minute, 0, 0);

      await prisma.order.create({
        data: {
          orderNumber: i + 1,
          subTotal,
          discount: 0,
          netTotal: subTotal,
          paymentMethod: Math.random() > 0.3 ? "CASH" : "QR",
          channel: Math.random() > 0.2 ? "DINE_IN" : "DELIVERY",
          branchId: saimo.id,
          staffId: Math.random() > 0.5 ? staff1.id : admin.id,
          createdAt,
          items: {
            create: orderItems.map((item) => ({
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemName,
              menuItemPrice: item.menuItemPrice,
              sweetnessLevel: item.sweetnessLevel,
              quantity: item.quantity,
              itemTotal: item.itemTotal,
              createdAt,
              toppings: {
                create: item.toppings.map((t) => ({
                  toppingId: t.toppingId,
                  toppingName: t.toppingName,
                  toppingPrice: t.toppingPrice,
                })),
              },
            })),
          },
        },
      });
    }
  }

  console.log("Sample orders created (assigned to สายมอ)");

  // ==================== Sample Expenses (สายมอ) ====================
  const expenseCategories = await prisma.expenseCategory.findMany();

  const sampleExpenses = [
    { title: "ซื้อนมสด 10 กล่อง", amount: 450, catName: "ค่าวัตถุดิบ" },
    { title: "ซื้อผลไม้สด", amount: 800, catName: "ค่าวัตถุดิบ" },
    { title: "ค่าเช่าร้านเดือนนี้", amount: 8000, catName: "ค่าเช่าร้าน" },
    { title: "ค่าไฟ", amount: 2500, catName: "ค่าน้ำ/ค่าไฟ" },
    { title: "ค่าน้ำ", amount: 500, catName: "ค่าน้ำ/ค่าไฟ" },
    { title: "เงินเดือนสมชาย", amount: 12000, catName: "ค่าแรงพนักงาน" },
    { title: "เงินเดือนสมหญิง", amount: 12000, catName: "ค่าแรงพนักงาน" },
    { title: "ซื้อแก้ว 5 แพ็ค", amount: 600, catName: "ค่าบรรจุภัณฑ์ (แก้ว/ฝา/หลอด)" },
    { title: "ค่า Facebook Ads", amount: 1500, catName: "ค่าโฆษณา/การตลาด" },
    { title: "ซื้อทิชชู่/กระดาษ", amount: 300, catName: "ค่าวัสดุสิ้นเปลือง" },
    { title: "ซื้อน้ำเชื่อม 5 ขวด", amount: 300, catName: "ค่าวัตถุดิบ" },
    { title: "ซื้อไข่มุก 5 ถุง", amount: 400, catName: "ค่าวัตถุดิบ" },
  ];

  for (const exp of sampleExpenses) {
    const cat = expenseCategories.find((c) => c.name === exp.catName);
    if (cat) {
      const randomDaysAgo = Math.floor(Math.random() * 7);
      const expDate = new Date();
      expDate.setDate(expDate.getDate() - randomDaysAgo);

      await prisma.expense.create({
        data: {
          title: exp.title,
          amount: exp.amount,
          categoryId: cat.id,
          branchId: saimo.id,
          date: expDate,
        },
      });
    }
  }

  console.log("Sample expenses created (assigned to สายมอ)");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
