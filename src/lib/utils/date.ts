/**
 * Utilidades de fecha en español (es-MX) sin dependencias externas.
 *
 * REGLA DEL PROTOTIPO: las fechas se formatean en el servidor y se envían a la
 * UI como texto. Así se evitan diferencias de zona horaria entre servidor y
 * navegador (hidratación inconsistente).
 */

const LOCALE = "es-MX";

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

/** "hace 5 min", "hace 2 h", "ayer"… para listas de actividad. */
export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24 && isSameDay(target, now)) return `hace ${diffHours} h`;

  if (isSameDay(target, addDays(now, -1))) return `ayer · ${formatTime(target)}`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays} días`;

  return formatDate(target);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Formato `YYYY-MM-DD` usado en los <input type="date"> de los filtros. */
export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Interpreta `YYYY-MM-DD` como fecha local (no UTC) para evitar desfases. */
export function fromDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shortWeekday(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { weekday: "short" })
    .format(date)
    .replace(".", "");
}

export function age(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years--;
  return years;
}

/** Minutos de diferencia entre una hora `HH:MM` del centro y un instante. */
export function minutesAfterSchedule(timestamp: Date, schedule: string): number {
  const [hours, minutes] = schedule.split(":").map(Number);
  const reference = new Date(timestamp);
  reference.setHours(hours ?? 8, minutes ?? 0, 0, 0);
  return Math.round((timestamp.getTime() - reference.getTime()) / 60000);
}
