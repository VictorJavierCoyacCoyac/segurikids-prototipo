import { CheckCircle2, ShieldCheck, Siren } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import {
  emergencyPriorityMeta,
  emergencyStatusMeta,
  emergencyTypeMeta,
  incidentStatusMeta,
  incidentTypeLabel,
  INCIDENT_SEVERITY_LABEL,
  type IncidentSeverity,
} from "@/lib/domain/alerts";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export type AlertListItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  createdBy: { name: string; jobTitle: string | null } | null;
  resolvedBy: { name: string } | null;
};

/** Histórico de alertas de emergencia. */
export function AlertList({
  alerts,
  resolveAction,
}: {
  alerts: AlertListItem[];
  /** Control de resolución (solo para roles con permiso). */
  resolveAction?: (alert: AlertListItem) => ReactNode;
}) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title="No hay alertas registradas"
        description="Cuando el personal active una emergencia aparecerá en este listado."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {alerts.map((alert) => {
        const type = emergencyTypeMeta(alert.type);
        const priority = emergencyPriorityMeta(alert.priority);
        const status = emergencyStatusMeta(alert.status);
        const isActive = alert.status === "ACTIVE";

        return (
          <li
            key={alert.id}
            className={cn(
              "overflow-hidden rounded-2xl border",
              isActive ? "border-berry-200 bg-berry-50/40" : "border-ink-100 bg-white",
            )}
          >
            <div className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                  isActive ? "bg-berry-600 text-white" : "bg-ink-100 text-ink-500",
                )}
              >
                {isActive ? (
                  <Siren className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-ink-900">{alert.title}</p>
                  <Badge className={status.pill} size="sm">
                    {status.label}
                  </Badge>
                  <Badge className={priority.pill} size="sm">
                    {priority.label}
                  </Badge>
                  <Badge className="bg-ink-100 text-ink-600 ring-ink-200" size="sm">
                    {type.label}
                  </Badge>
                </div>

                <p className="mt-1.5 text-sm leading-snug text-ink-600">{alert.message}</p>

                <p className="mt-2 text-[11px] text-ink-400">
                  Activada el {formatDateTime(alert.createdAt)}
                  {alert.createdBy ? ` por ${alert.createdBy.name}` : ""}
                  {alert.resolvedAt
                    ? ` · Resuelta el ${formatDateTime(alert.resolvedAt)}${
                        alert.resolvedBy ? ` por ${alert.resolvedBy.name}` : ""
                      }`
                    : ""}
                </p>

                {alert.resolutionNote ? (
                  <p className="mt-2 rounded-xl bg-mint-50 px-3 py-2 text-xs text-mint-800">
                    <span className="font-semibold">Cierre:</span> {alert.resolutionNote}
                  </p>
                ) : null}
              </div>

              {resolveAction && isActive ? (
                <div className="shrink-0">{resolveAction(alert)}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export type IncidentListItem = {
  id: string;
  type: string;
  severity: string;
  description: string;
  status: string;
  createdAt: Date;
  student: { id: string; firstName: string; lastName: string; group: string } | null;
  authorizedPerson: { id: string; name: string; qrIdentifier: string } | null;
  reportedBy: { name: string; jobTitle: string | null } | null;
};

/** Listado de incidencias operativas. */
export function IncidentList({
  incidents,
  statusAction,
}: {
  incidents: IncidentListItem[];
  statusAction?: (incident: IncidentListItem) => ReactNode;
}) {
  if (incidents.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title="Sin incidencias registradas"
        description="Las incidencias reportadas por el personal aparecerán aquí."
      />
    );
  }

  return (
    <ul className="divide-y divide-ink-50">
      {incidents.map((incident) => {
        const status = incidentStatusMeta(incident.status);
        return (
          <li key={incident.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink-900">
                  {incidentTypeLabel(incident.type)}
                </p>
                <Badge className={status.pill} size="sm">
                  {status.label}
                </Badge>
                <Badge className="bg-ink-100 text-ink-600 ring-ink-200" size="sm">
                  Severidad{" "}
                  {INCIDENT_SEVERITY_LABEL[incident.severity as IncidentSeverity] ??
                    incident.severity}
                </Badge>
              </div>

              <p className="mt-1 text-sm leading-snug text-ink-600">{incident.description}</p>

              <p className="mt-1.5 text-[11px] text-ink-400">
                {formatDateTime(incident.createdAt)}
                {incident.reportedBy ? ` · Reportó: ${incident.reportedBy.name}` : ""}
                {incident.student
                  ? ` · Alumno: ${incident.student.firstName} ${incident.student.lastName}`
                  : ""}
                {incident.authorizedPerson ? ` · Persona: ${incident.authorizedPerson.name}` : ""}
              </p>
            </div>

            {statusAction ? <div className="shrink-0">{statusAction(incident)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
