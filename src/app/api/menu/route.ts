import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";
import { logActivity, ACTIVITY } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const items = await prisma.menuItem.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "menu");
  if (denied) return denied;
  const body = await req.json();
  const item = await prisma.menuItem.create({ data: body });
  await logActivity({
    userId: auth.uid,
    action: ACTIVITY.MENU_CREATE,
    entity: "menuItem",
    entityId: item.id,
    detail: `${item.name} • ${item.price}฿`,
  });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "menu");
  if (denied) return denied;
  const body = await req.json();
  const { id, ...data } = body;
  const item = await prisma.menuItem.update({ where: { id }, data });
  await logActivity({
    userId: auth.uid,
    action: ACTIVITY.MENU_UPDATE,
    entity: "menuItem",
    entityId: item.id,
    detail: `${item.name} • ${item.price}฿`,
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "menu");
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.menuItem.update({ where: { id }, data: { active: false } });
  await logActivity({
    userId: auth.uid,
    action: ACTIVITY.MENU_DELETE,
    entity: "menuItem",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
