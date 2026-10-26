import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  FileText,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  QrCode,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DemoBadge } from "@/components/layout/brand";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { TERMS_VERSION } from "@/lib/domain/terms";
import { formatDateTime } from "@/lib/utils/date";
import { prisma } from "@/lib/db";
import { getOwnPersonProfile } from "@/server/services/authorizations";
import { listChildren } from "@/server/services/students";
import { logoutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Mi perfil" };

const LINKS = [
  {
    href: "/app/autorizados",
    label: "Personas autorizadas",
    hint: "Administra quién puede recoger a tus hijos",
    icon: BadgeCheck,
  },
  {
    href: "/app/historial",
    label: "Historial de accesos",
    hint: "Entradas y salidas de los últimos 30 días",
    icon: CalendarClock,
  },
  {
    href: "/app/mensajes",
    label: "Mensajes con el centro",
    hint: "Conversaciones con docentes y administración",
    icon: MessageSquare,
  },
  {
    href: "/app/qr",
    label: "Mi código QR",
    hint: "Identificación para la recogida",
    icon: QrCode,
  },
  {
    href: "/terminos",
    label: "Términos y aviso de privacidad",
    hint: "Condiciones de uso y tratamiento de datos",
    icon: FileText,
  },
];

export default async function ParentProfilePage() {
  const user = await requireRole("PARENT");

  const [account, children, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, createdAt: true },
    }),
    listChildren(user.id),
    getOwnPersonProfile(user.id),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Mi perfil" description="Datos de tu cuenta y accesos rápidos." />

      {/* Tarjeta de cuenta */}
      <section className="sk-card overflow-hidden">
        <div className="sk-hero flex items-center gap-4 p-5">
          <Avatar name={user.name} tone={user.avatarTone} size="xl" className="ring-2 ring-white/40" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{user.name}</h2>
            <p className="text-sm text-brand-100">{ROLE_LABEL[user.role]}</p>
            <div className="mt-2">
              <DemoBadge />
            </div>
          </div>
        </div>

        <ul className="divide-y divide-ink-50">
          {[
            { icon: Mail, label: "Correo", value: user.email },
            { icon: Phone, label: "Teléfono", value: account?.phone ?? "No registrado" },
            { icon: School, label: "Centro educativo", value: user.schoolName },
            {
              icon: Users,
              label: "Alumnos asociados",
              value: `${children.length} ${children.length === 1 ? "alumno" : "alumnos"}`,
            },
            ...(profile
              ? [
                  {
                    icon: ShieldCheck,
                    label: "Identificador de recogida",
                    value: profile.qrIdentifier,
                  },
                ]
              : []),
            {
              icon: FileText,
              label: `Términos aceptados (v${TERMS_VERSION})`,
              value: user.termsAcceptedAt
                ? formatDateTime(user.termsAcceptedAt)
                : "Pendiente de aceptación",
            },
          ].map((row) => (
            <li key={row.label} className="flex items-center gap-3 px-5 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-500">
                <row.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  {row.label}
                </p>
                <p className="truncate text-sm font-semibold text-ink-900">{row.value}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Accesos */}
      <SectionCard title="Accesos" description="Todas las secciones de la app familiar." bodyClassName="p-0">
        <ul className="divide-y divide-ink-50">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-ink-50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <link.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {link.label}
                  </span>
                  <span className="block truncate text-xs text-ink-500">{link.hint}</span>
                </span>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Alert tone="warning">
        <p className="font-semibold">Cuenta de demostración</p>
        <p className="mt-0.5 leading-relaxed">
          Esta cuenta y todos sus datos son ficticios y forman parte del prototipo de SeguriKids. La
          edición del perfil, el cambio de contraseña y la verificación de identidad quedan fuera del
          alcance de esta demostración.
        </p>
      </Alert>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-berry-200 bg-white px-4 py-3.5 text-sm font-bold text-berry-600 transition hover:bg-berry-50"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
