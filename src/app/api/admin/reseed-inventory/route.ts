import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOnly } from "@/lib/authz";

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

export async function POST(req: NextRequest) {
  const auth = await requireAdminOnly(req);
  if (auth instanceof NextResponse) return auth;
  const branches = await prisma.branch.findMany({ where: { active: true } });
  const results: { branch: string; updated: number; created: number }[] = [];

  for (const branch of branches) {
    let updated = 0;
    let created = 0;

    const existing = await prisma.inventoryItem.findMany({
      where: { branchId: branch.id },
      orderBy: { sortOrder: "asc" },
    });

    for (let i = 0; i < inventoryItems.length; i++) {
      const item = inventoryItems[i];
      const match = existing.find((e) => e.sortOrder === i + 1);

      if (match) {
        await prisma.inventoryItem.update({
          where: { id: match.id },
          data: { name: item.name, unit: item.unit },
        });
        updated++;
      } else {
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
        created++;
      }
    }

    results.push({ branch: branch.name, updated, created });
  }

  return NextResponse.json({ success: true, results });
}
