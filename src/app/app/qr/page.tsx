import { BadgeCheck, Info, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { QrCard } from "@/components/domain/qr-card";
import { StudentStatusPill } from "@/components/domain/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { relationshipLabel } from "@/lib/domain/roles";
import { getOwnPersonProfile } from "@/server/services/authorizations";

export const metadata: Metadata = { title: "Mi código QR" };

/**
 * Pantalla de identificación del tutor.
 * Es la pantalla que se muestra físicamente en el acceso, por lo que el QR
 * ocupa el centro, a gran tamaño y sobre fondo blanco.
 */
export default async function ParentQrPage() {
  const user = await requireRole("PARENT");
  const profile = await getOwnPersonProfile(user.id);

  if (!profile) {
    return (
      <div>
        <PageHeader title="Mi código QR" />
        <EmptyState
          icon={<QrCode className="h-6 w-6" />}
          title="Todavía no tienes un identificador"
          description="La dirección del centro debe generar tu ficha de persona autorizada para activar tu código QR."
        />
      </div>
    );
  }

  const inCampus = profile.authorizations.filter(
    (auth) => auth.student.status === "IN_CAMPUS",
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mi código QR"
        description="Muestra este código en el acceso para identificarte al recoger a tus hijos."
      />

      <QrCard
        code={profile.qrIdentifier}
        name={profile.name}
        subtitle={`${relationshipLabel(profile.relationship)} · ${user.schoolName}`}
        size={260}
        className="mx-auto max-w-sm animate-scale-in"
      />

      {/* Alumnos que este código permite recoger ahora mismo */}
      <SectionCard
        title="Alumnos que puedes recoger"
        description="Autorizaciones vigentes asociadas a tu identificador."
        icon={<BadgeCheck className="h-5 w-5" />}
      >
        {profile.authorizations.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck className="h-6 w-6" />}
            title="Sin autorizaciones vigentes"
            description="Contacta con la dirección del centro para revisar tus autorizaciones."
          />
        ) : (
          <ul className="space-y-2">
            {profile.authorizations.map((auth) => (
              <li
                key={auth.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {auth.student.firstName} {auth.student.lastName}
                  </p>
                  <p className="text-xs text-ink-500">{auth.student.group}</p>
                </div>
                <StudentStatusPill status={auth.student.status} size="sm" />
              </li>
            ))}
          </ul>
        )}

        {inCampus.length > 0 ? (
          <Alert tone="success" className="mt-4">
            <p className="font-semibold">
              {inCampus.length === 1
                ? `${inCampus[0]!.student.firstName} está en el plantel`
                : `${inCampus.length} de tus hijos están en el plantel`}
            </p>
            <p className="mt-0.5">
              Al escanear tu código, el personal verá directamente a quién puedes recoger.
            </p>
          </Alert>
        ) : null}
      </SectionCard>

      {/* Cómo funciona */}
      <SectionCard
        title="Cómo funciona"
        description="Tres pasos en el acceso del centro."
        icon={<Sparkles className="h-5 w-5" />}
      >
        <ol className="space-y-3">
          {[
            {
              title: "Muestra el código",
              text: "El personal escanea tu QR desde su dispositivo de control de acceso.",
            },
            {
              title: "El sistema valida tu autorización",
              text: "Se comprueba que tu identificación está activa y vigente para ese alumno.",
            },
            {
              title: "Se confirma la entrega",
              text: "Queda registrada la salida con fecha, hora y responsable, y recibes el aviso.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{step.title}</p>
                <p className="text-xs leading-snug text-ink-500">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Nota de seguridad: explica por qué el QR no lleva datos personales */}
      <Alert tone="info">
        <p className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Tu código no contiene datos personales
        </p>
        <p className="mt-1 leading-relaxed">
          El QR solo guarda un identificador ({profile.qrIdentifier}). Los datos de tus hijos nunca
          viajan dentro del código: el sistema los consulta de forma segura al validar la
          autorización.
        </p>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/app/autorizados" variant="outline" size="md">
          <BadgeCheck className="h-4 w-4" />
          Personas autorizadas
        </ButtonLink>
        <ButtonLink href="/app/historial" variant="outline" size="md">
          <Info className="h-4 w-4" />
          Ver historial
        </ButtonLink>
      </div>
    </div>
  );
}
