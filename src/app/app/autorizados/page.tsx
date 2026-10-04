import { BadgeCheck, Info, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { AddAuthorizedPersonButton } from "@/components/domain/authorized-person-form";
import { AuthorizationToggle } from "@/components/domain/authorization-toggle";
import { QrCard } from "@/components/domain/qr-card";
import { PersonStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { ModalTrigger } from "@/components/ui/modal";
import { requireRole } from "@/lib/auth/session";
import { relationshipLabel } from "@/lib/domain/roles";
import { maskPhone } from "@/lib/utils/format";
import { listPeopleForTutor } from "@/server/services/authorizations";
import { listChildren } from "@/server/services/students";

export const metadata: Metadata = { title: "Personas autorizadas" };

/**
 * Gestión de personas autorizadas desde la app familiar.
 * El tutor solo ve y administra las autorizaciones de SUS hijos (filtro
 * aplicado en el servicio, no en la interfaz).
 */
export default async function ParentAuthorizedPage() {
  const user = await requireRole("PARENT");

  const [people, children] = await Promise.all([
    listPeopleForTutor(user.id, user.schoolId),
    listChildren(user.id),
  ]);

  const selectableStudents = children.map((child) => ({
    id: child.id,
    name: `${child.firstName} ${child.lastName}`,
    group: child.group,
  }));

  const ownProfile = people.find((person) => person.user?.id === user.id);
  const others = people.filter((person) => person.user?.id !== user.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Personas autorizadas"
        description="Define quién puede recoger a tus hijos y revoca el permiso cuando sea necesario."
        action={<AddAuthorizedPersonButton students={selectableStudents} />}
      />

      <Alert tone="info">
        <p className="font-semibold">Cada persona recibe su propio código</p>
        <p className="mt-0.5 leading-relaxed">
          Al registrar a alguien, el sistema genera un identificador QR único. El personal del centro
          solo podrá entregar al alumno si esa autorización está vigente en el momento de la recogida.
        </p>
      </Alert>

      {/* Identificación del propio tutor */}
      {ownProfile ? (
        <SectionCard
          title="Tu identificación"
          description="Como tutor principal siempre estás autorizado."
          icon={<ShieldCheck className="h-5 w-5" />}
          action={
            <ModalTrigger
              label="Ver QR"
              variant="secondary"
              size="sm"
              title="Tu código de identificación"
              modalSize="sm"
            >
              {() => (
                <QrCard
                  code={ownProfile.qrIdentifier}
                  name={ownProfile.name}
                  subtitle={relationshipLabel(ownProfile.relationship)}
                  size={220}
                  compact
                  className="shadow-none ring-0"
                />
              )}
            </ModalTrigger>
          }
        >
          <div className="flex items-center gap-3">
            <Avatar name={ownProfile.name} tone={ownProfile.avatarTone} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">{ownProfile.name}</p>
              <p className="truncate text-xs text-ink-500">
                {relationshipLabel(ownProfile.relationship)} ·{" "}
                <span className="font-mono">{ownProfile.qrIdentifier}</span>
              </p>
            </div>
            <PersonStatusPill status={ownProfile.status} size="sm" />
          </div>
        </SectionCard>
      ) : null}

      {/* Resto de personas autorizadas */}
      <SectionCard
        title="Otras personas"
        description={`${others.length} persona(s) registrada(s) para tus hijos.`}
        icon={<BadgeCheck className="h-5 w-5" />}
      >
        {others.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck className="h-6 w-6" />}
            title="Todavía no has autorizado a nadie más"
            description="Registra a un familiar o persona de confianza para que pueda recoger a tus hijos."
            action={
              <AddAuthorizedPersonButton
                students={selectableStudents}
                label="Registrar primera persona"
              />
            }
          />
        ) : (
          <ul className="space-y-3">
            {others.map((person) => (
              <li
                key={person.id}
                className="rounded-2xl border border-ink-100 p-3.5 transition hover:border-brand-200"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={person.name} tone={person.avatarTone} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-ink-900">{person.name}</p>
                      <PersonStatusPill status={person.status} size="sm" />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {relationshipLabel(person.relationship)} · {maskPhone(person.phone)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-semibold text-brand-600">
                      {person.qrIdentifier}
                    </p>
                  </div>
                  <ModalTrigger
                    label="QR"
                    variant="outline"
                    size="sm"
                    title={`Código de ${person.name}`}
                    modalSize="sm"
                  >
                    {() => (
                      <QrCard
                        code={person.qrIdentifier}
                        name={person.name}
                        subtitle={relationshipLabel(person.relationship)}
                        size={220}
                        compact
                        className="shadow-none ring-0"
                      />
                    )}
                  </ModalTrigger>
                </div>

                {/* Autorización por alumno */}
                <ul className="mt-3 space-y-2 border-t border-ink-50 pt-3">
                  {person.authorizations.map((auth) => (
                    <li key={auth.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">
                          {auth.student.firstName} {auth.student.lastName}
                        </p>
                        <p className="text-[11px] text-ink-400">{auth.student.group}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
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

                {person.notes ? (
                  <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-xs leading-snug text-ink-600">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                    {person.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
