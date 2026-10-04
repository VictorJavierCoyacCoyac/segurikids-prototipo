import { Siren } from "lucide-react";
import Link from "next/link";

import { emergencyPriorityMeta, emergencyTypeMeta } from "@/lib/domain/alerts";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export type ActiveAlert = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  createdAt: Date;
  createdBy?: { name: string; jobTitle: string | null } | null;
};

/**
 * Aviso destacado de emergencia activa.
 * Aparece arriba de todo en los tres perfiles: una emergencia no puede quedar
 * escondida dentro de un listado.
 */
export function EmergencyBanner({
  alerts,
  href,
  className,
}: {
  alerts: ActiveAlert[];
  href?: string;
  className?: string;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {alerts.map((alert) => {
        const type = emergencyTypeMeta(alert.type);
        const priority = emergencyPriorityMeta(alert.priority);

        return (
          <div
            key={alert.id}
            role="alert"
            className="animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br from-berry-600 to-berry-700 text-white shadow-float"
          >
            <div className="flex items-start gap-3 p-4">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15">
                <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-white/30" />
                <Siren className="relative h-6 w-6" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                    {type.label}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-berry-700">
                    Prioridad {priority.label}
                  </span>
                </div>

                <p className="mt-2 text-base font-bold leading-tight">{alert.title}</p>
                <p className="mt-1 text-sm leading-snug text-berry-50">{alert.message}</p>

                <p className="mt-2 text-[11px] text-berry-100">
                  {formatDateTime(alert.createdAt)}
                  {alert.createdBy ? ` · ${alert.createdBy.name}` : ""}
                </p>

                {href ? (
                  <Link
                    href={href}
                    className="mt-3 inline-flex items-center rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-berry-700 transition hover:bg-berry-50"
                  >
                    Ver detalle de la alerta
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
