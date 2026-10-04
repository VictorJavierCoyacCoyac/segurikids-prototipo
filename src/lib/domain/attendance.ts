/** Tipos de movimiento registrados en el control de acceso. */
export const EVENT_TYPES = ["ENTRY", "EXIT"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  ENTRY: "Entrada",
  EXIT: "Salida",
};

export const EVENT_TYPE_META: Record<EventType, { label: string; pill: string; icon: "in" | "out" }> = {
  ENTRY: {
    label: "Entrada",
    pill: "bg-mint-50 text-mint-700 ring-1 ring-mint-200",
    icon: "in",
  },
  EXIT: {
    label: "Salida",
    pill: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
    icon: "out",
  },
};

/** Métodos de identificación admitidos por el prototipo. */
export const EVENT_METHODS = ["QR", "MANUAL"] as const;
export type EventMethod = (typeof EVENT_METHODS)[number];

export const EVENT_METHOD_LABEL: Record<EventMethod, string> = {
  QR: "Código QR",
  MANUAL: "Registro manual",
};

export function eventTypeLabel(value: string): string {
  return EVENT_TYPE_LABEL[value as EventType] ?? value;
}

export function eventMethodLabel(value: string): string {
  return EVENT_METHOD_LABEL[value as EventMethod] ?? value;
}

/** Estados de una persona autorizada. */
export const PERSON_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type PersonStatus = (typeof PERSON_STATUSES)[number];

export const PERSON_STATUS_META: Record<PersonStatus, { label: string; pill: string }> = {
  ACTIVE: { label: "Activa", pill: "bg-mint-50 text-mint-700 ring-1 ring-mint-200" },
  SUSPENDED: { label: "Suspendida", pill: "bg-berry-50 text-berry-700 ring-1 ring-berry-200" },
};

export function personStatusMeta(value: string) {
  return (
    PERSON_STATUS_META[value as PersonStatus] ?? {
      label: value,
      pill: "bg-ink-100 text-ink-700 ring-1 ring-ink-200",
    }
  );
}

/**
 * Motivos por los que una validación de QR puede fallar.
 * El orden refleja las comprobaciones del servicio de validación.
 */
export const VALIDATION_FAILURES = [
  "CODE_NOT_FOUND",
  "PERSON_SUSPENDED",
  "NO_AUTHORIZATIONS",
  "NO_ACTIVE_AUTHORIZATION",
  "NO_STUDENTS_IN_CAMPUS",
] as const;
export type ValidationFailure = (typeof VALIDATION_FAILURES)[number];

export const VALIDATION_FAILURE_MESSAGE: Record<ValidationFailure, { title: string; detail: string }> = {
  CODE_NOT_FOUND: {
    title: "Código no reconocido",
    detail:
      "El identificador escaneado no existe en el centro educativo. No es posible continuar con la entrega.",
  },
  PERSON_SUSPENDED: {
    title: "Persona suspendida",
    detail:
      "La persona existe, pero su autorización está suspendida por la administración del centro.",
  },
  NO_AUTHORIZATIONS: {
    title: "Persona no autorizada",
    detail: "La persona identificada no tiene ningún alumno asignado para recoger.",
  },
  NO_ACTIVE_AUTHORIZATION: {
    title: "Persona no autorizada",
    detail:
      "La persona identificada tiene todas sus autorizaciones revocadas. La entrega no puede continuar.",
  },
  NO_STUDENTS_IN_CAMPUS: {
    title: "Sin alumnos por entregar",
    detail:
      "La persona está autorizada, pero ninguno de sus alumnos se encuentra actualmente en el plantel.",
  },
};
