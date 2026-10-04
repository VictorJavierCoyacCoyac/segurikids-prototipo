import { CalendarClock, LogIn, LogOut, QrCode, PenLine } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { EVENT_TYPE_META, eventMethodLabel } from "@/lib/domain/attendance";
import { relationshipLabel } from "@/lib/domain/roles";
import { formatDate, formatRelative, formatTime, isSameDay } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export type MovementListItem = {
  id: string;
  type: string;
  method: string;
  timestamp: Date;
  note: string | null;
  student: { id: string; firstName: string; lastName: string; group: string; avatarTone: string };
  authorizedPerson: { id: string; name: string; relationship: string } | null;
  registeredBy: { id: string; name: string } | null;
};

/**
 * Lista de movimientos de acceso. Se reutiliza en la app familiar, el panel del
 * personal y la administración para que un mismo dato se lea siempre igual.
 */
export function MovementList({
  movements,
  showStudent = true,
  emptyTitle = "No hay movimientos registrados",
  emptyDescription = "Cuando se registre una entrada o una salida aparecerá aquí.",
  relative = false,
}: {
  movements: MovementListItem[];
  showStudent?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Muestra «hace 5 min» en lugar de la fecha completa. */
  relative?: boolean;
}) {
  if (movements.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const today = new Date();

  return (
    <ul className="divide-y divide-ink-50">
      {movements.map((movement) => {
        const meta = EVENT_TYPE_META[movement.type === "ENTRY" ? "ENTRY" : "EXIT"];
        const Icon = movement.type === "ENTRY" ? LogIn : LogOut;
        const studentName = `${movement.student.firstName} ${movement.student.lastName}`;

        return (
          <li key={movement.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={cn(
                "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                movement.type === "ENTRY"
                  ? "bg-mint-50 text-mint-600"
                  : "bg-brand-50 text-brand-600",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-ink-900">
                  {showStudent ? studentName : meta.label}
                </p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.pill)}>
                  {showStudent ? meta.label : movement.student.group}
                </span>
              </div>

              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                <span className="inline-flex items-center gap-1 font-medium text-ink-600">
                  {movement.method === "QR" ? (
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {eventMethodLabel(movement.method)}
                </span>
                {movement.authorizedPerson ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {movement.authorizedPerson.name}
                      <span className="text-ink-400">
                        {" "}
                        ({relationshipLabel(movement.authorizedPerson.relationship)})
                      </span>
                    </span>
                  </>
                ) : null}
                {movement.registeredBy ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-ink-400">
                      Confirmó: {movement.registeredBy.name}
                    </span>
                  </>
                ) : null}
              </p>

              {movement.note ? (
                <p className="mt-1 rounded-lg bg-sun-50 px-2 py-1 text-xs text-sun-800">
                  {movement.note}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-ink-900">
                {formatTime(movement.timestamp)}
              </p>
              <p className="text-[11px] text-ink-400">
                {relative
                  ? formatRelative(movement.timestamp, today)
                  : isSameDay(movement.timestamp, today)
                    ? "Hoy"
                    : formatDate(movement.timestamp)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Variante compacta con avatar, para paneles de actividad en vivo. */
export function ActivityFeed({ movements }: { movements: MovementListItem[] }) {
  if (movements.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-6 w-6" />}
        title="Sin actividad todavía"
        description="Los movimientos de la jornada aparecerán aquí en cuanto se registren."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {movements.map((movement) => {
        const isEntry = movement.type === "ENTRY";
        return (
          <li
            key={movement.id}
            className="flex animate-fade-up items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3"
          >
            <Avatar
              name={`${movement.student.firstName} ${movement.student.lastName}`}
              tone={movement.student.avatarTone}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">
                {movement.student.firstName} {movement.student.lastName}
              </p>
              <p className="truncate text-xs text-ink-500">
                {isEntry ? "Entrada" : "Salida"}
                {movement.authorizedPerson ? ` · ${movement.authorizedPerson.name}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                  isEntry ? "bg-mint-50 text-mint-700" : "bg-brand-50 text-brand-700",
                )}
              >
                {isEntry ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                {formatTime(movement.timestamp)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
