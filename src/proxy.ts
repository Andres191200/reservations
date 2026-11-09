import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN_ROUTE = "/admin/login";

/**
 * Quick check: without a session cookie, every panel route goes to the login.
 * It only checks that the cookie exists; `getSessionBusiness` verifies the session
 * is valid in every page and server action.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === LOGIN_ROUTE) return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
