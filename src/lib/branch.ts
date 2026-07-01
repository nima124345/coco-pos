import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/session";

export const BRANCH_HEADER = "x-branch-id";
export const BOOTH_HEADER = "x-booth-event-id";

export type Context = { mode: "BRANCH" | "BOOTH"; id: string } | null;

/** ADMIN and MANAGER may act across any branch/booth. */
export function isPrivileged(session: SessionPayload): boolean {
  return session.role === "ADMIN" || session.role === "MANAGER";
}

/**
 * Guard against cross-branch access. The branch/booth context arrives in a
 * client-controlled header, so a plain STAFF could otherwise point it at a
 * branch they don't belong to. ADMIN/MANAGER are unrestricted; booth events are
 * shared by everyone. Returns a 403 response on violation, otherwise null.
 */
export async function assertContextAccess(
  session: SessionPayload,
  ctx: Context
): Promise<NextResponse | null> {
  if (!ctx) return null;
  if (isPrivileged(session)) return null;
  if (ctx.mode === "BOOTH") return null;
  const link = await prisma.userBranch.findUnique({
    where: { userId_branchId: { userId: session.uid, branchId: ctx.id } },
    select: { userId: true },
  });
  if (!link) {
    return NextResponse.json(
      { error: "ไม่มีสิทธิ์เข้าถึงสาขานี้" },
      { status: 403 }
    );
  }
  return null;
}

/** Read branch or booth context from request headers. Returns null if neither set. */
export function getContext(req: NextRequest): Context {
  const boothId = req.headers.get(BOOTH_HEADER);
  if (boothId) return { mode: "BOOTH", id: boothId };
  const branchId = req.headers.get(BRANCH_HEADER);
  if (branchId) return { mode: "BRANCH", id: branchId };
  return null;
}

export function getBranchId(req: NextRequest): string | null {
  return req.headers.get(BRANCH_HEADER) || null;
}

export function getBoothEventId(req: NextRequest): string | null {
  return req.headers.get(BOOTH_HEADER) || null;
}

/** Build a Prisma where-clause snippet for context scoping. */
export function contextWhere(ctx: Context): Record<string, unknown> {
  if (!ctx) return {};
  if (ctx.mode === "BRANCH") return { branchId: ctx.id };
  return { boothEventId: ctx.id };
}

export function requireContext(req: NextRequest): Context | NextResponse {
  const ctx = getContext(req);
  if (!ctx) {
    return NextResponse.json(
      { error: "Missing context (X-Branch-Id or X-Booth-Event-Id header)" },
      { status: 400 }
    );
  }
  return ctx;
}
