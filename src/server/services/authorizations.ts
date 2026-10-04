import { prisma } from "@/lib/db";
import type { AuthorizedPersonInput } from "@/lib/validation/schemas";

import { logAudit } from "./audit";
import { notify } from "./notifications";

/**
 * Gestión de personas autorizadas: la función más sensible del sistema, porque
 * de ella depende quién puede llevarse a un menor.
 */

/** Genera el siguiente identificador de QR con formato SK-DEMO-000000. */
export async function nextQrIdentifier(): Promise<string> {
  const last = await prisma.authorizedPerson.findFirst({
    orderBy: { qrIdentifier: "desc" },
    select: { qrIdentifier: true },
  });

  const lastNumber = last ? Number(last.qrIdentifier.replace(/\D/g, "")) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `SK-DEMO-${String(next).padStart(6, "0")}`;
}

export type PeopleFilters = {
  schoolId: string;
  search?: string;
  status?: string;
};

export async function listAuthorizedPeople(filters: PeopleFilters) {
  const { schoolId, search, status } = filters;
  const term = search?.trim();

  return prisma.authorizedPerson.findMany({
    where: {
      schoolId,
      ...(status && status !== "ALL" ? { status } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term } },
              { qrIdentifier: { contains: term.toUpperCase() } },
            ],
          }
        : {}),
    },
    include: {
      authorizations: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, group: true } },
        },
      },
      user: { select: { id: true, email: true } },
      _count: { select: { attendanceEvents: true } },
    },
    orderBy: { name: "asc" },
  });
}

export type AuthorizedPersonListItem = Awaited<ReturnType<typeof listAuthorizedPeople>>[number];

export async function getAuthorizedPerson(personId: string, schoolId: string) {
  return prisma.authorizedPerson.findFirst({
    where: { id: personId, schoolId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      authorizations: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              group: true,
              status: true,
              avatarTone: true,
              tutor: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ active: "desc" }],
      },
    },
  });
}

export type AuthorizedPersonDetail = NonNullable<Awaited<ReturnType<typeof getAuthorizedPerson>>>;

/** Personas autorizadas para los hijos de un tutor (vista de la app familiar). */
export async function listPeopleForTutor(tutorId: string, schoolId: string) {
  return prisma.authorizedPerson.findMany({
    where: {
      schoolId,
      authorizations: { some: { student: { tutorId } } },
    },
    include: {
      authorizations: {
        where: { student: { tutorId } },
        include: { student: { select: { id: true, firstName: true, lastName: true, group: true } } },
      },
      user: { select: { id: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });
}

export type TutorPersonRecord = Awaited<ReturnType<typeof listPeopleForTutor>>[number];

/** Ficha de persona autorizada del propio tutor (su QR personal). */
export async function getOwnPersonProfile(userId: string) {
  return prisma.authorizedPerson.findUnique({
    where: { userId },
    include: {
      authorizations: {
        where: { active: true },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, group: true, status: true } },
        },
      },
    },
  });
}

export async function createAuthorizedPerson(
  input: AuthorizedPersonInput,
  actor: { id: string; name: string; schoolId: string; role: string },
) {
  const qrIdentifier = await nextQrIdentifier();

  const person = await prisma.authorizedPerson.create({
    data: {
      name: input.name,
      relationship: input.relationship,
      phone: input.phone ?? null,
      documentTail: input.documentTail ?? null,
      notes: input.notes ?? null,
      status: "ACTIVE",
      qrIdentifier,
      avatarTone: ["mint", "sun", "brand", "berry"][Math.floor(Math.random() * 4)] ?? "mint",
      schoolId: actor.schoolId,
    },
  });

  await prisma.studentAuthorizedPerson.createMany({
    data: input.studentIds.map((studentId) => ({
      studentId,
      authorizedPersonId: person.id,
      relationship: input.relationship,
      active: true,
      createdById: actor.id,
    })),
  });

  const students = await prisma.student.findMany({
    where: { id: { in: input.studentIds } },
    select: { firstName: true, lastName: true, tutorId: true },
  });

  await logAudit({
    action: "AUTHORIZED_PERSON_CREATE",
    userId: actor.id,
    entity: "AuthorizedPerson",
    entityId: person.id,
    summary: `Alta de ${person.name} como persona autorizada (${qrIdentifier}) para ${students.length} alumno(s).`,
    metadata: {
      qrIdentifier,
      relationship: input.relationship,
      students: students.map((student) => `${student.firstName} ${student.lastName}`),
    },
  });

  // Se avisa a los tutores implicados: cambiar quién puede recoger a un menor
  // nunca debe pasar desapercibido.
  const tutorIds = [...new Set(students.map((student) => student.tutorId))];
  for (const tutorId of tutorIds) {
    if (tutorId === actor.id) continue;
    await notify({
      userId: tutorId,
      type: "SYSTEM",
      title: "Nueva persona autorizada",
      message: `${person.name} fue registrada como persona autorizada para recoger a tu hijo(a).`,
      link: "/app/autorizados",
    });
  }

  return person;
}

