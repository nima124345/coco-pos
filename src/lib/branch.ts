import { NextRequest, NextResponse } from "next/server";

export const BRANCH_HEADER = "x-branch-id";
export const BOOTH_HEADER = "x-booth-event-id";

export type Context = { mode: "BRANCH" | "BOOTH"; id: string } | null;

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
