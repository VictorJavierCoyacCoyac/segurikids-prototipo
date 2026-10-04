import {
  Activity,
  BadgeCheck,
  ClipboardList,
  FileWarning,
  GraduationCap,
  LogIn,
  LogOut,
  ScanLine,
  ScrollText,
  Siren,
  UserRound,
} from "lucide-react";

import { AlertList, IncidentList } from "@/components/domain/alert-list";
import { ActivityFeed } from "@/components/domain/movement-list";
import { EmergencyBanner } from "@/components/domain/emergency-banner";
import { StatusLegend } from "@/components/domain/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { GroupedBarChart, MeterBar, StatCard } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { auditActionMeta, AUDIT_TONE_CLASS } from "@/lib/domain/audit";
import { formatDateLong, formatRelative } from "@/lib/utils/date";
import { percent } from "@/lib/utils/format";
import { listTodayMovements } from "@/server/services/attendance";
import { listAuditLogs } from "@/server/services/audit";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { listAlerts, listActiveAlerts, listIncidents } from "@/server/services/emergencies";

/**
 * Dashboard de dirección: responde «¿qué está pasando ahora mismo?».
 * Orden de lectura: alertas → indicadores clave → actividad → detalle.
 */
export default async function AdminDashboardPage() {
  const user = await requireRole("ADMIN");

  const [snapshot, movements, activeAlerts, alerts, incidents, audit] = await Promise.all([
    getDashboardSnapshot(user.schoolId),
    listTodayMovements(user.schoolId, 10),
    listActiveAlerts(user.schoolId),
    listAlerts(user.schoolId, 4),
    listIncidents(user.schoolId, 5),
    listAuditLogs({ take: 8 }),
  ]);

  const openIncidents = incidents.filter((incident) => incident.status !== "CLOSED");
  const now = new Date();

  return (
    <div className="space-y-5">
      <EmergencyBanner alerts={activeAlerts} href="/admin/emergencias" />

      {/* Cabecera */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            {formatDateLong(now)}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Panel de dirección
          </h1>
          <p className="mt-1 text-sm text-ink-500">{user.schoolName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/reportes" variant="outline" size="md">
            <Activity className="h-4 w-4" />
            Reportes
          </ButtonLink>
          <ButtonLink href="/staff/escaner" size="md">
            <ScanLine className="h-4 w-4" />
            Control de acceso
          </ButtonLink>
        </div>
      </header>

      {/* Indicadores principales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total de alumnos"
          value={snapshot.totalStudents}
          hint={`${snapshot.byGroup.length} grupos`}
          icon={<GraduationCap className="h-4 w-4" />}
          tone="brand"
          href="/admin/alumnos"
        />
        <StatCard
          label="Presentes"
          value={snapshot.inCampus}
          hint={`${percent(snapshot.inCampus, snapshot.totalStudents)}% del alumnado`}
          icon={<LogIn className="h-4 w-4" />}
          tone="mint"
          href="/admin/alumnos?status=IN_CAMPUS"
        />
        <StatCard
          label="Ya salieron"
          value={snapshot.offCampus}
          hint={`${snapshot.exitsToday} salidas hoy`}
          icon={<LogOut className="h-4 w-4" />}
          tone="sun"
          href="/admin/alumnos?status=OFF_CAMPUS"
        />
        <StatCard
          label="Ausentes"
          value={snapshot.absent}
          hint={snapshot.pending > 0 ? `${snapshot.pending} requieren atención` : "Sin pendientes"}
          icon={<UserRound className="h-4 w-4" />}
          tone={snapshot.pending > 0 ? "berry" : "ink"}
          href="/admin/alumnos?status=ABSENT"
        />
      </div>

      {/* Indicadores secundarios */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Entradas del día"
          value={snapshot.entriesToday}
          hint={snapshot.lateToday > 0 ? `${snapshot.lateToday} con retraso` : "Todas puntuales"}
          icon={<ClipboardList className="h-4 w-4" />}
          tone="brand"
          href="/admin/movimientos?type=ENTRY"
        />
        <StatCard
          label="Personas autorizadas"
          value={snapshot.authorizedPeople}
          hint={
            snapshot.suspendedPeople > 0
              ? `${snapshot.suspendedPeople} suspendidas`
              : "Todas activas"
          }
          icon={<BadgeCheck className="h-4 w-4" />}
          tone="mint"
          href="/admin/autorizados"
        />
        <StatCard
          label="Alertas activas"
          value={snapshot.activeAlerts}
          hint={snapshot.activeAlerts > 0 ? "Requieren cierre" : "Centro sin emergencias"}
          icon={<Siren className="h-4 w-4" />}
          tone={snapshot.activeAlerts > 0 ? "berry" : "ink"}
          href="/admin/emergencias"
        />
        <StatCard
          label="Incidencias abiertas"
          value={openIncidents.length}
          hint="Pendientes de revisión"
          icon={<FileWarning className="h-4 w-4" />}
          tone={openIncidents.length > 0 ? "sun" : "ink"}
          href="/admin/emergencias"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Movimientos del día */}
        <SectionCard
          title="Entradas y salidas de hoy"
          description="Distribución horaria de los movimientos registrados."
          icon={<Activity className="h-5 w-5" />}
          className="lg:col-span-2"
        >
          <GroupedBarChart
            data={snapshot.hourly.map((slot) => ({
              label: slot.label.slice(0, 2),
              a: slot.entries,
              b: slot.exits,
            }))}
            height={180}
          />

          <div className="mt-4 grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Entradas</p>
              <p className="text-xl font-bold text-ink-900">{snapshot.entriesToday}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Salidas</p>
              <p className="text-xl font-bold text-ink-900">{snapshot.exitsToday}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Puntualidad
              </p>
              <p className="text-xl font-bold text-ink-900">
                {snapshot.entriesToday > 0
                  ? `${percent(snapshot.entriesToday - snapshot.lateToday, snapshot.entriesToday)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Estado por grupo */}
        <SectionCard
          title="Ocupación por grupo"
          description="Alumnos presentes sobre el total de cada grupo."
          icon={<GraduationCap className="h-5 w-5" />}
        >
          <StatusLegend
            counts={{
              inCampus: snapshot.inCampus,
              offCampus: snapshot.offCampus,
              absent: snapshot.absent,
              pending: snapshot.pending,
            }}
          />
          <div className="mt-4 space-y-3">
            {snapshot.byGroup.map((group) => (
              <MeterBar
                key={group.group}
                label={group.group}
                value={group.inCampus}
                total={group.total}
                tone="mint"
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Últimos accesos */}
        <SectionCard
          title="Últimos accesos"
          description="Movimientos más recientes del centro."
          icon={<ClipboardList className="h-5 w-5" />}
          action={
            <ButtonLink href="/admin/movimientos" variant="ghost" size="sm">
              Ver todos
            </ButtonLink>
          }
        >
          <ActivityFeed movements={movements} />
        </SectionCard>

        <div className="space-y-4">
          {/* Alertas */}
          <SectionCard
            title="Emergencias"
            description="Alertas recientes del centro."
            icon={<Siren className="h-5 w-5" />}
            action={
              <ButtonLink href="/admin/emergencias" variant="ghost" size="sm">
                Gestionar
              </ButtonLink>
            }
          >
            <AlertList alerts={alerts} />
          </SectionCard>

          {/* Incidencias */}
          <SectionCard
            title="Incidencias"
            description="Reportes del personal escolar."
            icon={<FileWarning className="h-5 w-5" />}
          >
            <IncidentList incidents={incidents} />
          </SectionCard>
        </div>
      </div>

      {/* Actividad del sistema */}
      <SectionCard
        title="Actividad reciente del sistema"
        description="Últimas acciones registradas en la bitácora de auditoría."
        icon={<ScrollText className="h-5 w-5" />}
        action={
          <ButtonLink href="/admin/auditoria" variant="ghost" size="sm">
            Ver auditoría
          </ButtonLink>
        }
      >
        <ul className="divide-y divide-ink-50">
          {audit.map((log) => {
            const meta = auditActionMeta(log.action);
            return (
              <li key={log.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <Badge className={AUDIT_TONE_CLASS[meta.tone]} size="sm">
                  {meta.label}
                </Badge>
                <p className="min-w-0 flex-1 text-sm text-ink-700">{log.summary}</p>
                <span className="shrink-0 text-[11px] text-ink-400">
                  {formatRelative(log.createdAt, now)}
                </span>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}
