import {
  BellRing,
  ChevronRight,
  ClipboardCheck,
  Info,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DemoBadge, Logo } from "@/components/layout/brand";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_DESCRIPTION, ROLE_HOME, ROLE_LABEL, type Role } from "@/lib/domain/roles";
import { listDemoAccounts } from "@/server/services/users";
import { demoLoginAction } from "@/server/actions/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Acceso" };

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
/** Contraseña compartida por las cuentas de demostración (definida en el seed). */
const DEMO_PASSWORD = "demo1234";

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current) redirect(ROLE_HOME[current.role]);

  const demoAccounts = DEMO_MODE ? await listDemoAccounts() : [];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ── Columna de marca y propuesta de valor ── */}
      <section className="sk-hero relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="sk-grid-dots absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sun-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <Logo size="lg" inverted />
          <p className="mt-10 max-w-md text-3xl font-bold leading-tight xl:text-4xl">
            La recogida de cada niño, verificada en segundos.
          </p>
          <p className="mt-4 max-w-md text-brand-100">
            SeguriKids sustituye las listas en papel por un control digital de entradas y salidas:
            identifica a la persona que recoge, valida su autorización y avisa a la familia
            automáticamente.
          </p>
        </div>

        <ul className="relative mt-10 space-y-3">
          {[
            { icon: QrCode, title: "Identificación con QR", text: "Cada persona autorizada tiene un identificador propio." },
            { icon: ShieldCheck, title: "Validación antes de entregar", text: "El sistema bloquea las entregas no autorizadas." },
            { icon: BellRing, title: "Aviso inmediato a la familia", text: "El tutor recibe la confirmación de la salida." },
            { icon: ClipboardCheck, title: "Trazabilidad completa", text: "Cada movimiento queda en el historial y la auditoría." },
          ].map((feature) => (
            <li
              key={feature.title}
              className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{feature.title}</p>
                <p className="text-sm text-brand-100">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="relative mt-10 text-xs text-brand-200">
          Prototipo académico de demostración · Datos ficticios · No apto para uso en producción
        </p>
      </section>

      {/* ── Columna de acceso ── */}
      <section className="flex flex-col justify-center bg-white px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
            <Logo />
            <DemoBadge />
          </div>

          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Bienvenido de nuevo
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Accede con tu cuenta para continuar al panel que corresponde a tu rol.
            </p>
          </header>

          <LoginForm />

          {DEMO_MODE ? (
            <>
              <div className="my-7 flex items-center gap-3">
                <span className="h-px flex-1 bg-ink-100" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Acceso rápido de demostración
                </span>
                <span className="h-px flex-1 bg-ink-100" />
              </div>

              <Alert tone="warning" className="mb-4">
                <p className="font-semibold">Cuentas de demostración</p>
                <p className="mt-0.5">
                  Credenciales ficticias creadas por el seed del prototipo. Todas usan la contraseña{" "}
                  <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[13px] font-bold">
                    {DEMO_PASSWORD}
                  </code>
                  . No deben utilizarse en un entorno real.
                </p>
              </Alert>

              <ul className="space-y-2.5">
                {demoAccounts.map((account) => (
                  <li key={account.id}>
                    <form action={demoLoginAction}>
                      <input type="hidden" name="email" value={account.email} />
                      <button
                        type="submit"
                        className="group flex w-full items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-card"
                      >
                        <Avatar name={account.name} tone={account.avatarTone} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-bold text-ink-900">
                              {ROLE_LABEL[account.role as Role]}
                            </span>
                            <span className="truncate font-mono text-[11px] text-ink-400">
                              {account.email}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-ink-500">
                            {account.name}
                            {account.jobTitle ? ` · ${account.jobTitle}` : ""}
                          </span>
                          <span className="mt-1 block text-xs leading-snug text-ink-500">
                            {ROLE_DESCRIPTION[account.role as Role]}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                          aria-hidden="true"
                        />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>

              <div className="mt-7 rounded-2xl bg-ink-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                  <ScanLine className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  Sugerencia para la demostración
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
                  Entra primero como <strong>Padre / Tutor</strong> y abre «Mi QR». Después accede
                  como <strong>Personal escolar</strong> y usa el escáner (o «Simular escaneo») con el
                  código <code className="font-mono font-semibold">SK-DEMO-000101</code> para
                  completar una entrega real de principio a fin.
                </p>
              </div>
            </>
          ) : (
            <Alert tone="info" className="mt-6">
              <p className="flex items-center gap-1.5 font-semibold">
                <Info className="h-4 w-4" aria-hidden="true" />
                Modo demostración desactivado
              </p>
              <p className="mt-0.5">
                El acceso rápido está deshabilitado porque <code>NEXT_PUBLIC_DEMO_MODE</code> no es
                «true».
              </p>
            </Alert>
          )}

          <p className="mt-8 text-center text-xs leading-relaxed text-ink-400">
            SeguriKids · Prototipo funcional para presentación académica. La autenticación, el cifrado
            y el tratamiento de datos personales deben endurecerse antes de cualquier uso real.
          </p>
        </div>
      </section>
    </div>
  );
}
