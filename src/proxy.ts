import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * API endpoints reachable without a session.
 * - login: obviously pre-auth
 * - register: public staff self-registration (the handler forces role=STAFF
 *   for unauthenticated callers, so no admin can be created here)
 * - logout: clears the cookie
 */
const PUBLIC_API = ["/api/auth/login", "/api/auth/register", "/api/auth/logout"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionToken(
    req.cookies.get(SESSION_COOKIE)?.value
  );

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.includes(pathname)) {
      return NextResponse.next();
    }
    // The public registration form needs the branch list before login.
    if (pathname === "/api/branches" && req.method === "GET") {
      return NextResponse.next();
    }
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Page guards (defense in depth — pages also redirect client-side).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!session) return NextResponse.redirect(new URL("/", req.url));
    // ADMIN and MANAGER both use the admin panel; everyone else goes to staff.
    if (session.role !== "ADMIN" && session.role !== "MANAGER")
      return NextResponse.redirect(new URL("/staff", req.url));
  } else if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (!session) return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/staff/:path*"],
};
