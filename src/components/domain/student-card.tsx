import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";

import { StudentStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { eventTypeLabel } from "@/lib/domain/attendance";
import { formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/**
 * Tarjeta de alumno reutilizable. La jerarquía prioriza: nombre → estado →
 * último movimiento, que es el orden en el que se lee durante la jornada.
 */
export function StudentCard({
  href,
  name,
  group,
  status,
  avatarTone,
  lastEvent,
  meta,
  className,
  compact,
}: {
  href?: string;
  name: string;
  group: string;
  status: string;
  avatarTone?: string | null;
  lastEvent?: { type: string; timestamp: Date; personName?: string | null } | null;
  meta?: string;
  className?: string;
  compact?: boolean;
}) {
  const content = (
    <>
      <Avatar name={name} tone={avatarTone} size={compact ? "md" : "lg"} />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-bold text-ink-900", compact ? "text-sm" : "text-base")}>
          {name}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-500">
          {group}
          {meta ? ` · ${meta}` : ""}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StudentStatusPill status={status} size="sm" />
          {lastEvent ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {eventTypeLabel(lastEvent.type)} {formatTime(lastEvent.timestamp)}
              {lastEvent.personName ? ` · ${lastEvent.personName}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      {href ? (
        <ChevronRight
          className="h-5 w-5 shrink-0 self-center text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  const base = cn(
    "flex items-start gap-3.5 rounded-3xl border border-ink-100 bg-white p-4 shadow-card transition",
    className,
  );

  if (!href) return <div className={base}>{content}</div>;

  return (
    <Link href={href} className={cn(base, "group hover:border-brand-200 hover:shadow-float")}>
      {content}
    </Link>
  );
}
