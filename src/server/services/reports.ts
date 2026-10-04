import { prisma } from "@/lib/db";
import { addDays, endOfDay, formatDate, formatDateTime, shortWeekday, startOfDay } from "@/lib/utils/date";
import { eventMethodLabel, eventTypeLabel } from "@/lib/domain/attendance";
import { incidentTypeLabel } from "@/lib/domain/alerts";

/**
 * Reportes del panel administrativo. Todos los cálculos se hacen en el
 * servidor: la UI solo recibe series ya agregadas y listas para dibujar.
 */

export type ReportRange = {
  schoolId: string;
  from: Date;
  to: Date;
  group?: string;
  studentId?: string;
};

export type ReportData = {
  range: { from: Date; to: Date; label: string };
  totals: {
    entries: number;
    exits: number;
    qrPickups: number;
    manualPickups: number;
    onTime: number;
    late: number;
    punctualityRate: number;
    attendanceRate: number;
    schoolDays: number;
    trackedStudents: number;
    incidents: number;
  };
  /** Serie diaria: asistencia y salidas por día hábil. */
  daily: Array<{
    date: string;
    weekday: string;
    entries: number;
    exits: number;
    late: number;
    attendanceRate: number;
  }>;
  /** Asistencia por alumno en el periodo. */
  byStudent: Array<{
    id: string;
    name: string;
    group: string;
    entries: number;
    exits: number;
    late: number;
    attendanceRate: number;
  }>;
  /** Ranking de personas que más recogen. */
  byPicker: Array<{ id: string; name: string; relationship: string; pickups: number }>;
  /** Reparto por grupo. */
  byGroup: Array<{ group: string; entries: number; exits: number; students: number }>;
  incidents: Array<{ id: string; type: string; status: string; date: string; description: string }>;
};

