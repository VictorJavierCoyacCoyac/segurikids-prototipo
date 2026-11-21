/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensayo general previo a una presentación
 * ─────────────────────────────────────────────────────────────────────────────
 * Uso:  npm run ensayo          (con el servidor levantado en el puerto 3000)
 *
 * `verify` y `simulate` trabajan sobre bases de datos aparte y no prueban la
 * aplicación servida. Este ensayo recorre el guion completo contra la BASE REAL
 * de la demostración y contra el servidor que está en marcha: pide las páginas
 * por HTTP con cookies de sesión reales, ejecuta el escaneo y la entrega con
 * los mismos servicios que usa la interfaz, y comprueba que las pantallas
 * reflejan el cambio.
 *
 * Al terminar aplica el reinicio de la jornada, de modo que la base queda como
 * estaba. Si el ensayo se interrumpe a la mitad puede dejar algún alumno fuera
 * del plantel; se corrige con el botón «Reiniciar la jornada» de Configuración.
 *
 * ⚠️ DEMO: herramienta de presentación. No debe existir en producción, igual
 * que el reinicio de la jornada en el que se apoya.
 */
import { createHmac } from "node:crypto";

import { prisma } from "../src/lib/db";
import { buildAnnouncement } from "../src/lib/domain/announcements";
import { DEMO_DAY_STATUS, demoDayKey } from "../src/lib/domain/demo-day";
import { startOfDay } from "../src/lib/utils/date";
import { registerMovement, scanQrIdentifier } from "../src/server/services/attendance";
import { listAuditLogs } from "../src/server/services/audit";
import { resetDemoDay } from "../src/server/services/demo";
import { listNotifications } from "../src/server/services/notifications";

const BASE = "http://localhost:3000";
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
function step(title: string) {
  console.log(`\n\x1b[1m\x1b[36m── ${title} ─────────────────────────\x1b[0m`);
}
function say(text: string) {
  console.log(`     \x1b[2m${text}\x1b[0m`);
}

function cookieFor(userId: string, area: string): string {
  const secret = process.env.SESSION_SECRET!;
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() }), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `sk_session_${area}=${payload}.${signature}`;
}

async function get(path: string, cookies: string[]): Promise<{ status: number; html: string }> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { cookie: cookies.join("; ") },
    redirect: "manual",
  });
  return { status: response.status, html: await response.text() };
}

/** ¿Aparece `needle` cerca de `anchor` en el HTML? */
function nearby(html: string, anchor: string, needle: string, span = 2500): boolean {
  let from = 0;
  for (;;) {
    const at = html.indexOf(anchor, from);
    if (at === -1) return false;
    if (html.slice(at, at + span).includes(needle)) return true;
    from = at + anchor.length;
  }
}

async function statusMap(): Promise<Map<string, string>> {
  const students = await prisma.student.findMany({
    where: { active: true },
    select: { firstName: true, lastName: true, status: true },
  });
  return new Map(students.map((s) => [demoDayKey(s), s.status]));
}

async function todayMovements(): Promise<number> {
  return prisma.attendanceEvent.count({ where: { timestamp: { gte: startOfDay(new Date()) } } });
}

