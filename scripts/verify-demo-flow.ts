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
import { PrismaClient } from "@prisma/client";

import { prisma } from "../src/lib/db";
import { can } from "../src/lib/auth/permissions";
import { verifyPassword } from "../src/lib/auth/password";
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
import { addDays } from "../src/lib/utils/date";

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
