import { prisma } from "@/lib/db";
import type { EventMethod, EventType, ValidationFailure } from "@/lib/domain/attendance";
import { minutesAfterSchedule, startOfDay, endOfDay } from "@/lib/utils/date";

import { logAudit } from "./audit";
import { notify } from "./notifications";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NÚCLEO DEL SISTEMA · Validación de identidad y registro de movimientos
 * ═══════════════════════════════════════════════════════════════════════════
 * Toda entrada o salida del plantel pasa por `registerMovement()`. Esa función
 * es la única autorizada para modificar el estado de un alumno, de modo que el
 * estado siempre es consecuencia de un movimiento auditado.
 *
 * La validación NUNCA confía en el cliente: aunque la interfaz ya haya
 * validado un código, `registerMovement()` vuelve a comprobar la autorización
 * de cada alumno antes de registrar la entrega.
 */

export type PersonSummary = {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  documentTail: string | null;
  status: string;
  qrIdentifier: string;
  avatarTone: string;
  isTutorAccount: boolean;
};

export type StudentCandidate = {
  id: string;
  name: string;
  group: string;
  status: string;
  avatarTone: string;
  /** Relación declarada de la persona con ESTE alumno. */
  relationship: string;
  /** Autorización vigente para este alumno. */
  authorized: boolean;
  /** Puede entregarse ahora mismo (autorizado + en plantel). */
  deliverable: boolean;
  tutorName: string;
};

export type ScanResult =
  | {
      status: "AUTHORIZED";
      person: PersonSummary;
      /** Alumnos autorizados y presentes: se pueden entregar. */
      deliverable: StudentCandidate[];
      /** Alumnos autorizados pero no presentes (ausentes o ya entregados). */
      unavailable: StudentCandidate[];
      scannedAt: Date;
    }
  | {
      status: "DENIED";
      failure: ValidationFailure;
      person: PersonSummary | null;
      /** Alumnos relacionados, para dar contexto al personal. */
      related: StudentCandidate[];
      scannedAt: Date;
    };

/**
 * Comprueba un identificador de QR contra las reglas de autorización:
 *  1. El código existe.
 *  2. Pertenece a una persona del centro.
 *  3. La persona está activa (no suspendida).
 *  4. Tiene alumnos asignados.
 *  5. Al menos una autorización está vigente.
 *  6. Al menos un alumno está en el plantel.
 */
