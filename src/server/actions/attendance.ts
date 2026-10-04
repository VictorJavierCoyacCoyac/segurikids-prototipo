"use server";

import { revalidatePath } from "next/cache";

import { assertCan } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { fieldErrors, manualAttendanceSchema, qrCodeSchema } from "@/lib/validation/schemas";
import {
  registerMovement,
  scanQrIdentifier,
  type MovementResult,
  type ScanResult,
} from "@/server/services/attendance";

import { errorState, successState, toErrorState, type ActionState } from "./types";

/**
 * Acciones del control de acceso. Todas exigen rol con permiso ACCESS_CONTROL y
 * revalidan las rutas que muestran estado de alumnos, para que el cambio se vea
 * de inmediato en los tres perfiles (familia, personal y dirección).
 */

function revalidateAccessViews() {
  revalidatePath("/staff");
  revalidatePath("/staff/alumnos");
  revalidatePath("/staff/escaner");
  revalidatePath("/staff/actividad");
  revalidatePath("/admin");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin/alumnos");
  revalidatePath("/admin/reportes");
  revalidatePath("/app");
  revalidatePath("/app/hijos");
  revalidatePath("/app/historial");
  revalidatePath("/app/notificaciones");
}

/** Valida un identificador de QR (escaneo real o simulado). */
export async function scanCodeAction(
  _prev: ActionState<ScanResult>,
  formData: FormData,
): Promise<ActionState<ScanResult>> {
  try {
    const user = await requireRole("STAFF", "ADMIN");
    assertCan(user.role, "ACCESS_CONTROL");

    const parsed = qrCodeSchema.safeParse(formData.get("code"));
    if (!parsed.success) {
      return errorState("El código no tiene un formato válido.", {
        code: parsed.error.issues[0]?.message ?? "Código inválido.",
      });
    }

    const result = await scanQrIdentifier(parsed.data, user);

    if (result.status === "AUTHORIZED") {
      return successState(
        `Persona autorizada: ${result.person.name}.`,
        result,
      );
    }

    // El escaneo se resolvió correctamente aunque el resultado sea negativo:
    // `ok: true` indica que la operación técnica funcionó; el veredicto va en
    // `data.status`, que es lo que la interfaz debe mostrar de forma evidente.
    return successState("Validación completada.", result);
  } catch (error) {
    return toErrorState(error);
  }
}

/** Confirma la entrega de uno o varios alumnos tras un escaneo válido. */
export async function confirmPickupAction(
  _prev: ActionState<MovementResult>,
  formData: FormData,
): Promise<ActionState<MovementResult>> {
  try {
    const user = await requireRole("STAFF", "ADMIN");
    assertCan(user.role, "ACCESS_CONTROL");

    const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);
    const authorizedPersonId = String(formData.get("authorizedPersonId") ?? "");
    const method = String(formData.get("method") ?? "QR") === "MANUAL" ? "MANUAL" : "QR";

    if (!authorizedPersonId) return errorState("Falta identificar a la persona autorizada.");
    if (studentIds.length === 0) {
      return errorState("Selecciona al menos un alumno para confirmar la entrega.");
    }

    const result = await registerMovement({
      type: "EXIT",
      studentIds,
      method,
      authorizedPersonId,
      note: (formData.get("note") as string) || null,
      actor: user,
    });

    revalidateAccessViews();

    if (!result.ok) {
      return {
        ok: false,
        message:
          result.rejected[0]?.reason ?? "No fue posible registrar la salida.",
        data: result,
      };
    }

    const count = result.registered.length;
    return successState(
      count === 1
        ? `Salida registrada: ${result.registered[0]!.studentName}.`
        : `Salida registrada para ${count} alumnos.`,
      result,
    );
  } catch (error) {
    return toErrorState(error);
  }
}

/** Registro de entrada o salida desde los módulos manuales del personal. */
export async function registerMovementAction(
  _prev: ActionState<MovementResult>,
  formData: FormData,
): Promise<ActionState<MovementResult>> {
  try {
    const user = await requireRole("STAFF", "ADMIN");
    assertCan(user.role, "ACCESS_CONTROL");

    const parsed = manualAttendanceSchema.safeParse({
      studentIds: formData.getAll("studentIds").map(String).filter(Boolean),
      type: formData.get("type"),
      method: formData.get("method") ?? "MANUAL",
      authorizedPersonId: (formData.get("authorizedPersonId") as string) || undefined,
      note: formData.get("note") ?? "",
    });

    if (!parsed.success) {
      return errorState("Revisa los datos del registro.", fieldErrors(parsed.error));
    }

    const result = await registerMovement({
      type: parsed.data.type,
      studentIds: parsed.data.studentIds,
      method: parsed.data.method,
      authorizedPersonId: parsed.data.authorizedPersonId ?? null,
      note: parsed.data.note ?? null,
      actor: user,
    });

    revalidateAccessViews();

    if (!result.ok) {
      return {
        ok: false,
        message: result.rejected[0]?.reason ?? "No fue posible registrar el movimiento.",
        data: result,
      };
    }

    const verb = parsed.data.type === "ENTRY" ? "Entrada" : "Salida";
    const count = result.registered.length;
    return successState(
      count === 1
        ? `${verb} registrada: ${result.registered[0]!.studentName}.`
        : `${verb} registrada para ${count} alumnos.`,
      result,
    );
  } catch (error) {
    return toErrorState(error);
  }
}
