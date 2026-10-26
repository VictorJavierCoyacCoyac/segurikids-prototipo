import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { ROLE_HOME, isRole, type Role } from "@/lib/domain/roles";
import { TERMS_VERSION } from "@/lib/domain/terms";

/**
 * Sesión demo basada en cookie firmada (HMAC-SHA256).
 *
 * ⚠️ DEMO: no hay refresh tokens, revocación centralizada ni rotación de
 * secretos. La cookie es httpOnly + sameSite=lax y se firma con SESSION_SECRET.
 *
 * ANTES DE PRODUCCIÓN: sustituir por un proveedor real (NextAuth/Auth.js,
 * Clerk, Cognito…). Todo el resto de la aplicación consume únicamente
 * `getCurrentUser()` / `requireRole()`, por lo que el reemplazo se limita a
 * este archivo.
 *
 * ── SESIONES SIMULTÁNEAS POR ÁREA ──────────────────────────────────────────
 * El sistema se usa en dos dispositivos a la vez (el tutor con su QR y el
 * docente con el escáner), y durante una demostración también en dos pestañas
 * del mismo navegador. Una sola cookie lo impediría: la segunda sesión
 * sobreescribiría la primera.
 *
 * Por eso la cookie NO es única, sino una por área de la aplicación:
 *
 *   /app    → sk_session_app     (padre / tutor)
 *   /staff  → sk_session_staff   (personal escolar)
 *   /admin  → sk_session_admin   (dirección)
 *
 * El área se deduce de la ruta de la petición (cabecera `x-sk-area` que inyecta
 * `src/middleware.ts`), de modo que cada pestaña usa la cookie de su área sin
 * necesidad de parámetros en la URL ni de estado en el cliente. Así, la
 * pestaña del tutor y la del docente conviven en el mismo navegador.
 *
 * Límite conocido: una sesión por ÁREA y navegador. Dos cuentas de tutor a la
 * vez en el mismo navegador siguen requiriendo dos perfiles/navegadores o dos
 * dispositivos distintos.
 */

export const SESSION_AREAS = ["app", "staff", "admin"] as const;
export type SessionArea = (typeof SESSION_AREAS)[number];

/** Cabecera con el área resuelta, inyectada por el middleware. */
export const AREA_HEADER = "x-sk-area";

const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 h

/** Área a la que pertenece la sesión de cada rol. */
export const AREA_BY_ROLE: Record<Role, SessionArea> = {
  PARENT: "app",
  STAFF: "staff",
  ADMIN: "admin",
};

/**
 * Cookies que acepta cada área, en orden de preferencia.
 *
 * `/staff` admite también la cookie de dirección porque un ADMIN puede operar
 * el control de acceso; si existen ambas sesiones, manda la del personal.
 */
const AREA_COOKIES: Record<SessionArea, SessionArea[]> = {
  app: ["app"],
  staff: ["staff", "admin"],
  admin: ["admin"],
};

/** Roles admitidos en la cookie de cada área. */
const COOKIE_ROLES: Record<SessionArea, Role[]> = {
  app: ["PARENT"],
  staff: ["STAFF"],
  admin: ["ADMIN"],
};

export const AREA_LABEL: Record<SessionArea, string> = {
  app: "App familiar",
  staff: "Personal escolar",
  admin: "Dirección",
};

export function cookieName(area: SessionArea): string {
  return `sk_session_${area}`;
}

export function isSessionArea(value: unknown): value is SessionArea {
  return typeof value === "string" && (SESSION_AREAS as readonly string[]).includes(value);
}

/** Área de la aplicación a la que corresponde una ruta, o `null` si es pública. */
export function areaForPath(pathname: string): SessionArea | null {
  if (pathname === "/app" || pathname.startsWith("/app/")) return "app";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "staff";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return null;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    // Falla temprano y de forma explícita en lugar de firmar con un valor débil.
    throw new Error(
      "SESSION_SECRET no está configurado. Copia .env.example como .env antes de iniciar.",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodeToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, iat: Date.now() }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload), "utf8");
  const received = Buffer.from(signature, "utf8");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      iat?: number;
    };
    if (!data.sub || typeof data.iat !== "number") return null;
    if (Date.now() - data.iat > MAX_AGE_SECONDS * 1000) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  avatarTone: string;
  schoolId: string;
  schoolName: string;
  /** Cookie de la que proviene esta sesión. */
  area: SessionArea;
  /** Aceptación vigente de los términos (versión actual incluida). */
  termsAccepted: boolean;
  termsAcceptedAt: Date | null;
};