export async function validateQrIdentifier(code: string, schoolId: string): Promise<ScanResult> {
  const scannedAt = new Date();

  const person = await prisma.authorizedPerson.findFirst({
    where: { qrIdentifier: code, schoolId },
    include: {
      authorizations: {
        include: {
          student: {
            include: { tutor: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!person) {
    return { status: "DENIED", failure: "CODE_NOT_FOUND", person: null, related: [], scannedAt };
  }

  const summary: PersonSummary = {
    id: person.id,
    name: person.name,
    relationship: person.relationship,
    phone: person.phone,
    documentTail: person.documentTail,
    status: person.status,
    qrIdentifier: person.qrIdentifier,
    avatarTone: person.avatarTone,
    isTutorAccount: Boolean(person.userId),
  };

  const related: StudentCandidate[] = person.authorizations.map((link) => ({
    id: link.student.id,
    name: `${link.student.firstName} ${link.student.lastName}`,
    group: link.student.group,
    status: link.student.status,
    avatarTone: link.student.avatarTone,
    relationship: link.relationship ?? person.relationship,
    authorized: link.active && person.status === "ACTIVE" && link.student.active,
    deliverable:
      link.active &&
      person.status === "ACTIVE" &&
      link.student.active &&
      link.student.status === "IN_CAMPUS",
    tutorName: link.student.tutor.name,
  }));

  if (person.status !== "ACTIVE") {
    return { status: "DENIED", failure: "PERSON_SUSPENDED", person: summary, related, scannedAt };
  }

  if (related.length === 0) {
    return { status: "DENIED", failure: "NO_AUTHORIZATIONS", person: summary, related, scannedAt };
  }

  const authorized = related.filter((student) => student.authorized);
  if (authorized.length === 0) {
    return {
      status: "DENIED",
      failure: "NO_ACTIVE_AUTHORIZATION",
      person: summary,
      related,
      scannedAt,
    };
  }

  const deliverable = authorized.filter((student) => student.deliverable);
  if (deliverable.length === 0) {
    return {
      status: "DENIED",
      failure: "NO_STUDENTS_IN_CAMPUS",
      person: summary,
      related: authorized,
      scannedAt,
    };
  }

  return {
    status: "AUTHORIZED",
    person: summary,
    deliverable,
    unavailable: authorized.filter((student) => !student.deliverable),
    scannedAt,
  };
}

/** Valida el código y deja constancia del escaneo en la bitácora. */
export async function scanQrIdentifier(
  code: string,
  actor: { id: string; name: string; schoolId: string },
): Promise<ScanResult> {
  const result = await validateQrIdentifier(code, actor.schoolId);

  if (result.status === "AUTHORIZED") {
    await logAudit({
      action: "QR_SCAN",
      userId: actor.id,
      entity: "AuthorizedPerson",
      entityId: result.person.id,
      summary: `Escaneo válido de ${result.person.name} (${code}). ${result.deliverable.length} alumno(s) por entregar.`,
      metadata: {
        code,
        students: result.deliverable.map((student) => student.name),
      },
    });
  } else {
    await logAudit({
      action: "QR_SCAN_DENIED",
      userId: actor.id,
      entity: "AuthorizedPerson",
      entityId: result.person?.id ?? null,
      summary: result.person
        ? `Escaneo rechazado de ${result.person.name} (${code}): ${result.failure}.`
        : `Escaneo rechazado: el código ${code} no existe en el centro.`,
      metadata: { code, failure: result.failure },
    });
  }

  return result;
}

// ── Registro de movimientos ──────────────────────────────────────────────────

export type MovementOutcome = {
  studentId: string;
  studentName: string;
  ok: boolean;
  reason?: string;
  at?: Date;
};

export type MovementResult = {
  ok: boolean;
  type: EventType;
  registered: MovementOutcome[];
  rejected: MovementOutcome[];
  personName: string | null;
};

/**
 * Registra una entrada o salida para uno o varios alumnos.
 *
 * Efectos (en una sola transacción por alumno):
 *   1. Crea el AttendanceEvent con fecha, hora, método y responsables.
 *   2. Actualiza el estado del alumno (IN_CAMPUS / OFF_CAMPUS).
 *   3. Genera la notificación al tutor.
 *   4. Escribe la entrada de auditoría.
 */
export async function registerMovement(input: {
  type: EventType;
  studentIds: string[];
  method: EventMethod;
  authorizedPersonId?: string | null;
  note?: string | null;
  actor: { id: string; name: string; schoolId: string };
}): Promise<MovementResult> {
  const { type, method, note, actor } = input;
  const studentIds = [...new Set(input.studentIds)];

  const school = await prisma.school.findUnique({
    where: { id: actor.schoolId },
    select: { entryTime: true, name: true },
  });

  const person = input.authorizedPersonId
    ? await prisma.authorizedPerson.findFirst({
        where: { id: input.authorizedPersonId, schoolId: actor.schoolId },
        include: { authorizations: true },
      })
    : null;

  // Regla de negocio: una salida siempre debe tener una persona identificada.
  if (type === "EXIT" && !person) {
    return {
      ok: false,
      type,
      registered: [],
      rejected: studentIds.map((id) => ({
        studentId: id,
        studentName: "",
        ok: false,
        reason: "Toda salida requiere una persona autorizada identificada.",
      })),
      personName: null,
    };
  }

  if (person && person.status !== "ACTIVE") {
    return {
      ok: false,
      type,
      registered: [],
      rejected: studentIds.map((id) => ({
        studentId: id,
        studentName: "",
        ok: false,
        reason: "La persona indicada está suspendida.",
      })),
      personName: person.name,
    };
  }

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId: actor.schoolId, active: true },
    include: { tutor: { select: { id: true, name: true } } },
  });

  const registered: MovementOutcome[] = [];
  const rejected: MovementOutcome[] = [];

  for (const studentId of studentIds) {
    const student = students.find((item) => item.id === studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Alumno desconocido";

    if (!student) {
      rejected.push({
        studentId,
        studentName,
        ok: false,
        reason: "El alumno no pertenece a este centro o está dado de baja.",
      });
      continue;
    }

    // Revalidación de autorización en el servidor (no se confía en el cliente).
    if (type === "EXIT") {
      const link = person!.authorizations.find((auth) => auth.studentId === studentId);
      if (!link || !link.active) {
        rejected.push({
          studentId,
          studentName,
          ok: false,
          reason: `${person!.name} no cuenta con autorización vigente para ${studentName}.`,
        });
        continue;
      }
      if (student.status !== "IN_CAMPUS") {
        rejected.push({
          studentId,
          studentName,
          ok: false,
          reason: `${studentName} no se encuentra en el plantel.`,
        });
        continue;
      }
    }

    if (type === "ENTRY" && student.status === "IN_CAMPUS") {
      rejected.push({
        studentId,
        studentName,
        ok: false,
        reason: `${studentName} ya tiene una entrada registrada hoy.`,
      });
      continue;
    }

    const timestamp = new Date();
    const nextStatus = type === "ENTRY" ? "IN_CAMPUS" : "OFF_CAMPUS";

    await prisma.$transaction([
      prisma.attendanceEvent.create({
        data: {
          type,
          method,
          timestamp,
          note: note ?? null,
          studentId: student.id,
          authorizedPersonId: person?.id ?? null,
          registeredById: actor.id,
          latencyMin:
            type === "ENTRY" ? minutesAfterSchedule(timestamp, school?.entryTime ?? "08:00") : null,
        },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { status: nextStatus },
      }),
    ]);

    // Aviso al tutor: es la pieza que cierra el ciclo de confianza con la familia.
    await notify({
      userId: student.tutor.id,
      type: type === "ENTRY" ? "ENTRY" : "EXIT",
      title: type === "ENTRY" ? "Entrada registrada" : "Salida registrada",
      message:
        type === "ENTRY"
          ? `${studentName} ingresó al plantel correctamente.`
          : `${studentName} salió del plantel con ${person!.name}, persona autorizada.`,
      link: "/app/historial",
    });

    await logAudit({
      action: type === "ENTRY" ? "ENTRY_REGISTER" : "EXIT_REGISTER",
      userId: actor.id,
      entity: "Student",
      entityId: student.id,
      summary:
        type === "ENTRY"
          ? `Entrada de ${studentName} registrada mediante ${method === "QR" ? "código QR" : "registro manual"}.`
          : `Salida de ${studentName} entregado a ${person!.name} mediante ${method === "QR" ? "código QR" : "registro manual"}.`,
      metadata: {
        method,
        type,
        person: person?.name ?? null,
        qr: person?.qrIdentifier ?? null,
      },
    });

    registered.push({ studentId, studentName, ok: true, at: timestamp });
  }

  return {
    ok: registered.length > 0,
    type,
    registered,
    rejected,
    personName: person?.name ?? null,
  };
}

// ── Consultas de movimientos ─────────────────────────────────────────────────

export type MovementFilters = {
  schoolId: string;
  studentIds?: string[];
  type?: EventType;
  group?: string;
  from?: Date;
  to?: Date;
  take?: number;
};

const movementInclude = {
  student: {
    select: { id: true, firstName: true, lastName: true, group: true, avatarTone: true },
  },
  authorizedPerson: { select: { id: true, name: true, relationship: true, avatarTone: true } },
  registeredBy: { select: { id: true, name: true, role: true } },
} as const;

export async function listMovements(filters: MovementFilters) {
  const { schoolId, studentIds, type, group, from, to, take = 100 } = filters;

  return prisma.attendanceEvent.findMany({
    where: {
      student: {
        schoolId,
        ...(group ? { group } : {}),
        ...(studentIds && studentIds.length > 0 ? { id: { in: studentIds } } : {}),
      },
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            timestamp: {
              ...(from ? { gte: startOfDay(from) } : {}),
              ...(to ? { lte: endOfDay(to) } : {}),
            },
          }
        : {}),
    },
    include: movementInclude,
    orderBy: { timestamp: "desc" },
    take,
  });
}

export type MovementRecord = Awaited<ReturnType<typeof listMovements>>[number];

/** Movimientos del día en curso, para los paneles operativos. */
export async function listTodayMovements(schoolId: string, take = 30) {
  return prisma.attendanceEvent.findMany({
    where: {
      student: { schoolId },
      timestamp: { gte: startOfDay(), lte: endOfDay() },
    },
    include: movementInclude,
    orderBy: { timestamp: "desc" },
    take,
  });
}

export async function listStudentMovements(studentId: string, take = 60) {
  return prisma.attendanceEvent.findMany({
    where: { studentId },
    include: movementInclude,
    orderBy: { timestamp: "desc" },
    take,
  });
}

/** Historial de recogidas de una persona autorizada. */
export async function listPersonPickups(authorizedPersonId: string, take = 40) {
  return prisma.attendanceEvent.findMany({
    where: { authorizedPersonId },
    include: movementInclude,
    orderBy: { timestamp: "desc" },
    take,
  });
}
