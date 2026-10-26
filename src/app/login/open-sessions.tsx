import { ArrowRight, LogOut, MonitorSmartphone } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { AREA_LABEL, type SessionArea, type SessionUser } from "@/lib/auth/session";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/domain/roles";
import { logoutAllAction, logoutAreaAction } from "@/server/actions/auth";

/**
 * Sesiones abiertas en este navegador.
 *
 * El sistema mantiene una sesión por área (app familiar, personal escolar y
 * dirección), así que la pantalla de acceso no expulsa a quien ya entró: lista
 * lo que hay abierto y permite añadir otra cuenta en una pestaña distinta.
 */
export function OpenSessions({
  sessions,
  requestedArea,
}: {
  sessions: SessionUser[];
  requestedArea?: SessionArea;
}) {
  if (sessions.length === 0) return null;

  return (
    <section className="mb-7" aria-labelledby="sesiones-abiertas">
      <h2 id="sesiones-abiertas" className="mb-2 text-sm font-bold text-ink-900">
        Sesiones abiertas en este navegador
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-ink-500">
        Cada área mantiene su propia sesión. Puedes tener la app del tutor en una pestaña y el
        escáner del docente en otra, con cuentas distintas y al mismo tiempo.
      </p>

      <ul className="space-y-2.5">
        {sessions.map((session) => (
          <li
            key={session.area}
            className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3.5 ${
              requestedArea === session.area ? "border-brand-300 ring-2 ring-brand-100" : "border-ink-200"
            }`}
          >
            <Avatar name={session.name} tone={session.avatarTone} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-ink-900">{session.name}</p>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                  {AREA_LABEL[session.area]}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {session.email} · {ROLE_LABEL[session.role]}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href={ROLE_HOME[session.role]}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                Continuar
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <form action={logoutAreaAction}>
                <input type="hidden" name="area" value={session.area} />
                <button
                  type="submit"
                  title={`Cerrar la sesión de ${AREA_LABEL[session.area]}`}
                  aria-label={`Cerrar la sesión de ${AREA_LABEL[session.area]}`}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-ink-200 text-ink-500 transition hover:bg-ink-50 hover:text-berry-600"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Para la segunda cuenta, abre esta pantalla en otra pestaña y entra con el otro rol.
        </p>
        {sessions.length > 1 ? (
          <form action={logoutAllAction}>
            <button
              type="submit"
              className="text-xs font-semibold text-ink-500 underline underline-offset-2 transition hover:text-berry-600"
            >
              Cerrar todas
            </button>
          </form>
        ) : null}
      </div>

      <div className="my-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-100" />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Añadir otra cuenta
        </span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>
    </section>
  );
}
