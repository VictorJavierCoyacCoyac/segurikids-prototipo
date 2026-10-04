"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { CountBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

import { DemoBadge, Logo } from "./brand";
import { PARENT_TABS } from "./nav-config";
import type { ShellCounts, ShellUser } from "./dashboard-shell";

/**
 * Estructura de la app familiar (mobile first).
 *
 * Se mantiene la barra inferior en todos los tamaños y el contenido centrado en
 * una columna estrecha: es el patrón de una aplicación móvil real y permite que
 * la misma interfaz se empaquete después como app nativa sin rediseñarla.
 */
export function ParentShell({
  user,
  counts,
  children,
}: {
  user: ShellUser;
  counts: ShellCounts;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/app" className="flex min-w-0 items-center gap-2.5">
            <Logo size="sm" withText={false} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-ink-900">
                SeguriKids
              </span>
              <span className="block truncate text-[11px] leading-tight text-ink-500">
                {user.schoolName}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <DemoBadge compact className="hidden sm:inline-flex" />
            <Link
              href="/app/notificaciones"
              aria-label="Avisos"
              className="relative grid h-10 w-10 place-items-center rounded-2xl border border-ink-200 text-ink-600 transition hover:bg-ink-50"
            >
              <Bell className="h-5 w-5" />
              {counts.notifications > 0 ? (
                <span className="absolute -right-1 -top-1">
                  <CountBadge count={counts.notifications} />
                </span>
              ) : null}
            </Link>
            <Link href="/app/perfil" aria-label="Mi perfil" className="rounded-full">
              <Avatar name={user.name} tone={user.avatarTone} size="md" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-4">{children}</main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-3xl items-stretch">
          {PARENT_TABS.map((item) => {
            const active = isActive(item.href, item.exact);
            const count = item.badge ? counts[item.badge] : 0;
            const isQr = item.href === "/app/qr";

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-[4.5rem] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition",
                    active ? "text-brand-600" : "text-ink-500",
                  )}
                >
                  {/* El acceso al QR es la acción más frecuente: se destaca. */}
                  {isQr ? (
                    <span
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-2xl shadow-sm transition",
                        active
                          ? "bg-brand-600 text-white"
                          : "bg-brand-50 text-brand-600 ring-1 ring-brand-200",
                      )}
                    >
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                  ) : (
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span className={isQr ? "sr-only sm:not-sr-only" : undefined}>{item.label}</span>
                  {count > 0 ? (
                    <span className="absolute right-1/2 top-2.5 translate-x-4">
                      <CountBadge count={count} />
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
