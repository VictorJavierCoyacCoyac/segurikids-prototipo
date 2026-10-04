import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { STAFF_NAV, STAFF_TABS } from "@/components/layout/nav-config";
import { requireRole } from "@/lib/auth/session";
import { listActiveAlerts } from "@/server/services/emergencies";
import { unreadMessageCount } from "@/server/services/messages";
import { unreadNotificationCount } from "@/server/services/notifications";

/** Área del personal escolar (control de acceso). */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("STAFF", "ADMIN");

  const [notifications, messages, alerts] = await Promise.all([
    unreadNotificationCount(user.id),
    unreadMessageCount(user),
    listActiveAlerts(user.schoolId),
  ]);

  return (
    <DashboardShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle,
        avatarTone: user.avatarTone,
        schoolName: user.schoolName,
      }}
      sections={STAFF_NAV}
      tabs={STAFF_TABS}
      counts={{ notifications, messages, alerts: alerts.length }}
      notificationsHref="/staff/alertas"
    >
      {children}
    </DashboardShell>
  );
}
