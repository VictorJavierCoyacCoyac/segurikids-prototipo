import { prisma } from "@/lib/db";
import { endOfDay, startOfDay } from "@/lib/utils/date";

/** Agregados para los paneles de administración y de personal escolar. */

export type DashboardSnapshot = {
  totalStudents: number;
  inCampus: number;
  offCampus: number;
  absent: number;
  pending: number;
  entriesToday: number;
  exitsToday: number;
  lateToday: number;
  authorizedPeople: number;
  suspendedPeople: number;
  activeAlerts: number;
  openIncidents: number;
  unreadMessages: number;
  /** Distribución horaria de los movimientos de hoy (para la gráfica). */
  hourly: Array<{ hour: number; label: string; entries: number; exits: number }>;
  byGroup: Array<{ group: string; total: number; inCampus: number; offCampus: number; absent: number }>;
};

export async function getDashboardSnapshot(schoolId: string): Promise<DashboardSnapshot> {
  const dayStart = startOfDay();
  const dayEnd = endOfDay();

  const [
    students,
    todayEvents,
    authorizedPeople,
    suspendedPeople,
    activeAlerts,
    openIncidents,
    unreadMessages,
  ] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, active: true },
      select: { status: true, group: true },
    }),
    prisma.attendanceEvent.findMany({
      where: { student: { schoolId }, timestamp: { gte: dayStart, lte: dayEnd } },
      select: { type: true, timestamp: true, latencyMin: true },
    }),
    prisma.authorizedPerson.count({ where: { schoolId } }),
    prisma.authorizedPerson.count({ where: { schoolId, status: "SUSPENDED" } }),
    prisma.emergencyAlert.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.incident.count({ where: { schoolId, status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.message.count({ where: { read: false, conversation: { schoolId } } }),
  ]);

  const countByStatus = (status: string) => students.filter((s) => s.status === status).length;

  // Ventana horaria operativa del centro: 06:00 a 19:00.
  const hours = Array.from({ length: 14 }, (_, index) => index + 6);
  const hourly = hours.map((hour) => {
    const inHour = todayEvents.filter((event) => event.timestamp.getHours() === hour);
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      entries: inHour.filter((event) => event.type === "ENTRY").length,
      exits: inHour.filter((event) => event.type === "EXIT").length,
    };
  });

  const groups = [...new Set(students.map((student) => student.group))].sort();
  const byGroup = groups.map((group) => {
    const groupStudents = students.filter((student) => student.group === group);
    return {
      group,
      total: groupStudents.length,
      inCampus: groupStudents.filter((student) => student.status === "IN_CAMPUS").length,
      offCampus: groupStudents.filter((student) => student.status === "OFF_CAMPUS").length,
      absent: groupStudents.filter((student) => student.status === "ABSENT").length,
    };
  });

  return {
    totalStudents: students.length,
    inCampus: countByStatus("IN_CAMPUS"),
    offCampus: countByStatus("OFF_CAMPUS"),
    absent: countByStatus("ABSENT"),
    pending: countByStatus("PENDING"),
    entriesToday: todayEvents.filter((event) => event.type === "ENTRY").length,
    exitsToday: todayEvents.filter((event) => event.type === "EXIT").length,
    lateToday: todayEvents.filter((event) => event.type === "ENTRY" && (event.latencyMin ?? 0) > 15)
      .length,
    authorizedPeople,
    suspendedPeople,
    activeAlerts,
    openIncidents,
    unreadMessages,
    hourly,
    byGroup,
  };
}
