import { FileWarning, ShieldAlert, Siren } from "lucide-react";
import type { Metadata } from "next";

import { AlertList, IncidentList } from "@/components/domain/alert-list";
import { EmergencyBanner } from "@/components/domain/emergency-banner";
import { TriggerEmergencyButton } from "@/components/domain/emergency-form";
import { ReportIncidentButton } from "@/components/domain/incident-form";
import { NotificationList } from "@/components/domain/notification-list";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { listAlerts, listActiveAlerts, listIncidents } from "@/server/services/emergencies";
import { listNotifications } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Alertas e incidencias" };

/** Módulo de emergencias para el personal escolar. */
export default async function StaffAlertsPage() {
  const user = await requireRole("STAFF", "ADMIN");

  const [active, alerts, incidents, notifications] = await Promise.all([
    listActiveAlerts(user.schoolId),
    listAlerts(user.schoolId, 20),
    listIncidents(user.schoolId, 20),
    listNotifications(user.id, 10),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertas e incidencias"
        description="Activa una emergencia, reporta una incidencia y consulta los avisos del centro."
        action={
          <>
            <ReportIncidentButton size="md" />
            <TriggerEmergencyButton size="md" />
          </>
        }
      />

      <EmergencyBanner alerts={active} />

      {active.length === 0 ? (
        <Alert tone="success" title="Sin emergencias activas">
          El centro opera con normalidad. Si ocurre una situación de riesgo, activa la alerta
          correspondiente para notificar de inmediato a todas las familias.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Historial de alertas"
          description="Emergencias activadas en el centro."
          icon={<Siren className="h-5 w-5" />}
        >
          <AlertList alerts={alerts} />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Incidencias"
            description="Situaciones reportadas por el personal."
            icon={<FileWarning className="h-5 w-5" />}
          >
            <IncidentList incidents={incidents} />
          </SectionCard>

          <SectionCard
            title="Mis avisos"
            description="Notificaciones recibidas en tu cuenta."
            icon={<ShieldAlert className="h-5 w-5" />}
          >
            <NotificationList notifications={notifications} />
          </SectionCard>
        </div>
      </div>

      <p className="px-1 text-xs leading-relaxed text-ink-400">
        Nota del prototipo: solo la dirección del centro puede resolver una alerta desde el panel
        administrativo. El cierre de una emergencia queda siempre a cargo de un responsable.
      </p>
    </div>
  );
}
