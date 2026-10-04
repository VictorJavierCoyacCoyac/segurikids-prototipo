import { ArrowLeft, BadgeCheck, CalendarClock, Phone, QrCode, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthorizationToggle } from "@/components/domain/authorization-toggle";
import { MovementList } from "@/components/domain/movement-list";
import { PersonStatusToggle } from "@/components/domain/person-status-toggle";
import { QrCard } from "@/components/domain/qr-card";
import { PersonStatusPill, StudentStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { relationshipLabel } from "@/lib/domain/roles";
import { formatDate } from "@/lib/utils/date";
import { listPersonPickups } from "@/server/services/attendance";
import { getAuthorizedPerson } from "@/server/services/authorizations";

export const metadata: Metadata = { title: "Persona autorizada" };

export default async function AdminAuthorizedPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ADMIN");

  const person = await getAuthorizedPerson(id, user.schoolId);
  if (!person) notFound();

  const pickups = await listPersonPickups(person.id, 30);
  const active = person.authorizations.filter((auth) => auth.active);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/autorizados"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Personas autorizadas
      </Link>

      <PageHeader
        eyebrow="Persona autorizada"
        title={person.name}
        description={`${relationshipLabel(person.relationship)} · Alta: ${formatDate(person.createdAt)}`}
        action={
          <PersonStatusToggle
            personId={person.id}
            personName={person.name}
            status={person.status}
            size="md"
          />
        }
      />

      {person.status === "SUSPENDED" ? (
        <Alert tone="danger" title="Persona suspendida">
          El escáner rechazará su código en todos los accesos, independientemente de las
          autorizaciones individuales que conserve.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Ficha */}
          <SectionCard
            title="Datos de la persona"
            description="Información utilizada para el cotejo en la entrega."
            icon={<BadgeCheck className="h-5 w-5" />}
          >
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={person.name} tone={person.avatarTone} size="lg" />
              <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Estado
                  </dt>
                  <dd className="mt-1">
                    <PersonStatusPill status={person.status} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Relación
                  </dt>
                  <dd className="mt-0.5 font-semibold text-ink-900">
                    {relationshipLabel(person.relationship)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                    <Phone className="h-3 w-3" aria-hidden="true" />
                    Teléfono
                  </dt>
                  <dd className="mt-0.5 font-semibold text-ink-900">
                    {person.phone ?? "No registrado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Identificación
                  </dt>
                  <dd className="mt-0.5 font-semibold text-ink-900">
                    {person.documentTail ? `Termina en ${person.documentTail}` : "No registrada"}
                  </dd>
                </div>
                {person.user ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                      Cuenta vinculada
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink-900">
                      {person.user.name} · {person.user.email}
                    </dd>
                  </div>
                ) : null}
                {person.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                      Notas
                    </dt>
                    <dd className="mt-0.5 text-ink-700">{person.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </SectionCard>

          {/* Autorizaciones */}
          <SectionCard
            title="Alumnos autorizados"
            description={`${active.length} autorización(es) vigente(s) de ${person.authorizations.length}.`}
            icon={<ShieldAlert className="h-5 w-5" />}
          >
            {person.authorizations.length === 0 ? (
              <EmptyState
                icon={<BadgeCheck className="h-6 w-6" />}
                title="Sin alumnos asignados"
                description="Esta persona no puede recoger a ningún alumno del centro."
              />
            ) : (
              <ul className="space-y-2.5">
                {person.authorizations.map((auth) => (
                  <li
                    key={auth.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 p-3"
                  >
                    <Avatar
                      name={`${auth.student.firstName} ${auth.student.lastName}`}
                      tone={auth.student.avatarTone}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/alumnos/${auth.student.id}`}
                        className="truncate text-sm font-semibold text-ink-900 hover:text-brand-600 hover:underline"
                      >
                        {auth.student.firstName} {auth.student.lastName}
                      </Link>
                      <p className="truncate text-xs text-ink-500">
                        {auth.student.group} · Tutor: {auth.student.tutor.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StudentStatusPill status={auth.student.status} size="sm" />
                      {auth.active ? (
                        <Badge className="bg-mint-50 text-mint-700 ring-mint-200" size="sm">
                          Autorizada
                        </Badge>
                      ) : (
                        <Badge className="bg-ink-100 text-ink-600 ring-ink-200" size="sm">
                          Revocada
                        </Badge>
                      )}
                      <AuthorizationToggle
                        authorizationId={auth.id}
                        active={auth.active}
                        personName={person.name}
                        studentName={`${auth.student.firstName} ${auth.student.lastName}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Historial de recogidas */}
          <SectionCard
            title="Historial de recogidas"
            description="Movimientos en los que esta persona participó."
            icon={<CalendarClock className="h-5 w-5" />}
          >
            <MovementList
              movements={pickups}
              emptyTitle="Sin recogidas registradas"
              emptyDescription="Esta persona todavía no ha recogido a ningún alumno."
            />
          </SectionCard>
        </div>

        {/* Credencial */}
        <div>
          <SectionCard
            title="Credencial QR"
            description="Identificador que se lee en el acceso."
            icon={<QrCode className="h-5 w-5" />}
          >
            <QrCard
              code={person.qrIdentifier}
              name={person.name}
              subtitle={relationshipLabel(person.relationship)}
              size={200}
              compact
              className="shadow-none ring-0"
            />
            <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
              El código contiene únicamente este identificador. Ningún dato personal del menor ni de
              la persona viaja dentro del QR.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
