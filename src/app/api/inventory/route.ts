import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getContext } from "@/lib/branch";
import { requireAdmin } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";

// Whitelisted, validated fields for inventory writes. Prevents mass-assignment
// (e.g. moving an item between branches by injecting branchId) and negative
// quantities/costs slipping through the raw-body spread.
function sanitizeInventory(body: Record<string, unknown>): Record<string, unknown> | string {
  const out: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return "กรุณาระบุชื่อรายการ";
    out.name = name;
  }
  if (body.unit !== undefined) out.unit = String(body.unit);
  if (body.active !== undefined) out.active = !!body.active;
  if (body.sortOrder !== undefined) out.sortOrder = Math.trunc(Number(body.sortOrder)) || 0;
  for (const key of ["quantity", "minStock", "costPrice"] as const) {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 0) return "ค่าตัวเลขต้องไม่ติดลบ";
      out[key] = n;
    }
  }
  return out;
}

// Inventory is per-branch OR per-booth-event. Each owner has independent stock.
// Admin-panel only (ADMIN/MANAGER); the staff POS app does not touch inventory.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "inventory", "VIEW");
  if (denied) return denied;
  const ctx = getContext(req);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  if (!ctx && scope !== "all") {
    return NextResponse.json([]);
  }

  const where: Record<string, unknown> = { active: true };
  if (scope !== "all" && ctx) {
    if (ctx.mode === "BRANCH") where.branchId = ctx.id;
    else where.boothEventId = ctx.id;
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      boothEvent: { select: { id: true, name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "inventory");
  if (denied) return denied;
  const body = await req.json();
  const ctx = getContext(req);

  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (branch or booth)" },
      { status: 400 }
    );
  }

  const data = sanitizeInventory(body);
  if (typeof data === "string") {
    return NextResponse.json({ error: data }, { status: 400 });
  }
  if (!data.name) {
    return NextResponse.json({ error: "กรุณาระบุชื่อรายการ" }, { status: 400 });
  }
  // Context (branch/booth) is assigned server-side, never from the client body.
  if (ctx.mode === "BRANCH") {
    data.branchId = ctx.id;
    data.boothEventId = null;
  } else {
    data.boothEventId = ctx.id;
    data.branchId = null;
  }

  const item = await prisma.inventoryItem.create({ data: data as never });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "inventory");
  if (denied) return denied;
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data = sanitizeInventory(body);
  if (typeof data === "string") {
    return NextResponse.json({ error: data }, { status: 400 });
  }
  const item = await prisma.inventoryItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "inventory");
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.inventoryItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
