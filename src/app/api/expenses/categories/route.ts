import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "expenses");
  if (denied) return denied;
  const body = await req.json();
  const category = await prisma.expenseCategory.create({ data: body });
  return NextResponse.json(category);
}
