import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TermsDocument } from "@/components/domain/terms-document";
import { DemoBadge, Logo } from "@/components/layout/brand";
import { listSessions } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/domain/roles";

export const metadata: Metadata = { title: "Términos y aviso de privacidad" };

/** Consulta pública del documento. Accesible con sesión y sin ella. */
export default async function TermsPage() {
  // Con varias sesiones abiertas no se puede saber desde cuál se llegó, así que
  // el enlace de vuelta lleva a la pantalla de acceso, que las lista todas.
  const sessions = await listSessions();
  const user = sessions.length === 1 ? sessions[0]! : null;
  const backHref = user ? ROLE_HOME[user.role] : "/login";

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Logo />
          <DemoBadge />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <Link
          href={backHref}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 transition hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {user ? "Volver a la aplicación" : "Volver al acceso"}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Términos de uso y aviso de privacidad
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Condiciones de uso de SeguriKids y tratamiento de los datos del alumnado y de las personas
          autorizadas.
        </p>

        <div className="sk-card mt-6 p-5 sm:p-7">
          <TermsDocument />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-400">
          SeguriKids · Prototipo académico de demostración · Datos ficticios
        </p>
      </main>
    </div>
  );
}
