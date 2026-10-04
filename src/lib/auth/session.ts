import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { ROLE_HOME, isRole, type Role } from "@/lib/domain/roles";

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
 */

const COOKIE_NAME = "sk_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 h

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
};

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Usuario de la petición actual, o `null`. Memoizado por petición con `cache()`
 * para que múltiples componentes no repitan la consulta.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = decodeToken(token);
  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, active: true },
    include: { school: { select: { name: true } } },
  });
  if (!user || !isRole(user.role)) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle,
    avatarTone: user.avatarTone,
    schoolId: user.schoolId,
    schoolName: user.school.name,
  };
});

/** Exige sesión válida; si no existe, redirige al login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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
