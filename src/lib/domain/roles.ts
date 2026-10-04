/**
 * Roles del sistema. El rol define la interfaz de entrada y los permisos.
 * @see src/lib/auth/permissions.ts
 */
export const ROLES = ["ADMIN", "STAFF", "PARENT"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administración",
  STAFF: "Personal escolar",
  PARENT: "Padre / Tutor",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  ADMIN: "Panel directivo: alumnado, reportes, emergencias y auditoría.",
  STAFF: "Control de acceso: escáner QR, entradas y salidas.",
  PARENT: "App familiar: estado de tus hijos, QR de recogida y avisos.",
};

/** Ruta de inicio de cada rol tras iniciar sesión. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  STAFF: "/staff",
  PARENT: "/app",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const RELATIONSHIPS = [
  "MOTHER",
  "FATHER",
  "GRANDPARENT",
  "TUTOR",
  "RELATIVE",
  "OTHER",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  MOTHER: "Madre",
  FATHER: "Padre",
  GRANDPARENT: "Abuelo / Abuela",
  TUTOR: "Tutor legal",
  RELATIVE: "Familiar",
  OTHER: "Otra persona autorizada",
};

export function relationshipLabel(value: string | null | undefined): string {
  if (!value) return "Sin especificar";
  return RELATIONSHIP_LABEL[value as Relationship] ?? value;
}
