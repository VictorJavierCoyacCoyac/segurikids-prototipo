/**
 * Estados operativos del alumno.
 * Solo el servicio de accesos los modifica (src/server/services/attendance.ts),
 * de modo que el estado siempre es consecuencia de un movimiento registrado.
 */
export const STUDENT_STATUSES = [
  "IN_CAMPUS",
  "OFF_CAMPUS",
  "ABSENT",
  "PENDING",
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

type StatusMeta = {
  label: string;
  short: string;
  description: string;
  /** Clases Tailwind para la píldora de estado. */
  pill: string;
  dot: string;
};

export const STUDENT_STATUS_META: Record<StudentStatus, StatusMeta> = {
  IN_CAMPUS: {
    label: "En plantel",
    short: "En plantel",
    description: "El alumno se encuentra dentro del centro educativo.",
    pill: "bg-mint-50 text-mint-700 ring-1 ring-mint-200",
    dot: "bg-mint-500",
  },
  OFF_CAMPUS: {
    label: "Fuera del plantel",
    short: "Entregado",
    description: "El alumno ya fue entregado a una persona autorizada.",
    pill: "bg-ink-100 text-ink-700 ring-1 ring-ink-200",
    dot: "bg-ink-400",
  },
  ABSENT: {
    label: "Ausente",
    short: "Ausente",
    description: "No ha registrado entrada en la jornada de hoy.",
    pill: "bg-sun-50 text-sun-700 ring-1 ring-sun-200",
    dot: "bg-sun-500",
  },
  PENDING: {
    label: "Requiere atención",
    short: "Pendiente",
    description: "Situación que necesita revisión administrativa.",
    pill: "bg-berry-50 text-berry-700 ring-1 ring-berry-200",
    dot: "bg-berry-500",
  },
};

export function studentStatusMeta(status: string): StatusMeta {
  return (
    STUDENT_STATUS_META[status as StudentStatus] ?? {
      label: status,
      short: status,
      description: "Estado no catalogado.",
      pill: "bg-ink-100 text-ink-700 ring-1 ring-ink-200",
      dot: "bg-ink-400",
    }
  );
}

export const STUDENT_GROUPS = [
  "Maternal",
  "Preescolar 1",
  "Preescolar 2",
  "Kínder A",
  "Kínder B",
] as const;

/** Paletas para avatares generados (evita almacenar fotografías reales). */
export const AVATAR_TONES = ["brand", "mint", "sun", "berry", "ink"] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

export const AVATAR_TONE_CLASS: Record<AvatarTone, string> = {
  brand: "bg-brand-100 text-brand-700",
  mint: "bg-mint-100 text-mint-700",
  sun: "bg-sun-100 text-sun-700",
  berry: "bg-berry-100 text-berry-700",
  ink: "bg-ink-200 text-ink-700",
};

export function avatarToneClass(tone: string | null | undefined): string {
  return AVATAR_TONE_CLASS[(tone ?? "brand") as AvatarTone] ?? AVATAR_TONE_CLASS.brand;
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