/**
 * `secure` solo cuando la petición llega realmente por HTTPS.
 *
 * El prototipo se sirve por HTTP en la red local y por HTTPS a través del túnel
 * público. Marcar la cookie como `secure` de forma incondicional en producción
 * haría que el navegador la descartara en el acceso por IP local y el inicio de
 * sesión fallaría sin mensaje.
 */
async function secureCookie(): Promise<boolean> {
  const store = await headers();
  return (store.get("x-forwarded-proto") ?? "").split(",")[0]?.trim() === "https";
}

/** Área de la petición en curso según la cabecera del middleware. */
async function requestArea(): Promise<SessionArea | null> {
  const store = await headers();
  const value = store.get(AREA_HEADER);
  return isSessionArea(value) ? value : null;
}

async function readSession(cookieArea: SessionArea): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(cookieName(cookieArea))?.value;
  if (!token) return null;

  const userId = decodeToken(token);
  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, active: true },
    include: { school: { select: { name: true } } },
  });
  if (!user || !isRole(user.role)) return null;

  // La cookie de un área solo puede transportar los roles de esa área: evita
  // que una cookie reutilizada otorgue acceso donde no corresponde.
  if (!COOKIE_ROLES[cookieArea].includes(user.role)) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle,
    avatarTone: user.avatarTone,
    schoolId: user.schoolId,
    schoolName: user.school.name,
    area: cookieArea,
    termsAccepted: Boolean(user.termsAcceptedAt) && user.termsVersion === TERMS_VERSION,
    termsAcceptedAt: user.termsAcceptedAt,
  };
}

/**
 * Resuelve la sesión del área indicada. Memoizado por petición con `cache()`
 * para que múltiples componentes no repitan la consulta.
 *
 * `"any"` se usa en las rutas públicas (p. ej. `/terminos`), donde no hay área:
 * devuelve la primera sesión válida que encuentre.
 */
const resolveSession = cache(async (area: SessionArea | "any"): Promise<SessionUser | null> => {
  const candidates = area === "any" ? SESSION_AREAS : AREA_COOKIES[area];
  for (const candidate of candidates) {
    const user = await readSession(candidate);
    if (user) return user;
  }
  return null;
});

/** Usuario de la petición actual, o `null`. */
export async function getCurrentUser(area?: SessionArea): Promise<SessionUser | null> {
  const target = area ?? (await requestArea()) ?? "any";
  return resolveSession(target);
}

/** Todas las sesiones abiertas en este navegador, una por área. */
export async function listSessions(): Promise<SessionUser[]> {
  const found = await Promise.all(SESSION_AREAS.map((area) => readSession(area)));
  return found.filter((user): user is SessionUser => user !== null);
}

export async function createSession(userId: string, role: Role): Promise<void> {
  const store = await cookies();
  store.set(cookieName(AREA_BY_ROLE[role]), encodeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookie(),
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Cierra UNA sesión: la del área indicada o, si no se indica, la de la ruta
 * actual.
 *
 * Borra una sola cookie a propósito. `AREA_COOKIES` solo describe qué cookies
 * puede LEER cada área: si dirección opera el control de acceso y cierra
 * sesión en `/staff`, debe cerrarse su sesión de dirección y no la del tutor
 * abierta en otra pestaña. Por eso quien invoca pasa `user.area`, que es la
 * cookie de la que vino realmente la sesión.
 *
 * Sin área resoluble (ruta pública) se limpian todas: en ese contexto no hay
 * ninguna sesión concreta que preservar.
 */
export async function destroySession(area?: SessionArea): Promise<void> {
  const store = await cookies();
  const target = area ?? (await requestArea());
  if (target) {
    store.delete(cookieName(target));
    return;
  }
  for (const candidate of SESSION_AREAS) store.delete(cookieName(candidate));
}

/**
 * Exige sesión válida SIN comprobar los términos.
 *
 * Solo lo usa la pantalla de aceptación de términos: si exigiera la aceptación,
 * se redirigiría a sí misma en bucle.
 */
export async function requireSession(area?: SessionArea): Promise<SessionUser> {
  const user = await getCurrentUser(area);
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige sesión válida y términos aceptados; si no, redirige.
 *
 * La aceptación se comprueba aquí —y no en cada pantalla— para que ninguna ruta
 * nueva pueda olvidarse de la comprobación.
 */
export async function requireUser(area?: SessionArea): Promise<SessionUser> {
  const user = await requireSession(area);
  if (!user.termsAccepted) redirect(`/terminos/aceptar?area=${user.area}`);
  return user;
}

/**
 * Exige sesión con uno de los roles indicados. Si el usuario está autenticado
 * pero con otro rol, se le envía a su propio inicio en lugar de mostrar un
 * error: evita callejones sin salida en la demostración.
 */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
