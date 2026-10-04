"use server";

import { redirect } from "next/navigation";

import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
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

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({
    action: "LOGIN",
    userId: user.id,
    entity: "User",
    entityId: user.id,
    summary: `${user.name} inició sesión como ${user.role}.`,
    metadata: { role: user.role },
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

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({
    action: "LOGIN",
    userId: user.id,
    entity: "User",
    entityId: user.id,
    summary: `${user.name} inició sesión con acceso demo (${user.role}).`,
    metadata: { role: user.role, demoShortcut: true },
  });

  redirect(ROLE_HOME[user.role]);
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      action: "LOGOUT",
      userId: user.id,
      entity: "User",
      entityId: user.id,
      summary: `${user.name} cerró sesión.`,
    });
  }
  await destroySession();
  redirect("/login");
}
