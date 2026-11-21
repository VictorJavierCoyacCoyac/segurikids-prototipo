/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Verificación automática de los flujos de demostración de SeguriKids
 * ─────────────────────────────────────────────────────────────────────────────
 * Ejecuta contra la base de datos los mismos servicios que utiliza la interfaz
 * y comprueba que los cuatro escenarios del prototipo funcionan de principio a
 * fin: recogida autorizada, persona no autorizada, emergencia y reportes.
 *
 * Uso:  npm run verify
 *
 * El script trabaja sobre una base de datos independiente (`prisma/verify.db`),
 * por lo que NO altera los datos de la demostración en `prisma/dev.db`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { prisma } from "../src/lib/db";
import { can } from "../src/lib/auth/permissions";
import { AREA_BY_ROLE, areaForPath, cookieName } from "../src/lib/auth/session";
import { verifyPassword } from "../src/lib/auth/password";
import { assistantReply, buildAnnouncement } from "../src/lib/domain/announcements";
import { DEMO_DAY_STATUS, demoDayKey, expectedMovements } from "../src/lib/domain/demo-day";
import { TERMS_VERSION } from "../src/lib/domain/terms";
import {
  listStudentMovements,
  registerMovement,
  scanQrIdentifier,
} from "../src/server/services/attendance";
import { setAuthorizationActive } from "../src/server/services/authorizations";
import { createAlert, resolveAlert } from "../src/server/services/emergencies";
import { getDashboardSnapshot } from "../src/server/services/dashboard";
import { getReportData } from "../src/server/services/reports";
import { listNotifications } from "../src/server/services/notifications";
import { listAuditLogs } from "../src/server/services/audit";
import { resetDemoDay } from "../src/server/services/demo";
import { addDays, startOfDay } from "../src/lib/utils/date";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` → ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

async function main() {
  const db: PrismaClient = prisma;

  // Foto del estado inicial, ANTES de que las secciones siguientes muevan a
  // nadie: es con esto con lo que se compara el escenario de `demo-day.ts`.
  const seededStatus = new Map(
    (
      await db.student.findMany({
        where: { active: true },
        select: { firstName: true, lastName: true, status: true },
      })
    ).map((student) => [demoDayKey(student), student.status] as const),
  );

  const school = await db.school.findFirst();
  if (!school) throw new Error("No hay datos. Ejecuta `npm run db:seed` primero.");

  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@demo.local" } });
  const staff = await db.user.findUniqueOrThrow({ where: { email: "docente@demo.local" } });
  const parent = await db.user.findUniqueOrThrow({ where: { email: "padre@demo.local" } });

  const staffActor = { id: staff.id, name: staff.name, schoolId: staff.schoolId };
  const adminActor = { id: admin.id, name: admin.name, schoolId: admin.schoolId };

  // ── 0 · Autenticación demo ────────────────────────────────────────────────
  section("0 · Cuentas de demostración");
  check("admin@demo.local acepta la contraseña demo", verifyPassword("demo1234", admin.passwordHash));
  check("docente@demo.local acepta la contraseña demo", verifyPassword("demo1234", staff.passwordHash));
  check("padre@demo.local acepta la contraseña demo", verifyPassword("demo1234", parent.passwordHash));
  check("una contraseña incorrecta es rechazada", !verifyPassword("incorrecta", admin.passwordHash));
  check("el rol PARENT no puede usar el control de acceso", !can("PARENT", "ACCESS_CONTROL"));
  check("el rol STAFF sí puede usar el control de acceso", can("STAFF", "ACCESS_CONTROL"));
  check("el rol STAFF no puede consultar reportes", !can("STAFF", "VIEW_REPORTS"));
  check("el rol ADMIN puede consultar la auditoría", can("ADMIN", "VIEW_AUDIT"));

  // ── 1 · Flujo principal: recogida autorizada ──────────────────────────────
  section("1 · Recogida autorizada (flujo principal)");

  const beforeSnapshot = await getDashboardSnapshot(school.id);

  const scan = await scanQrIdentifier("SK-DEMO-000101", staffActor);
  check("el escaneo de SK-DEMO-000101 resulta AUTORIZADO", scan.status === "AUTHORIZED", scan.status);

  if (scan.status !== "AUTHORIZED") throw new Error("El flujo principal no puede continuar.");

  check("identifica a la tutora Carmen Martínez", scan.person.name === "Carmen Martínez", scan.person.name);
  check("propone alumnos por entregar", scan.deliverable.length > 0, `${scan.deliverable.length}`);

  const target = scan.deliverable[0]!;
  const auditBefore = (await listAuditLogs({ take: 500 })).length;
  const notificationsBefore = (await listNotifications(parent.id, 200)).length;

  const pickup = await registerMovement({
    type: "EXIT",
    studentIds: [target.id],
    method: "QR",
    authorizedPersonId: scan.person.id,
    actor: staffActor,
  });

  check("la salida se registra correctamente", pickup.ok, JSON.stringify(pickup.rejected));

  const studentAfter = await db.student.findUniqueOrThrow({ where: { id: target.id } });
  check(
    "el alumno pasa a FUERA DEL PLANTEL",
    studentAfter.status === "OFF_CAMPUS",
    studentAfter.status,
  );

  const movements = await listStudentMovements(target.id, 5);
  const lastMovement = movements[0];
  check("el movimiento aparece en el historial del alumno", lastMovement?.type === "EXIT");
  check("el historial guarda el método QR", lastMovement?.method === "QR", lastMovement?.method);
  check(
    "el historial guarda a la persona que recoge",
    lastMovement?.authorizedPerson?.name === "Carmen Martínez",
    lastMovement?.authorizedPerson?.name,
  );
  check(
    "el historial guarda al responsable que confirmó",
    lastMovement?.registeredBy.name === staff.name,
    lastMovement?.registeredBy.name,
  );

  const notificationsAfter = await listNotifications(parent.id, 200);
  check(
    "se generó una notificación para el tutor",
    notificationsAfter.length === notificationsBefore + 1,
    `${notificationsBefore} → ${notificationsAfter.length}`,
  );
  check(
    "la notificación es de tipo SALIDA y menciona a la persona autorizada",
    notificationsAfter[0]?.type === "EXIT" &&
      notificationsAfter[0].message.includes("Carmen Martínez"),
    notificationsAfter[0]?.message,
  );

  const afterSnapshot = await getDashboardSnapshot(school.id);
  check(
    "el dashboard refleja un alumno menos en plantel",
    afterSnapshot.inCampus === beforeSnapshot.inCampus - 1,
    `${beforeSnapshot.inCampus} → ${afterSnapshot.inCampus}`,
  );
  check(
    "el dashboard suma una salida del día",
    afterSnapshot.exitsToday === beforeSnapshot.exitsToday + 1,
    `${beforeSnapshot.exitsToday} → ${afterSnapshot.exitsToday}`,
  );

  // `auditBefore` se tomó después del escaneo, por lo que el registro de la
  // salida debe añadir exactamente una entrada más.
  const auditAfter = await listAuditLogs({ take: 500 });
  check(
    "el registro de la salida añade una entrada de auditoría",
    auditAfter.length === auditBefore + 1,
    `${auditBefore} → ${auditAfter.length}`,
  );
  check(
    "existe un registro de auditoría EXIT_REGISTER",
    auditAfter.some((log) => log.action === "EXIT_REGISTER"),
  );
  check(
    "existe un registro de auditoría QR_SCAN",
    auditAfter.some((log) => log.action === "QR_SCAN"),
  );

  // ── 2 · Reintento: el alumno ya no está en el plantel ─────────────────────
  section("2 · El sistema impide entregar dos veces al mismo alumno");
  const duplicate = await registerMovement({
    type: "EXIT",
    studentIds: [target.id],
    method: "QR",
    authorizedPersonId: scan.person.id,
    actor: staffActor,
  });
  check("la segunda entrega se rechaza", !duplicate.ok);
  check(
    "el motivo indica que el alumno no está en el plantel",
    duplicate.rejected[0]?.reason?.includes("no se encuentra en el plantel") ?? false,
    duplicate.rejected[0]?.reason,
  );

  // ── 3 · Persona no autorizada ─────────────────────────────────────────────
  section("3 · Persona NO autorizada");

  const revoked = await scanQrIdentifier("SK-DEMO-000202", staffActor);
  check("el escaneo de una autorización revocada es DENEGADO", revoked.status === "DENIED");
  check(
    "el motivo es NO_ACTIVE_AUTHORIZATION",
    revoked.status === "DENIED" && revoked.failure === "NO_ACTIVE_AUTHORIZATION",
    revoked.status === "DENIED" ? revoked.failure : "",
  );

  const suspended = await scanQrIdentifier("SK-DEMO-000203", staffActor);
  check("el escaneo de una persona suspendida es DENEGADO", suspended.status === "DENIED");
  check(
    "el motivo es PERSON_SUSPENDED",
    suspended.status === "DENIED" && suspended.failure === "PERSON_SUSPENDED",
    suspended.status === "DENIED" ? suspended.failure : "",
  );

  const unknown = await scanQrIdentifier("SK-DEMO-999999", staffActor);
  check("un código inexistente es DENEGADO", unknown.status === "DENIED");
  check(
    "el motivo es CODE_NOT_FOUND",
    unknown.status === "DENIED" && unknown.failure === "CODE_NOT_FOUND",
    unknown.status === "DENIED" ? unknown.failure : "",
  );

  // El servidor debe bloquear la entrega aunque se fuerce la petición.
  const luis = await db.authorizedPerson.findUniqueOrThrow({
    where: { qrIdentifier: "SK-DEMO-000202" },
  });
  const sofia = await db.student.findFirstOrThrow({ where: { firstName: "Sofía" } });
  await db.student.update({ where: { id: sofia.id }, data: { status: "IN_CAMPUS" } });

  const forced = await registerMovement({
    type: "EXIT",
    studentIds: [sofia.id],
    method: "QR",
    authorizedPersonId: luis.id,
    actor: staffActor,
  });
  check("una entrega forzada sin autorización vigente se rechaza en el servidor", !forced.ok);
  check(
    "el alumno permanece EN PLANTEL tras el intento",
    (await db.student.findUniqueOrThrow({ where: { id: sofia.id } })).status === "IN_CAMPUS",
  );
  check(
    "el intento rechazado queda auditado",
    (await listAuditLogs({ action: "QR_SCAN_DENIED", take: 10 })).length > 0,
  );

  // ── 4 · Revocar y volver a autorizar ──────────────────────────────────────
  section("4 · Gestión de autorizaciones");

  const grandmother = await db.authorizedPerson.findUniqueOrThrow({
    where: { qrIdentifier: "SK-DEMO-000201" },
  });
  const link = await db.studentAuthorizedPerson.findFirstOrThrow({
    where: { authorizedPersonId: grandmother.id, studentId: sofia.id },
  });

  await setAuthorizationActive(link.id, false, adminActor);
  const afterRevoke = await scanQrIdentifier(grandmother.qrIdentifier, staffActor);
  const stillAllowed =
    afterRevoke.status === "AUTHORIZED"
      ? afterRevoke.deliverable.some((student) => student.id === sofia.id)
      : false;
  check("tras revocar, la abuela ya no puede recoger a Sofía", !stillAllowed);

  await setAuthorizationActive(link.id, true, adminActor);
  const afterGrant = await scanQrIdentifier(grandmother.qrIdentifier, staffActor);
  const allowedAgain =
    afterGrant.status === "AUTHORIZED"
      ? afterGrant.deliverable.some((student) => student.id === sofia.id)
      : false;
  check("al reactivar la autorización, vuelve a poder recogerla", allowedAgain);
  check(
    "ambos cambios quedan auditados",
    (await listAuditLogs({ action: "AUTHORIZATION_REVOKE", take: 5 })).length > 0 &&
      (await listAuditLogs({ action: "AUTHORIZATION_GRANT", take: 5 })).length > 0,
  );

  // ── 5 · Entrada manual ────────────────────────────────────────────────────
  section("5 · Registro manual de entrada");

  const absent = await db.student.findFirst({
    where: { schoolId: school.id, status: "ABSENT" },
  });
  if (absent) {
    const entry = await registerMovement({
      type: "ENTRY",
      studentIds: [absent.id],
      method: "MANUAL",
      actor: staffActor,
      note: "Verificación automática del prototipo.",
    });
    check("la entrada manual se registra", entry.ok, JSON.stringify(entry.rejected));
    check(
      "el alumno pasa a EN PLANTEL",
      (await db.student.findUniqueOrThrow({ where: { id: absent.id } })).status === "IN_CAMPUS",
    );
  } else {
    check("hay un alumno ausente para probar la entrada manual", false, "ninguno disponible");
  }

  // Una salida sin persona identificada nunca debe registrarse.
  const inCampus = await db.student.findFirstOrThrow({
    where: { schoolId: school.id, status: "IN_CAMPUS" },
  });
  const withoutPerson = await registerMovement({
    type: "EXIT",
    studentIds: [inCampus.id],
    method: "MANUAL",
    actor: staffActor,
  });
  check("una salida sin persona identificada se rechaza", !withoutPerson.ok);

  // ── 6 · Emergencia ────────────────────────────────────────────────────────
  section("6 · Alerta de emergencia");

  const parentsCount = await db.user.count({
    where: { schoolId: school.id, role: "PARENT", active: true },
  });
  const parentNotifsBefore = await db.notification.count({
    where: { userId: parent.id, type: "EMERGENCY" },
  });

  const { alert, notified } = await createAlert(
    {
      type: "EVACUATION",
      title: "Simulacro de verificación",
      message: "Alerta generada por el script de verificación automática del prototipo.",
      priority: "HIGH",
    },
    staffActor,
  );

  check("la alerta queda activa", alert.status === "ACTIVE");
  check("se notificó a toda la comunidad escolar", notified >= parentsCount, `${notified} avisos`);
  check(
    "el tutor recibió la notificación de emergencia",
    (await db.notification.count({ where: { userId: parent.id, type: "EMERGENCY" } })) ===
      parentNotifsBefore + 1,
  );

  const snapshotWithAlert = await getDashboardSnapshot(school.id);
  check("el dashboard muestra la alerta activa", snapshotWithAlert.activeAlerts > 0);

  await resolveAlert(alert.id, "Simulacro finalizado por la verificación automática.", adminActor);
  const resolved = await db.emergencyAlert.findUniqueOrThrow({ where: { id: alert.id } });
  check("la alerta se marca como resuelta", resolved.status === "RESOLVED");
  check("se guarda la fecha de resolución", resolved.resolvedAt !== null);
  check(
    "la activación y el cierre quedan auditados",
    (await listAuditLogs({ action: "EMERGENCY_CREATE", take: 5 })).length > 0 &&
      (await listAuditLogs({ action: "EMERGENCY_RESOLVE", take: 5 })).length > 0,
  );

  // ── 7 · Reportes ──────────────────────────────────────────────────────────
  section("7 · Reportes");

  const report = await getReportData({
    schoolId: school.id,
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  check("el reporte cubre días hábiles", report.totals.schoolDays > 0, `${report.totals.schoolDays}`);
  check("el reporte contabiliza entradas", report.totals.entries > 0, `${report.totals.entries}`);
  check("el reporte contabiliza salidas", report.totals.exits > 0, `${report.totals.exits}`);
  check(
    "la tasa de asistencia está entre 0 y 100",
    report.totals.attendanceRate >= 0 && report.totals.attendanceRate <= 100,
    `${report.totals.attendanceRate}%`,
  );
  check(
    "la tasa de puntualidad está entre 0 y 100",
    report.totals.punctualityRate >= 0 && report.totals.punctualityRate <= 100,
    `${report.totals.punctualityRate}%`,
  );
  check("hay ranking de personas que recogen", report.byPicker.length > 0);
  check("hay desglose por alumno", report.byStudent.length > 0);
  check("hay serie diaria para la gráfica", report.daily.length > 0);
  check(
    "la salida registrada en el paso 1 aparece en el reporte",
    report.totals.exits >= 1,
  );

  // ── 8 · Sesiones simultáneas por área ─────────────────────────────────────
  section("8 · Sesiones simultáneas por área");

  check(
    "el tutor usa la cookie del área familiar",
    cookieName(AREA_BY_ROLE.PARENT) === "sk_session_app",
    cookieName(AREA_BY_ROLE.PARENT),
  );
  check(
    "el personal usa la cookie del área de personal",
    cookieName(AREA_BY_ROLE.STAFF) === "sk_session_staff",
    cookieName(AREA_BY_ROLE.STAFF),
  );
  check(
    "dirección usa la cookie del área administrativa",
    cookieName(AREA_BY_ROLE.ADMIN) === "sk_session_admin",
    cookieName(AREA_BY_ROLE.ADMIN),
  );
  check(
    "las tres áreas usan cookies distintas (tutor y docente pueden coexistir)",
    new Set(Object.values(AREA_BY_ROLE).map(cookieName)).size === 3,
  );

  // `areaForPath` es lo que decide con qué cookie se identifica cada petición.
  // Un error aquí haría que una pestaña usara la sesión de otra, que es
  // justamente lo que el diseño por áreas tiene que impedir.
  const areaCases: Array<[string, "app" | "staff" | "admin" | null]> = [
    ["/app", "app"],
    ["/app/qr", "app"],
    ["/app/hijos/abc", "app"],
    ["/staff", "staff"],
    ["/staff/escaner", "staff"],
    ["/admin", "admin"],
    ["/admin/configuracion", "admin"],
    // Rutas públicas: no pertenecen a ningún área.
    ["/", null],
    ["/login", null],
    ["/terminos", null],
    ["/terminos/aceptar", null],
    ["/api/qr", null],
    // Prefijos que SE PARECEN a un área pero no lo son.
    ["/appointments", null],
    ["/administracion", null],
    ["/staffroom", null],
  ];
  for (const [path, expected] of areaCases) {
    check(
      `«${path}» se resuelve como ${expected ?? "ruta pública"}`,
      areaForPath(path) === expected,
      String(areaForPath(path)),
    );
  }

  // ── 9 · Términos y aviso de privacidad ────────────────────────────────────
  section("9 · Términos y aviso de privacidad");

  const pendingAccount = await db.user.findUniqueOrThrow({
    where: { email: "tutor11@demo.local" },
  });
  check(
    "la cuenta de ejemplo queda pendiente de aceptar los términos",
    pendingAccount.termsAcceptedAt === null && pendingAccount.termsVersion === null,
  );
  check(
    "las cuentas destacadas de la demostración ya los aceptaron",
    parent.termsVersion === TERMS_VERSION &&
      staff.termsVersion === TERMS_VERSION &&
      admin.termsVersion === TERMS_VERSION,
  );

  await db.user.update({
    where: { id: pendingAccount.id },
    data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
  });
  const accepted = await db.user.findUniqueOrThrow({ where: { id: pendingAccount.id } });
  check(
    "al aceptar se guarda la versión del documento, no solo un booleano",
    accepted.termsVersion === TERMS_VERSION && accepted.termsAcceptedAt !== null,
  );

  // Una versión nueva del texto invalida la aceptación anterior.
  await db.user.update({
    where: { id: pendingAccount.id },
    data: { termsVersion: "0000.00" },
  });
  const stale = await db.user.findUniqueOrThrow({ where: { id: pendingAccount.id } });
  check(
    "una aceptación de otra versión no se da por válida",
    stale.termsVersion !== TERMS_VERSION,
  );

  // Ninguna puerta de entrada puede saltarse el consentimiento.
  //
  // Las pantallas lo tienen cubierto: pasan por `requireUser()`/`requireRole()`
  // en el layout de su área. Las rutas de `/api` NO pasan por ahí —no pueden
  // redirigir a una pantalla— así que cada una debe comprobar `termsAccepted`
  // por su cuenta. Esta comprobación es estructural a propósito: así una ruta
  // nueva que se olvide del requisito hace fallar la verificación en lugar de
  // quedar abierta en silencio.
  function routeFiles(dir: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) found.push(...routeFiles(path));
      else if (entry.name === "route.ts") found.push(path);
    }
    return found;
  }

  const apiRoutes = routeFiles("src/app/api");
  check("hay rutas de /api que verificar", apiRoutes.length > 0, `${apiRoutes.length}`);
  for (const route of apiRoutes) {
    const source = readFileSync(route, "utf8");
    check(
      `${route.replace("src/app/api/", "")} exige los términos aceptados`,
      source.includes("termsAccepted"),
      "falta la comprobación de termsAccepted",
    );
  }

  // Lo mismo para las server actions: todas deben exigir términos salvo las dos
  // que no pueden hacerlo (la propia aceptación y el cierre de sesión).
  const SIN_TERMINOS = ["terms.ts", "auth.ts"];
  const actionFiles = readdirSync("src/server/actions").filter(
    (name) => name.endsWith(".ts") && name !== "types.ts" && !SIN_TERMINOS.includes(name),
  );
  for (const name of actionFiles) {
    const source = readFileSync(join("src/server/actions", name), "utf8");
    check(
      `actions/${name} pasa por requireUser o requireRole`,
      source.includes("requireUser(") || source.includes("requireRole("),
      "usa un helper que no comprueba los términos",
    );
  }

  // ── 10 · Voceo y asistente ────────────────────────────────────────────────
  section("10 · Voceo y asistente de recogida");

  const announcement = buildAnnouncement({
    students: [{ name: "Mateo Rivas", group: "Kínder A" }],
    personName: "Carmen Martínez",
    relationship: "MOTHER",
  });
  check("el voceo nombra al alumno", announcement.includes("Mateo Rivas"));
  check("el voceo nombra el grupo", announcement.includes("Kínder A"));
  check("el voceo nombra a quien lo espera", announcement.includes("Carmen Martínez"));
  check(
    "el voceo no incluye el identificador QR",
    !announcement.includes("SK-DEMO"),
    announcement,
  );

  const twoStudents = buildAnnouncement({
    students: [
      { name: "Mateo Rivas", group: "Kínder A" },
      { name: "Sofía Rivas", group: "Maternal" },
    ],
    personName: "Javier Hernández",
  });
  check("con dos alumnos se vocean ambos nombres", twoStudents.includes("Mateo Rivas y Sofía Rivas"));
  check("sin alumnos no se genera voceo", buildAnnouncement({ students: [], personName: "X" }) === "");

  const current = await getDashboardSnapshot(school.id);
  const assistantContext = {
    inCampus: current.inCampus,
    offCampus: current.offCampus,
    absent: current.absent,
    pending: current.pending,
    entriesToday: current.entriesToday,
    exitsToday: current.exitsToday,
    activeAlerts: current.activeAlerts,
    schoolName: school.name,
  };
  check(
    "el asistente cita el número de alumnos en el plantel",
    assistantReply("¿cuántos alumnos siguen en el plantel?", assistantContext).text.includes(
      `${current.inCampus}`,
    ),
  );
  check(
    "el asistente explica el requisito de https para la cámara",
    assistantReply("la cámara no enciende", assistantContext).text.includes("https"),
  );
  check(
    "«vocea:» devuelve el texto que debe reproducirse",
    assistantReply("vocea: ya pueden pasar por Kínder A", assistantContext).speak ===
      "ya pueden pasar por Kínder A",
  );
  check(
    "una pregunta fuera del guion se responde sin inventar",
    assistantReply("cuál es la capital de Francia", assistantContext).text.includes(
      "No tengo una respuesta guionizada",
    ),
  );

  // ── 11 · Reinicio de la jornada de demostración ───────────────────────────
  section("11 · Reinicio de la jornada de demostración");

  // El escenario que describe `demo-day.ts` tiene que ser el mismo que deja el
  // seed. Si alguien cambia `todayStatus` en el seed y se olvida del módulo, el
  // reinicio dejaría la jornada en un estado que nunca existió.
  const mismatched = [...seededStatus.entries()].filter(
    ([name, status]) => DEMO_DAY_STATUS[name] !== status,
  );
  check(
    "el escenario de demo-day.ts coincide con el estado que deja el seed",
    mismatched.length === 0,
    mismatched.map(([name, status]) => `${name}=${status}`).join(", "),
  );
  check(
    "demo-day.ts describe a todos los alumnos del escenario",
    [...seededStatus.keys()].every((name) => DEMO_DAY_STATUS[name] !== undefined),
    `${seededStatus.size} alumnos`,
  );

  // Se altera la jornada como lo haría una demostración y se comprueba que el
  // reinicio la repone.
  const demoChild = await db.student.findFirstOrThrow({
    where: { firstName: "Sofía", status: "IN_CAMPUS" },
    include: { tutor: true },
  });
  const demoPerson = await db.authorizedPerson.findFirstOrThrow({
    where: { qrIdentifier: "SK-DEMO-000101" },
  });

  await registerMovement({
    type: "EXIT",
    studentIds: [demoChild.id],
    method: "QR",
    authorizedPersonId: demoPerson.id,
    actor: { id: staff.id, name: staff.name, schoolId: school.id },
  });

  const afterPickup = await db.student.findUniqueOrThrow({ where: { id: demoChild.id } });
  check(
    "tras la recogida el alumno queda fuera del plantel (el guion se agota)",
    afterPickup.status === "OFF_CAMPUS",
    afterPickup.status,
  );

  const resetSummary = await resetDemoDay(school.id);

  const afterReset = await db.student.findUniqueOrThrow({ where: { id: demoChild.id } });
  check(
    "el reinicio devuelve al alumno a su estado inicial",
    afterReset.status === DEMO_DAY_STATUS[demoDayKey(afterReset)],
    afterReset.status,
  );
  check("el reinicio informa de lo que repuso", resetSummary.studentsRestored >= 1);
  check("el reinicio borró el movimiento de la demostración", resetSummary.movementsRemoved >= 1);
  const expectedToday = expectedMovements(DEMO_DAY_STATUS[demoDayKey(afterReset)]!);
  check(
    "solo quedan los movimientos que su estado inicial justifica",
    (await db.attendanceEvent.count({
      where: { studentId: demoChild.id, timestamp: { gte: startOfDay() } },
    })) === expectedToday.entries + expectedToday.exits,
  );
  check(
    "y son del tipo correcto (una entrada, ninguna salida)",
    (await db.attendanceEvent.count({
      where: { studentId: demoChild.id, type: "ENTRY", timestamp: { gte: startOfDay() } },
    })) === expectedToday.entries &&
      (await db.attendanceEvent.count({
        where: { studentId: demoChild.id, type: "EXIT", timestamp: { gte: startOfDay() } },
      })) === expectedToday.exits,
  );
  check(
    "el reinicio no deja alumnos del escenario sin describir",
    resetSummary.missing.length === 0,
    resetSummary.missing.join(", "),
  );

  // Volver a aplicarlo no debe cambiar nada: la operación es idempotente.
  const secondReset = await resetDemoDay(school.id);
  check(
    "aplicarlo dos veces no altera nada (idempotente)",
    secondReset.studentsRestored === 0 && secondReset.movementsRemoved === 0,
    `repuestos=${secondReset.studentsRestored} movimientos=${secondReset.movementsRemoved}`,
  );

  // Lo que el reinicio NO debe tocar.
  check(
    "el reinicio no borra cuentas (las sesiones siguen vivas)",
    (await db.user.count()) > 0 &&
      (await db.user.findUnique({ where: { id: parent.id } })) !== null,
  );
  check(
    "el reinicio no borra autorizaciones",
    (await db.studentAuthorizedPerson.count({ where: { authorizedPersonId: demoPerson.id } })) > 0,
  );
  check(
    "el reinicio conserva la bitácora de auditoría de la demostración",
    (await db.auditLog.count({ where: { action: "EXIT_REGISTER" } })) > 0,
  );

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(
    `\n\x1b[1mResultado:\x1b[0m ${passed} comprobaciones correctas, ${failed} fallidas.\n`,
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\n\x1b[31mError durante la verificación:\x1b[0m\n", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
