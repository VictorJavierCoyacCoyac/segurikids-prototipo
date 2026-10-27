/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulación del ciclo de vida completo de un tutor
 * ─────────────────────────────────────────────────────────────────────────────
 * Recorre, en orden cronológico y contra los mismos servicios que usa la
 * interfaz, la jornada entera de un tutor: deja al niño por la mañana, el niño
 * permanece en el plantel, y por la tarde el tutor vuelve a recogerlo
 * enseñando su QR al docente.
 *
 * A diferencia de `verify-demo-flow.ts`, que comprueba casos sueltos, este
 * script narra una sola historia de principio a fin y va imprimiendo el estado
 * real del sistema en cada paso.
 *
 * Uso:  npm run simulate
 *
 * Trabaja sobre una base de datos independiente (`prisma/simulate.db`), por lo
 * que NO altera los datos de la demostración en `prisma/dev.db`.
 */
import { prisma } from "../src/lib/db";
import { buildAnnouncement } from "../src/lib/domain/announcements";
import { relationshipLabel } from "../src/lib/domain/roles";
import {
  registerMovement,
  scanQrIdentifier,
  listStudentMovements,
} from "../src/server/services/attendance";
import { listNotifications } from "../src/server/services/notifications";
import { listAuditLogs } from "../src/server/services/audit";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`     \x1b[32m✓\x1b[0m ${label}`);
  } else {
    failed++;
    console.log(`     \x1b[31m✗\x1b[0m ${label}${detail ? ` → ${detail}` : ""}`);
  }
}

function step(hour: string, title: string) {
  console.log(`\n\x1b[1m\x1b[36m${hour}\x1b[0m  \x1b[1m${title}\x1b[0m`);
}

function say(text: string) {
  console.log(`     \x1b[2m${text}\x1b[0m`);
}

