"use client";

import { CheckCheck } from "lucide-react";
import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { markAllNotificationsReadAction } from "@/server/actions/communication";
import { idleState } from "@/server/actions/types";

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const [state, formAction] = useActionState(markAllNotificationsReadAction, idleState());

  return (
    <form action={formAction} className="flex items-center gap-2">
      {state.ok && state.message ? (
        <span className="text-xs font-medium text-mint-700">{state.message}</span>
      ) : null}
      <SubmitButton
        variant="outline"
        size="sm"
        disabled={disabled}
        pendingText="Marcando…"
        icon={<CheckCheck className="h-4 w-4" />}
      >
        Marcar todo como leído
      </SubmitButton>
    </form>
  );
}
