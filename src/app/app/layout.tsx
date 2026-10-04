import type { ReactNode } from "react";

import { ParentShell } from "@/components/layout/parent-shell";
import { requireRole } from "@/lib/auth/session";
import { listActiveAlerts } from "@/server/services/emergencies";
import { unreadMessageCount } from "@/server/services/messages";
import { unreadNotificationCount } from "@/server/services/notifications";

/**
 * Área de padres y tutores.
 * El control de rol se hace en el layout: cualquier ruta hija queda protegida
 * sin tener que repetir la comprobación en cada página.
 */
export default async function ParentLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("PARENT");

  const [notifications, messages, alerts] = await Promise.all([
    unreadNotificationCount(user.id),
    unreadMessageCount(user),
    listActiveAlerts(user.schoolId),
  ]);

  return (
    <ParentShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle,
        avatarTone: user.avatarTone,
        schoolName: user.schoolName,
      }}
      counts={{ notifications, messages, alerts: alerts.length }}
    >
      {children}
    </ParentShell>
  );
}
