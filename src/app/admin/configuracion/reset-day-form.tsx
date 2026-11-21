"use client";

import { RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { resetDemoDayAction } from "@/server/actions/demo";
import { idleState } from "@/server/actions/types";

/**
 * Reinicio de la jornada de demostración.
 *
 * Pide una confirmación en dos pasos. No porque la operación sea peligrosa
 * —no borra cuentas ni autorizaciones— sino porque este botón vive en la
 * pantalla de configuración que se enseña durante la presentación, y un clic
 * accidental delante del público borraría el movimiento que se acaba de
 * registrar.
 */
export function ResetDayForm() {
  const [state, formAction] = useActionState(resetDemoDayAction, idleState());
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-3">
      {state.ok === true && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state.ok === false && state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      {confirming ? (
        <div className="rounded-2xl border border-sun-200 bg-sun-50 p-4">
          <p className="text-sm font-semibold text-ink-900">
            ¿Reiniciar la jornada de demostración?
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Se repondrá el estado de los alumnos y se borrarán los movimientos y avisos generados
            durante la demostración. Las cuentas, las autorizaciones y las sesiones abiertas no se
            tocan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={formAction} onSubmit={() => setConfirming(false)}>
              <SubmitButton
                size="md"
                pendingText="Reiniciando…"
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Sí, reiniciar
              </SubmitButton>
            </form>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-600 transition hover:text-ink-900"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reiniciar la jornada
        </button>
      )}
    </div>
  );
}
