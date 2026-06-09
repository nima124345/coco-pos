import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight signed-cookie sessions.
 *
 * The token is `base64url(payload).base64url(HMAC-SHA256)` built with the Web
 * Crypto API so it works in both the Node and Edge (middleware) runtimes. The
 * payload only holds ASCII fields (uid/role/exp) — no PII — so base64 is safe.
 */

export const SESSION_COOKIE = "coco_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (seconds)

const ALG = { name: "HMAC", hash: "SHA-256" } as const;

export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface SessionPayload {
  uid: string;
  role: Role;
  exp: number; // expiry, epoch milliseconds
}

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "coco-pos-dev-insecure-secret-change-me"
  );
}

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

/** Copy bytes into a standalone ArrayBuffer (satisfies the BufferSource type). */
function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", buf(enc.encode(getSecret())), ALG, false, [
    "sign",
    "verify",
  ]);
}

export async function createSessionToken(
  payload: { uid: string; role: Role },
  maxAgeSec: number = SESSION_MAX_AGE
): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + maxAgeSec * 1000,
  };
  const enc = new TextEncoder();
  const body = b64urlEncode(enc.encode(JSON.stringify(full)));
  const key = await getKey();
  const sig = await crypto.subtle.sign(ALG, key, buf(enc.encode(body)));
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const enc = new TextEncoder();
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      ALG,
      key,
      buf(b64urlDecode(sig)),
      buf(enc.encode(body))
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body))
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Read and verify the session from a request's cookies. */
export async function getSession(
  req: NextRequest
): Promise<SessionPayload | null> {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * Guard for admin-panel route handlers. Returns the session for ADMIN or
 * MANAGER accounts, otherwise a ready-to-return 401/403 response.
 *
 * Per-menu access for MANAGER is enforced in the UI (sidebar/page gating); this
 * guard only keeps plain STAFF out of admin-panel endpoints.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<SessionPayload | NextResponse> {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/**
 * Guard for any authenticated route handler. Returns the session for any
 * logged-in user (ADMIN or STAFF), otherwise a ready-to-return 401 response.
 */
export async function requireAuth(
  req: NextRequest
): Promise<SessionPayload | NextResponse> {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/** Apply the session cookie to a response. */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clear the session cookie on a response. */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
