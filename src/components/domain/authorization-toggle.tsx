"use client";

import { ShieldBan, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { toggleAuthorizationAction } from "@/server/actions/authorizations";
import { idleState } from "@/server/actions/types";
import { useState } from "react";

/**
 * Activa o revoca la autorización de una persona sobre un alumno concreto.
 * Revocar requiere confirmación explícita: es una decisión con consecuencias
 * directas en la seguridad del menor.
 */
export function AuthorizationToggle({
  authorizationId,
  active,
  personName,
  studentName,
  disabled,
  disabledReason,
}: {
  authorizationId: string;
  active: boolean;
  personName: string;
  studentName: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction] = useActionState(toggleAuthorizationAction, idleState());
  const [open, setOpen] = useState(false);

  if (disabled) {
    return (
      <span className="text-[11px] font-medium text-ink-400" title={disabledReason}>
        {disabledReason ?? "No modificable"}
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={active ? "outline" : "success"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {active ? (
          <>
            <ShieldBan className="h-3.5 w-3.5" />
            Revocar
          </>
        ) : (
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            Autorizar
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={active ? "Revocar autorización" : "Activar autorización"}
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
          {active ? (
            <>
              <strong>{personName}</strong> dejará de poder recoger a{" "}
              <strong>{studentName}</strong>. El escáner bloqueará la entrega y el intento quedará
              registrado como incidencia.
            </>
          ) : (
            <>
              <strong>{personName}</strong> podrá recoger a <strong>{studentName}</strong> mostrando
              su código QR en el acceso.
            </>
          )}
        </p>

        <form action={formAction} className="mt-5 flex flex-wrap justify-end gap-2">
          <input type="hidden" name="authorizationId" value={authorizationId} />
          <input type="hidden" name="active" value={active ? "false" : "true"} />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <SubmitButton
            variant={active ? "danger" : "success"}
            pendingText="Aplicando…"
          >
            {active ? "Sí, revocar" : "Sí, autorizar"}
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
