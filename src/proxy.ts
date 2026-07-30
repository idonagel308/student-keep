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

  const hasSession = Boolean(request.cookies.get("__Host-session")?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip Next internals and static assets. Note this also skips any request
  // path ending in an image extension, which in principle could include
  // /api/files/*. That's fine here: uploaded files are validated as real
  // PDFs by magic bytes (see lib/blob.ts) and never stored with an image
  // extension, and canReadBlobPath's exact-URL DB check is the actual
  // authorization boundary for that route regardless of what proxy does.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
