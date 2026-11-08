import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const RUTA_LOGIN = "/admin/login";

/**
 * Chequeo rápido: sin cookie de sesión, cualquier ruta del panel va al login.
 * Solo mira si la cookie existe; que la sesión sea válida lo verifica
 * `obtenerNegocioDeLaSesion` en cada página y server action.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === RUTA_LOGIN) return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL(RUTA_LOGIN, request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
