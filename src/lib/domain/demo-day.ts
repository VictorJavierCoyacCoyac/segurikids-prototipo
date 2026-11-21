/**
 * Estado inicial de la jornada de demostración.
 *
 * ⚠️ DEMO: este módulo existe únicamente para poder devolver el prototipo a su
 * punto de partida durante una presentación. En un sistema productivo no tiene
 * sentido: el estado del día lo determinan los movimientos reales, no un
 * guion.
 *
 * ── POR QUÉ HACE FALTA ─────────────────────────────────────────────────────
 * El guion de la demostración se puede mostrar UNA vez: al registrar la salida
 * de Sofía y Emiliano quedan en `OFF_CAMPUS`, y el siguiente escaneo del QR de
 * su madre responde —correctamente— que no están en el plantel. En un stand con
 * visitantes llegando toda la mañana eso agota el guion al primer pase.
 *
 * Volver a sembrar la base lo resuelve, pero regenera los identificadores de
 * todos los usuarios y, con ello, cierra la sesión de todos los dispositivos
 * conectados. Este módulo permite reiniciar solo la JORNADA —estado de los
 * alumnos y movimientos del día— dejando intactas las cuentas, las
 * autorizaciones y las sesiones abiertas.
 *
 * ── RELACIÓN CON EL SEED ───────────────────────────────────────────────────
 * El estado de abajo tiene que coincidir con `todayStatus` de cada alumno en
 * `prisma/seed.ts`. No se importa de allí porque el seed es un script con su
 * propio cliente de Prisma. Para que no diverjan en silencio, `npm run verify`
 * comprueba que este mapa describe exactamente lo que el seed deja en la base.
 */
import type { StudentStatus } from "./students";

/**
 * Estado con el que arranca la jornada cada alumno, por nombre completo.
 *
 * La clave es el nombre y no el identificador porque los `cuid` se regeneran
 * en cada siembra; el nombre, en cambio, es estable dentro del escenario DEMO.
 */
export const DEMO_DAY_STATUS: Record<string, StudentStatus> = {
  "Sofía Martínez": "IN_CAMPUS",
  "Emiliano Martínez": "IN_CAMPUS",
  "Mateo Hernández": "IN_CAMPUS",
  "Valentina López": "IN_CAMPUS",
  "Diego Ramírez": "IN_CAMPUS",
  "Emma Torres": "OFF_CAMPUS",
  "Santiago Rivas": "IN_CAMPUS",
  "Regina Castro": "IN_CAMPUS",
  "Iker Domínguez": "ABSENT",
  "Camila Fuentes": "IN_CAMPUS",
  "Bruno Salazar": "OFF_CAMPUS",
  "Renata Aguilar": "PENDING",
};

/**
 * Movimientos que corresponden al estado inicial de un alumno.
 *
 * Es la regla con la que el reinicio decide qué conservar y qué sobra, sin
 * necesidad de distinguir qué evento vino del seed y cuál de la demostración:
 *
 *   ABSENT              → ningún movimiento hoy
 *   IN_CAMPUS, PENDING  → una entrada, ninguna salida
 *   OFF_CAMPUS          → una entrada y una salida
 *
 * Se conservan los PRIMEROS movimientos de cada tipo (los de la mañana) y se
 * descartan los demás, que son necesariamente los generados al demostrar.
 */
export function expectedMovements(status: StudentStatus): { entries: number; exits: number } {
  if (status === "ABSENT") return { entries: 0, exits: 0 };
  if (status === "OFF_CAMPUS") return { entries: 1, exits: 1 };
  return { entries: 1, exits: 0 };
}

/** Nombre completo tal como se usa de clave en `DEMO_DAY_STATUS`. */
export function demoDayKey(student: { firstName: string; lastName: string }): string {
  return `${student.firstName} ${student.lastName}`;
}
