import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Droplets,
  HeartPulse,
  Info,
  School,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MovementList } from "@/components/domain/movement-list";
import { StudentStatusPill } from "@/components/domain/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { relationshipLabel } from "@/lib/domain/roles";
import { studentStatusMeta } from "@/lib/domain/students";
import { age } from "@/lib/utils/date";
import { listStudentMovements } from "@/server/services/attendance";
import { getChild } from "@/server/services/students";

export const metadata: Metadata = { title: "Detalle del alumno" };

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("PARENT");

  // Un tutor solo puede consultar a sus propios hijos.
  const child = await getChild(id, user.id);
  if (!child) notFound();

  const movements = await listStudentMovements(child.id, 20);
  const statusMeta = studentStatusMeta(child.status);
  const fullName = `${child.firstName} ${child.lastName}`;
  const years = age(child.birthDate);

  const activeAuthorizations = child.authorizations.filter((auth) => auth.active);
  const revokedAuthorizations = child.authorizations.filter((auth) => !auth.active);

  return (
    <div className="space-y-5">
      <Link
        href="/app/hijos"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis hijos
      </Link>

      {/* Ficha del alumno */}
      <section className="sk-card overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <Avatar name={fullName} tone={child.avatarTone} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight text-ink-900">{fullName}</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {child.group}
              {years !== null ? ` · ${years} años` : ""}
            </p>
            <div className="mt-3">
              <StudentStatusPill status={child.status} />
            </div>
          </div>
        </div>

        <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
            {statusMeta.description}
          </p>
        </div>
      </section>

      {/* Datos de interés */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: School, label: "Grupo", value: child.group },
          { icon: Droplets, label: "Tipo de sangre", value: child.bloodType ?? "No registrado" },
          {
            icon: HeartPulse,
            label: "Alergias",
            value: child.allergies ?? "Ninguna registrada",
          },
        ].map((item) => (
          <div key={item.label} className="sk-card p-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="mt-2.5 text-xs font-medium uppercase tracking-wide text-ink-400">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Personas autorizadas */}
      <SectionCard
        title="Quién puede recogerlo"
        description={`${activeAuthorizations.length} autorización(es) vigente(s).`}
        icon={<BadgeCheck className="h-5 w-5" />}
        action={
          <ButtonLink href="/app/autorizados" variant="secondary" size="sm">
            Administrar
          </ButtonLink>
        }
      >
        {activeAuthorizations.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck className="h-6 w-6" />}
            title="Sin personas autorizadas"
            description="Registra al menos una persona autorizada para agilizar la recogida."
            action={
              <ButtonLink href="/app/autorizados" size="sm">
                Registrar persona
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {activeAuthorizations.map((auth) => (
              <li
                key={auth.id}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3"
              >
                <Avatar
                  name={auth.authorizedPerson.name}
                  tone={auth.authorizedPerson.avatarTone}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {auth.authorizedPerson.name}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {relationshipLabel(auth.relationship ?? auth.authorizedPerson.relationship)}
                    {" · "}
                    <span className="font-mono">{auth.authorizedPerson.qrIdentifier}</span>
                  </p>
                </div>
                {auth.authorizedPerson.status === "SUSPENDED" ? (
                  <Badge className="bg-berry-50 text-berry-700 ring-berry-200" size="sm">
                    Suspendida
                  </Badge>
                ) : (
                  <Badge className="bg-mint-50 text-mint-700 ring-mint-200" size="sm">
                    Activa
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {revokedAuthorizations.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-ink-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Autorizaciones revocadas
            </p>
            <ul className="mt-2 space-y-1.5">
              {revokedAuthorizations.map((auth) => (
                <li key={auth.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink-600">{auth.authorizedPerson.name}</span>
                  <Badge className="bg-white text-ink-500 ring-ink-200" size="sm">
                    Sin autorización
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SectionCard>

      {/* Historial del alumno */}
      <SectionCard
        title="Historial de accesos"
        description="Últimos movimientos registrados por el centro."
        icon={<CalendarClock className="h-5 w-5" />}
        action={
          <ButtonLink href={`/app/historial?studentId=${child.id}`} variant="ghost" size="sm">
            Filtrar
          </ButtonLink>
        }
      >
        <MovementList movements={movements} showStudent={false} />
      </SectionCard>
    </div>
  );
}
