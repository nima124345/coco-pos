import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBranchId } from "@/lib/branch";
import { ensureCocoTopping } from "@/lib/ensure-coco-topping";
import { requireAdmin, requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const branchId = getBranchId(req);

  await ensureCocoTopping();

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { active: true },
        orderBy: { name: "asc" },
        include: branchId
          ? {
              branchOverrides: {
                where: { branchId },
              },
            }
          : undefined,
      },
    },
  });

  type ItemWithOverride = {
    id: string;
    name: string;
    price: number;
    shopeePrice: number;
    image: string;
    description: string;
    categoryId: string;
    active: boolean;
    branchOverrides?: {
      price: number | null;
      shopeePrice: number | null;
      active: boolean | null;
    }[];
  };

  const result = categories.map((cat) => ({
    ...cat,
    items: (cat.items as unknown as ItemWithOverride[])
      .map((item) => {
        const override = item.branchOverrides?.[0];
        return {
          id: item.id,
          name: item.name,
          price: override?.price ?? item.price,
          shopeePrice: override?.shopeePrice ?? item.shopeePrice,
          image: item.image,
          description: item.description,
          categoryId: item.categoryId,
          active: override?.active ?? item.active,
        };
      })
      .filter((item) => item.active),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const category = await prisma.category.create({ data: body });
  return NextResponse.json(category);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const { id, ...data } = body;
  const category = await prisma.category.update({ where: { id }, data });
  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  // Soft-delete (consistent with menu items / toppings). The POS GET already
  // filters to active categories, so this hides the category and its items.
  await prisma.category.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