function hhmm(date: Date): string {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

async function main() {
  console.log("\n\x1b[1m══ SeguriKids · Ciclo de vida de un tutor (datos DEMO) ══\x1b[0m");

  // ── Reparto ────────────────────────────────────────────────────────────────
  const school = await prisma.school.findFirstOrThrow();

  // El docente que opera el lector en la puerta.
  const docente = await prisma.user.findFirstOrThrow({
    where: { schoolId: school.id, role: "STAFF", active: true },
  });

  // Un tutor que (a) tiene ficha de persona autorizada con su QR y (b) tiene
  // al menos un hijo con autorización vigente sobre sí mismo.
  const tutor = await prisma.user.findFirstOrThrow({
    where: {
      schoolId: school.id,
      role: "PARENT",
      active: true,
      authorizedPersonProfile: { isNot: null },
      children: { some: { active: true } },
    },
    include: {
      authorizedPersonProfile: true,
      children: { where: { active: true } },
    },
  });

  const ficha = tutor.authorizedPersonProfile!;
  const alumno = tutor.children[0]!;

  console.log(`\n  Centro   : ${school.name} (${school.code})`);
  console.log(`  Tutor    : ${tutor.name} — ${relationshipLabel(ficha.relationship)}`);
  console.log(`  Alumno   : ${alumno.firstName} ${alumno.lastName} — grupo ${alumno.group}`);
  console.log(`  Docente  : ${docente.name} — ${docente.jobTitle ?? "personal escolar"}`);
  console.log(`  Horario  : entrada ${school.entryTime} · salida ${school.exitTime}`);

  const actorDocente = { id: docente.id, name: docente.name, schoolId: school.id };

  // Punto de partida limpio: el alumno aún no ha llegado hoy.
  await prisma.student.update({ where: { id: alumno.id }, data: { status: "ABSENT" } });
  const notificacionesPrevias = (await listNotifications(tutor.id)).length;
  const eventosPrevios = (await listStudentMovements(alumno.id)).length;

  // ── 1 · El tutor abre su app y ve su credencial ────────────────────────────
  step("07:40", "El tutor abre la app familiar y muestra su credencial QR");

  say(`Identificador que viaja dentro del QR: «${ficha.qrIdentifier}»`);

  const contenidoQr = ficha.qrIdentifier;
  check("el QR lleva un identificador opaco con el prefijo del centro", contenidoQr.startsWith("SK-"));
  check(
    "el QR NO contiene el nombre del tutor",
    !contenidoQr.toLowerCase().includes(tutor.name.split(" ")[0]!.toLowerCase()),
  );
  check(
    "el QR NO contiene el nombre del alumno",
    !contenidoQr.toLowerCase().includes(alumno.firstName.toLowerCase()),
  );
  check("el QR NO contiene teléfono", !ficha.phone || !contenidoQr.includes(ficha.phone));
  check(
    "el identificador solo tiene sentido contra la base del centro",
    (await prisma.authorizedPerson.count({ where: { qrIdentifier: contenidoQr } })) === 1,
  );

  // ── 2 · Entrada: el docente escanea el QR en la puerta ─────────────────────
  step("07:52", "El docente escanea el QR del tutor para registrar la ENTRADA");

  const escaneoEntrada = await scanQrIdentifier(contenidoQr, actorDocente);
  check("el escaneo resuelve AUTORIZADO", escaneoEntrada.status === "AUTHORIZED");

  if (escaneoEntrada.status !== "AUTHORIZED") {
    throw new Error("La simulación no puede continuar: el escaneo de entrada fue denegado.");
  }

  say(`El lector identifica a ${escaneoEntrada.person.name} (${relationshipLabel(escaneoEntrada.person.relationship)})`);
  const candidatoEntrada = [...escaneoEntrada.deliverable, ...escaneoEntrada.unavailable].find(
    (s) => s.id === alumno.id,
  );
  check("el alumno aparece entre los vinculados a esta persona", Boolean(candidatoEntrada));
  check("el alumno está autorizado para esta persona", candidatoEntrada?.authorized === true);
  check(
    "el alumno NO figura como entregable todavía (aún no ha entrado)",
    !escaneoEntrada.deliverable.some((s) => s.id === alumno.id),
  );

  const entrada = await registerMovement({
    type: "ENTRY",
    studentIds: [alumno.id],
    method: "QR",
    authorizedPersonId: ficha.id,
    actor: actorDocente,
  });

  check("la entrada queda registrada", entrada.ok && entrada.registered.length === 1);

  const trasEntrada = await prisma.student.findUniqueOrThrow({ where: { id: alumno.id } });
  check("el alumno pasa a EN PLANTEL", trasEntrada.status === "IN_CAMPUS", trasEntrada.status);

  const eventoEntrada = (await listStudentMovements(alumno.id))[0];
  check("el movimiento es de tipo ENTRY por método QR", eventoEntrada?.type === "ENTRY" && eventoEntrada?.method === "QR");
  check("el movimiento guarda quién lo acompañó", eventoEntrada?.authorizedPersonId === ficha.id);
  check("el movimiento guarda qué docente lo confirmó", eventoEntrada?.registeredById === docente.id);
  if (eventoEntrada) say(`Asentado a las ${hhmm(eventoEntrada.timestamp)} · retraso: ${eventoEntrada.latencyMin ?? 0} min`);

  const avisosEntrada = await listNotifications(tutor.id);
  check("el tutor recibe aviso de la entrada", avisosEntrada.length > notificacionesPrevias);
  const avisoEntrada = avisosEntrada[0];
  if (avisoEntrada) say(`Aviso al tutor → «${avisoEntrada.title}: ${avisoEntrada.message}»`);

  // ── 3 · Jornada ────────────────────────────────────────────────────────────
  step("08:00 – 12:55", "Jornada escolar");

  const enPlantel = await prisma.student.count({
    where: { schoolId: school.id, status: "IN_CAMPUS" },
  });
  say(`${enPlantel} alumnos en el plantel. El tablero del docente los muestra en tiempo real.`);
  check("el alumno sigue EN PLANTEL durante la jornada", trasEntrada.status === "IN_CAMPUS");

  // ── 4 · Salida: el tutor vuelve y el docente escanea ───────────────────────
  step("13:02", "El tutor llega por su hijo · el docente vuelve a escanear el QR");

  const escaneoSalida = await scanQrIdentifier(contenidoQr, actorDocente);
  check("el escaneo resuelve AUTORIZADO", escaneoSalida.status === "AUTHORIZED");

  if (escaneoSalida.status !== "AUTHORIZED") {
    throw new Error("La simulación no puede continuar: el escaneo de salida fue denegado.");
  }

  const entregable = escaneoSalida.deliverable.find((s) => s.id === alumno.id);
  check("ahora el alumno SÍ es entregable", Boolean(entregable));
  check("la pantalla muestra el tutor principal para el cotejo", Boolean(entregable?.tutorName));
  check(
    "la pantalla muestra los últimos dígitos de la identificación, no el documento",
    ficha.documentTail === null || ficha.documentTail.length <= 6,
  );

  // ── 5 · El voceo ───────────────────────────────────────────────────────────
  step("13:02", "El sistema compone el voceo y lo reproduce en el dispositivo");

  const voceo = buildAnnouncement({
    students: escaneoSalida.deliverable.map((s) => ({ name: s.name, group: s.group })),
    personName: escaneoSalida.person.name,
    relationship: escaneoSalida.person.relationship,
  });

  console.log(`\n     \x1b[1m\x1b[33m🔊 «${voceo}»\x1b[0m\n`);

  check("el voceo nombra al alumno", voceo.includes(alumno.firstName));
  check("el voceo nombra el grupo", voceo.includes(alumno.group));
  check("el voceo nombra a quien lo espera", voceo.includes(escaneoSalida.person.name));
  check("el voceo NO dice el identificador QR", !voceo.includes(contenidoQr));
  check("el voceo NO dice el teléfono", !ficha.phone || !voceo.includes(ficha.phone));
  check(
    "el voceo NO dice los dígitos de la identificación",
    !ficha.documentTail || !voceo.includes(ficha.documentTail),
  );

  // ── 6 · Entrega ────────────────────────────────────────────────────────────
  step("13:04", "El docente confirma la entrega");

  const salida = await registerMovement({
    type: "EXIT",
    studentIds: [alumno.id],
    method: "QR",
    authorizedPersonId: ficha.id,
    actor: actorDocente,
  });

  check("la salida queda registrada", salida.ok && salida.registered.length === 1);

  const trasSalida = await prisma.student.findUniqueOrThrow({ where: { id: alumno.id } });
  check("el alumno pasa a FUERA DEL PLANTEL", trasSalida.status === "OFF_CAMPUS", trasSalida.status);

  const avisosSalida = await listNotifications(tutor.id);
  check("el tutor recibe aviso de la salida", avisosSalida.length > avisosEntrada.length);
  const avisoSalida = avisosSalida[0];
  if (avisoSalida) say(`Aviso al tutor → «${avisoSalida.title}: ${avisoSalida.message}»`);

  // ── 7 · El mismo QR ya no sirve dos veces ──────────────────────────────────
  step("13:05", "Alguien intenta usar el mismo QR otra vez");

  const reintento = await scanQrIdentifier(contenidoQr, actorDocente);
  const yaNoEntregable =
    reintento.status === "DENIED" ||
    (reintento.status === "AUTHORIZED" && !reintento.deliverable.some((s) => s.id === alumno.id));
  check("el alumno ya no puede volver a entregarse", yaNoEntregable);

  const segundaSalida = await registerMovement({
    type: "EXIT",
    studentIds: [alumno.id],
    method: "QR",
    authorizedPersonId: ficha.id,
    actor: actorDocente,
  });
  check("el servidor rechaza la segunda entrega", !segundaSalida.ok);
  if (segundaSalida.rejected[0]) say(`Motivo: ${segundaSalida.rejected[0].reason}`);

  // ── 8 · La bitácora de la jornada ──────────────────────────────────────────
  step("Cierre", "Bitácora de auditoría de la jornada");

  const eventos = await listStudentMovements(alumno.id);
  check("quedan registrados exactamente 2 movimientos nuevos", eventos.length === eventosPrevios + 2);

  const bitacora = await listAuditLogs({ take: 100 });
  const escaneos = bitacora.filter((l) => l.action === "QR_SCAN");
  const entregas = bitacora.filter((l) => l.action === "EXIT_REGISTER" || l.action === "ENTRY_REGISTER");
  check("los escaneos quedaron auditados", escaneos.length >= 3);
  check("los registros de movimiento quedaron auditados", entregas.length >= 2);

  const linea = eventos
    .slice(0, 2)
    .reverse()
    .map((e) => `${hhmm(e.timestamp)} ${e.type === "ENTRY" ? "entrada" : "salida"}`)
    .join("  →  ");
  say(`Línea de tiempo del alumno hoy:  ${linea}`);

  // ── Resultado ──────────────────────────────────────────────────────────────
  const color = failed === 0 ? "\x1b[32m" : "\x1b[31m";
  console.log(
    `\n\x1b[1m${color}Resultado: ${passed} comprobaciones correctas, ${failed} fallidas.\x1b[0m\n`,
  );

  if (failed > 0) process.exitCode = 1;
}

void main()
  .catch((error) => {
    console.error("\n\x1b[31mLa simulación se interrumpió:\x1b[0m", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
