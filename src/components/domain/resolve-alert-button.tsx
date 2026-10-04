"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { resolveAlertAction, setIncidentStatusAction } from "@/server/actions/emergencies";
import { idleState } from "@/server/actions/types";

/** Cierre de una alerta de emergencia (reservado a la dirección). */
export function ResolveAlertButton({
  alertId,
  alertTitle,
}: {
  alertId: string;
  alertTitle: string;
}) {
  const [state, formAction] = useActionState(resolveAlertAction, idleState());
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="success" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Resolver
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Marcar la alerta como resuelta"
        description={alertTitle}
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

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="alertId" value={alertId} />

          <p className="text-sm leading-relaxed text-ink-600">
            Se notificará a las familias de que la situación quedó resuelta y la alerta dejará de
            mostrarse como activa.
          </p>

          <Field
            label="Nota de cierre (opcional)"
            htmlFor={`note-${alertId}`}
            hint="Queda archivada junto a la alerta."
          >
            <Textarea
              id={`note-${alertId}`}
              name="note"
              rows={3}
              maxLength={300}
              placeholder="Ej. Evacuación concluida sin incidentes. Todos los grupos regresaron a las aulas."
              className="min-h-[5rem]"
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton variant="success" pendingText="Cerrando alerta…">
              Marcar como resuelta
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Cambio de estado de una incidencia operativa. */
export function IncidentStatusButton({
  incidentId,
  status,
}: {
  incidentId: string;
  status: string;
}) {
  const [state, formAction] = useActionState(setIncidentStatusAction, idleState());
  const next = status === "OPEN" ? "REVIEWING" : status === "REVIEWING" ? "CLOSED" : "OPEN";
  const labels: Record<string, string> = {
    REVIEWING: "Marcar en revisión",
    CLOSED: "Cerrar incidencia",
    OPEN: "Reabrir",
  };

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <input type="hidden" name="status" value={next} />
      {state.ok === false && state.message ? (
        <span className="text-[11px] text-berry-600">{state.message}</span>
      ) : null}
      <SubmitButton variant="outline" size="sm" pendingText="Guardando…">
        {labels[next]}
      </SubmitButton>
    </form>
  );
}
