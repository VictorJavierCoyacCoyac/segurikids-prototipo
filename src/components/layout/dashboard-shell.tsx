"use client";

import { Bell, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { CountBadge } from "@/components/ui/badge";
import { ROLE_LABEL, type Role } from "@/lib/domain/roles";
import { cn } from "@/lib/utils/cn";
import { logoutAction } from "@/server/actions/auth";

import { DemoBadge, Logo } from "./brand";
import type { NavItem, NavSection } from "./nav-config";

export type ShellUser = {
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  avatarTone: string;
  schoolName: string;
};

export type ShellCounts = {
  notifications: number;
  messages: number;
  alerts: number;
};

/**
 * Estructura del panel web (personal escolar y dirección):
 *  · escritorio ≥1024px → barra lateral fija
 *  · tablet/móvil       → cabecera con menú lateral desplegable + pestañas inferiores
 */
export function DashboardShell({
  user,
  sections,
  tabs,
  counts,
  notificationsHref,
  children,
}: {
  user: ShellUser;
  sections: NavSection[];
  tabs: NavItem[];
  counts: ShellCounts;
  notificationsHref: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Cerrar el menú al navegar evita que quede abierto sobre el contenido.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const badgeCount = (item: NavItem) => (item.badge ? counts[item.badge] : 0);

  const navList = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title ? (
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {section.title}
            </p>
          ) : null}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = isActive(item);
              const count = badgeCount(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    <item.icon
                      className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-ink-400")}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 ? <CountBadge count={count} /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const userBlock = (
    <div className="border-t border-ink-100 p-3">
      <div className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
        <Avatar name={user.name} tone={user.avatarTone} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
          <p className="truncate text-xs text-ink-500">{user.jobTitle ?? ROLE_LABEL[user.role]}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="grid h-9 w-9 place-items-center rounded-xl text-ink-500 transition hover:bg-white hover:text-berry-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ── Barra lateral (escritorio) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex flex-col gap-2 border-b border-ink-100 px-4 py-4">
          <Logo />
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-ink-500">{user.schoolName}</p>
            <DemoBadge compact />
          </div>
        </div>
        {navList}
        {userBlock}
      </aside>

      {/* ── Cabecera (móvil y tablet) ── */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú de navegación"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-ink-200 text-ink-600 transition hover:bg-ink-50"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Logo size="sm" />

          <div className="flex items-center gap-1.5">
            <Link
              href={notificationsHref}
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
          </div>
        </div>
      </header>

      {/* ── Menú lateral desplegable (móvil) ── */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm"
          />
          <div className="relative z-10 flex h-full w-[17.5rem] max-w-[85vw] animate-slide-down flex-col bg-white shadow-float">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
                className="grid h-9 w-9 place-items-center rounded-xl text-ink-500 transition hover:bg-ink-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <p className="truncate text-xs font-medium text-ink-500">{user.schoolName}</p>
              <DemoBadge compact />
            </div>
            {navList}
            {userBlock}
          </div>
        </div>
      ) : null}

      {/* ── Contenido ── */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          {children}
        </div>
      </main>

      {/* ── Pestañas inferiores (móvil) ── */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
      >
        <ul className="flex items-stretch">
          {tabs.map((item) => {
            const active = isActive(item);
            const count = badgeCount(item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition",
                    active ? "text-brand-600" : "text-ink-500",
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                  {count > 0 ? (
                    <span className="absolute right-1/2 top-2 translate-x-4">
                      <CountBadge count={count} />
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-600" />
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
