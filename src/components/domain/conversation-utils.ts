import { formatDateTime } from "@/lib/utils/date";

import type { ConversationMessage } from "./conversation-view";

/**
 * Prepara los mensajes en el servidor (fechas ya formateadas) antes de
 * entregarlos al componente de cliente. Así el texto de las fechas es idéntico
 * en servidor y navegador y no se produce un desajuste de hidratación.
 */
export function toConversationMessages(
  messages: Array<{ id: string; body: string; senderId: string; read: boolean; createdAt: Date }>,
): ConversationMessage[] {
  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    read: message.read,
    createdAtLabel: formatDateTime(message.createdAt),
  }));
}
