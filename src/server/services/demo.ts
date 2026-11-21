import { prisma } from "@/lib/db";
import { DEMO_DAY_STATUS, demoDayKey, expectedMovements } from "@/lib/domain/demo-day";
import { startOfDay } from "@/lib/utils/date";

/**
 * Reinicio de la jornada de demostración.
 *
 * ⚠️ DEMO: herramienta de presentación, no una función del producto. En
 * producción no debe existir: el estado del día es consecuencia de los
 * movimientos reales y no se puede «deshacer» desde la interfaz.
 *
 * ── QUÉ HACE Y QUÉ NO ──────────────────────────────────────────────────────
 * Devuelve la jornada a su estado inicial (ver `src/lib/domain/demo-day.ts`):
 *
 *   • Repone el estado operativo de cada alumno.
 *   • Conserva los movimientos de la mañana y borra los de la demostración.
 *   • Hace lo mismo con los avisos de entrada y salida del día.
 *
 * NO toca cuentas, autorizaciones, mensajes, alertas ni incidencias, y NO
 * vuelve a sembrar la base. Esto es deliberado: el seed regenera todos los
 * identificadores y cerraría la sesión de los dispositivos conectados, que es
 * justo lo que no se puede permitir en mitad de una presentación.
 *
 * NO borra la bitácora de auditoría. Los escaneos de la demostración quedan
 * registrados —son prueba de que el sistema los anotó— y el propio reinicio
 * también se audita.
 *
 * ── CÓMO DISTINGUE LA MAÑANA DE LA DEMOSTRACIÓN ────────────────────────────
 * No lo hace por marcas en los datos, que serían frágiles, sino por el estado
 * esperado: de cada alumno se conservan los PRIMEROS movimientos que su estado
 * inicial justifica (`expectedMovements`) y se descartan los posteriores. Por
 * eso la operación es idempotente: aplicarla dos veces da el mismo resultado.
 */

export type DemoResetSummary = {
  /** Alumnos cuyo estado operativo se corrigió. */
  studentsRestored: number;
  /** Movimientos de la demostración eliminados. */
  movementsRemoved: number;
  /** Avisos de entrada/salida de la demostración eliminados. */
  notificationsRemoved: number;
  /** Alumnos del escenario que no se encontraron en la base. */
  missing: string[];
};

export async function resetDemoDay(schoolId: string): Promise<DemoResetSummary> {
  const today = startOfDay(new Date());

  const students = await prisma.student.findMany({
    where: { schoolId, active: true },
    select: { id: true, firstName: true, lastName: true, status: true, tutorId: true },
  });

  const summary: DemoResetSummary = {
    studentsRestored: 0,
    movementsRemoved: 0,
    notificationsRemoved: 0,
    missing: [],
  };

  for (const student of students) {
    const target = DEMO_DAY_STATUS[demoDayKey(student)];
    if (!target) {
      // Un alumno dado de alta durante la demostración no forma parte del
      // guion: se deja como está en lugar de inventarle un estado.
      summary.missing.push(demoDayKey(student));
      continue;
    }

    const expected = expectedMovements(target);

    const todayEvents = await prisma.attendanceEvent.findMany({
      where: { studentId: student.id, timestamp: { gte: today } },
      orderBy: { timestamp: "asc" },
      select: { id: true, type: true },
    });

    // Se conservan los primeros movimientos de cada tipo que el estado inicial
    // justifica; el resto son los generados al demostrar.
    let entriesKept = 0;
    let exitsKept = 0;
    const surplus: string[] = [];

    for (const event of todayEvents) {
      if (event.type === "ENTRY" && entriesKept < expected.entries) {
        entriesKept++;
        continue;
      }
      if (event.type === "EXIT" && exitsKept < expected.exits) {
        exitsKept++;
        continue;
      }
      surplus.push(event.id);
    }

    if (surplus.length > 0) {
      await prisma.attendanceEvent.deleteMany({ where: { id: { in: surplus } } });
      summary.movementsRemoved += surplus.length;
    }

    if (student.status !== target) {
      await prisma.student.update({ where: { id: student.id }, data: { status: target } });
      summary.studentsRestored++;
    }

    // Los avisos al tutor siguen la misma regla: uno por cada movimiento que el
    // estado inicial justifica, y fuera los demás. Así la bandeja del tutor no
    // acumula «Salida registrada» de cada visitante del stand.
    const todayNotices = await prisma.notification.findMany({
      where: {
        userId: student.tutorId,
        type: { in: ["ENTRY", "EXIT"] },
        createdAt: { gte: today },
        message: { contains: `${student.firstName} ${student.lastName}` },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, type: true },
    });

    let entryNotices = 0;
    let exitNotices = 0;
    const surplusNotices: string[] = [];

    for (const notice of todayNotices) {
      if (notice.type === "ENTRY" && entryNotices < expected.entries) {
        entryNotices++;
        continue;
      }
      if (notice.type === "EXIT" && exitNotices < expected.exits) {
        exitNotices++;
        continue;
      }
      surplusNotices.push(notice.id);
    }

    if (surplusNotices.length > 0) {
      await prisma.notification.deleteMany({ where: { id: { in: surplusNotices } } });
      summary.notificationsRemoved += surplusNotices.length;
    }
  }

  return summary;
}
