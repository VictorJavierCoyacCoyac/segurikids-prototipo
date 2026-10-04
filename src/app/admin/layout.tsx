import type { ReactNode } from "react";

import { ADMIN_NAV, ADMIN_TABS } from "@/components/layout/nav-config";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { listActiveAlerts } from "@/server/services/emergencies";
import { unreadMessageCount } from "@/server/services/messages";
import { unreadNotificationCount } from "@/server/services/notifications";

/** Área de dirección / administración del centro. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("ADMIN");

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
      sections={ADMIN_NAV}
      tabs={ADMIN_TABS}
      counts={{ notifications, messages, alerts: alerts.length }}
      notificationsHref="/admin/emergencias"
    >
      {children}
    </DashboardShell>
  );
}
