import type { Role } from "@/lib/domain/roles";

/**
 * Matriz de permisos del prototipo. Centralizar las capacidades evita que la UI
 * decida por su cuenta qué puede hacer cada rol: tanto los menús como los
 * servidores (server actions) consultan esta misma tabla.
 */
export const PERMISSIONS = {
  /** Registrar entradas y salidas, y usar el escáner. */
  ACCESS_CONTROL: ["ADMIN", "STAFF"],
  /** Dar de alta cuentas de usuario del centro. */
  MANAGE_USERS: ["ADMIN"],
  /** Crear o editar alumnos. */
  MANAGE_STUDENTS: ["ADMIN"],
  /** Crear o editar personas autorizadas de cualquier alumno. */
  MANAGE_ALL_AUTHORIZATIONS: ["ADMIN"],
  /** Gestionar las personas autorizadas de sus propios hijos. */
  MANAGE_OWN_AUTHORIZATIONS: ["PARENT"],
  /** Activar alertas de emergencia. */
  TRIGGER_EMERGENCY: ["ADMIN", "STAFF"],
  /** Cerrar o resolver alertas de emergencia. */
  RESOLVE_EMERGENCY: ["ADMIN"],
  /** Reportar incidencias operativas. */
  REPORT_INCIDENT: ["ADMIN", "STAFF"],
  /** Consultar reportes y exportarlos. */
  VIEW_REPORTS: ["ADMIN"],
  /** Consultar la bitácora de auditoría. */
  VIEW_AUDIT: ["ADMIN"],
  /** Ver el directorio completo de alumnado del centro. */
  VIEW_ALL_STUDENTS: ["ADMIN", "STAFF"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Lanza si el rol no tiene el permiso: última línea de defensa en el servidor. */
export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`Acceso denegado: el rol ${role} no puede ejecutar ${permission}.`);
  }
}
