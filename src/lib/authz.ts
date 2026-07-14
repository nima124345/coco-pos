import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, type SessionPayload } from "@/lib/session";
import {
  parsePermissions,
  type MenuKey,
  type PermissionLevel,
} from "@/lib/permissions";

/**
 * Server-side authorization helpers.
 *
 * `requireAdmin` in session.ts only checks the *signed cookie* — it treats every
 * MANAGER as a full ADMIN and never looks at `User.permissions`. That means the
 * per-menu VIEW/EDIT/NONE matrix was enforced in the UI only, so a MANAGER could
 * still call any write endpoint directly. These helpers close that gap by
 * checking the permission level against the live DB row (which also revokes a
 * deactivated/demoted user immediately instead of after the 30-day cookie).
 */

const RANK: Record<PermissionLevel, number> = { NONE: 0, VIEW: 1, EDIT: 2 };

/**
 * For a route already guarded by `requireAdmin` (ADMIN or MANAGER). ADMIN passes
 * through; a MANAGER must hold at least `level` on `menu`, verified against the
 * DB. Returns a ready-to-return 403 on violation, otherwise `null` (allowed).
 *
 * Also usable after `requireAuth` on endpoints that STAFF may use too: STAFF are
 * not MANAGERs so they return `null` here and are governed by the caller's own
 * branch/context checks.
 */
export async function managerPermissionDenied(
  session: SessionPayload,
  menu: MenuKey,
  level: PermissionLevel = "EDIT"
): Promise<NextResponse | null> {
  if (session.role !== "MANAGER") return null; // ADMIN / STAFF handled elsewhere

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { active: true, role: true, permissions: true },
  });
  if (!user || !user.active || user.role !== "MANAGER") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ใช้งาน" }, { status: 403 });
  }

  const have = parsePermissions(user.permissions)[menu] ?? "NONE";
  if (RANK[have] < RANK[level]) {
    return NextResponse.json(
      { error: "ไม่มีสิทธิ์ใช้งานเมนูนี้" },
      { status: 403 }
    );
  }
  return null;
}

/**
 * ADMIN-only guard for surfaces with no per-menu permission (e.g. branches).
 * Re-validates against the DB so a demoted/deactivated admin loses access at
 * once. Returns the session or a ready-to-return 401/403 response.
 */
export async function requireAdminOnly(
  req: NextRequest
): Promise<SessionPayload | NextResponse> {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { active: true, role: true },
  });
  if (!user || !user.active || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/**
 * Confirm the session's user still exists and is active. Use on money-sensitive
 * STAFF write paths (orders, void, shifts) so a fired employee's still-valid
 * 30-day cookie can't keep transacting. Returns a 403 response or `null`.
 */
export async function inactiveUserDenied(
  session: SessionPayload
): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { active: true },
  });
  if (!user || !user.active) {
    return NextResponse.json(
      { error: "บัญชีนี้ถูกปิดการใช้งาน" },
      { status: 403 }
    );
  }
  return null;
}
