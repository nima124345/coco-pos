import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";
import { ensureSchemaExtras } from "@/lib/ensure-schema-extras";

/** Read the audit log (ADMIN, or MANAGER with `activity` view permission). */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "activity", "VIEW");
  if (denied) return denied;
  await ensureSchemaExtras();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);

  const where: Record<string, unknown> = {};
  if (action) where.action = action;

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(logs);
}
