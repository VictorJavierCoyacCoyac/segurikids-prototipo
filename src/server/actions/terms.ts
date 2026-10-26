"use server";

import { redirect } from "next/navigation";

import { isSessionArea, requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ROLE_HOME } from "@/lib/domain/roles";
import { TERMS_VERSION } from "@/lib/domain/terms";
import { logAudit } from "@/server/services/audit";

import { errorState, type ActionState } from "./types";

/**
 * Registra la aceptación de los términos de la cuenta en curso.
 *
 * La aceptación se guarda con la versión del documento, no como un simple
 * booleano: si el texto cambia, `TERMS_VERSION` cambia y el sistema vuelve a
 * pedir el consentimiento en lugar de dar por válido el anterior.
 *
 * ⚠️ DEMO: queda constancia de la cuenta, el momento y la versión. Un entorno
 * real debería conservar además una copia inmutable del texto aceptado y la
 * evidencia del consentimiento (IP, dispositivo) según la normativa aplicable.
 */
export async function acceptTermsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawArea = formData.get("area");
  const area = isSessionArea(rawArea) ? rawArea : undefined;

  // `requireSession` y no `requireUser`: la cuenta aún no ha aceptado nada y
  // `requireUser` la devolvería a esta misma pantalla.
  const user = await requireSession(area);

  if (formData.get("accept") !== "on") {
    return errorState("Debes marcar la casilla de aceptación para continuar.", {
      accept: "Marca la casilla para aceptar los términos.",
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
  });

  await logAudit({
    action: "TERMS_ACCEPT",
    userId: user.id,
    entity: "User",
    entityId: user.id,
    summary: `${user.name} aceptó los términos y el aviso de privacidad (versión ${TERMS_VERSION}).`,
    metadata: { version: TERMS_VERSION, area: user.area },
  });

  redirect(ROLE_HOME[user.role]);
}
