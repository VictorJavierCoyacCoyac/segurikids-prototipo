import { ChevronRight, MessagesSquare } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { CountBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatRelative } from "@/lib/utils/date";
import { truncate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export type ConversationListItem = {
  id: string;
  subject: string;
  updatedAt: Date;
  unread: number;
  counterpartName: string;
  counterpartTone: string;
  counterpartRole: string;
  lastMessageBody: string | null;
};

/** Listado de conversaciones (bandeja de entrada del tutor o del personal). */
export function ConversationList({
  conversations,
  basePath,
  emptyAction,
}: {
  conversations: ConversationListItem[];
  basePath: string;
  emptyAction?: React.ReactNode;
}) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessagesSquare className="h-6 w-6" />}
        title="No hay conversaciones"
        description="Cuando se inicie una conversación con el centro aparecerá en esta bandeja."
        action={emptyAction}
      />
    );
  }

  const now = new Date();

  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`${basePath}/${conversation.id}`}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border p-3.5 transition",
              conversation.unread > 0
                ? "border-brand-200 bg-brand-50/50"
                : "border-ink-100 bg-white hover:border-brand-200",
            )}
          >
            <Avatar
              name={conversation.counterpartName}
              tone={conversation.counterpartTone}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-bold text-ink-900">{conversation.subject}</p>
                <span className="shrink-0 text-[11px] text-ink-400">
                  {formatRelative(conversation.updatedAt, now)}
                </span>
              </div>
              <p className="truncate text-xs font-medium text-ink-600">
                {conversation.counterpartName}
                <span className="text-ink-400"> · {conversation.counterpartRole}</span>
              </p>
              {conversation.lastMessageBody ? (
                <p className="mt-0.5 truncate text-xs text-ink-500">
                  {truncate(conversation.lastMessageBody, 70)}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CountBadge count={conversation.unread} />
              <ChevronRight
                className="h-5 w-5 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                aria-hidden="true"
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
