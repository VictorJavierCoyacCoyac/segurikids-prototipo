"use client";

import {
  Activity,
  BadgeCheck,
  Bell,
  ClipboardList,
  Cog,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  QrCode,
  ScanLine,
  ScrollText,
  ShieldAlert,
  Siren,
  User,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Definición de la navegación por rol.
 * Vive en un módulo de cliente porque los iconos son componentes y no pueden
 * serializarse desde el servidor.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Clave del contador de avisos que se muestra sobre el icono. */
  badge?: "notifications" | "messages" | "alerts";
  /** Coincidencia exacta de ruta (para los índices de sección). */
  exact?: boolean;
};

export type NavSection = { title?: string; items: NavItem[] };

/** App familiar: barra inferior de 5 destinos + accesos desde el inicio. */
export const PARENT_TABS: NavItem[] = [
  { href: "/app", label: "Inicio", icon: Home, exact: true },
  { href: "/app/hijos", label: "Mis hijos", icon: Users },
  { href: "/app/qr", label: "Mi QR", icon: QrCode },
  { href: "/app/notificaciones", label: "Avisos", icon: Bell, badge: "notifications" },
  { href: "/app/perfil", label: "Perfil", icon: User },
];

/**
 * Las secciones «Personas autorizadas», «Historial» y «Mensajes» no ocupan
 * pestaña propia: se alcanzan desde el inicio y desde el perfil, para mantener
 * la barra inferior en cinco destinos y que siga siendo cómoda con una mano.
 */

/** Personal escolar: operación diaria del control de acceso. */
export const STAFF_NAV: NavSection[] = [
  {
    items: [
      { href: "/staff", label: "Panel de jornada", icon: LayoutDashboard, exact: true },
      { href: "/staff/escaner", label: "Escáner QR", icon: ScanLine },
    ],
  },
  {
    title: "Control de acceso",
    items: [
      { href: "/staff/entrada", label: "Registrar entrada", icon: LogIn },
      { href: "/staff/salida", label: "Registrar salida", icon: LogOut },
      { href: "/staff/actividad", label: "Actividad reciente", icon: Activity },
    ],
  },
  {
    title: "Consulta",
    items: [
      { href: "/staff/alumnos", label: "Alumnos", icon: GraduationCap },
      { href: "/staff/autorizaciones", label: "Autorizaciones", icon: BadgeCheck },
      { href: "/staff/mensajes", label: "Mensajes", icon: MessageSquare, badge: "messages" },
      { href: "/staff/alertas", label: "Alertas e incidencias", icon: Siren, badge: "alerts" },
    ],
  },
];

/** Barra inferior del personal en móvil (los 4 destinos críticos). */
export const STAFF_TABS: NavItem[] = [
  { href: "/staff", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/staff/escaner", label: "Escáner", icon: ScanLine },
  { href: "/staff/alumnos", label: "Alumnos", icon: GraduationCap },
  { href: "/staff/alertas", label: "Alertas", icon: Siren, badge: "alerts" },
];

/** Panel administrativo. */
export const ADMIN_NAV: NavSection[] = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Comunidad escolar",
    items: [
      { href: "/admin/alumnos", label: "Alumnos", icon: GraduationCap },
      { href: "/admin/tutores", label: "Padres y tutores", icon: UserRound },
      { href: "/admin/personal", label: "Personal", icon: Users },
      { href: "/admin/autorizados", label: "Personas autorizadas", icon: BadgeCheck },
    ],
  },
  {
    title: "Operación",
    items: [
      { href: "/admin/movimientos", label: "Movimientos", icon: ClipboardList },
      { href: "/admin/reportes", label: "Reportes", icon: Activity },
      { href: "/admin/emergencias", label: "Emergencias", icon: ShieldAlert, badge: "alerts" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
      { href: "/admin/configuracion", label: "Configuración", icon: Cog },
    ],
  },
];

export const ADMIN_TABS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/alumnos", label: "Alumnos", icon: GraduationCap },
  { href: "/admin/movimientos", label: "Movimientos", icon: ClipboardList },
  { href: "/admin/reportes", label: "Reportes", icon: Activity },
];
