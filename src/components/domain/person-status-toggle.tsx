"use client";

import { ShieldBan, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { setPersonStatusAction } from "@/server/actions/authorizations";
import { idleState } from "@/server/actions/types";

/**
 * Suspende o reactiva a una persona autorizada en todo el centro.
 * La suspensión es la medida más severa: bloquea la entrega para todos sus
 * alumnos sin tocar las autorizaciones individuales.
 */
export function PersonStatusToggle({
  personId,
  personName,
  status,
  size = "sm",
}: {
  personId: string;
  personName: string;
  status: string;
  size?: "sm" | "md";
}) {
  const [state, formAction] = useActionState(setPersonStatusAction, idleState());
  const [open, setOpen] = useState(false);
  const suspended = status === "SUSPENDED";

  return (
    <>
      <Button
        type="button"
        variant={suspended ? "success" : "outline"}
        size={size}
        onClick={() => setOpen(true)}
      >
        {suspended ? (
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            Reactivar
          </>
        ) : (
          <>
            <ShieldBan className="h-3.5 w-3.5" />
            Suspender
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={suspended ? "Reactivar persona autorizada" : "Suspender persona autorizada"}
        size="sm"
      >
        {state.ok === false && state.message ? (
          <Alert tone="danger" className="mb-4">
            {state.message}
          </Alert>
        ) : null}
        {state.ok === true && state.message ? (
          <Alert tone="success" className="mb-4">
            {state.message}
          </Alert>
        ) : null}

        <p className="text-sm leading-relaxed text-ink-600">
          {suspended ? (
            <>
              <strong>{personName}</strong> volverá a poder recoger a los alumnos para los que tenga
              autorización vigente.
            </>
          ) : (
            <>
              <strong>{personName}</strong> quedará bloqueada en todo el centro: el escáner
              rechazará su código aunque conserve autorizaciones activas.
            </>
          )}
        </p>

        <form action={formAction} className="mt-5 flex flex-wrap justify-end gap-2">
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="status" value={suspended ? "ACTIVE" : "SUSPENDED"} />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <SubmitButton variant={suspended ? "success" : "danger"} pendingText="Aplicando…">
            {suspended ? "Sí, reactivar" : "Sí, suspender"}
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
