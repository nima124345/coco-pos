import { prisma } from "@/lib/db";

let ensured: Promise<void> | null = null;

const ITEMS: { name: string; price: number }[] = [
  { name: "แมงลัก", price: 5 },
  { name: "สาคูใบเตย", price: 5 },
  { name: "ลอดช่อง", price: 5 },
  { name: "เยลลี่ปีโป้", price: 5 },
  { name: "วุ้นมะพร้าว", price: 10 },
  { name: "โอริโอ้ครัมเบิ้ล", price: 10 },
  { name: "เนื้อมะพร้าว", price: 10 },
];

/**
 * Idempotently ensure the "coco Topping" category and its menu items exist.
 *
 * The production Turso DB is seeded from a destructive full redeploy, so this
 * additive data is rolled out on demand (once per process) via the runtime DB
 * connection instead — same rationale as ensureAttendanceTable /
 * ensurePermissionsColumn. The toppings of the same name are already seeded in
 * prod, so only the standalone category + menu items are created here.
 */
export function ensureCocoTopping(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      let category = await prisma.category.findFirst({
        where: { name: "coco Topping" },
      });
      if (!category) {
        const last = await prisma.category.findFirst({
          orderBy: { sortOrder: "desc" },
        });
        category = await prisma.category.create({
          data: {
            name: "coco Topping",
            emoji: "🧋",
            sortOrder: (last?.sortOrder ?? 0) + 1,
          },
        });
      }

      for (const it of ITEMS) {
        const existing = await prisma.menuItem.findFirst({
          where: { name: it.name, categoryId: category.id },
        });
        if (!existing) {
          await prisma.menuItem.create({
            data: {
              name: it.name,
              price: it.price,
              shopeePrice: it.price,
              categoryId: category.id,
            },
          });
        }
      }
    })().catch((e) => {
      ensured = null; // allow a retry on the next request if this failed
      throw e;
    });
  }
  return ensured;
}
