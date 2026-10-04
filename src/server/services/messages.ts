import { prisma } from "@/lib/db";
import type { Role } from "@/lib/domain/roles";

import { logAudit } from "./audit";
import { notify } from "./notifications";

/**
 * Comunicación escuela ↔ familia.
 *
 * Alcance deliberadamente reducido (no es un chat en tiempo real): conversación
 * por asunto entre un tutor y un miembro del personal, con estado de lectura.
 */

const conversationInclude = {
  parent: { select: { id: true, name: true, avatarTone: true } },
  staff: { select: { id: true, name: true, jobTitle: true, avatarTone: true } },
  messages: { orderBy: { createdAt: "asc" } },
} as const;

export async function listConversations(user: { id: string; role: Role; schoolId: string }) {
  const conversations = await prisma.conversation.findMany({
    where: {
      schoolId: user.schoolId,
      ...(user.role === "PARENT"
        ? { parentId: user.id }
        : user.role === "STAFF"
          ? { staffId: user.id }
          : {}),
    },
    include: conversationInclude,
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map((conversation) => {
    const last = conversation.messages[conversation.messages.length - 1];
    return {
      ...conversation,
      lastMessage: last ?? null,
      unread: conversation.messages.filter((message) => !message.read && message.senderId !== user.id)
        .length,
    };
  });
}

export type ConversationSummary = Awaited<ReturnType<typeof listConversations>>[number];

export async function getConversation(
  conversationId: string,
  user: { id: string; role: Role; schoolId: string },
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      schoolId: user.schoolId,
      // Un tutor solo puede abrir sus propias conversaciones.
      ...(user.role === "PARENT" ? { parentId: user.id } : {}),
    },
    include: conversationInclude,
  });
  if (!conversation) return null;

  // Marcar como leídos los mensajes recibidos al abrir el hilo.
  await prisma.message.updateMany({
    where: { conversationId, read: false, senderId: { not: user.id } },
    data: { read: true },
  });

  return conversation;
}

export type ConversationDetail = NonNullable<Awaited<ReturnType<typeof getConversation>>>;

export async function sendMessage(
  input: { conversationId: string; body: string },
  actor: { id: string; name: string; role: Role; schoolId: string },
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: input.conversationId,
      schoolId: actor.schoolId,
      ...(actor.role === "PARENT" ? { parentId: actor.id } : {}),
    },
  });
  if (!conversation) throw new Error("La conversación indicada no está disponible.");

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: actor.id,
      body: input.body,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  const recipientId =
    actor.id === conversation.parentId ? conversation.staffId : conversation.parentId;

  await notify({
    userId: recipientId,
    type: "SCHOOL_INFO",
    title: `Nuevo mensaje de ${actor.name}`,
    message: input.body.length > 120 ? `${input.body.slice(0, 119)}…` : input.body,
    link: actor.role === "PARENT" ? "/staff/mensajes" : "/app/mensajes",
  });

  await logAudit({
    action: "MESSAGE_SEND",
    userId: actor.id,
    entity: "Conversation",
    entityId: conversation.id,
    summary: `${actor.name} envió un mensaje en "${conversation.subject}".`,
  });

  return message;
}

/** Crea (o reutiliza) la conversación de un tutor con el personal indicado. */
export async function startConversation(
  input: { subject: string; staffId: string; body: string },
  actor: { id: string; name: string; role: Role; schoolId: string },
) {
  const existing = await prisma.conversation.findFirst({
    where: { schoolId: actor.schoolId, parentId: actor.id, staffId: input.staffId, subject: input.subject },
  });

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: {
        subject: input.subject,
        schoolId: actor.schoolId,
        parentId: actor.id,
        staffId: input.staffId,
      },
    }));

  await sendMessage({ conversationId: conversation.id, body: input.body }, actor);
  return conversation;
}

export async function unreadMessageCount(user: { id: string; role: Role; schoolId: string }) {
  return prisma.message.count({
    where: {
      read: false,
      senderId: { not: user.id },
      conversation: {
        schoolId: user.schoolId,
        ...(user.role === "PARENT"
          ? { parentId: user.id }
          : user.role === "STAFF"
            ? { staffId: user.id }
            : {}),
      },
    },
  });
}
