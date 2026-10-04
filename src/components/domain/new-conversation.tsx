"use client";

import { MessageSquarePlus } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ModalTrigger } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { startConversationAction } from "@/server/actions/communication";
import { idleState } from "@/server/actions/types";

/** Inicia una conversación con un miembro del personal del centro. */
export function NewConversationButton({
  staff,
  variant = "primary",
  label = "Nuevo mensaje",
}: {
  staff: Array<{ id: string; name: string; jobTitle: string | null }>;
  variant?: "primary" | "secondary" | "outline";
  label?: string;
}) {
  return (
    <ModalTrigger
      label={label}
      variant={variant}
      icon={<MessageSquarePlus className="h-4 w-4" />}
      title="Nuevo mensaje al centro"
      description="Elige a quién quieres escribir y describe tu consulta."
    >
      {(close) => <NewConversationForm staff={staff} onDone={close} />}
    </ModalTrigger>
  );
}

function NewConversationForm({
  staff,
  onDone,
}: {
  staff: Array<{ id: string; name: string; jobTitle: string | null }>;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(startConversationAction, idleState());

  if (state.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Mensaje enviado">
          {state.message}
        </Alert>
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.ok === false && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <Field label="Destinatario" htmlFor="staffId" error={state.errors?.staffId} required>
        <Select id="staffId" name="staffId" error={Boolean(state.errors?.staffId)}>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
              {member.jobTitle ? ` — ${member.jobTitle}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Asunto" htmlFor="subject" error={state.errors?.subject} required>
        <Input
          id="subject"
          name="subject"
          placeholder="Ej. Cambio en la persona que recoge"
          error={Boolean(state.errors?.subject)}
          required
        />
      </Field>

      <Field label="Mensaje" htmlFor="body" error={state.errors?.body} required>
        <Textarea
          id="body"
          name="body"
          rows={4}
          placeholder="Escribe tu consulta al centro educativo."
          error={Boolean(state.errors?.body)}
          required
        />
      </Field>

      <SubmitButton fullWidth size="lg" pendingText="Enviando…">
        Enviar mensaje
      </SubmitButton>
    </form>
  );
}