export async function getReportData(range: ReportRange): Promise<ReportData> {
  const from = startOfDay(range.from);
  const to = endOfDay(range.to);

  const studentWhere = {
    schoolId: range.schoolId,
    active: true,
    ...(range.group && range.group !== "ALL" ? { group: range.group } : {}),
    ...(range.studentId && range.studentId !== "ALL" ? { id: range.studentId } : {}),
  };

  const [students, events, incidents] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: { id: true, firstName: true, lastName: true, group: true },
      orderBy: [{ group: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendanceEvent.findMany({
      where: {
        student: studentWhere,
        timestamp: { gte: from, lte: to },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, group: true } },
        authorizedPerson: { select: { id: true, name: true, relationship: true } },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.incident.findMany({
      where: {
        schoolId: range.schoolId,
        createdAt: { gte: from, lte: to },
        ...(range.studentId && range.studentId !== "ALL" ? { studentId: range.studentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const entries = events.filter((event) => event.type === "ENTRY");
  const exits = events.filter((event) => event.type === "EXIT");
  const late = entries.filter((event) => (event.latencyMin ?? 0) > 15);

  // Días hábiles del periodo (base para la tasa de asistencia).
  const schoolDays: Date[] = [];
  for (let cursor = new Date(from); cursor <= to; cursor = addDays(cursor, 1)) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) schoolDays.push(new Date(cursor));
  }

  const expectedAttendances = schoolDays.length * students.length;

  const daily = schoolDays.map((day) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();
    const dayEvents = events.filter(
      (event) => event.timestamp.getTime() >= dayStart && event.timestamp.getTime() <= dayEnd,
    );
    const dayEntries = dayEvents.filter((event) => event.type === "ENTRY");
    return {
      date: formatDate(day),
      weekday: shortWeekday(day),
      entries: dayEntries.length,
      exits: dayEvents.filter((event) => event.type === "EXIT").length,
      late: dayEntries.filter((event) => (event.latencyMin ?? 0) > 15).length,
      attendanceRate:
        students.length > 0 ? Math.round((dayEntries.length / students.length) * 100) : 0,
    };
  });

  const byStudent = students.map((student) => {
    const studentEntries = entries.filter((event) => event.studentId === student.id);
    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      group: student.group,
      entries: studentEntries.length,
      exits: exits.filter((event) => event.studentId === student.id).length,
      late: studentEntries.filter((event) => (event.latencyMin ?? 0) > 15).length,
      attendanceRate:
        schoolDays.length > 0 ? Math.round((studentEntries.length / schoolDays.length) * 100) : 0,
    };
  });

  const pickerMap = new Map<string, { id: string; name: string; relationship: string; pickups: number }>();
  for (const exit of exits) {
    if (!exit.authorizedPerson) continue;
    const current = pickerMap.get(exit.authorizedPerson.id);
    if (current) {
      current.pickups += 1;
    } else {
      pickerMap.set(exit.authorizedPerson.id, {
        id: exit.authorizedPerson.id,
        name: exit.authorizedPerson.name,
        relationship: exit.authorizedPerson.relationship,
        pickups: 1,
      });
    }
  }

  const groups = [...new Set(students.map((student) => student.group))].sort();
  const byGroup = groups.map((group) => ({
    group,
    entries: entries.filter((event) => event.student.group === group).length,
    exits: exits.filter((event) => event.student.group === group).length,
    students: students.filter((student) => student.group === group).length,
  }));

  return {
    range: {
      from,
      to,
      label: `${formatDate(from)} — ${formatDate(to)}`,
    },
    totals: {
      entries: entries.length,
      exits: exits.length,
      qrPickups: exits.filter((event) => event.method === "QR").length,
      manualPickups: exits.filter((event) => event.method === "MANUAL").length,
      onTime: entries.length - late.length,
      late: late.length,
      punctualityRate:
        entries.length > 0 ? Math.round(((entries.length - late.length) / entries.length) * 100) : 0,
      attendanceRate:
        expectedAttendances > 0 ? Math.round((entries.length / expectedAttendances) * 100) : 0,
      schoolDays: schoolDays.length,
      trackedStudents: students.length,
      incidents: incidents.length,
    },
    daily,
    byStudent: byStudent.sort((a, b) => b.attendanceRate - a.attendanceRate),
    byPicker: [...pickerMap.values()].sort((a, b) => b.pickups - a.pickups).slice(0, 10),
    byGroup,
    incidents: incidents.map((incident) => ({
      id: incident.id,
      type: incidentTypeLabel(incident.type),
      status: incident.status,
      date: formatDate(incident.createdAt),
      description: incident.description,
    })),
  };
}

/** Filas del CSV exportable de movimientos. */
export async function getMovementsCsvRows(range: ReportRange) {
  const events = await prisma.attendanceEvent.findMany({
    where: {
      student: {
        schoolId: range.schoolId,
        ...(range.group && range.group !== "ALL" ? { group: range.group } : {}),
        ...(range.studentId && range.studentId !== "ALL" ? { id: range.studentId } : {}),
      },
      timestamp: { gte: startOfDay(range.from), lte: endOfDay(range.to) },
    },
    include: {
      student: { select: { firstName: true, lastName: true, group: true } },
      authorizedPerson: { select: { name: true, relationship: true, qrIdentifier: true } },
      registeredBy: { select: { name: true, role: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  const headers = [
    "Fecha y hora",
    "Alumno",
    "Grupo",
    "Movimiento",
    "Método",
    "Persona relacionada",
    "Identificador QR",
    "Registrado por",
    "Retraso (min)",
    "Nota",
  ];

  const rows = events.map((event) => [
    formatDateTime(event.timestamp),
    `${event.student.firstName} ${event.student.lastName}`,
    event.student.group,
    eventTypeLabel(event.type),
    eventMethodLabel(event.method),
    event.authorizedPerson?.name ?? "—",
    event.authorizedPerson?.qrIdentifier ?? "—",
    event.registeredBy.name,
    event.type === "ENTRY" ? (event.latencyMin ?? 0) : "",
    event.note ?? "",
  ]);

  return { headers, rows };
}
