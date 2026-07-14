import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOnly } from "@/lib/authz";

// GET stays public: the login/register screen fetches the branch list before
// the user is authenticated. It only exposes branch id + name.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "1";

  const branches = await prisma.branch.findMany({
    where: includeInactive ? {} : { active: true },
    include: {
      _count: { select: { orders: true, shifts: true, users: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(branches);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminOnly(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "กรุณาระบุชื่อสาขา" }, { status: 400 });
  }

  const branch = await prisma.branch.create({
    data: {
      name: body.name.trim(),
      address: body.address?.trim() || "",
      note: body.note?.trim() || "",
    },
  });

  return NextResponse.json(branch);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminOnly(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (data.closedAt) data.closedAt = new Date(data.closedAt);

  const branch = await prisma.branch.update({
    where: { id },
    data,
  });

  return NextResponse.json(branch);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminOnly(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.branch.update({
    where: { id },
    data: { active: false, closedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
