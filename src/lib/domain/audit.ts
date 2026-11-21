/**
 * Catálogo de acciones auditables. Mantener este catálogo cerrado permite
 * filtrar y auditar de forma consistente.
 */
export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "QR_SCAN",
  "QR_SCAN_DENIED",
  "ENTRY_REGISTER",
  "EXIT_REGISTER",
  "USER_CREATE",
  "TERMS_ACCEPT",
  "STUDENT_CREATE",
  "STUDENT_UPDATE",
  "AUTHORIZED_PERSON_CREATE",
  "AUTHORIZED_PERSON_UPDATE",
  "AUTHORIZATION_GRANT",
  "AUTHORIZATION_REVOKE",
  "EMERGENCY_CREATE",
  "EMERGENCY_RESOLVE",
  "INCIDENT_CREATE",
  "MESSAGE_SEND",
  "REPORT_EXPORT",
  "DEMO_DAY_RESET",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_META: Record<
  AuditAction,
  { label: string; tone: "neutral" | "success" | "warn" | "danger" | "info" }
> = {
  LOGIN: { label: "Inicio de sesión", tone: "neutral" },
  LOGOUT: { label: "Cierre de sesión", tone: "neutral" },
  QR_SCAN: { label: "Escaneo de QR", tone: "info" },
  QR_SCAN_DENIED: { label: "Escaneo rechazado", tone: "danger" },
  ENTRY_REGISTER: { label: "Registro de entrada", tone: "success" },
  EXIT_REGISTER: { label: "Registro de salida", tone: "success" },
  USER_CREATE: { label: "Alta de usuario", tone: "info" },
  TERMS_ACCEPT: { label: "Aceptación de términos", tone: "neutral" },
  STUDENT_CREATE: { label: "Alta de alumno", tone: "info" },
  STUDENT_UPDATE: { label: "Modificación de alumno", tone: "info" },
  AUTHORIZED_PERSON_CREATE: { label: "Alta de persona autorizada", tone: "info" },
  AUTHORIZED_PERSON_UPDATE: { label: "Modificación de persona autorizada", tone: "warn" },
  AUTHORIZATION_GRANT: { label: "Autorización otorgada", tone: "success" },
  AUTHORIZATION_REVOKE: { label: "Autorización revocada", tone: "warn" },
  EMERGENCY_CREATE: { label: "Activación de emergencia", tone: "danger" },
  EMERGENCY_RESOLVE: { label: "Emergencia resuelta", tone: "success" },
  INCIDENT_CREATE: { label: "Incidencia reportada", tone: "warn" },
  MESSAGE_SEND: { label: "Mensaje enviado", tone: "neutral" },
  REPORT_EXPORT: { label: "Exportación de reporte", tone: "info" },
  DEMO_DAY_RESET: { label: "Reinicio de la jornada (demo)", tone: "warn" },
};

export const AUDIT_TONE_CLASS: Record<string, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-1 ring-ink-200",
  success: "bg-mint-50 text-mint-700 ring-1 ring-mint-200",
  warn: "bg-sun-50 text-sun-700 ring-1 ring-sun-200",
  danger: "bg-berry-50 text-berry-700 ring-1 ring-berry-200",
  info: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
};

export function auditActionMeta(action: string) {
  return (
    AUDIT_ACTION_META[action as AuditAction] ?? {
      label: action,
      tone: "neutral" as const,
    }
  );
}
