import { prisma } from "@/lib/db";
import { emergencyTypeMeta } from "@/lib/domain/alerts";
import type { EmergencyInput, IncidentInput } from "@/lib/validation/schemas";

import { logAudit } from "./audit";
import { notifyMany, notify } from "./notifications";

/** Alertas de emergencia e incidencias operativas. */

export async function listAlerts(schoolId: string, take = 30) {
  return prisma.emergencyAlert.findMany({
    where: { schoolId },
    include: {
      createdBy: { select: { id: true, name: true, jobTitle: true, avatarTone: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take,
  });
}

export type AlertRecord = Awaited<ReturnType<typeof listAlerts>>[number];

export async function listActiveAlerts(schoolId: string) {
  return prisma.emergencyAlert.findMany({
    where: { schoolId, status: "ACTIVE" },
    include: { createdBy: { select: { name: true, jobTitle: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Activa una alerta y notifica a todas las familias del centro.
 * La notificación masiva es simulada (se escribe en la tabla Notification).
 */
export async function createAlert(
  input: EmergencyInput,
  actor: { id: string; name: string; schoolId: string },
) {
  const alert = await prisma.emergencyAlert.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority,
      status: "ACTIVE",
      schoolId: actor.schoolId,
      createdById: actor.id,
    },
  });

  const recipients = await prisma.user.findMany({
    where: { schoolId: actor.schoolId, active: true, role: { in: ["PARENT", "STAFF", "ADMIN"] } },
    select: { id: true },
  });

  const notified = await notifyMany(
    recipients.filter((user) => user.id !== actor.id).map((user) => user.id),
    {
      type: "EMERGENCY",
      title: `${emergencyTypeMeta(input.type).label}: ${input.title}`,
      message: input.message,
      link: "/app/notificaciones",
    },
  );

  await logAudit({
    action: "EMERGENCY_CREATE",
    userId: actor.id,
    entity: "EmergencyAlert",
    entityId: alert.id,
    summary: `${actor.name} activó la alerta "${alert.title}" (${emergencyTypeMeta(alert.type).label}, prioridad ${alert.priority}).`,
    metadata: { type: alert.type, priority: alert.priority, notified },
  });

  return { alert, notified };
}

export async function resolveAlert(
  alertId: string,
  note: string | undefined,
  actor: { id: string; name: string; schoolId: string },
) {
  const alert = await prisma.emergencyAlert.findFirst({
    where: { id: alertId, schoolId: actor.schoolId },
  });
  if (!alert) throw new Error("La alerta indicada no existe en este centro.");
  if (alert.status === "RESOLVED") return alert;

  const updated = await prisma.emergencyAlert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedById: actor.id,
      resolutionNote: note ?? null,
    },
  });

  const recipients = await prisma.user.findMany({
    where: { schoolId: actor.schoolId, active: true, role: "PARENT" },
    select: { id: true },
  });

  await notifyMany(
    recipients.map((user) => user.id),
    {
      type: "SYSTEM",
      title: "Situación resuelta",
      message: `La alerta "${alert.title}" fue marcada como resuelta por el centro educativo.`,
      link: "/app/notificaciones",
    },
  );

  await logAudit({
    action: "EMERGENCY_RESOLVE",
    userId: actor.id,
    entity: "EmergencyAlert",
    entityId: alert.id,
    summary: `${actor.name} marcó como resuelta la alerta "${alert.title}".`,
    metadata: { note: note ?? null },
  });

  return updated;
}

// ── Incidencias ──────────────────────────────────────────────────────────────

export async function listIncidents(schoolId: string, take = 40) {
  return prisma.incident.findMany({
    where: { schoolId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, group: true } },
      authorizedPerson: { select: { id: true, name: true, qrIdentifier: true } },
      reportedBy: { select: { id: true, name: true, jobTitle: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take,
  });
}

export type IncidentRecord = Awaited<ReturnType<typeof listIncidents>>[number];

export async function createIncident(
  input: IncidentInput,
  actor: { id: string; name: string; schoolId: string },
) {
  const incident = await prisma.incident.create({
    data: {
      type: input.type,
      severity: input.severity,
      description: input.description,
      status: "OPEN",
      schoolId: actor.schoolId,
      studentId: input.studentId ?? null,
      authorizedPersonId: input.authorizedPersonId ?? null,
      reportedById: actor.id,
    },
    include: {
      student: { select: { firstName: true, lastName: true, tutorId: true } },
    },
  });

  await logAudit({
    action: "INCIDENT_CREATE",
    userId: actor.id,
    entity: "Incident",
    entityId: incident.id,
    summary: `${actor.name} reportó una incidencia (${input.type}, severidad ${input.severity}).`,
    metadata: {
      type: input.type,
      severity: input.severity,
      student: incident.student
        ? `${incident.student.firstName} ${incident.student.lastName}`
        : null,
    },
  });

  // Se informa a la dirección para que la incidencia no dependa de un solo canal.
  const admins = await prisma.user.findMany({
    where: { schoolId: actor.schoolId, role: "ADMIN", active: true },
    select: { id: true },
  });
  for (const adminUser of admins) {
    if (adminUser.id === actor.id) continue;
    await notify({
      userId: adminUser.id,
      type: "SYSTEM",
      title: "Nueva incidencia reportada",
      message: incident.student
        ? `${actor.name} reportó una incidencia relacionada con ${incident.student.firstName} ${incident.student.lastName}.`
        : `${actor.name} reportó una nueva incidencia operativa.`,
      link: "/admin/emergencias",
    });
  }

  return incident;
}

export async function setIncidentStatus(
  incidentId: string,
  status: "OPEN" | "REVIEWING" | "CLOSED",
  actor: { id: string; name: string; schoolId: string },
) {
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, schoolId: actor.schoolId },
  });
  if (!incident) throw new Error("La incidencia indicada no existe en este centro.");

  return prisma.incident.update({
    where: { id: incidentId },
    data: { status, closedAt: status === "CLOSED" ? new Date() : null },
  });
}
