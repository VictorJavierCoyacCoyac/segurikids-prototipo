import {
  Activity,
  BadgeCheck,
  CalendarCheck,
  Download,
  FileWarning,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";
import type { Metadata } from "next";

import { FilterBar, FilterDate, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { GroupedBarChart, MeterBar, StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { incidentStatusMeta } from "@/lib/domain/alerts";
import { relationshipLabel } from "@/lib/domain/roles";
import { addDays, fromDateInput, toDateInput } from "@/lib/utils/date";
import { getReportData } from "@/server/services/reports";
import { listGroups, listStudents } from "@/server/services/students";

export const metadata: Metadata = { title: "Reportes" };

/**
 * Reportes de asistencia, puntualidad, recogidas e incidencias.
 * Todas las series se calculan en el servidor a partir de los movimientos
 * reales registrados por el sistema.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireRole("ADMIN");

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const from = fromDateInput(single("from") ?? "") ?? addDays(new Date(), -30);
  const to = fromDateInput(single("to") ?? "") ?? new Date();
  const group = single("group") ?? "ALL";
  const studentId = single("studentId") ?? "ALL";

  const [report, groups, students] = await Promise.all([
    getReportData({ schoolId: user.schoolId, from, to, group, studentId }),
    listGroups(user.schoolId),
    listStudents({ schoolId: user.schoolId }),
  ]);

  const exportUrl = `/api/reports/export?from=${toDateInput(from)}&to=${toDateInput(to)}&group=${encodeURIComponent(group)}&studentId=${encodeURIComponent(studentId)}`;

  return (
    <div>
      <PageHeader
        title="Reportes"
        description={`Periodo analizado: ${report.range.label} · ${report.totals.schoolDays} días hábiles`}
        action={
          <ButtonLink href={exportUrl} size="md" prefetch={false}>
            <Download className="h-4 w-4" />
            Exportar reporte
          </ButtonLink>
        }
      />

      <FilterBar action="/admin/reportes" resetHref="/admin/reportes" className="mb-4">
        <FilterField label="Grupo" htmlFor="group">
          <FilterSelect
            id="group"
            name="group"
            defaultValue={group}
            allLabel="Todos los grupos"
            options={groups.map((item) => ({ value: item, label: item }))}
          />
        </FilterField>

        <FilterField label="Alumno" htmlFor="studentId">
          <FilterSelect
            id="studentId"
            name="studentId"
            defaultValue={studentId}
            allLabel="Todos los alumnos"
            options={students.map((student) => ({
              value: student.id,
              label: `${student.firstName} ${student.lastName}`,
            }))}
          />
        </FilterField>

        <FilterField label="Desde" htmlFor="from">
          <FilterDate id="from" name="from" defaultValue={toDateInput(from)} />
        </FilterField>

        <FilterField label="Hasta" htmlFor="to">
          <FilterDate id="to" name="to" defaultValue={toDateInput(to)} />
        </FilterField>
      </FilterBar>

      {/* Indicadores del periodo */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Asistencia media"
          value={`${report.totals.attendanceRate}%`}
          hint={`${report.totals.trackedStudents} alumnos analizados`}
          icon={<CalendarCheck className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Puntualidad"
          value={`${report.totals.punctualityRate}%`}
          hint={`${report.totals.late} entradas con retraso`}
          icon={<Timer className="h-4 w-4" />}
          tone={report.totals.punctualityRate >= 85 ? "mint" : "sun"}
        />
        <StatCard
          label="Entradas"
          value={report.totals.entries}
          icon={<LogIn className="h-4 w-4" />}
          tone="mint"
        />
        <StatCard
          label="Salidas"
          value={report.totals.exits}
          hint={`${report.totals.qrPickups} con QR · ${report.totals.manualPickups} manuales`}
          icon={<LogOut className="h-4 w-4" />}
          tone="sun"
        />
      </div>

      <div className="space-y-4">
        {/* Serie diaria */}
        <SectionCard
          title="Asistencia diaria"
          description="Entradas y salidas registradas por día hábil del periodo."
          icon={<Activity className="h-5 w-5" />}
        >
          {report.daily.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="No existen movimientos para este periodo"
              description="Selecciona un rango de fechas con días hábiles."
            />
          ) : (
            <GroupedBarChart
              data={report.daily.map((day) => ({
                label: day.date.slice(0, 2),
                a: day.entries,
                b: day.exits,
              }))}
              height={200}
            />
          )}
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Asistencia por alumno */}
          <SectionCard
            title="Asistencia por alumno"
            description="Porcentaje de días hábiles con entrada registrada."
            icon={<CalendarCheck className="h-5 w-5" />}
          >
            {report.byStudent.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="h-6 w-6" />}
                title="Sin datos de asistencia"
                description="Ajusta los filtros del reporte."
              />
            ) : (
              <div className="space-y-3">
                {report.byStudent.map((student) => (
                  <MeterBar
                    key={student.id}
                    label={`${student.name} · ${student.group}`}
                    value={student.attendanceRate}
                    tone={
                      student.attendanceRate >= 90
                        ? "mint"
                        : student.attendanceRate >= 75
                          ? "brand"
                          : "sun"
                    }
                    suffix={student.late > 0 ? `${student.late} retrasos` : undefined}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <div className="space-y-4">
            {/* Recogidas */}
            <SectionCard
              title="Recogidas por persona"
              description="Quién recoge con más frecuencia en el periodo."
              icon={<BadgeCheck className="h-5 w-5" />}
            >
              {report.byPicker.length === 0 ? (
                <EmptyState
                  icon={<BadgeCheck className="h-6 w-6" />}
                  title="Sin recogidas registradas"
                  description="No hay salidas con persona identificada en el periodo."
                />
              ) : (
                <ul className="divide-y divide-ink-50">
                  {report.byPicker.map((picker, index) => (
                    <li key={picker.id} className="flex items-center gap-3 py-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{picker.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          {relationshipLabel(picker.relationship)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-ink-900">
                        {picker.pickups}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {/* Por grupo */}
            <SectionCard
              title="Movimientos por grupo"
              description="Distribución del periodo entre los grupos del centro."
              icon={<Activity className="h-5 w-5" />}
            >
              {report.byGroup.length === 0 ? (
                <EmptyState title="Sin datos por grupo" />
              ) : (
                <div className="sk-table-wrap">
                  <table className="sk-table min-w-[420px]">
                    <thead>
                      <tr>
                        <th>Grupo</th>
                        <th>Alumnos</th>
                        <th>Entradas</th>
                        <th>Salidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byGroup.map((row) => (
                        <tr key={row.group}>
                          <td className="font-semibold text-ink-900">{row.group}</td>
                          <td className="tabular-nums">{row.students}</td>
                          <td className="tabular-nums">{row.entries}</td>
                          <td className="tabular-nums">{row.exits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        {/* Incidencias */}
        <SectionCard
          title="Incidencias del periodo"
          description={`${report.totals.incidents} incidencia(s) registrada(s).`}
          icon={<FileWarning className="h-5 w-5" />}
        >
          {report.incidents.length === 0 ? (
            <EmptyState
              icon={<FileWarning className="h-6 w-6" />}
              title="Sin incidencias en el periodo"
              description="No se reportaron incidencias operativas en estas fechas."
            />
          ) : (
            <ul className="divide-y divide-ink-50">
              {report.incidents.map((incident) => {
                const status = incidentStatusMeta(incident.status);
                return (
                  <li key={incident.id} className="flex items-start gap-3 py-2.5">
                    <span className="shrink-0 text-xs tabular-nums text-ink-400">
                      {incident.date}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">{incident.type}</p>
                      <p className="text-xs leading-snug text-ink-600">{incident.description}</p>
                    </div>
                    <Badge className={status.pill} size="sm">
                      {status.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <p className="mt-4 px-1 text-xs leading-relaxed text-ink-400">
        La exportación genera un archivo CSV real con los movimientos del periodo y los filtros
        aplicados. Cada exportación queda registrada en la bitácora de auditoría.
      </p>
    </div>
  );
}
