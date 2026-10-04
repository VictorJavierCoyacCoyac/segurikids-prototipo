import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { toConversationMessages } from "@/components/domain/conversation-utils";
import { ConversationView } from "@/components/domain/conversation-view";
import { requireRole } from "@/lib/auth/session";
import { getConversation } from "@/server/services/messages";

export const metadata: Metadata = { title: "Conversación" };

export default async function StaffConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("STAFF", "ADMIN");

  const conversation = await getConversation(id, user);
  if (!conversation) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/staff/mensajes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Mensajes
      </Link>

      <ConversationView
        conversationId={conversation.id}
        subject={conversation.subject}
        counterpartName={conversation.parent.name}
        counterpartTone={conversation.parent.avatarTone}
        counterpartRole="Padre / Tutor"
        currentUserId={user.id}
        messages={toConversationMessages(conversation.messages)}
      />
    </div>
  );
}
