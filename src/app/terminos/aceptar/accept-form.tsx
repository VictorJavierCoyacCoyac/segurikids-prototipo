"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { acceptTermsAction } from "@/server/actions/terms";
import { idleState } from "@/server/actions/types";

/**
 * Casilla de aceptación.
 *
 * El botón permanece deshabilitado hasta marcar la casilla: el consentimiento
 * tiene que ser una acción deliberada, no el resultado de pulsar «continuar».
 * La comprobación se repite en el servidor (`acceptTermsAction`).
 */
export function AcceptTermsForm({ area }: { area: string }) {
  const [state, formAction] = useActionState(acceptTermsAction, idleState());
  const [checked, setChecked] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="area" value={area} />

      {state.ok === false && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-brand-300">
        <input
          type="checkbox"
          name="accept"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-ink-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm leading-snug text-ink-700">
          He leído y acepto los <strong>términos de uso</strong> y el{" "}
          <strong>aviso de privacidad</strong> de SeguriKids. Entiendo que mi cuenta es personal y
          que mi credencial QR no debe compartirse.{" "}
          <Link
            href="/terminos"
            target="_blank"
            className="font-semibold text-brand-600 underline underline-offset-2"
          >
            Abrir en una pestaña nueva
          </Link>
          .
        </span>
      </label>

      <SubmitButton
        size="lg"
        fullWidth
        disabled={!checked}
        pendingText="Registrando aceptación…"
        icon={<Check className="h-5 w-5" />}
      >
        Aceptar y continuar
      </SubmitButton>
    </form>
  );
}
