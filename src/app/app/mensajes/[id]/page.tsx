import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConversationView } from "@/components/domain/conversation-view";
import { toConversationMessages } from "@/components/domain/conversation-utils";
import { requireRole } from "@/lib/auth/session";
import { getConversation } from "@/server/services/messages";

export const metadata: Metadata = { title: "Conversación" };

export default async function ParentConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("PARENT");

  const conversation = await getConversation(id, user);
  if (!conversation) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/app/mensajes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Mensajes
      </Link>

      <ConversationView
        conversationId={conversation.id}
        subject={conversation.subject}
        counterpartName={conversation.staff.name}
        counterpartTone={conversation.staff.avatarTone}
        counterpartRole={conversation.staff.jobTitle ?? "Personal escolar"}
        currentUserId={user.id}
        messages={toConversationMessages(conversation.messages)}
      />
    </div>
  );
}
