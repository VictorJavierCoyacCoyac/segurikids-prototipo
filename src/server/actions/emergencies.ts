"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { emergencySchema, fieldErrors, incidentSchema } from "@/lib/validation/schemas";
import {
  createAlert,
  createIncident,
  resolveAlert,
  setIncidentStatus,
} from "@/server/services/emergencies";

import { errorState, successState, toErrorState, type ActionState } from "./types";

function revalidateAlertViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/emergencias");
  revalidatePath("/staff");
  revalidatePath("/staff/alertas");
  revalidatePath("/app");
  revalidatePath("/app/notificaciones");
}

export async function createAlertAction(
  _prev: ActionState<{ id: string; notified: number }>,
  formData: FormData,
): Promise<ActionState<{ id: string; notified: number }>> {
  try {
    const user = await requireUser();
    if (!can(user.role, "TRIGGER_EMERGENCY")) {
      return errorState("No tienes permiso para activar alertas de emergencia.");
    }

    const parsed = emergencySchema.safeParse({
      type: formData.get("type"),
      title: formData.get("title"),
      message: formData.get("message"),
      priority: formData.get("priority"),
    });

    if (!parsed.success) {
      return errorState("Revisa los datos de la alerta.", fieldErrors(parsed.error));
    }

    const { alert, notified } = await createAlert(parsed.data, user);
    revalidateAlertViews();

    return successState(
      `Alerta activada. Se notificó a ${notified} persona(s) del centro.`,
      { id: alert.id, notified },
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function resolveAlertAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!can(user.role, "RESOLVE_EMERGENCY")) {
      return errorState("Solo la dirección puede cerrar una alerta de emergencia.");
    }

    const alertId = String(formData.get("alertId") ?? "");
    if (!alertId) return errorState("Falta la alerta a resolver.");

    const note = String(formData.get("note") ?? "").trim();
    await resolveAlert(alertId, note || undefined, user);
    revalidateAlertViews();

    return successState("La alerta se marcó como resuelta y se avisó a las familias.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function createIncidentAction(
  _prev: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  try {
    const user = await requireUser();
    if (!can(user.role, "REPORT_INCIDENT")) {
      return errorState("No tienes permiso para reportar incidencias.");
    }

    const parsed = incidentSchema.safeParse({
      type: formData.get("type"),
      severity: formData.get("severity") ?? "MEDIUM",
      description: formData.get("description"),
      studentId: (formData.get("studentId") as string) || undefined,
      authorizedPersonId: (formData.get("authorizedPersonId") as string) || undefined,
    });

    if (!parsed.success) {
      return errorState("Revisa los datos de la incidencia.", fieldErrors(parsed.error));
    }

    const incident = await createIncident(parsed.data, user);
    revalidatePath("/admin/emergencias");
    revalidatePath("/admin");
    revalidatePath("/staff/alertas");

    return successState("Incidencia registrada. La dirección fue notificada.", {
      id: incident.id,
    });
  } catch (error) {
    return toErrorState(error);
  }
}

export async function setIncidentStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!can(user.role, "RESOLVE_EMERGENCY")) {
      return errorState("Solo la dirección puede cambiar el estado de una incidencia.");
    }

    const incidentId = String(formData.get("incidentId") ?? "");
    const raw = String(formData.get("status") ?? "");
    const status = raw === "CLOSED" ? "CLOSED" : raw === "REVIEWING" ? "REVIEWING" : "OPEN";
    if (!incidentId) return errorState("Falta la incidencia a modificar.");

    await setIncidentStatus(incidentId, status, user);
    revalidatePath("/admin/emergencias");

    return successState(
      status === "CLOSED" ? "Incidencia cerrada." : "Estado de la incidencia actualizado.",
    );
  } catch (error) {
    return toErrorState(error);
  }
}
