import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  MessageSquare,
  QrCode,
  Users,
} from "lucide-react";
import Link from "next/link";

import { EmergencyBanner } from "@/components/domain/emergency-banner";
import { MovementList } from "@/components/domain/movement-list";
import { NotificationList } from "@/components/domain/notification-list";
import { StudentCard } from "@/components/domain/student-card";
import { SectionCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { formatDateLong } from "@/lib/utils/date";
import { listMovements } from "@/server/services/attendance";
import { getOwnPersonProfile } from "@/server/services/authorizations";
import { listActiveAlerts } from "@/server/services/emergencies";
import { listNotifications } from "@/server/services/notifications";
import { listChildren } from "@/server/services/students";

/** Inicio de la app familiar: estado de los hijos y acceso directo al QR. */
export default async function ParentHomePage() {
  const user = await requireRole("PARENT");

  const [children, notifications, alerts, profile] = await Promise.all([
    listChildren(user.id),
    listNotifications(user.id, 4),
    listActiveAlerts(user.schoolId),
    getOwnPersonProfile(user.id),
  ]);

  const childIds = children.map((child) => child.id);
  const recentMovements =
    childIds.length > 0
      ? await listMovements({ schoolId: user.schoolId, studentIds: childIds, take: 5 })
      : [];

  const inCampus = children.filter((child) => child.status === "IN_CAMPUS").length;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-5">
      <EmergencyBanner alerts={alerts} href="/app/notificaciones" />

      {/* Saludo y resumen del día */}
      <section className="sk-hero relative overflow-hidden rounded-3xl p-5 shadow-float">
        <div className="sk-grid-dots absolute inset-0 opacity-50" aria-hidden="true" />
        <div
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sun-400/25 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">
            {formatDateLong(new Date())}
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">Hola, {firstName}</h1>
          <p className="mt-1.5 text-sm text-brand-100">
            {children.length === 0
              ? "Aún no tienes alumnos asociados a tu cuenta."
              : inCampus > 0
                ? `${inCampus} de ${children.length} ${children.length === 1 ? "hijo" : "hijos"} ${inCampus === 1 ? "está" : "están"} en el plantel en este momento.`
                : "Ninguno de tus hijos se encuentra en el plantel ahora mismo."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/app/qr" variant="white" size="md">
              <QrCode className="h-4 w-4" />
              Mostrar mi QR
            </ButtonLink>
            <ButtonLink
              href="/app/historial"
              variant="ghost"
              size="md"
              className="bg-white/15 text-white hover:bg-white/25"
            >
              <CalendarClock className="h-4 w-4" />
              Historial
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Estado de los hijos */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink-900">Mis hijos</h2>
          <Link
            href="/app/hijos"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
          >
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {children.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Sin alumnos asociados"
            description="Solicita a la dirección del centro que vincule a tus hijos con tu cuenta."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((child) => {
              const lastEvent = child.attendanceEvents[0];
              return (
                <StudentCard
                  key={child.id}
                  href={`/app/hijos/${child.id}`}
                  name={`${child.firstName} ${child.lastName}`}
                  group={child.group}
                  status={child.status}
                  avatarTone={child.avatarTone}
                  meta={`${child.authorizations.length} autorizados`}
                  lastEvent={
                    lastEvent
                      ? {
                          type: lastEvent.type,
                          timestamp: lastEvent.timestamp,
                          personName: lastEvent.authorizedPerson?.name ?? null,
                        }
                      : null
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Accesos rápidos */}
      <section className="grid grid-cols-2 gap-3">
        {[
          {
            href: "/app/autorizados",
            label: "Personas autorizadas",
            hint: "Quién puede recoger",
            icon: BadgeCheck,
            tone: "bg-mint-50 text-mint-600",
          },
          {
            href: "/app/mensajes",
            label: "Mensajes",
            hint: "Hablar con la escuela",
            icon: MessageSquare,
            tone: "bg-sun-50 text-sun-600",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="sk-card group flex flex-col gap-2 p-4 transition hover:border-brand-200 hover:shadow-float"
          >
            <span className={`grid h-10 w-10 place-items-center rounded-2xl ${item.tone}`}>
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink-900">{item.label}</span>
              <span className="block text-xs text-ink-500">{item.hint}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Últimos movimientos */}
      <SectionCard
        title="Últimos movimientos"
        description="Entradas y salidas registradas por el centro."
        icon={<CalendarClock className="h-5 w-5" />}
        action={
          <ButtonLink href="/app/historial" variant="ghost" size="sm">
            Ver historial
          </ButtonLink>
        }
      >
        <MovementList
          movements={recentMovements}
          relative
          emptyTitle="Todavía no hay movimientos"
          emptyDescription="Cuando tu hijo entre o salga del plantel lo verás aquí."
        />
      </SectionCard>

      {/* Avisos recientes */}
      <SectionCard
        title="Avisos recientes"
        description="Notificaciones del centro educativo."
        icon={<MessageSquare className="h-5 w-5" />}
        action={
          <ButtonLink href="/app/notificaciones" variant="ghost" size="sm">
            Ver todos
          </ButtonLink>
        }
      >
        <NotificationList notifications={notifications} />
      </SectionCard>

      {/* Recordatorio del identificador propio */}
      {profile ? (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900">Tu identificador de recogida</p>
            <p className="font-mono text-xs font-semibold tracking-wider text-brand-700">
              {profile.qrIdentifier}
            </p>
          </div>
          <ButtonLink href="/app/qr" size="sm" variant="secondary">
            Abrir
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
