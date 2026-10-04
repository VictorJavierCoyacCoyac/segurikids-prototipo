import { Bell } from "lucide-react";
import type { Metadata } from "next";

import { EmergencyBanner } from "@/components/domain/emergency-banner";
import { MarkAllReadButton } from "@/components/domain/mark-all-read";
import { NotificationList } from "@/components/domain/notification-list";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listActiveAlerts } from "@/server/services/emergencies";
import { listNotifications } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Avisos" };

export default async function ParentNotificationsPage() {
  const user = await requireRole("PARENT");

  const [notifications, alerts] = await Promise.all([
    listNotifications(user.id, 60),
    listActiveAlerts(user.schoolId),
  ]);

  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Avisos"
        description={
          unread > 0
            ? `Tienes ${unread} aviso(s) sin leer.`
            : "Estás al día: no hay avisos pendientes."
        }
        action={<MarkAllReadButton disabled={unread === 0} />}
      />

      <EmergencyBanner alerts={alerts} />

      <SectionCard
        title="Centro de notificaciones"
        description="Entradas, salidas, comunicados escolares y emergencias."
        icon={<Bell className="h-5 w-5" />}
      >
        <NotificationList notifications={notifications} />
      </SectionCard>

      <p className="px-1 text-xs leading-relaxed text-ink-400">
        Nota del prototipo: las notificaciones se almacenan en la base de datos y se muestran al
        cargar la pantalla. En una versión productiva se enviarían además como notificaciones push al
        dispositivo del tutor.
      </p>
    </div>
  );
}
