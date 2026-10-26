import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import type { UserInput } from "@/lib/validation/schemas";

import { logAudit } from "./audit";
import { nextQrIdentifier } from "./authorizations";

/** Consultas sobre usuarios (tutores y personal del centro). */

export async function listTutors(schoolId: string, search?: string) {
  const term = search?.trim();
  return prisma.user.findMany({
    where: {
      schoolId,
      role: "PARENT",
      ...(term
        ? { OR: [{ name: { contains: term } }, { email: { contains: term } }] }
        : {}),
    },
    include: {
      children: {
        where: { active: true },
        select: { id: true, firstName: true, lastName: true, group: true, status: true },
      },
      authorizedPersonProfile: { select: { id: true, qrIdentifier: true, status: true } },
    },
    orderBy: { name: "asc" },
  });
}

export type TutorRecord = Awaited<ReturnType<typeof listTutors>>[number];

export async function getTutor(tutorId: string, schoolId: string) {
  return prisma.user.findFirst({
    where: { id: tutorId, schoolId, role: "PARENT" },
    include: {
      children: {
        where: { active: true },
        include: {
          _count: { select: { authorizations: { where: { active: true } } } },
        },
      },
      authorizedPersonProfile: true,
      notifications: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

export async function listStaff(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId, role: { in: ["ADMIN", "STAFF"] } },
    include: {
      _count: { select: { registeredEvents: true, createdAlerts: true, reportedIncidents: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export type StaffRecord = Awaited<ReturnType<typeof listStaff>>[number];

/** Cuentas demo disponibles en el selector del login. */
export async function listDemoAccounts() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@demo.local" }, active: true },
    select: { id: true, name: true, email: true, role: true, jobTitle: true, avatarTone: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  // Se prioriza una cuenta por rol para no saturar la pantalla de acceso.
  const featured = ["admin@demo.local", "docente@demo.local", "padre@demo.local"];
  return featured
    .map((email) => users.find((user) => user.email === email))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
}

export async function getSchool(schoolId: string) {
  return prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: {
        select: { students: true, users: true, authorizedPeople: true },
      },
    },
  });
}

/** Indica si un correo ya está en uso, para avisar antes de intentar el alta. */
export async function emailExists(email: string): Promise<boolean> {
  const found = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return Boolean(found);
}

/**
 * Alta de una cuenta de usuario. Reservado a dirección (permiso MANAGE_USERS).
 *
 * Si el rol es PARENT se crea además su ficha de persona autorizada con su
 * identificador QR: sin ella el tutor no tendría credencial de recogida y la
 * pantalla «Mi QR» aparecería vacía. Es el mismo comportamiento que aplica el
 * seed, de modo que una cuenta creada aquí es indistinguible de una sembrada.
 *
 * No se asignan alumnos en este paso: la vinculación tutor ↔ alumno se hace
 * desde la ficha del alumno, que es donde el dato tiene contexto.
 */
export async function createUser(
  input: UserInput,
  actor: { id: string; name: string; schoolId: string },
) {
  const tones = ["brand", "mint", "sun", "berry"] as const;
  const avatarTone = tones[Math.floor(Math.random() * tones.length)] ?? "brand";

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      phone: input.phone ?? null,
      jobTitle: input.role === "PARENT" ? null : (input.jobTitle ?? null),
      avatarTone,
      active: true,
      schoolId: actor.schoolId,
    },
  });

  let qrIdentifier: string | null = null;

  if (input.role === "PARENT") {
    qrIdentifier = await nextQrIdentifier();
    await prisma.authorizedPerson.create({
      data: {
        name: input.name,
        relationship: input.relationship ?? "TUTOR",
        phone: input.phone ?? null,
        status: "ACTIVE",
        qrIdentifier,
        avatarTone,
        notes: "Tutor principal. Credencial generada al dar de alta la cuenta.",
        schoolId: actor.schoolId,
        userId: user.id,
      },
    });
  }

  await logAudit({
    action: "USER_CREATE",
    userId: actor.id,
    entity: "User",
    entityId: user.id,
    summary: `${actor.name} dio de alta la cuenta de ${user.name} (${user.email}) con rol ${user.role}.`,
    metadata: { role: user.role, qrIdentifier },
  });

  return { user, qrIdentifier };
}
