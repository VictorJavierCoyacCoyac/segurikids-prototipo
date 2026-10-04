import { FileWarning, ShieldCheck, Siren } from "lucide-react";
import type { Metadata } from "next";

import { AlertList, IncidentList } from "@/components/domain/alert-list";
import { EmergencyBanner } from "@/components/domain/emergency-banner";
import { TriggerEmergencyButton } from "@/components/domain/emergency-form";
import {
  IncidentStatusButton,
  ResolveAlertButton,
} from "@/components/domain/resolve-alert-button";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { listActiveAlerts, listAlerts, listIncidents } from "@/server/services/emergencies";

export const metadata: Metadata = { title: "Emergencias" };

/** Gestión de emergencias e incidencias por parte de la dirección. */
export default async function AdminEmergenciesPage() {
  const user = await requireRole("ADMIN");

  const [active, alerts, incidents] = await Promise.all([
    listActiveAlerts(user.schoolId),
    listAlerts(user.schoolId, 30),
    listIncidents(user.schoolId, 30),
  ]);

  const openIncidents = incidents.filter((incident) => incident.status !== "CLOSED");
  const resolved = alerts.filter((alert) => alert.status === "RESOLVED").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Emergencias e incidencias"
        description="Activa alertas, consulta el historial y cierra las situaciones resueltas."
        action={<TriggerEmergencyButton size="md" />}
      />

      <EmergencyBanner alerts={active} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Alertas activas"
          value={active.length}
          hint={active.length > 0 ? "Requieren cierre" : "Sin emergencias"}
          icon={<Siren className="h-4 w-4" />}
          tone={active.length > 0 ? "berry" : "ink"}
        />
        <StatCard
          label="Alertas resueltas"
          value={resolved}
          hint="Historial del centro"
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="mint"
        />
        <StatCard
          label="Incidencias abiertas"
          value={openIncidents.length}
          hint={`${incidents.length} en total`}
          icon={<FileWarning className="h-4 w-4" />}
          tone={openIncidents.length > 0 ? "sun" : "ink"}
        />
      </div>

      {active.length === 0 ? (
        <Alert tone="success" title="El centro no tiene emergencias activas">
          Si necesitas demostrar el flujo completo, activa una alerta: se notificará a todas las
          familias y podrás cerrarla desde este mismo panel.
        </Alert>
      ) : null}

      <SectionCard
        title="Alertas de emergencia"
        description="Historial completo con responsable de activación y de cierre."
        icon={<Siren className="h-5 w-5" />}
      >
        <AlertList
          alerts={alerts}
          resolveAction={(alert) => (
            <ResolveAlertButton alertId={alert.id} alertTitle={alert.title} />
          )}
        />
      </SectionCard>

      <SectionCard
        title="Incidencias operativas"
        description="Situaciones reportadas por el personal del centro."
        icon={<FileWarning className="h-5 w-5" />}
      >
        <IncidentList
          incidents={incidents}
          statusAction={(incident) => (
            <IncidentStatusButton incidentId={incident.id} status={incident.status} />
          )}
        />
      </SectionCard>
    </div>
  );
}
