"use client";

import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "@/server/actions/auth";
import { idleState } from "@/server/actions/types";

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState(loginAction, idleState());

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.ok === false && state.message ? (
        <Alert tone="danger" title="No se pudo iniciar sesión">
          {state.message}
        </Alert>
      ) : null}

      <Field label="Correo electrónico" htmlFor="email" error={state.errors?.email} required>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="tu.correo@demo.local"
            defaultValue={defaultEmail}
            error={Boolean(state.errors?.email)}
            className="pl-12"
            required
          />
        </div>
      </Field>

      <Field label="Contraseña" htmlFor="password" error={state.errors?.password} required>
        <div className="relative">
          <KeyRound
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={Boolean(state.errors?.password)}
            className="pl-12"
            required
          />
        </div>
      </Field>

      <SubmitButton
        size="lg"
        fullWidth
        pendingText="Validando acceso…"
        icon={<ArrowRight className="h-5 w-5" />}
      >
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}