/** Activa o revoca la autorización de una persona sobre un alumno concreto. */
export async function setAuthorizationActive(
  authorizationId: string,
  active: boolean,
  actor: { id: string; name: string; schoolId: string },
) {
  const authorization = await prisma.studentAuthorizedPerson.findFirst({
    where: { id: authorizationId, student: { schoolId: actor.schoolId } },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, tutorId: true } },
      authorizedPerson: { select: { id: true, name: true } },
    },
  });

  if (!authorization) {
    throw new Error("La autorización indicada no existe en este centro.");
  }

  await prisma.studentAuthorizedPerson.update({
    where: { id: authorizationId },
    data: { active },
  });

  const studentName = `${authorization.student.firstName} ${authorization.student.lastName}`;

  await logAudit({
    action: active ? "AUTHORIZATION_GRANT" : "AUTHORIZATION_REVOKE",
    userId: actor.id,
    entity: "AuthorizedPerson",
    entityId: authorization.authorizedPerson.id,
    summary: active
      ? `Se otorgó a ${authorization.authorizedPerson.name} autorización para recoger a ${studentName}.`
      : `Se revocó la autorización de ${authorization.authorizedPerson.name} sobre ${studentName}.`,
    metadata: { student: studentName, person: authorization.authorizedPerson.name, active },
  });

  if (authorization.student.tutorId !== actor.id) {
    await notify({
      userId: authorization.student.tutorId,
      type: "SYSTEM",
      title: active ? "Autorización activada" : "Autorización revocada",
      message: active
        ? `${authorization.authorizedPerson.name} ya puede recoger a ${studentName}.`
        : `${authorization.authorizedPerson.name} ya no puede recoger a ${studentName}.`,
      link: "/app/autorizados",
    });
  }

  return { active, studentName, personName: authorization.authorizedPerson.name };
}

/** Suspende o reactiva a una persona autorizada en todo el centro. */
export async function setPersonStatus(
  personId: string,
  status: "ACTIVE" | "SUSPENDED",
  actor: { id: string; name: string; schoolId: string },
) {
  const person = await prisma.authorizedPerson.findFirst({
    where: { id: personId, schoolId: actor.schoolId },
  });
  if (!person) throw new Error("La persona indicada no existe en este centro.");

  await prisma.authorizedPerson.update({ where: { id: personId }, data: { status } });

  await logAudit({
    action: "AUTHORIZED_PERSON_UPDATE",
    userId: actor.id,
    entity: "AuthorizedPerson",
    entityId: personId,
    summary:
      status === "SUSPENDED"
        ? `${person.name} fue suspendida como persona autorizada.`
        : `${person.name} fue reactivada como persona autorizada.`,
    metadata: { status },
  });

  return { name: person.name, status };
}

/**
 * Personas que el personal puede seleccionar en "Simular escaneo".
 * Se incluyen casos válidos y no válidos a propósito, para poder demostrar
 * ambos resultados de la validación.
 */
export async function listScannablePeople(schoolId: string) {
  const people = await prisma.authorizedPerson.findMany({
    where: { schoolId },
    include: {
      authorizations: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, status: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return people.map((person) => {
    const activeLinks = person.authorizations.filter((link) => link.active);
    const inCampus = activeLinks.filter((link) => link.student.status === "IN_CAMPUS");
    const willBeAuthorized = person.status === "ACTIVE" && inCampus.length > 0;

    return {
      id: person.id,
      name: person.name,
      relationship: person.relationship,
      qrIdentifier: person.qrIdentifier,
      status: person.status,
      avatarTone: person.avatarTone,
      studentNames: activeLinks.map((link) => `${link.student.firstName} ${link.student.lastName}`),
      inCampusCount: inCampus.length,
      /** Resultado esperado del escaneo: guía al presentador de la demo. */
      expected: willBeAuthorized
        ? ("AUTHORIZED" as const)
        : person.status !== "ACTIVE"
          ? ("SUSPENDED" as const)
          : activeLinks.length === 0
            ? ("UNAUTHORIZED" as const)
            : ("UNAVAILABLE" as const),
    };
  });
}

export type ScannablePerson = Awaited<ReturnType<typeof listScannablePeople>>[number];
