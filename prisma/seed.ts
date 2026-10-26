/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SeguriKids · Semilla de datos de DEMOSTRACIÓN
 * ─────────────────────────────────────────────────────────────────────────────
 * Todos los datos son FICTICIOS. No se utilizan nombres, domicilios, teléfonos
 * ni identificaciones de personas reales.
 *
 * `npm run db:seed` vacía las tablas y vuelve a generar el escenario completo,
 * de modo que el prototipo se puede reiniciar tantas veces como se quiera
 * antes de una presentación.
 *
 * El escenario se construye de forma DETERMINISTA (PRNG con semilla fija) para
 * que la demostración sea siempre reproducible.
 */
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { TERMS_VERSION } from "../src/lib/domain/terms";

const prisma = new PrismaClient();

// ── Utilidades deterministas ────────────────────────────────────────────────

/** PRNG mulberry32: misma semilla ⇒ mismos datos en cada ejecución. */
function createRandom(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20260929);

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

function at(date: Date, hours: number, minutes: number): Date {
  const copy = new Date(date);
  copy.setHours(hours, minutes, randomInt(0, 59), 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

const SCHOOL_ENTRY_HOUR = 8;
const SCHOOL_ENTRY_MINUTE = 0;

function latencyMinutes(timestamp: Date): number {
  const reference = new Date(timestamp);
  reference.setHours(SCHOOL_ENTRY_HOUR, SCHOOL_ENTRY_MINUTE, 0, 0);
  return Math.round((timestamp.getTime() - reference.getTime()) / 60000);
}

// ── Escenario ────────────────────────────────────────────────────────────────

const DEMO_PASSWORD = "demo1234";

/**
 * Cuenta que se deja SIN aceptar los términos, para poder demostrar la puerta
 * de aceptación en el primer acceso. Es un tutor secundario, nunca una de las
 * tres cuentas destacadas del selector de acceso.
 */
const PENDING_TERMS_EMAIL = "tutor11@demo.local";

/** Tutores (rol PARENT). El primero es la cuenta demo principal. */
const TUTORS = [
  { key: "carmen", name: "Carmen Martínez", email: "padre@demo.local", phone: "55 1000 0101", tone: "brand" },
  { key: "javier", name: "Javier Hernández", email: "tutor2@demo.local", phone: "55 1000 0102", tone: "mint" },
  { key: "paola", name: "Paola López", email: "tutor3@demo.local", phone: "55 1000 0103", tone: "sun" },
  { key: "ernesto", name: "Ernesto Ramírez", email: "tutor4@demo.local", phone: "55 1000 0104", tone: "berry" },
  { key: "diana", name: "Diana Torres", email: "tutor5@demo.local", phone: "55 1000 0105", tone: "brand" },
  { key: "lucia", name: "Lucía Rivas", email: "tutor6@demo.local", phone: "55 1000 0106", tone: "mint" },
  { key: "marcos", name: "Marcos Castro", email: "tutor7@demo.local", phone: "55 1000 0107", tone: "ink" },
  { key: "gabriela", name: "Gabriela Domínguez", email: "tutor8@demo.local", phone: "55 1000 0108", tone: "sun" },
  { key: "rodrigo", name: "Rodrigo Fuentes", email: "tutor9@demo.local", phone: "55 1000 0109", tone: "brand" },
  { key: "ximena", name: "Ximena Salazar", email: "tutor10@demo.local", phone: "55 1000 0110", tone: "berry" },
  { key: "tomas", name: "Tomás Aguilar", email: "tutor11@demo.local", phone: "55 1000 0111", tone: "mint" },
] as const;

type TutorKey = (typeof TUTORS)[number]["key"];

/**
 * Alumnado. `todayStatus` define el estado de la jornada actual:
 *  - IN_CAMPUS  → entró hoy y está dentro (candidato a recogida)
 *  - OFF_CAMPUS → entró y ya fue entregado
 *  - ABSENT     → no registró entrada
 *  - PENDING    → requiere atención administrativa
 *
 * Sofía y Emiliano quedan EN PLANTEL a propósito: son los alumnos del flujo
 * principal de demostración (su tutora es la cuenta `padre@demo.local`).
 */
const STUDENTS = [
  { key: "sofia", firstName: "Sofía", lastName: "Martínez", group: "Kínder A", tutor: "carmen", birth: "2020-03-14", blood: "O+", allergies: "Ninguna registrada", todayStatus: "IN_CAMPUS", tone: "berry" },
  { key: "emiliano", firstName: "Emiliano", lastName: "Martínez", group: "Preescolar 2", tutor: "carmen", birth: "2021-07-02", blood: "O+", allergies: "Intolerancia a la lactosa", todayStatus: "IN_CAMPUS", tone: "brand" },
  { key: "mateo", firstName: "Mateo", lastName: "Hernández", group: "Kínder A", tutor: "javier", birth: "2020-01-28", blood: "A+", allergies: "Ninguna registrada", todayStatus: "IN_CAMPUS", tone: "mint" },
  { key: "valentina", firstName: "Valentina", lastName: "López", group: "Kínder B", tutor: "paola", birth: "2020-09-09", blood: "B+", allergies: "Polen", todayStatus: "IN_CAMPUS", tone: "sun" },
  { key: "diego", firstName: "Diego", lastName: "Ramírez", group: "Preescolar 1", tutor: "ernesto", birth: "2021-11-21", blood: "A-", allergies: "Cacahuate", todayStatus: "IN_CAMPUS", tone: "brand" },
  { key: "emma", firstName: "Emma", lastName: "Torres", group: "Kínder B", tutor: "diana", birth: "2020-05-30", blood: "O-", allergies: "Ninguna registrada", todayStatus: "OFF_CAMPUS", tone: "berry" },
  { key: "santiago", firstName: "Santiago", lastName: "Rivas", group: "Maternal", tutor: "lucia", birth: "2022-08-17", blood: "AB+", allergies: "Ninguna registrada", todayStatus: "IN_CAMPUS", tone: "mint" },
  { key: "regina", firstName: "Regina", lastName: "Castro", group: "Preescolar 2", tutor: "marcos", birth: "2021-04-05", blood: "A+", allergies: "Mariscos", todayStatus: "IN_CAMPUS", tone: "sun" },
  { key: "iker", firstName: "Iker", lastName: "Domínguez", group: "Kínder A", tutor: "gabriela", birth: "2020-02-11", blood: "B-", allergies: "Ninguna registrada", todayStatus: "ABSENT", tone: "ink" },
  { key: "camila", firstName: "Camila", lastName: "Fuentes", group: "Kínder B", tutor: "rodrigo", birth: "2020-12-01", blood: "O+", allergies: "Ninguna registrada", todayStatus: "IN_CAMPUS", tone: "brand" },
  { key: "bruno", firstName: "Bruno", lastName: "Salazar", group: "Preescolar 1", tutor: "ximena", birth: "2021-06-23", blood: "A+", allergies: "Asma leve", todayStatus: "OFF_CAMPUS", tone: "mint" },
  { key: "renata", firstName: "Renata", lastName: "Aguilar", group: "Maternal", tutor: "tomas", birth: "2022-10-08", blood: "O+", allergies: "Ninguna registrada", todayStatus: "PENDING", tone: "berry" },
] as const;

type StudentKey = (typeof STUDENTS)[number]["key"];

/**
 * Personas autorizadas adicionales (además del propio tutor, que siempre queda
 * autorizado para sus hijos). Los códigos QR son fijos para que la guía de
 * demostración del README sea siempre válida.
 */
const EXTRA_PEOPLE: Array<{
  key: string;
  name: string;
  relationship: string;
  qr: string;
  status: "ACTIVE" | "SUSPENDED";
  phone: string;
  documentTail: string;
  tone: string;
  notes?: string;
  /** Alumnos y si la autorización está vigente. */
  links: Array<{ student: StudentKey; active: boolean; relationship?: string }>;
}> = [
  {
    key: "rosa",
    name: "Rosa Elena Martínez",
    relationship: "GRANDPARENT",
    qr: "SK-DEMO-000201",
    status: "ACTIVE",
    phone: "55 2000 0201",
    documentTail: "4821",
    tone: "sun",
    notes: "Abuela materna. Recoge habitualmente los martes y jueves.",
    links: [
      { student: "sofia", active: true, relationship: "GRANDPARENT" },
      { student: "emiliano", active: true, relationship: "GRANDPARENT" },
    ],
  },
  {
    key: "luis",
    name: "Luis Ángel Ortega",
    relationship: "RELATIVE",
    qr: "SK-DEMO-000202",
    status: "ACTIVE",
    phone: "55 2000 0202",
    documentTail: "1907",
    tone: "ink",
    notes:
      "DEMO: autorización REVOCADA por la tutora. Sirve para demostrar el bloqueo de una entrega no autorizada.",
    links: [{ student: "sofia", active: false, relationship: "RELATIVE" }],
  },
  {
    key: "hugo",
    name: "Hugo Medina",
    relationship: "GRANDPARENT",
    qr: "SK-DEMO-000203",
    status: "SUSPENDED",
    phone: "55 2000 0203",
    documentTail: "3355",
    tone: "berry",
    notes: "DEMO: persona SUSPENDIDA por la dirección del centro.",
    links: [{ student: "diego", active: true, relationship: "GRANDPARENT" }],
  },
  {
    key: "beatriz",
    name: "Beatriz Nava",
    relationship: "OTHER",
    qr: "SK-DEMO-000204",
    status: "ACTIVE",
    phone: "55 2000 0204",
    documentTail: "7712",
    tone: "mint",
    notes: "Persona de confianza de la familia, autorizada por escrito.",
    links: [
      { student: "mateo", active: true, relationship: "OTHER" },
      { student: "valentina", active: true, relationship: "OTHER" },
    ],
  },
  {
    key: "sandra",
    name: "Sandra Ríos",
    relationship: "RELATIVE",
    qr: "SK-DEMO-000205",
    status: "ACTIVE",
    phone: "55 2000 0205",
    documentTail: "5590",
    tone: "brand",
    links: [
      { student: "emma", active: true, relationship: "RELATIVE" },
      { student: "camila", active: true, relationship: "RELATIVE" },
    ],
  },
  {
    key: "alberto",
    name: "Alberto Quintana",
    relationship: "TUTOR",
    qr: "SK-DEMO-000206",
    status: "ACTIVE",
    phone: "55 2000 0206",
    documentTail: "6034",
    tone: "sun",
    links: [
      { student: "regina", active: true, relationship: "TUTOR" },
      { student: "iker", active: true, relationship: "TUTOR" },
    ],
  },
  {
    key: "marta",
    name: "Marta Delgado",
    relationship: "RELATIVE",
    qr: "SK-DEMO-000207",
    status: "ACTIVE",
    phone: "55 2000 0207",
    documentTail: "2288",
    tone: "mint",
    links: [
      { student: "santiago", active: true, relationship: "RELATIVE" },
      { student: "renata", active: true, relationship: "RELATIVE" },
    ],
  },
  {
    key: "felipe",
    name: "Felipe Arriaga",
    relationship: "OTHER",
    qr: "SK-DEMO-000208",
    status: "ACTIVE",
    phone: "55 2000 0208",
    documentTail: "9041",
    tone: "ink",
    notes: "Transporte escolar autorizado por la familia Salazar.",
    links: [{ student: "bruno", active: true, relationship: "OTHER" }],
  },
];

/** Códigos QR de los tutores (su identificación personal en la app). */
const TUTOR_QR: Record<TutorKey, string> = {
  carmen: "SK-DEMO-000101",
  javier: "SK-DEMO-000102",
  paola: "SK-DEMO-000103",
  ernesto: "SK-DEMO-000104",
  diana: "SK-DEMO-000105",
  lucia: "SK-DEMO-000106",
  marcos: "SK-DEMO-000107",
  gabriela: "SK-DEMO-000108",
  rodrigo: "SK-DEMO-000109",
  ximena: "SK-DEMO-000110",
  tomas: "SK-DEMO-000111",
};

const TUTOR_RELATIONSHIP: Record<TutorKey, string> = {
  carmen: "MOTHER",
  javier: "FATHER",
  paola: "MOTHER",
  ernesto: "FATHER",
  diana: "MOTHER",
  lucia: "MOTHER",
  marcos: "FATHER",
  gabriela: "MOTHER",
  rodrigo: "FATHER",
  ximena: "MOTHER",
  tomas: "FATHER",
};

async function main() {
  console.log("\n🧹  Limpiando datos anteriores…");
  // El orden respeta las dependencias de claves foráneas.
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.emergencyAlert.deleteMany();
  await prisma.attendanceEvent.deleteMany();
  await prisma.studentAuthorizedPerson.deleteMany();
  await prisma.authorizedPerson.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  // ── Centro educativo ──────────────────────────────────────────────────────
  console.log("🏫  Creando centro educativo DEMO…");
  const school = await prisma.school.create({
    data: {
      name: "Centro Educativo Demo",
      code: "SK-DEMO",
      address: "Av. Demostración 100, Colonia Ejemplo (dirección ficticia)",
      phone: "55 0000 0000",
      status: "ACTIVE",
      entryTime: "08:00",
      exitTime: "13:00",
    },
  });

  const passwordHash = hashPassword(DEMO_PASSWORD);

  // ── Personal y dirección ──────────────────────────────────────────────────
  console.log("👩‍💼  Creando cuentas de personal…");
  const admin = await prisma.user.create({
    data: {
      name: "Andrea Solís",
      email: "admin@demo.local",
      passwordHash,
      role: "ADMIN",
      jobTitle: "Dirección general",
      phone: "55 3000 0001",
      avatarTone: "brand",
      schoolId: school.id,
    },
  });

  const staffAccess = await prisma.user.create({
    data: {
      name: "Ricardo Peña",
      email: "docente@demo.local",
      passwordHash,
      role: "STAFF",
      jobTitle: "Control de acceso",
      phone: "55 3000 0002",
      avatarTone: "mint",
      schoolId: school.id,
    },
  });

  const staffTeacher = await prisma.user.create({
    data: {
      name: "Mónica Vargas",
      email: "docente2@demo.local",
      passwordHash,
      role: "STAFF",
      jobTitle: "Docente · Kínder A",
      phone: "55 3000 0003",
      avatarTone: "sun",
      schoolId: school.id,
    },
  });

  const staffAssistant = await prisma.user.create({
    data: {
      name: "Elena Bravo",
      email: "docente3@demo.local",
      passwordHash,
      role: "STAFF",
      jobTitle: "Asistente educativa · Maternal",
      phone: "55 3000 0004",
      avatarTone: "berry",
      schoolId: school.id,
    },
  });

  const staffPool = [staffAccess, staffTeacher, staffAssistant];

  // ── Tutores ───────────────────────────────────────────────────────────────
  console.log("👨‍👩‍👧  Creando tutores…");
  const tutors = new Map<TutorKey, { id: string; name: string }>();
  for (const tutor of TUTORS) {
    const created = await prisma.user.create({
      data: {
        name: tutor.name,
        email: tutor.email,
        passwordHash,
        role: "PARENT",
        phone: tutor.phone,
        avatarTone: tutor.tone,
        schoolId: school.id,
      },
    });
    tutors.set(tutor.key, { id: created.id, name: created.name });
  }

  // ── Alumnado ──────────────────────────────────────────────────────────────
  console.log("🧒  Creando alumnado…");
  const students = new Map<StudentKey, { id: string; name: string; group: string; tutorKey: TutorKey }>();
  for (const student of STUDENTS) {
    const tutor = tutors.get(student.tutor)!;
    const created = await prisma.student.create({
      data: {
        firstName: student.firstName,
        lastName: student.lastName,
        group: student.group,
        // El estado final de hoy se aplica al terminar de generar movimientos.
        status: "ABSENT",
        birthDate: new Date(`${student.birth}T08:00:00`),
        bloodType: student.blood,
        allergies: student.allergies,
        avatarTone: student.tone,
        schoolId: school.id,
        tutorId: tutor.id,
      },
    });
    students.set(student.key, {
      id: created.id,
      name: `${created.firstName} ${created.lastName}`,
      group: created.group,
      tutorKey: student.tutor,
    });
  }

  // ── Personas autorizadas: ficha del propio tutor ───────────────────────────
  console.log("🪪  Creando personas autorizadas y sus QR…");
  const people = new Map<string, { id: string; name: string; qr: string }>();

  for (const tutor of TUTORS) {
    const user = tutors.get(tutor.key)!;
    const person = await prisma.authorizedPerson.create({
      data: {
        name: tutor.name,
        relationship: TUTOR_RELATIONSHIP[tutor.key],
        phone: tutor.phone,
        documentTail: String(randomInt(1000, 9999)),
        status: "ACTIVE",
        qrIdentifier: TUTOR_QR[tutor.key],
        avatarTone: tutor.tone,
        notes: "Tutor principal. Identificación generada automáticamente por el sistema.",
        schoolId: school.id,
        userId: user.id,
      },
    });
    people.set(`tutor:${tutor.key}`, { id: person.id, name: person.name, qr: person.qrIdentifier });

    // El tutor queda autorizado para todos sus hijos.
    const children = STUDENTS.filter((s) => s.tutor === tutor.key);
    for (const child of children) {
      await prisma.studentAuthorizedPerson.create({
        data: {
          studentId: students.get(child.key)!.id,
          authorizedPersonId: person.id,
          relationship: TUTOR_RELATIONSHIP[tutor.key],
          active: true,
          createdById: admin.id,
        },
      });
    }
  }

  // ── Personas autorizadas adicionales ──────────────────────────────────────
  for (const entry of EXTRA_PEOPLE) {
    const person = await prisma.authorizedPerson.create({
      data: {
        name: entry.name,
        relationship: entry.relationship,
        phone: entry.phone,
        documentTail: entry.documentTail,
        status: entry.status,
        qrIdentifier: entry.qr,
        avatarTone: entry.tone,
        notes: entry.notes,
        schoolId: school.id,
      },
    });
    people.set(entry.key, { id: person.id, name: person.name, qr: person.qrIdentifier });

    for (const link of entry.links) {
      const tutorKey = STUDENTS.find((s) => s.key === link.student)!.tutor;
      await prisma.studentAuthorizedPerson.create({
        data: {
          studentId: students.get(link.student)!.id,
          authorizedPersonId: person.id,
          relationship: link.relationship ?? entry.relationship,
          active: link.active,
          createdById: tutors.get(tutorKey)!.id,
        },
      });
    }
  }

  // ── Historial de 30 días de movimientos ───────────────────────────────────
  console.log("📆  Generando 30 días de movimientos de acceso…");

  type EventRow = {
    studentId: string;
    type: string;
    method: string;
    timestamp: Date;
    authorizedPersonId: string | null;
    registeredById: string;
    latencyMin: number | null;
    note: string | null;
  };

  const events: EventRow[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /** Personas que pueden recoger a cada alumno (autorizaciones vigentes). */
  function pickersFor(studentKey: StudentKey): Array<{ id: string; name: string }> {
    const tutorKey = STUDENTS.find((s) => s.key === studentKey)!.tutor;
    const list = [people.get(`tutor:${tutorKey}`)!];
    for (const entry of EXTRA_PEOPLE) {
      if (entry.status !== "ACTIVE") continue;
      const link = entry.links.find((l) => l.student === studentKey && l.active);
      if (link) list.push(people.get(entry.key)!);
    }
    return list;
  }

  // Días anteriores (30 días naturales hacia atrás, solo días hábiles).
  for (let offset = 30; offset >= 1; offset--) {
    const day = addDays(today, -offset);
    if (isWeekend(day)) continue;

    for (const student of STUDENTS) {
      // ~8 % de ausencias para que los reportes tengan variación real.
      if (random() < 0.08) continue;

      const entryAt = at(day, 7, randomInt(40, 59));
      const lateEntry = random() < 0.18;
      const entryTime = lateEntry ? at(day, 8, randomInt(5, 35)) : entryAt;

      events.push({
        studentId: students.get(student.key)!.id,
        type: "ENTRY",
        method: random() < 0.85 ? "QR" : "MANUAL",
        timestamp: entryTime,
        authorizedPersonId: pick(pickersFor(student.key)).id,
        registeredById: pick(staffPool).id,
        latencyMin: latencyMinutes(entryTime),
        note: lateEntry ? "Entrada posterior al horario establecido." : null,
      });

      const exitTime = at(day, 13, randomInt(0, 40));
      const picker = pick(pickersFor(student.key));
      events.push({
        studentId: students.get(student.key)!.id,
        type: "EXIT",
        method: random() < 0.9 ? "QR" : "MANUAL",
        timestamp: exitTime,
        authorizedPersonId: picker.id,
        registeredById: pick(staffPool).id,
        latencyMin: null,
        note: null,
      });
    }
  }

  // Jornada de hoy: coherente con el estado inicial de cada alumno.
  const now = new Date();
  const finalStatus = new Map<StudentKey, string>();

  for (const student of STUDENTS) {
    const record = students.get(student.key)!;
    const status = student.todayStatus;
    finalStatus.set(student.key, status);

    if (status === "ABSENT") continue;

    const entryTime = at(today, 7, randomInt(42, 58));
    events.push({
      studentId: record.id,
      type: "ENTRY",
      method: "QR",
      timestamp: entryTime,
      authorizedPersonId: people.get(`tutor:${record.tutorKey}`)!.id,
      registeredById: staffAccess.id,
      latencyMin: latencyMinutes(entryTime),
      note: null,
    });

    if (status === "OFF_CAMPUS") {
      // Salida ya realizada hoy (una hora antes del momento actual como máximo).
      const exitTime = new Date(Math.max(entryTime.getTime() + 3600_000, now.getTime() - 5400_000));
      const picker = pick(pickersFor(student.key));
      events.push({
        studentId: record.id,
        type: "EXIT",
        method: "QR",
        timestamp: exitTime,
        authorizedPersonId: picker.id,
        registeredById: staffAccess.id,
        latencyMin: null,
        note: null,
      });
    }

    if (status === "PENDING") {
      events[events.length - 1]!.note =
        "Entrada registrada de forma manual: pendiente de validar documentación.";
      events[events.length - 1]!.method = "MANUAL";
    }
  }

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  await prisma.attendanceEvent.createMany({ data: events });
  console.log(`   → ${events.length} movimientos registrados.`);

  // Estado operativo de hoy.
  for (const [key, status] of finalStatus) {
    await prisma.student.update({
      where: { id: students.get(key)!.id },
      data: { status },
    });
  }

  // ── Notificaciones ────────────────────────────────────────────────────────
  console.log("🔔  Generando notificaciones…");
  const carmen = tutors.get("carmen")!;
  const notifications: Array<{
    userId: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    link: string | null;
    createdAt: Date;
  }> = [];

  // Avisos de entrada de hoy para cada tutor cuyo hijo entró.
  for (const student of STUDENTS) {
    if (student.todayStatus === "ABSENT") continue;
    const record = students.get(student.key)!;
    const tutor = tutors.get(student.tutor)!;
    notifications.push({
      userId: tutor.id,
      type: "ENTRY",
      title: "Entrada registrada",
      message: `${record.name} ingresó al plantel correctamente.`,
      read: student.tutor !== "carmen",
      link: "/app/historial",
      createdAt: at(today, 7, randomInt(42, 58)),
    });

    if (student.todayStatus === "OFF_CAMPUS") {
      notifications.push({
        userId: tutor.id,
        type: "EXIT",
        title: "Salida registrada",
        message: `${record.name} salió del plantel con una persona autorizada.`,
        read: false,
        link: "/app/historial",
        createdAt: new Date(now.getTime() - 5000_000),
      });
    }
  }

  notifications.push(
    {
      userId: carmen.id,
      type: "SCHOOL_INFO",
      title: "Festival de primavera",
      message:
        "El viernes realizaremos el festival de primavera a las 10:00. La salida se adelanta a las 12:30.",
      read: false,
      link: "/app/mensajes",
      createdAt: addDays(now, -1),
    },
    {
      userId: carmen.id,
      type: "SYSTEM",
      title: "Tu código QR está activo",
      message:
        "Muestra tu código QR en el acceso para recoger a tus hijos de forma más rápida y segura.",
      read: true,
      link: "/app/qr",
      createdAt: addDays(now, -6),
    },
    {
      userId: tutors.get("javier")!.id,
      type: "SCHOOL_INFO",
      title: "Recordatorio de puntualidad",
      message: "Te recordamos que el acceso se cierra a las 08:15. Gracias por tu apoyo.",
      read: false,
      link: null,
      createdAt: addDays(now, -2),
    },
  );

  await prisma.notification.createMany({ data: notifications });

  // ── Conversaciones ────────────────────────────────────────────────────────
  console.log("💬  Generando conversaciones…");
  const conversation = await prisma.conversation.create({
    data: {
      subject: "Seguimiento de Sofía",
      schoolId: school.id,
      parentId: carmen.id,
      staffId: staffTeacher.id,
      updatedAt: new Date(now.getTime() - 3600_000),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: staffTeacher.id,
        body: "Buenos días. Sofía participó muy bien en la actividad de lectura de hoy. ¡Felicidades!",
        read: true,
        createdAt: addDays(now, -2),
      },
      {
        conversationId: conversation.id,
        senderId: carmen.id,
        body: "Muchas gracias por el aviso. ¿Necesita llevar algún material adicional mañana?",
        read: true,
        createdAt: new Date(addDays(now, -2).getTime() + 1800_000),
      },
      {
        conversationId: conversation.id,
        senderId: staffTeacher.id,
        body: "Solo su cuaderno de trabajo. Hoy la recoge su abuela Rosa Elena, ¿es correcto?",
        read: false,
        createdAt: new Date(now.getTime() - 3600_000),
      },
    ],
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      subject: "Autorización de transporte",
      schoolId: school.id,
      parentId: tutors.get("ximena")!.id,
      staffId: staffAccess.id,
      updatedAt: addDays(now, -3),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation2.id,
        senderId: tutors.get("ximena")!.id,
        body: "Buen día, solicito confirmar que Felipe Arriaga quedó autorizado para recoger a Bruno.",
        read: true,
        createdAt: addDays(now, -3),
      },
      {
        conversationId: conversation2.id,
        senderId: staffAccess.id,
        body: "Confirmado. Su autorización ya aparece activa en el sistema con su código QR asignado.",
        read: true,
        createdAt: new Date(addDays(now, -3).getTime() + 2400_000),
      },
    ],
  });

  // ── Emergencias históricas ────────────────────────────────────────────────
  console.log("🚨  Generando historial de emergencias e incidencias…");
  await prisma.emergencyAlert.createMany({
    data: [
      {
        type: "EVACUATION",
        title: "Simulacro de evacuación",
        message:
          "Simulacro programado de evacuación. Todos los grupos salieron al punto de reunión sin incidentes.",
        priority: "MEDIUM",
        status: "RESOLVED",
        schoolId: school.id,
        createdById: admin.id,
        resolvedById: admin.id,
        createdAt: addDays(now, -12),
        resolvedAt: new Date(addDays(now, -12).getTime() + 2700_000),
        resolutionNote: "Simulacro concluido en 14 minutos. Sin novedades.",
      },
      {
        type: "MEDICAL",
        title: "Atención médica en Preescolar 1",
        message:
          "Alumno con temperatura elevada. Se contactó al tutor y se activó el protocolo de atención.",
        priority: "HIGH",
        status: "RESOLVED",
        schoolId: school.id,
        createdById: staffAssistant.id,
        resolvedById: admin.id,
        createdAt: addDays(now, -5),
        resolvedAt: new Date(addDays(now, -5).getTime() + 5400_000),
        resolutionNote: "El alumno fue recogido por su tutor y se dio seguimiento telefónico.",
      },
    ],
  });

  await prisma.incident.createMany({
    data: [
      {
        type: "UNAUTHORIZED_PICKUP",
        severity: "HIGH",
        description:
          "Se presentó una persona sin autorización vigente para recoger a una alumna. Se bloqueó la entrega y se contactó a la tutora.",
        status: "CLOSED",
        schoolId: school.id,
        studentId: students.get("sofia")!.id,
        authorizedPersonId: people.get("luis")!.id,
        reportedById: staffAccess.id,
        createdAt: addDays(now, -9),
        closedAt: addDays(now, -9),
      },
      {
        type: "HEALTH",
        severity: "MEDIUM",
        description: "Raspón leve en el patio durante el recreo. Se aplicó primeros auxilios y se avisó al tutor.",
        status: "CLOSED",
        schoolId: school.id,
        studentId: students.get("mateo")!.id,
        reportedById: staffTeacher.id,
        createdAt: addDays(now, -4),
        closedAt: addDays(now, -4),
      },
      {
        type: "SUSPENDED_PERSON",
        severity: "MEDIUM",
        description:
          "Persona suspendida intentó identificarse en el acceso. Se informó a la dirección para revisión del caso.",
        status: "OPEN",
        schoolId: school.id,
        studentId: students.get("diego")!.id,
        authorizedPersonId: people.get("hugo")!.id,
        reportedById: staffAccess.id,
        createdAt: addDays(now, -1),
      },
    ],
  });

  // ── Bitácora de auditoría ─────────────────────────────────────────────────
  console.log("📋  Generando bitácora de auditoría…");
  const auditRows: Array<{
    action: string;
    entity: string | null;
    entityId: string | null;
    summary: string;
    metadata: string | null;
    userId: string | null;
    createdAt: Date;
  }> = [
    {
      action: "LOGIN",
      entity: "User",
      entityId: admin.id,
      summary: "Andrea Solís inició sesión en el panel administrativo.",
      metadata: JSON.stringify({ role: "ADMIN", demo: true }),
      userId: admin.id,
      createdAt: at(today, 7, 30),
    },
    {
      action: "LOGIN",
      entity: "User",
      entityId: staffAccess.id,
      summary: "Ricardo Peña inició sesión en el módulo de control de acceso.",
      metadata: JSON.stringify({ role: "STAFF", demo: true }),
      userId: staffAccess.id,
      createdAt: at(today, 7, 35),
    },
    {
      action: "AUTHORIZATION_REVOKE",
      entity: "AuthorizedPerson",
      entityId: people.get("luis")!.id,
      summary: "Se revocó la autorización de Luis Ángel Ortega sobre Sofía Martínez.",
      metadata: JSON.stringify({ student: "Sofía Martínez", reason: "Solicitud de la tutora" }),
      userId: carmen.id,
      createdAt: addDays(now, -10),
    },
    {
      action: "QR_SCAN_DENIED",
      entity: "AuthorizedPerson",
      entityId: people.get("luis")!.id,
      summary: "Escaneo rechazado: Luis Ángel Ortega no cuenta con autorización vigente.",
      metadata: JSON.stringify({ code: "SK-DEMO-000202", reason: "NO_ACTIVE_AUTHORIZATION" }),
      userId: staffAccess.id,
      createdAt: addDays(now, -9),
    },
    {
      action: "AUTHORIZED_PERSON_UPDATE",
      entity: "AuthorizedPerson",
      entityId: people.get("hugo")!.id,
      summary: "Hugo Medina fue suspendido como persona autorizada.",
      metadata: JSON.stringify({ status: "SUSPENDED" }),
      userId: admin.id,
      createdAt: addDays(now, -7),
    },
    {
      action: "EMERGENCY_RESOLVE",
      entity: "EmergencyAlert",
      entityId: null,
      summary: "La alerta 'Atención médica en Preescolar 1' se marcó como resuelta.",
      metadata: JSON.stringify({ priority: "HIGH" }),
      userId: admin.id,
      createdAt: addDays(now, -5),
    },
    {
      action: "STUDENT_CREATE",
      entity: "Student",
      entityId: students.get("renata")!.id,
      summary: "Alta de la alumna Renata Aguilar en el grupo Maternal.",
      metadata: JSON.stringify({ group: "Maternal" }),
      userId: admin.id,
      createdAt: addDays(now, -20),
    },
  ];

  // Auditoría derivada de los movimientos de hoy.
  const todayEvents = events.filter((event) => event.timestamp >= today);
  for (const event of todayEvents) {
    const student = STUDENTS.find((s) => students.get(s.key)!.id === event.studentId)!;
    auditRows.push({
      action: event.type === "ENTRY" ? "ENTRY_REGISTER" : "EXIT_REGISTER",
      entity: "Student",
      entityId: event.studentId,
      summary: `${event.type === "ENTRY" ? "Entrada" : "Salida"} de ${student.firstName} ${student.lastName} registrada mediante ${event.method === "QR" ? "código QR" : "registro manual"}.`,
      metadata: JSON.stringify({ method: event.method, type: event.type }),
      userId: event.registeredById,
      createdAt: event.timestamp,
    });
  }

  auditRows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  await prisma.auditLog.createMany({ data: auditRows });

  await prisma.user.updateMany({
    where: { email: { in: ["admin@demo.local", "docente@demo.local", "padre@demo.local"] } },
    data: { lastLoginAt: at(today, 7, 30) },
  });

  // ── Aceptación de términos ────────────────────────────────────────────────
  // Las cuentas sembradas se dan por aceptadas para que la demostración entre
  // directa al panel. Se deja UNA cuenta pendiente a propósito
  // (PENDING_TERMS_EMAIL) para poder mostrar la pantalla de aceptación sin
  // tener que dar de alta un usuario nuevo.
  await prisma.user.updateMany({
    where: { email: { not: PENDING_TERMS_EMAIL } },
    data: { termsAcceptedAt: at(today, 7, 0), termsVersion: TERMS_VERSION },
  });

  // ── Resumen ───────────────────────────────────────────────────────────────
  const counts = {
    alumnos: await prisma.student.count(),
    tutores: await prisma.user.count({ where: { role: "PARENT" } }),
    personal: await prisma.user.count({ where: { role: { in: ["ADMIN", "STAFF"] } } }),
    autorizados: await prisma.authorizedPerson.count(),
    movimientos: await prisma.attendanceEvent.count(),
    notificaciones: await prisma.notification.count(),
    auditoria: await prisma.auditLog.count(),
  };

  console.log(`
✅  Datos DEMO listos.

    Centro:          ${school.name} (${school.code})
    Alumnos:         ${counts.alumnos}
    Tutores:         ${counts.tutores}
    Personal:        ${counts.personal}
    Autorizados:     ${counts.autorizados}
    Movimientos:     ${counts.movimientos}
    Notificaciones:  ${counts.notificaciones}
    Auditoría:       ${counts.auditoria}

    ── Cuentas de demostración (contraseña: ${DEMO_PASSWORD}) ──
    admin@demo.local     Administración   · Andrea Solís
    docente@demo.local   Personal escolar · Ricardo Peña
    padre@demo.local     Padre / Tutor    · Carmen Martínez

    ── Códigos QR para la demostración ──
    SK-DEMO-000101  Carmen Martínez      → AUTORIZADA (Sofía y Emiliano en plantel)
    SK-DEMO-000201  Rosa Elena Martínez  → AUTORIZADA (abuela)
    SK-DEMO-000202  Luis Ángel Ortega    → NO AUTORIZADO (autorización revocada)
    SK-DEMO-000203  Hugo Medina          → NO AUTORIZADO (persona suspendida)
    SK-DEMO-999999  (inexistente)        → CÓDIGO NO RECONOCIDO
`);
}

main()
  .catch((error) => {
    console.error("\n❌  Error al generar los datos DEMO:\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
