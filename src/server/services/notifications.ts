import { prisma } from "@/lib/db";
import type { NotificationType } from "@/lib/domain/alerts";

/**
 * Centro de notificaciones interno.
 *
 * ⚠️ DEMO: las notificaciones se almacenan en la base de datos y se consultan
 * al renderizar. No hay push real (FCM/APNs) ni websockets.
 * ANTES DE PRODUCCIÓN: publicar estos mismos eventos a un servicio de push y/o
 * abrir un canal en tiempo real; la firma de `notify()` no cambiaría.
 */
export async function notify(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    },
  });
}

/** Envío masivo (p. ej. una emergencia para todas las familias). */
export async function notifyMany(
  userIds: string[],
  payload: { type: NotificationType; title: string; message: string; link?: string | null },
): Promise<number> {
  if (userIds.length === 0) return 0;
  const result = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link ?? null,
    })),
  });
  return result.count;
}

export async function listNotifications(userId: string, take = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  // El `userId` en el where evita que un usuario marque notificaciones de otro.
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return result.count;
}
