import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

import { ConversationList } from "@/components/domain/conversation-list";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listConversations } from "@/server/services/messages";

export const metadata: Metadata = { title: "Mensajes" };

export default async function StaffMessagesPage() {
  const user = await requireRole("STAFF", "ADMIN");
  const conversations = await listConversations(user);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Mensajes"
        description="Conversaciones con las familias del centro educativo."
      />

      <SectionCard
        title="Bandeja de entrada"
        description={`${conversations.length} conversación(es).`}
        icon={<MessagesSquare className="h-5 w-5" />}
      >
        <ConversationList
          basePath="/staff/mensajes"
          conversations={conversations.map((conversation) => ({
            id: conversation.id,
            subject: conversation.subject,
            updatedAt: conversation.updatedAt,
            unread: conversation.unread,
            counterpartName: conversation.parent.name,
            counterpartTone: conversation.parent.avatarTone,
            counterpartRole: "Padre / Tutor",
            lastMessageBody: conversation.lastMessage?.body ?? null,
          }))}
        />
      </SectionCard>
    </div>
  );
}
