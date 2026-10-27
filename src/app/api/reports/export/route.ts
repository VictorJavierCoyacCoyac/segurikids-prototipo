import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { addDays, fromDateInput, toDateInput } from "@/lib/utils/date";
import { toCsv } from "@/lib/utils/csv";
import { logAudit } from "@/server/services/audit";
import { getMovementsCsvRows } from "@/server/services/reports";

/**
 * Exportación de movimientos a CSV.
 *
 * La descarga es real (no simulada): genera el archivo a partir de los mismos
 * datos que muestra el reporte en pantalla, aplicando los filtros recibidos.
 * La exportación queda registrada en la auditoría porque implica extraer datos
 * del centro.
 *
 * La sesión se resuelve en el área `admin` de forma EXPLÍCITA. Las rutas de
 * `/api` no tienen área propia, y con varias sesiones abiertas en el navegador
 * (tutor, docente y dirección) se elegiría la primera que existiera, que
 * podría no ser la de dirección y haría fallar la descarga. Exportar reportes
 * es competencia exclusiva de dirección, así que esa es la sesión a usar.
 *
 * La aceptación de términos se comprueba aquí de forma explícita porque las
 * rutas de `/api` no pasan por `requireUser()`: extraer datos del centro es
 * precisamente una de las operaciones que el consentimiento habilita.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser("admin");
  if (!user) return new Response("No autorizado", { status: 401 });
  if (!user.termsAccepted) {
    return new Response("Términos pendientes de aceptación", { status: 403 });
  }
  if (!can(user.role, "VIEW_REPORTS")) {
    return new Response("Acceso denegado", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = fromDateInput(searchParams.get("from") ?? "") ?? addDays(new Date(), -30);
  const to = fromDateInput(searchParams.get("to") ?? "") ?? new Date();
  const group = searchParams.get("group") ?? undefined;
  const studentId = searchParams.get("studentId") ?? undefined;

  const { headers, rows } = await getMovementsCsvRows({
    schoolId: user.schoolId,
    from,
    to,
    group,
    studentId,
  });

  await logAudit({
    action: "REPORT_EXPORT",
    userId: user.id,
    entity: "Report",
    summary: `${user.name} exportó ${rows.length} movimiento(s) en formato CSV.`,
    metadata: {
      from: toDateInput(from),
      to: toDateInput(to),
      group: group ?? "ALL",
      studentId: studentId ?? "ALL",
    },
  });

  const filename = `segurikids-movimientos-${toDateInput(from)}_${toDateInput(to)}.csv`;

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
