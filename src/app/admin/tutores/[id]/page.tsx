import { ArrowLeft, Bell, GraduationCap, Mail, Phone, QrCode, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NotificationList } from "@/components/domain/notification-list";
import { QrCard } from "@/components/domain/qr-card";
import { StudentCard } from "@/components/domain/student-card";
import { PersonStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/date";
import { getTutor } from "@/server/services/users";

export const metadata: Metadata = { title: "Ficha del tutor" };

export default async function AdminTutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ADMIN");

  const tutor = await getTutor(id, user.schoolId);
  if (!tutor) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/tutores"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Padres y tutores
      </Link>

      <PageHeader
        eyebrow="Padre / Tutor"
        title={tutor.name}
        description={`Cuenta creada el ${formatDate(tutor.createdAt)}${
          tutor.lastLoginAt ? ` · Último acceso: ${formatDate(tutor.lastLoginAt)}` : ""
        }`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Datos de contacto */}
          <SectionCard
            title="Datos de la cuenta"
            description="Información de contacto y estado de acceso."
            icon={<ShieldCheck className="h-5 w-5" />}
          >
            <div className="flex items-center gap-4">
              <Avatar name={tutor.name} tone={tutor.avatarTone} size="lg" />
              <dl className="grid flex-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                    <Mail className="h-3 w-3" aria-hidden="true" />
                    Correo
                  </dt>
                  <dd className="truncate font-semibold text-ink-900">{tutor.email}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                    <Phone className="h-3 w-3" aria-hidden="true" />
                    Teléfono
                  </dt>
                  <dd className="font-semibold text-ink-900">{tutor.phone ?? "No registrado"}</dd>
                </div>
              </dl>
            </div>
          </SectionCard>

          {/* Alumnos asociados */}
          <SectionCard
            title="Alumnos asociados"
            description={`${tutor.children.length} alumno(s) bajo su tutoría.`}
            icon={<GraduationCap className="h-5 w-5" />}
          >
            {tutor.children.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="h-6 w-6" />}
                title="Sin alumnos asociados"
                description="Vincula alumnos a este tutor desde la ficha del alumno."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {tutor.children.map((child) => (
                  <StudentCard
                    key={child.id}
                    href={`/admin/alumnos/${child.id}`}
                    name={`${child.firstName} ${child.lastName}`}
                    group={child.group}
                    status={child.status}
                    avatarTone={child.avatarTone}
                    meta={`${child._count.authorizations} autorizados`}
                    compact
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Avisos recibidos */}
          <SectionCard
            title="Últimos avisos recibidos"
            description="Notificaciones enviadas a este tutor."
            icon={<Bell className="h-5 w-5" />}
          >
            <NotificationList notifications={tutor.notifications} interactive={false} />
          </SectionCard>
        </div>

        <div className="space-y-4">
          {/* Credencial */}
          <SectionCard
            title="Credencial de recogida"
            description="Identificador con el que se valida en el acceso."
            icon={<QrCode className="h-5 w-5" />}
          >
            {tutor.authorizedPersonProfile ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm text-ink-600">Estado</span>
                  <PersonStatusPill status={tutor.authorizedPersonProfile.status} size="sm" />
                </div>
                <QrCard
                  code={tutor.authorizedPersonProfile.qrIdentifier}
                  name={tutor.authorizedPersonProfile.name}
                  subtitle="Tutor principal"
                  size={200}
                  compact
                  className="shadow-none ring-0"
                />
              </>
            ) : (
              <EmptyState
                icon={<QrCode className="h-6 w-6" />}
                title="Sin credencial generada"
                description="Este tutor no tiene ficha de persona autorizada asociada."
              />
            )}
          </SectionCard>

          <Alert tone="warning">
            <p className="font-semibold">Datos de demostración</p>
            <p className="mt-0.5 leading-relaxed">
              La edición de usuarios, el restablecimiento de contraseñas y la verificación de
              identidad no forman parte del alcance de este prototipo.
            </p>
          </Alert>
        </div>
      </div>
    </div>
  );
}
