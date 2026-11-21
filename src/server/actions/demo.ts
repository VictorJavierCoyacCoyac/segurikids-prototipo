"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { resetDemoDay } from "@/server/services/demo";
import { logAudit } from "@/server/services/audit";

import { errorState, successState, toErrorState, type ActionState } from "./types";

/**
 * Reinicia la jornada de demostración.
 *
 * ⚠️ DEMO: acción de presentación. Doble puerta antes de ejecutarla:
 *
 *   1. `requireRole("ADMIN")` — solo dirección, y con los términos aceptados.
 *   2. `NEXT_PUBLIC_DEMO_MODE` — si el prototipo se despliega con el modo de
 *      demostración desactivado, la acción se niega aunque alguien llegue a la
 *      ruta. Es la misma puerta que usa el acceso directo del login.
 *
 * ANTES DE PRODUCCIÓN: eliminar esta acción junto con `src/server/services/demo.ts`
 * y `src/lib/domain/demo-day.ts`. No existe ningún caso real en el que el
 * personal del centro deba poder deshacer los movimientos del día.
 */
export async function resetDemoDayAction(): Promise<ActionState> {
  try {
    const user = await requireRole("ADMIN");

    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      return errorState("El reinicio solo está disponible con el modo de demostración activo.");
    }

    const summary = await resetDemoDay(user.schoolId);

    await logAudit({
      action: "DEMO_DAY_RESET",
      userId: user.id,
      entity: "School",
      entityId: user.schoolId,
      summary: `${user.name} reinició la jornada de demostración: ${summary.studentsRestored} alumno(s) repuesto(s) y ${summary.movementsRemoved} movimiento(s) de la demostración eliminado(s).`,
      metadata: {
        studentsRestored: summary.studentsRestored,
        movementsRemoved: summary.movementsRemoved,
        notificationsRemoved: summary.notificationsRemoved,
        missing: summary.missing,
      },
    });

    // Las pantallas que leen el estado del día tienen que reflejarlo ya: el
    // escáner de la tableta y el tablero del monitor se quedarían con los datos
    // anteriores hasta la siguiente navegación.
    for (const path of [
      "/admin",
      "/admin/configuracion",
      "/admin/movimientos",
      "/staff",
      "/staff/escaner",
      "/staff/entrada",
      "/staff/salida",
      "/staff/alumnos",
      "/app",
      "/app/hijos",
      "/app/historial",
      "/app/notificaciones",
    ]) {
      revalidatePath(path);
    }

    const detail =
      summary.movementsRemoved === 0 && summary.studentsRestored === 0
        ? "La jornada ya estaba en su estado inicial."
        : `${summary.studentsRestored} alumno(s) repuesto(s) · ${summary.movementsRemoved} movimiento(s) y ${summary.notificationsRemoved} aviso(s) de la demostración eliminados.`;

    return successState(`Jornada reiniciada. ${detail}`);
  } catch (error) {
    return toErrorState(error);
  }
}
