import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  const branchId = getBranchId(req);

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
  const body = await req.json();
  const category = await prisma.category.create({ data: body });
  return NextResponse.json(category);
}
