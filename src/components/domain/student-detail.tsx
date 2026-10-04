import {
  BadgeCheck,
  CalendarClock,
  Droplets,
  HeartPulse,
  Info,
  Phone,
  ShieldX,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { MovementList, type MovementListItem } from "@/components/domain/movement-list";
import { StudentStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { relationshipLabel } from "@/lib/domain/roles";
import { studentStatusMeta } from "@/lib/domain/students";
import { age, formatDate } from "@/lib/utils/date";
import { maskPhone } from "@/lib/utils/format";

export type StudentDetailData = {
  id: string;
  firstName: string;
  lastName: string;
  group: string;
  status: string;
  avatarTone: string;
  birthDate: Date | null;
  bloodType: string | null;
  allergies: string | null;
  notes: string | null;
  createdAt: Date;
  tutor: { id: string; name: string; email?: string; phone: string | null; avatarTone: string };
  authorizations: Array<{
    id: string;
    active: boolean;
    relationship: string | null;
    authorizedPerson: {
      id: string;
      name: string;
      relationship: string;
      status: string;
      qrIdentifier: string;
      avatarTone: string;
      documentTail: string | null;
    };
  }>;
};

/**
 * Ficha completa del alumno, compartida por el panel del personal y el
 * administrativo. Las acciones concretas (editar, revocar…) se inyectan según
 * los permisos del rol que la consulta.
 */
export function StudentDetail({
  student,
  movements,
  headerActions,
  authorizationAction,
  tutorHref,
}: {
  student: StudentDetailData;
  movements: MovementListItem[];
  headerActions?: ReactNode;
  /** Renderiza el control de activar/revocar por autorización (solo con permiso). */
  authorizationAction?: (authorization: StudentDetailData["authorizations"][number]) => ReactNode;
  tutorHref?: string;
}) {
  const fullName = `${student.firstName} ${student.lastName}`;
  const years = age(student.birthDate);
  const statusMeta = studentStatusMeta(student.status);
  const active = student.authorizations.filter((auth) => auth.active);
  const revoked = student.authorizations.filter((auth) => !auth.active);

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <section className="sk-card overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <Avatar name={fullName} tone={student.avatarTone} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight text-ink-900 sm:text-2xl">{fullName}</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {student.group}
              {years !== null ? ` · ${years} años` : ""}
              {" · Alta: "}
              {formatDate(student.createdAt)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StudentStatusPill status={student.status} />
              <Badge className="bg-brand-50 text-brand-700 ring-brand-200" size="sm">
                {active.length} autorizados
              </Badge>
            </div>
          </div>
          {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
        </div>

        <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
            {statusMeta.description}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Personas autorizadas */}
          <SectionCard
            title="Personas autorizadas"
            description={`${active.length} vigente(s) · ${revoked.length} revocada(s).`}
            icon={<BadgeCheck className="h-5 w-5" />}
          >
            {student.authorizations.length === 0 ? (
              <EmptyState
                icon={<BadgeCheck className="h-6 w-6" />}
                title="Sin personas autorizadas"
                description="Este alumno no puede ser entregado hasta que se registre al menos una persona autorizada."
              />
            ) : (
              <ul className="space-y-2.5">
                {student.authorizations.map((auth) => {
                  const person = auth.authorizedPerson;
                  const blocked = !auth.active || person.status !== "ACTIVE";
                  return (
                    <li
                      key={auth.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 p-3"
                    >
                      <Avatar name={person.name} tone={person.avatarTone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{person.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          {relationshipLabel(auth.relationship ?? person.relationship)} ·{" "}
                          <span className="font-mono">{person.qrIdentifier}</span>
                          {person.documentTail ? ` · ID ···${person.documentTail}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {person.status !== "ACTIVE" ? (
                          <Badge className="bg-berry-50 text-berry-700 ring-berry-200" size="sm">
                            <ShieldX className="h-3 w-3" />
                            Suspendida
                          </Badge>
                        ) : auth.active ? (
                          <Badge className="bg-mint-50 text-mint-700 ring-mint-200" size="sm">
                            Autorizada
                          </Badge>
                        ) : (
                          <Badge className="bg-ink-100 text-ink-600 ring-ink-200" size="sm">
                            Revocada
                          </Badge>
                        )}
                        {authorizationAction ? authorizationAction(auth) : null}
                      </div>
                      {blocked && auth.active ? (
                        <p className="w-full rounded-xl bg-berry-50 px-3 py-1.5 text-[11px] text-berry-700">
                          La persona está suspendida en todo el centro: el escáner bloqueará la
                          entrega aunque la autorización siga activa.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* Historial */}
          <SectionCard
            title="Historial de accesos"
            description="Últimos movimientos registrados."
            icon={<CalendarClock className="h-5 w-5" />}
          >
            <MovementList movements={movements} showStudent={false} />
          </SectionCard>
        </div>

        <div className="space-y-4">
          {/* Tutor */}
          <SectionCard
            title="Tutor principal"
            description="Contacto responsable del alumno."
            icon={<UserRound className="h-5 w-5" />}
          >
            <div className="flex items-center gap-3">
              <Avatar name={student.tutor.name} tone={student.tutor.avatarTone} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{student.tutor.name}</p>
                {student.tutor.email ? (
                  <p className="truncate text-xs text-ink-500">{student.tutor.email}</p>
                ) : null}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  {maskPhone(student.tutor.phone)}
                </p>
              </div>
            </div>
            {tutorHref ? (
              <a
                href={tutorHref}
                className="mt-3 block rounded-xl bg-brand-50 py-2 text-center text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                Ver ficha del tutor
              </a>
            ) : null}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
              Los teléfonos se muestran parcialmente: el prototipo limita la exposición de datos de
              contacto en pantallas operativas.
            </p>
          </SectionCard>

          {/* Datos de salud */}
          <SectionCard
            title="Información relevante"
            description="Datos útiles durante la jornada."
            icon={<HeartPulse className="h-5 w-5" />}
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                  Tipo de sangre
                </dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {student.bloodType ?? "No registrado"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
                  <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                  Alergias
                </dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {student.allergies ?? "Ninguna registrada"}
                </dd>
              </div>
              {student.notes ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Notas
                  </dt>
                  <dd className="mt-0.5 text-ink-700">{student.notes}</dd>
                </div>
              ) : null}
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
