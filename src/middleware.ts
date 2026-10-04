import { NextResponse, type NextRequest } from "next/server";

/**
 * Primera barrera de acceso.
 *
 * ⚠️ Comprueba ÚNICAMENTE la presencia de la cookie de sesión, porque el
 * middleware se ejecuta en el runtime Edge. La verificación real (firma HMAC,
 * caducidad, usuario activo y rol) la hace `requireRole()` en el layout de cada
 * área, que sí se ejecuta en Node.
 *
 * Es decir: este middleware es una mejora de experiencia (evitar pantallazos a
 * usuarios sin sesión), NO el control de seguridad. La autorización efectiva
 * vive en el servidor, en `src/lib/auth/session.ts` y en cada server action.
 */
const PROTECTED_PREFIXES = ["/app", "/staff", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has("sk_session");
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*", "/staff/:path*", "/admin/:path*"],
};
