import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/session";
import { managerPermissionDenied } from "@/lib/authz";
import { ensureSchemaExtras } from "@/lib/ensure-schema-extras";
import { logActivity, ACTIVITY } from "@/lib/activity";

// Editable settings keys. Anything not in this list is ignored on write.
const ALLOWED_KEYS = [
  "shopName",
  "shopAddress",
  "shopPhone",
  "taxId",
  "receiptHeader",
  "receiptFooter",
  "lowStockDefault",
] as const;

/** Read all settings as a { key: value } map. Any authenticated user may read
 * (staff need shop name / receipt text). */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  await ensureSchemaExtras();

  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return NextResponse.json(map);
}

/** Update settings (ADMIN, or MANAGER with `settings` edit permission). */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const denied = await managerPermissionDenied(auth, "settings");
  if (denied) return denied;
  await ensureSchemaExtras();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const updates = ALLOWED_KEYS.filter((k) => body[k] !== undefined).map((k) => ({
    key: k,
    value: String(body[k] ?? "").slice(0, 500),
  }));

  for (const u of updates) {
    await prisma.setting.upsert({
      where: { key: u.key },
      create: { key: u.key, value: u.value },
      update: { value: u.value },
    });
  }

  await logActivity({
    userId: auth.uid,
    action: ACTIVITY.SETTINGS_UPDATE,
    entity: "settings",
    detail: updates.map((u) => u.key).join(", "),
  });

  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return NextResponse.json(map);
}
