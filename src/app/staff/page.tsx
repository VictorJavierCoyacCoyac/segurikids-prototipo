import {
  Activity,
  BadgeCheck,
  GraduationCap,
  LogIn,
  LogOut,
  ScanLine,
  Siren,
  Users,
} from "lucide-react";

import { ActivityFeed } from "@/components/domain/movement-list";
import { EmergencyBanner } from "@/components/domain/emergency-banner";
import { StatusLegend } from "@/components/domain/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { GroupedBarChart, MeterBar, StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { formatDateLong } from "@/lib/utils/date";
import { listTodayMovements } from "@/server/services/attendance";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { listActiveAlerts, listIncidents } from "@/server/services/emergencies";

/** Panel de jornada del personal escolar. */
export default async function StaffDashboardPage() {
  const user = await requireRole("STAFF", "ADMIN");

  const [snapshot, movements, alerts, incidents] = await Promise.all([
    getDashboardSnapshot(user.schoolId),
    listTodayMovements(user.schoolId, 12),
    listActiveAlerts(user.schoolId),
    listIncidents(user.schoolId, 5),
  ]);

  const openIncidents = incidents.filter((incident) => incident.status !== "CLOSED");

  return (
    <div className="space-y-5">
      <EmergencyBanner alerts={alerts} href="/staff/alertas" />

      {/* Acción principal de la jornada */}
      <section className="sk-hero relative overflow-hidden rounded-3xl p-5 shadow-float sm:p-6">
        <div className="sk-grid-dots absolute inset-0 opacity-50" aria-hidden="true" />
        <div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sun-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">
              {formatDateLong(new Date())}
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
              Hola, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1.5 max-w-lg text-sm text-brand-100">
              {snapshot.inCampus} {snapshot.inCampus === 1 ? "alumno" : "alumnos"} en el plantel ·{" "}
              {snapshot.exitsToday} {snapshot.exitsToday === 1 ? "salida" : "salidas"} registradas hoy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/staff/escaner" variant="white" size="lg">
              <ScanLine className="h-5 w-5" />
              Abrir escáner
            </ButtonLink>
            <ButtonLink
              href="/staff/entrada"
              variant="ghost"
              size="lg"
              className="bg-white/15 text-white hover:bg-white/25"
            >
              <LogIn className="h-5 w-5" />
              Registrar entrada
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Indicadores de la jornada */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="En plantel"
          value={snapshot.inCampus}
          hint={`de ${snapshot.totalStudents} alumnos`}
          icon={<GraduationCap className="h-4 w-4" />}
          tone="mint"
          href="/staff/alumnos?status=IN_CAMPUS"
        />
        <StatCard
          label="Entradas de hoy"
          value={snapshot.entriesToday}
          hint={snapshot.lateToday > 0 ? `${snapshot.lateToday} con retraso` : "Todas puntuales"}
          icon={<LogIn className="h-4 w-4" />}
          tone="brand"
          href="/staff/actividad?type=ENTRY"
        />
        <StatCard
          label="Salidas de hoy"
          value={snapshot.exitsToday}
          hint="Entregas confirmadas"
          icon={<LogOut className="h-4 w-4" />}
          tone="sun"
          href="/staff/actividad?type=EXIT"
        />
        <StatCard
          label="Incidencias abiertas"
          value={openIncidents.length}
          hint={alerts.length > 0 ? `${alerts.length} alerta activa` : "Sin alertas activas"}
          icon={<Siren className="h-4 w-4" />}
          tone={openIncidents.length > 0 || alerts.length > 0 ? "berry" : "ink"}
          href="/staff/alertas"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Actividad en vivo */}
        <SectionCard
          title="Actividad de la jornada"
          description="Últimos movimientos registrados en el acceso."
          icon={<Activity className="h-5 w-5" />}
          className="lg:col-span-2"
          action={
            <ButtonLink href="/staff/actividad" variant="ghost" size="sm">
              Ver todo
            </ButtonLink>
          }
        >
          <ActivityFeed movements={movements} />
        </SectionCard>

        <div className="space-y-4">
          {/* Estado del alumnado */}
          <SectionCard
            title="Estado del alumnado"
            description="Distribución actual del centro."
            icon={<Users className="h-5 w-5" />}
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
                  suffix="en plantel"
                />
              ))}
            </div>
          </SectionCard>

          {/* Accesos rápidos */}
          <SectionCard
            title="Accesos rápidos"
            description="Operaciones frecuentes."
            icon={<BadgeCheck className="h-5 w-5" />}
            bodyClassName="p-3"
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/staff/salida", label: "Salida manual", icon: LogOut },
                { href: "/staff/alumnos", label: "Buscar alumno", icon: GraduationCap },
                { href: "/staff/autorizaciones", label: "Autorizaciones", icon: BadgeCheck },
                { href: "/staff/alertas", label: "Emergencias", icon: Siren },
              ].map((item) => (
                <ButtonLink
                  key={item.href}
                  href={item.href}
                  variant="outline"
                  size="md"
                  className="justify-start"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs">{item.label}</span>
                </ButtonLink>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Flujo horario */}
      <SectionCard
        title="Entradas y salidas por hora"
        description="Distribución de los movimientos del día de hoy."
        icon={<Activity className="h-5 w-5" />}
      >
        <GroupedBarChart
          data={snapshot.hourly.map((slot) => ({
            label: slot.label.slice(0, 2),
            a: slot.entries,
            b: slot.exits,
          }))}
          height={160}
        />
      </SectionCard>
    </div>
  );
}
