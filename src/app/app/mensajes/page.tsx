import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

import { ConversationList } from "@/components/domain/conversation-list";
import { NewConversationButton } from "@/components/domain/new-conversation";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listConversations } from "@/server/services/messages";
import { listStaff } from "@/server/services/users";

export const metadata: Metadata = { title: "Mensajes" };

export default async function ParentMessagesPage() {
  const user = await requireRole("PARENT");

  const [conversations, staff] = await Promise.all([
    listConversations(user),
    listStaff(user.schoolId),
  ]);

  const staffOptions = staff
    .filter((member) => member.role === "STAFF" || member.role === "ADMIN")
    .map((member) => ({ id: member.id, name: member.name, jobTitle: member.jobTitle }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mensajes"
        description="Comunicación directa con el personal del centro educativo."
        action={<NewConversationButton staff={staffOptions} />}
      />

      <SectionCard
        title="Mis conversaciones"
        description={`${conversations.length} conversación(es).`}
        icon={<MessagesSquare className="h-5 w-5" />}
      >
        <ConversationList
          basePath="/app/mensajes"
          conversations={conversations.map((conversation) => ({
            id: conversation.id,
            subject: conversation.subject,
            updatedAt: conversation.updatedAt,
            unread: conversation.unread,
            counterpartName: conversation.staff.name,
            counterpartTone: conversation.staff.avatarTone,
            counterpartRole: conversation.staff.jobTitle ?? "Personal escolar",
            lastMessageBody: conversation.lastMessage?.body ?? null,
          }))}
          emptyAction={<NewConversationButton staff={staffOptions} label="Escribir al centro" />}
        />
      </SectionCard>
    </div>
  );
}
