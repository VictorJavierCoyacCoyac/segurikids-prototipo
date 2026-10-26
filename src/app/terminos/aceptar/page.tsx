import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TermsDocument } from "@/components/domain/terms-document";
import { DemoBadge, Logo } from "@/components/layout/brand";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/feedback";
import { isSessionArea, requireSession } from "@/lib/auth/session";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/domain/roles";
import { logoutAction } from "@/server/actions/auth";

import { AcceptTermsForm } from "./accept-form";

export const metadata: Metadata = { title: "Aceptación de términos" };

/**
 * Puerta de aceptación obligatoria.
 *
 * `requireUser()` envía aquí a cualquier cuenta que no haya aceptado la versión
 * vigente, de modo que ninguna pantalla puede olvidarse de la comprobación.
 * El parámetro `area` indica de qué sesión se trata: sin él, con dos sesiones
 * abiertas en el navegador (tutor y docente), no se sabría cuál debe aceptar.
 */
export default async function AcceptTermsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.area) ? params.area[0] : params.area;
  const area = isSessionArea(raw) ? raw : undefined;

  const user = await requireSession(area);
  if (user.termsAccepted) redirect(ROLE_HOME[user.role]);

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Logo />
          <DemoBadge />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5 flex items-start gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              Antes de continuar
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Tu cuenta es nueva, o los términos han cambiado. Necesitamos tu aceptación para
              activarla.
            </p>
          </div>
        </div>

        <div className="sk-card mb-4 flex flex-wrap items-center gap-3 p-4">
          <Avatar name={user.name} tone={user.avatarTone} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">
              {user.email} · {ROLE_LABEL[user.role]}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-white hover:text-berry-600"
            >
              No soy yo · Salir
            </button>
          </form>
        </div>

        <div className="sk-card p-5 sm:p-6">
          <TermsDocument compact />

          <div className="mt-5 border-t border-ink-100 pt-5">
            <AcceptTermsForm area={user.area} />
          </div>
        </div>

        <Alert tone="info" className="mt-4">
          <p className="leading-relaxed">
            La aceptación queda registrada con la fecha y la versión del documento en la bitácora de
            auditoría del centro. Puedes volver a consultar el texto en cualquier momento desde tu
            perfil.
          </p>
        </Alert>
      </main>
    </div>
  );
}
