"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils/cn";
import { sendMessageAction } from "@/server/actions/communication";
import { idleState } from "@/server/actions/types";

export type ConversationMessage = {
  id: string;
  body: string;
  senderId: string;
  read: boolean;
  createdAtLabel: string;
};

/** Hilo de conversación con composición de mensaje. */
export function ConversationView({
  conversationId,
  subject,
  counterpartName,
  counterpartTone,
  counterpartRole,
  currentUserId,
  messages,
}: {
  conversationId: string;
  subject: string;
  counterpartName: string;
  counterpartTone: string;
  counterpartRole: string;
  currentUserId: string;
  messages: ConversationMessage[];
}) {
  const [state, formAction] = useActionState(sendMessageAction, idleState());
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Limpiar el campo tras un envío correcto y bajar al último mensaje.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      endRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [state]);

  return (
    <div className="sk-card flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
        <Avatar name={counterpartName} tone={counterpartTone} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900">{subject}</p>
          <p className="truncate text-xs text-ink-500">
            {counterpartName} · {counterpartRole}
          </p>
        </div>
      </header>

      <div className="max-h-[26rem] space-y-3 overflow-y-auto bg-ink-50/50 px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">
            Todavía no hay mensajes en esta conversación.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={cn("flex animate-fade-up", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%]",
                    mine
                      ? "rounded-br-md bg-brand-600 text-white"
                      : "rounded-bl-md bg-white text-ink-800 ring-1 ring-ink-100",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-snug">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      mine ? "text-brand-100" : "text-ink-400",
                    )}
                  >
                    {message.createdAtLabel}
                    {mine ? (message.read ? " · Leído" : " · Enviado") : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form ref={formRef} action={formAction} className="border-t border-ink-100 p-3">
        {state.ok === false && state.message ? (
          <Alert tone="danger" className="mb-3">
            {state.message}
          </Alert>
        ) : null}

        <input type="hidden" name="conversationId" value={conversationId} />
        <div className="flex items-end gap-2">
          <label htmlFor="message-body" className="sr-only">
            Escribe un mensaje
          </label>
          <textarea
            id="message-body"
            name="body"
            rows={2}
            required
            maxLength={1000}
            placeholder="Escribe tu mensaje…"
            className="sk-input min-h-[3rem] flex-1 resize-none py-2.5"
          />
          <SubmitButton
            size="md"
            pendingText="Enviando…"
            icon={<Send className="h-4 w-4" />}
            className="shrink-0"
          >
            <span className="hidden sm:inline">Enviar</span>
          </SubmitButton>
        </div>
        {state.errors?.body ? (
          <p role="alert" className="mt-1.5 text-xs font-medium text-berry-600">
            {state.errors.body}
          </p>
        ) : null}
      </form>
    </div>
  );
}
