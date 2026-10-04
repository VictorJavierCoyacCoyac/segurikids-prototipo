/** Tipos de notificación del centro de avisos. */
export const NOTIFICATION_TYPES = [
  "ENTRY",
  "EXIT",
  "SCHOOL_INFO",
  "EMERGENCY",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_META: Record<
  NotificationType,
  { label: string; icon: "in" | "out" | "info" | "emergency" | "system"; tone: string }
> = {
  ENTRY: { label: "Entrada", icon: "in", tone: "bg-mint-100 text-mint-700" },
  EXIT: { label: "Salida", icon: "out", tone: "bg-brand-100 text-brand-700" },
  SCHOOL_INFO: { label: "Información escolar", icon: "info", tone: "bg-sun-100 text-sun-700" },
  EMERGENCY: { label: "Emergencia", icon: "emergency", tone: "bg-berry-100 text-berry-700" },
  SYSTEM: { label: "Sistema", icon: "system", tone: "bg-ink-200 text-ink-700" },
};

export function notificationMeta(type: string) {
  return NOTIFICATION_META[type as NotificationType] ?? NOTIFICATION_META.SYSTEM;
}

/** Tipos de emergencia que el personal puede activar. */
export const EMERGENCY_TYPES = ["EVACUATION", "MEDICAL", "SECURITY", "GENERAL"] as const;
export type EmergencyType = (typeof EMERGENCY_TYPES)[number];

export const EMERGENCY_TYPE_META: Record<
  EmergencyType,
  { label: string; description: string; defaultPriority: EmergencyPriority; icon: string }
> = {
  EVACUATION: {
    label: "Evacuación",
    description: "Desalojo del plantel por sismo, incendio o riesgo estructural.",
    defaultPriority: "CRITICAL",
    icon: "siren",
  },
  MEDICAL: {
    label: "Emergencia médica",
    description: "Atención médica urgente de un alumno o del personal.",
    defaultPriority: "HIGH",
    icon: "heart-pulse",
  },
  SECURITY: {
    label: "Incidente de seguridad",
    description: "Persona no autorizada, resguardo o situación externa de riesgo.",
    defaultPriority: "HIGH",
    icon: "shield-alert",
  },
  GENERAL: {
    label: "Aviso general",
    description: "Comunicado urgente para todas las familias del centro.",
    defaultPriority: "MEDIUM",
    icon: "megaphone",
  },
};

export const EMERGENCY_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type EmergencyPriority = (typeof EMERGENCY_PRIORITIES)[number];

export const EMERGENCY_PRIORITY_META: Record<
  EmergencyPriority,
  { label: string; pill: string; bar: string }
> = {
  LOW: { label: "Baja", pill: "bg-ink-100 text-ink-700 ring-1 ring-ink-200", bar: "bg-ink-400" },
  MEDIUM: { label: "Media", pill: "bg-sun-50 text-sun-700 ring-1 ring-sun-200", bar: "bg-sun-500" },
  HIGH: { label: "Alta", pill: "bg-berry-50 text-berry-700 ring-1 ring-berry-200", bar: "bg-berry-500" },
  CRITICAL: {
    label: "Crítica",
    pill: "bg-berry-600 text-white ring-1 ring-berry-700",
    bar: "bg-berry-600",
  },
};

export const EMERGENCY_STATUSES = ["ACTIVE", "RESOLVED"] as const;
export type EmergencyStatus = (typeof EMERGENCY_STATUSES)[number];

export const EMERGENCY_STATUS_META: Record<EmergencyStatus, { label: string; pill: string }> = {
  ACTIVE: { label: "Activa", pill: "bg-berry-50 text-berry-700 ring-1 ring-berry-200" },
  RESOLVED: { label: "Resuelta", pill: "bg-mint-50 text-mint-700 ring-1 ring-mint-200" },
};

export function emergencyTypeMeta(value: string) {
  return EMERGENCY_TYPE_META[value as EmergencyType] ?? EMERGENCY_TYPE_META.GENERAL;
}
export function emergencyPriorityMeta(value: string) {
  return EMERGENCY_PRIORITY_META[value as EmergencyPriority] ?? EMERGENCY_PRIORITY_META.MEDIUM;
}
export function emergencyStatusMeta(value: string) {
  return EMERGENCY_STATUS_META[value as EmergencyStatus] ?? EMERGENCY_STATUS_META.ACTIVE;
}

/** Incidencias operativas reportadas por el personal. */
export const INCIDENT_TYPES = [
  "UNAUTHORIZED_PICKUP",
  "UNKNOWN_CODE",
  "SUSPENDED_PERSON",
  "HEALTH",
  "OTHER",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  UNAUTHORIZED_PICKUP: "Intento de recogida no autorizada",
  UNKNOWN_CODE: "Código QR no reconocido",
  SUSPENDED_PERSON: "Persona suspendida en acceso",
  HEALTH: "Incidencia de salud",
  OTHER: "Otra incidencia",
};

export const INCIDENT_STATUSES = ["OPEN", "REVIEWING", "CLOSED"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_STATUS_META: Record<IncidentStatus, { label: string; pill: string }> = {
  OPEN: { label: "Abierta", pill: "bg-berry-50 text-berry-700 ring-1 ring-berry-200" },
  REVIEWING: { label: "En revisión", pill: "bg-sun-50 text-sun-700 ring-1 ring-sun-200" },
  CLOSED: { label: "Cerrada", pill: "bg-mint-50 text-mint-700 ring-1 ring-mint-200" },
};

export const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export function incidentTypeLabel(value: string): string {
  return INCIDENT_TYPE_LABEL[value as IncidentType] ?? value;
}
export function incidentStatusMeta(value: string) {
  return INCIDENT_STATUS_META[value as IncidentStatus] ?? INCIDENT_STATUS_META.OPEN;
}
