import { prisma } from "@/lib/db";

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
