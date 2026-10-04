import { BellOff, Info, LogIn, LogOut, Megaphone, Settings2, Siren } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/feedback";
import { notificationMeta } from "@/lib/domain/alerts";
import { formatRelative } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { markNotificationReadAction } from "@/server/actions/communication";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
};

const ICONS = {
  in: LogIn,
  out: LogOut,
  info: Megaphone,
  emergency: Siren,
  system: Settings2,
} as const;

/**
 * Centro de notificaciones.
 * Cada aviso puede marcarse como leído y, si tiene destino, navegar a la
 * pantalla correspondiente: ninguna notificación es un callejón sin salida.
 */
export function NotificationList({
  notifications,
  interactive = true,
}: {
  notifications: NotificationItem[];
  interactive?: boolean;
}) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<BellOff className="h-6 w-6" />}
        title="No hay notificaciones"
        description="Aquí aparecerán los avisos de entrada, salida, comunicados y emergencias."
      />
    );
  }

  const now = new Date();

  return (
    <ul className="space-y-2.5">
      {notifications.map((notification) => {
        const meta = notificationMeta(notification.type);
        const Icon = ICONS[meta.icon] ?? Info;

        return (
          <li
            key={notification.id}
            className={cn(
              "animate-fade-up rounded-2xl border p-3.5 transition",
              notification.read
                ? "border-ink-100 bg-white"
                : "border-brand-200 bg-brand-50/50 shadow-card",
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", meta.tone)}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-bold text-ink-900">
                    {!notification.read ? (
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle"
                        aria-label="No leído"
                      />
                    ) : null}
                    {notification.title}
                  </p>
                  <span className="shrink-0 text-[11px] text-ink-400">
                    {formatRelative(notification.createdAt, now)}
                  </span>
                </div>

                <p className="mt-1 text-sm leading-snug text-ink-600">{notification.message}</p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    {meta.label}
                  </span>
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      Ver detalle
                    </Link>
                  ) : null}
                  {interactive && !notification.read ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-ink-500 transition hover:text-ink-800 hover:underline"
                      >
                        Marcar como leído
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
