import { prisma } from "@/lib/db";
import type { StudentInput } from "@/lib/validation/schemas";

import { logAudit } from "./audit";

/** Consultas y altas de alumnado. */

export type StudentFilters = {
  schoolId: string;
  search?: string;
  group?: string;
  status?: string;
};

export async function listStudents(filters: StudentFilters) {
  const { schoolId, search, group, status } = filters;
  const term = search?.trim();

  return prisma.student.findMany({
    where: {
      schoolId,
      active: true,
      ...(group && group !== "ALL" ? { group } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
      ...(term
        ? {
            OR: [
              { firstName: { contains: term } },
              { lastName: { contains: term } },
              { group: { contains: term } },
              { tutor: { name: { contains: term } } },
            ],
          }
        : {}),
    },
    include: {
      tutor: { select: { id: true, name: true, phone: true, avatarTone: true } },
      _count: { select: { authorizations: { where: { active: true } } } },
    },
    orderBy: [{ group: "asc" }, { firstName: "asc" }],
  });
}

export type StudentListItem = Awaited<ReturnType<typeof listStudents>>[number];

export async function getStudent(studentId: string, schoolId: string) {
  return prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      tutor: { select: { id: true, name: true, email: true, phone: true, avatarTone: true } },
      school: { select: { name: true, entryTime: true, exitTime: true } },
      authorizations: {
        include: {
          authorizedPerson: true,
        },
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      },
    },
  });
}

export type StudentDetail = NonNullable<Awaited<ReturnType<typeof getStudent>>>;

/** Alumnos de un tutor: base de toda la experiencia de la app familiar. */
export async function listChildren(tutorId: string) {
  return prisma.student.findMany({
    where: { tutorId, active: true },
    include: {
      authorizations: {
        where: { active: true },
        include: { authorizedPerson: true },
      },
      attendanceEvents: {
        orderBy: { timestamp: "desc" },
        take: 1,
        include: { authorizedPerson: { select: { name: true } } },
      },
    },
    orderBy: { firstName: "asc" },
  });
}

export type ChildRecord = Awaited<ReturnType<typeof listChildren>>[number];

export async function getChild(studentId: string, tutorId: string) {
  return prisma.student.findFirst({
    where: { id: studentId, tutorId, active: true },
    include: {
      tutor: { select: { id: true, name: true, phone: true } },
      school: { select: { name: true, entryTime: true, exitTime: true } },
      authorizations: {
        include: { authorizedPerson: true },
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function listGroups(schoolId: string): Promise<string[]> {
  const rows = await prisma.student.findMany({
    where: { schoolId, active: true },
    select: { group: true },
    distinct: ["group"],
    orderBy: { group: "asc" },
  });
  return rows.map((row) => row.group);
}

export async function createStudent(
  input: StudentInput,
  actor: { id: string; name: string; schoolId: string },
) {
  const student = await prisma.student.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      group: input.group,
      status: input.status,
      birthDate: input.birthDate ? new Date(`${input.birthDate}T08:00:00`) : null,
      bloodType: input.bloodType ?? null,
      allergies: input.allergies ?? null,
      notes: input.notes ?? null,
      tutorId: input.tutorId,
      schoolId: actor.schoolId,
      avatarTone: ["brand", "mint", "sun", "berry"][Math.floor(Math.random() * 4)] ?? "brand",
    },
    include: { tutor: { select: { id: true, name: true } } },
  });

  // El tutor principal queda autorizado automáticamente para recoger a su hijo.
  const tutorPerson = await prisma.authorizedPerson.findUnique({
    where: { userId: input.tutorId },
  });
  if (tutorPerson) {
    await prisma.studentAuthorizedPerson.create({
      data: {
        studentId: student.id,
        authorizedPersonId: tutorPerson.id,
        relationship: tutorPerson.relationship,
        active: true,
        createdById: actor.id,
      },
    });
  }

  await logAudit({
    action: "STUDENT_CREATE",
    userId: actor.id,
    entity: "Student",
    entityId: student.id,
    summary: `Alta del alumno ${student.firstName} ${student.lastName} en el grupo ${student.group}.`,
    metadata: { group: student.group, tutor: student.tutor.name },
  });

  return student;
}

export async function updateStudent(
  studentId: string,
  input: StudentInput,
  actor: { id: string; name: string; schoolId: string },
) {
  const student = await prisma.student.update({
    where: { id: studentId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      group: input.group,
      status: input.status,
      birthDate: input.birthDate ? new Date(`${input.birthDate}T08:00:00`) : null,
      bloodType: input.bloodType ?? null,
      allergies: input.allergies ?? null,
      notes: input.notes ?? null,
      tutorId: input.tutorId,
    },
  });

  await logAudit({
    action: "STUDENT_UPDATE",
    userId: actor.id,
    entity: "Student",
    entityId: student.id,
    summary: `Modificación del alumno ${student.firstName} ${student.lastName}.`,
    metadata: { group: student.group, status: student.status },
  });

  return student;
}
