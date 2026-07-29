import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth check only.
 *
 * Per the Next.js docs, Proxy must not be treated as an authorization layer:
 * it only looks for the presence of a session cookie so signed-out visitors get
 * bounced to /login without a database round trip. Real ownership enforcement
 * lives in the Data Access Layer (src/lib/dal.ts), which every page and action
 * goes through.
 */

const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get("session")?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