async function main() {
  console.log("\n\x1b[1m🎬  ENSAYO GENERAL · base real + servidor en marcha\x1b[0m");

  // ── 1 · El servidor responde ───────────────────────────────────────────────
  step("1 · El servidor está en marcha");
  const login = await fetch(`${BASE}/login`).catch(() => null);
  check("GET /login responde 200", login?.status === 200, String(login?.status));
  if (!login || login.status !== 200) throw new Error("El servidor no responde en " + BASE);

  // ── 2 · Estado de partida ──────────────────────────────────────────────────
  step("2 · La jornada arranca en su estado de guion");
  const statusAntes = await statusMap();
  const movimientosAntes = await todayMovements();
  let coinciden = 0;
  for (const [nombre, esperado] of Object.entries(DEMO_DAY_STATUS)) {
    if (statusAntes.get(nombre) === esperado) coinciden++;
  }
  check(
    `los ${Object.keys(DEMO_DAY_STATUS).length} alumnos están como marca el guion`,
    coinciden === Object.keys(DEMO_DAY_STATUS).length,
    `${coinciden} coinciden`,
  );
  check("hay movimientos registrados hoy", movimientosAntes > 0, String(movimientosAntes));
  say(`Movimientos de hoy: ${movimientosAntes}`);

  // ── 3 · Las tres áreas en el mismo navegador ───────────────────────────────
  step("3 · Tres sesiones simultáneas en un mismo navegador");
  const tutor = await prisma.user.findUniqueOrThrow({ where: { email: "padre@demo.local" } });
  const docente = await prisma.user.findUniqueOrThrow({ where: { email: "docente@demo.local" } });
  const direccion = await prisma.user.findUniqueOrThrow({ where: { email: "admin@demo.local" } });

  const jar = [
    cookieFor(tutor.id, "app"),
    cookieFor(docente.id, "staff"),
    cookieFor(direccion.id, "admin"),
  ];

  const rutas = [
    "/app",
    "/app/qr",
    "/app/hijos",
    "/app/historial",
    "/staff",
    "/staff/escaner",
    "/staff/voceo",
    "/admin",
    "/admin/movimientos",
    "/admin/configuracion",
  ];
  for (const ruta of rutas) {
    const { status } = await get(ruta, jar);
    check(`${ruta} → 200 con las tres cookies puestas`, status === 200, String(status));
  }

  const perfil = await get("/app/perfil", jar);
  check("el área del tutor identifica a su propia cuenta", perfil.html.includes(tutor.name));
  const panelStaff = await get("/staff", jar);
  check("el área del personal identifica a su propia cuenta", panelStaff.html.includes(docente.name));
  const panelAdmin = await get("/admin", jar);
  check("el área de dirección identifica a su propia cuenta", panelAdmin.html.includes(direccion.name));

  // ── 4 · El tutor enseña su código ──────────────────────────────────────────
  step("4 · El tutor abre su código QR");
  const persona = await prisma.authorizedPerson.findFirstOrThrow({
    where: { qrIdentifier: "SK-DEMO-000101" },
  });
  const pantallaQr = await get("/app/qr", jar);
  check("la pantalla del tutor muestra su identificador", pantallaQr.html.includes(persona.qrIdentifier));
  check(
    "la pantalla del QR no filtra el teléfono del tutor",
    !tutor.phone || !pantallaQr.html.includes(tutor.phone),
  );

  // ── 5 · El personal escanea ────────────────────────────────────────────────
  step("5 · El personal escanea el código");
  const actor = { id: docente.id, name: docente.name, schoolId: docente.schoolId };
  const escaneo = await scanQrIdentifier(persona.qrIdentifier, actor);
  check("el escaneo resuelve AUTORIZADO", escaneo.status === "AUTHORIZED", escaneo.status);
  if (escaneo.status !== "AUTHORIZED") throw new Error("El escaneo del guion falló.");
  say(`${escaneo.person.name} → ${escaneo.deliverable.map((s) => s.name).join(", ")}`);
  check("hay alumnos entregables", escaneo.deliverable.length > 0);

  const sofia = escaneo.deliverable.find((s) => s.name.startsWith("Sofía"));
  check("Sofía aparece como entregable", Boolean(sofia));
  if (!sofia) throw new Error("Sofía no es entregable.");

  // ── 6 · El voceo ───────────────────────────────────────────────────────────
  step("6 · El voceo");
  const voceo = buildAnnouncement({
    students: [{ name: sofia.name, group: sofia.group }],
    personName: escaneo.person.name,
    relationship: escaneo.person.relationship,
  });
  console.log(`\n     \x1b[1m\x1b[33m🔊 «${voceo}»\x1b[0m\n`);
  check("el voceo nombra al alumno", voceo.includes("Sofía"));
  check("el voceo NO dice el identificador del QR", !voceo.includes(persona.qrIdentifier));
  check(
    "el voceo NO dice los dígitos de la identificación",
    persona.documentTail !== null && !voceo.includes(persona.documentTail),
    persona.documentTail ?? "la ficha no tiene dígitos registrados",
  );

  // ── 7 · La entrega ─────────────────────────────────────────────────────────
  step("7 · El personal confirma la entrega");
  const avisosAntes = (await listNotifications(tutor.id)).length;
  const salida = await registerMovement({
    type: "EXIT",
    studentIds: [sofia.id],
    method: "QR",
    authorizedPersonId: persona.id,
    actor,
  });
  check("la salida queda registrada", salida.ok && salida.registered.length === 1);
  const sofiaTras = await prisma.student.findUniqueOrThrow({ where: { id: sofia.id } });
  check("el alumno pasa a FUERA DEL PLANTEL", sofiaTras.status === "OFF_CAMPUS", sofiaTras.status);

  const avisos = await listNotifications(tutor.id);
  check("el tutor recibe el aviso de salida", avisos.length > avisosAntes);
  if (avisos[0]) say(`Aviso → «${avisos[0].title}: ${avisos[0].message}»`);

  const bitacora = await listAuditLogs({ take: 20 });
  check("la bitácora registra el escaneo", bitacora.some((l) => l.action === "QR_SCAN"));
  check("la bitácora registra la salida", bitacora.some((l) => l.action === "EXIT_REGISTER"));

  // ── 8 · Las pantallas lo reflejan ──────────────────────────────────────────
  step("8 · Las pantallas reflejan el cambio");
  const hijos = await get("/app/hijos", jar);
  check("la pantalla del tutor muestra a Sofía fuera del plantel",
    nearby(hijos.html, "Sof", "Fuera del plantel"));
  const movimientos = await get("/admin/movimientos", jar);
  check("dirección ve el movimiento recién registrado", movimientos.html.includes("Sofía"));

  // ── 9 · Lo que debe fallar, falla ──────────────────────────────────────────
  step("9 · Los códigos que no deben pasar");
  for (const [codigo, etiqueta] of [
    ["SK-DEMO-000202", "autorización revocada"],
    ["SK-DEMO-000203", "persona suspendida"],
    ["SK-DEMO-999999", "código inexistente"],
  ] as const) {
    const intento = await scanQrIdentifier(codigo, actor);
    check(`${codigo} (${etiqueta}) NO queda autorizado`, intento.status !== "AUTHORIZED", intento.status);
  }
  const trasDenegados = await listAuditLogs({ take: 10 });
  check(
    "los intentos denegados quedan en la bitácora",
    trasDenegados.filter((l) => l.action === "QR_SCAN_DENIED").length >= 3,
  );

  // ── 10 · El botón de reinicio ──────────────────────────────────────────────
  step("10 · Reinicio de la jornada");
  const resumen = await resetDemoDay(direccion.schoolId);
  say(JSON.stringify(resumen));
  check("el reinicio repone al menos un alumno", resumen.studentsRestored >= 1);
  check("el reinicio no encuentra alumnos fuera del guion", resumen.missing.length === 0);

  const statusDespues = await statusMap();
  const movimientosDespues = await todayMovements();
  let iguales = 0;
  for (const [nombre, estado] of statusAntes) {
    if (statusDespues.get(nombre) === estado) iguales++;
  }
  check("todos los alumnos vuelven a su estado de partida", iguales === statusAntes.size,
    `${iguales}/${statusAntes.size}`);
  check("los movimientos del día vuelven a su número de partida",
    movimientosDespues === movimientosAntes, `${movimientosDespues} vs ${movimientosAntes}`);

  const segundo = await resetDemoDay(direccion.schoolId);
  check("aplicarlo otra vez no cambia nada (idempotente)",
    segundo.studentsRestored === 0 && segundo.movementsRemoved === 0);

  // ── 11 · Las sesiones sobreviven ───────────────────────────────────────────
  step("11 · Las sesiones siguen vivas tras el reinicio");
  for (const ruta of ["/app", "/app/qr", "/staff/escaner", "/admin/configuracion"]) {
    const { status } = await get(ruta, jar);
    check(`${ruta} sigue respondiendo 200 con la misma cookie`, status === 200, String(status));
  }
  const tutorTras = await prisma.user.findUnique({ where: { id: tutor.id } });
  check("la cuenta del tutor conserva su identificador", tutorTras?.id === tutor.id);

  // ── 12 · Estado final ──────────────────────────────────────────────────────
  step("12 · La base queda lista para volver a empezar");
  const escaneoFinal = await scanQrIdentifier(persona.qrIdentifier, actor);
  check("el mismo QR vuelve a autorizar la recogida de Sofía",
    escaneoFinal.status === "AUTHORIZED" &&
      escaneoFinal.deliverable.some((s) => s.name.startsWith("Sofía")));

  console.log(
    `\n\x1b[1mResultado:\x1b[0m ${passed} comprobaciones correctas, ${failed} fallidas.\n`,
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\n\x1b[31m" + (error instanceof Error ? error.stack : error) + "\x1b[0m");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
