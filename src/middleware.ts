import { NextResponse, type NextRequest } from "next/server";

/**
 * Primera barrera de acceso y resolución del área de la petición.
 *
 * Hace dos cosas:
 *
 *  1. Inyecta la cabecera `x-sk-area` con el área de la ruta (`app`, `staff` o
 *     `admin`). Es lo que permite que cada pestaña use su propia cookie de
 *     sesión y que el tutor y el docente trabajen a la vez en el mismo
 *     navegador. Ver `src/lib/auth/session.ts`.
 *
 *  2. Comprueba la PRESENCIA de la cookie del área antes de renderizar.
 *
 * ⚠️ El punto 2 comprueba únicamente que la cookie exista, porque el middleware
 * se ejecuta en el runtime Edge. La verificación real (firma HMAC, caducidad,
 * usuario activo, rol y aceptación de términos) la hace `requireRole()` en el
 * layout de cada área, que sí se ejecuta en Node.
 *
 * Es decir: este middleware es una mejora de experiencia (evitar pantallazos a
 * usuarios sin sesión), NO el control de seguridad. La autorización efectiva
 * vive en el servidor, en `src/lib/auth/session.ts` y en cada server action.
 */

type Area = "app" | "staff" | "admin";

/** Cookies aceptadas por área, en el mismo orden que `AREA_COOKIES`. */
const AREA_COOKIES: Record<Area, Area[]> = {
  app: ["app"],
  staff: ["staff", "admin"],
  admin: ["admin"],
};

function areaForPath(pathname: string): Area | null {
  if (pathname === "/app" || pathname.startsWith("/app/")) return "app";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "staff";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = areaForPath(pathname);

  const requestHeaders = new Headers(request.headers);
  // Se elimina cualquier valor entrante: la cabecera la fija el servidor y un
  // cliente no debe poder elegir con qué cookie se le identifica.
  requestHeaders.delete("x-sk-area");
  if (area) requestHeaders.set("x-sk-area", area);

  const next = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (!area) return next();

  const hasSession = AREA_COOKIES[area].some((candidate) =>
    request.cookies.has(`sk_session_${candidate}`),
  );
  if (hasSession) return next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("area", area);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Se ejecuta en todas las rutas de aplicación (no solo en las protegidas)
  // porque `/login` y `/terminos` también necesitan resolver el área.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
