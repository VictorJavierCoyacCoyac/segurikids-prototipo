"use server";

import { redirect } from "next/navigation";

import { verifyPassword } from "@/lib/auth/password";
import {
  AREA_BY_ROLE,
  createSession,
  destroySession,
  getCurrentUser,
  isSessionArea,
  listSessions,
  type SessionArea,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ROLE_HOME, isRole } from "@/lib/domain/roles";
import { fieldErrors, loginSchema } from "@/lib/validation/schemas";
import { logAudit } from "@/server/services/audit";

import { errorState, type ActionState } from "./types";

/**
 * Inicio de sesión del prototipo.
 *
 * ⚠️ DEMO: sin límite de intentos, captcha ni 2FA.
 * ANTES DE PRODUCCIÓN: añadir rate limiting por IP/cuenta, bloqueo temporal,
 * registro de dispositivos y segundo factor para cuentas administrativas.
 */
export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return errorState("Revisa los datos introducidos.", fieldErrors(parsed.error));
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Mensaje genérico: no se revela si el correo existe.
  const invalid = errorState("Correo o contraseña incorrectos.");

  if (!user || !user.active || !isRole(user.role)) return invalid;
  if (!verifyPassword(parsed.data.password, user.passwordHash)) return invalid;

  await createSession(user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({
    action: "LOGIN",
    userId: user.id,
    entity: "User",
    entityId: user.id,
    summary: `${user.name} inició sesión como ${user.role}.`,
    metadata: { role: user.role, area: AREA_BY_ROLE[user.role] },
  });

  redirect(ROLE_HOME[user.role]);
}

/** Acceso directo con una cuenta demo (botones del login). */
export async function demoLoginAction(formData: FormData): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    throw new Error("El acceso demo está desactivado en este entorno.");
  }

  const email = String(formData.get("email") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active || !isRole(user.role) || !email.endsWith("@demo.local")) {
    throw new Error("La cuenta de demostración indicada no está disponible.");
  }

  await createSession(user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({
    action: "LOGIN",
    userId: user.id,
    entity: "User",
    entityId: user.id,
    summary: `${user.name} inició sesión con acceso demo (${user.role}).`,
    metadata: { role: user.role, demoShortcut: true, area: AREA_BY_ROLE[user.role] },
  });

  redirect(ROLE_HOME[user.role]);
}

/**
 * Cierra la sesión del área desde la que se invoca.
 *
 * Importante para el escenario de dos dispositivos: cerrar la sesión del
 * docente no debe tirar la del tutor abierta en otra pestaña del mismo
 * navegador. El área la resuelve `destroySession()` a partir de la ruta.
 */
export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      action: "LOGOUT",
      userId: user.id,
      entity: "User",
      entityId: user.id,
      summary: `${user.name} cerró sesión (${user.area}).`,
      metadata: { area: user.area },
    });
  }
  // `user.area` y no el área de la ruta: en `/staff` la sesión puede venir de
  // la cookie de dirección, y hay que cerrar esa, no otra.
  await destroySession(user?.area);
  redirect("/login");
}

/** Cierra una sesión concreta desde la pantalla de acceso. */
export async function logoutAreaAction(formData: FormData): Promise<void> {
  const raw = formData.get("area");
  const area: SessionArea | undefined = isSessionArea(raw) ? raw : undefined;
  if (!area) redirect("/login");

  const user = await getCurrentUser(area);
  if (user) {
    await logAudit({
      action: "LOGOUT",
      userId: user.id,
      entity: "User",
      entityId: user.id,
      summary: `${user.name} cerró sesión (${area}).`,
      metadata: { area },
    });
  }
  await destroySession(area);
  redirect("/login");
}

/** Cierra todas las sesiones abiertas en el navegador. */
export async function logoutAllAction(): Promise<void> {
  for (const user of await listSessions()) {
    await logAudit({
      action: "LOGOUT",
      userId: user.id,
      entity: "User",
      entityId: user.id,
      summary: `${user.name} cerró sesión (${user.area}).`,
      metadata: { area: user.area, all: true },
    });
    await destroySession(user.area);
  }
  redirect("/login");
}
