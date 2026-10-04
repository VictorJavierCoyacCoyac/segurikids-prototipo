"use client";

import { HeartPulse, Megaphone, ShieldAlert, Siren, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ModalTrigger } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  EMERGENCY_PRIORITIES,
  EMERGENCY_PRIORITY_META,
  EMERGENCY_TYPES,
  EMERGENCY_TYPE_META,
  type EmergencyType,
} from "@/lib/domain/alerts";
import { cn } from "@/lib/utils/cn";
import { createAlertAction } from "@/server/actions/emergencies";
import { idleState } from "@/server/actions/types";

const TYPE_ICONS = {
  EVACUATION: Siren,
  MEDICAL: HeartPulse,
  SECURITY: ShieldAlert,
  GENERAL: Megaphone,
} as const;

/**
 * Activación de una alerta de emergencia.
 *
 * Es una acción irreversible desde el punto de vista comunicativo (notifica a
 * todo el centro), por lo que exige elegir tipo, escribir un mensaje y pasar
 * por una confirmación explícita antes de enviarse.
 */
export function EmergencyForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction] = useActionState(
    createAlertAction,
    idleState<{ id: string; notified: number }>(),
  );
  const [type, setType] = useState<EmergencyType>("EVACUATION");
  const [confirming, setConfirming] = useState(false);

  if (state.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Alerta activada">
          {state.message}
        </Alert>
        <p className="text-xs leading-relaxed text-ink-500">
          La alerta ya aparece destacada en los paneles de dirección, personal y familias. La
          dirección del centro puede marcarla como resuelta cuando la situación termine.
        </p>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Cerrar
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.ok === false && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <fieldset>
        <legend className="sk-label">Tipo de emergencia</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {EMERGENCY_TYPES.map((option) => {
            const meta = EMERGENCY_TYPE_META[option];
            const Icon = TYPE_ICONS[option];
            const selected = type === option;
            return (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition",
                  selected
                    ? "border-berry-400 bg-berry-50/60 ring-2 ring-berry-100"
                    : "border-ink-200 bg-white hover:border-berry-300",
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={option}
                  checked={selected}
                  onChange={() => setType(option)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    selected ? "bg-berry-600 text-white" : "bg-ink-100 text-ink-500",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink-900">{meta.label}</span>
                  <span className="block text-xs leading-snug text-ink-500">
                    {meta.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field label="Título de la alerta" htmlFor="alert-title" error={state.errors?.title} required>
        <Input
          id="alert-title"
          name="title"
          defaultValue={EMERGENCY_TYPE_META[type].label}
          key={type}
          placeholder="Ej. Evacuación por sismo"
          error={Boolean(state.errors?.title)}
          required
        />
      </Field>

      <Field
        label="Mensaje para el centro"
        htmlFor="alert-message"
        error={state.errors?.message}
        hint="Este texto se envía tal cual a las familias y al personal."
        required
      >
        <Textarea
          id="alert-message"
          name="message"
          rows={4}
          placeholder="Describe la situación e indica qué debe hacer la comunidad escolar."
          error={Boolean(state.errors?.message)}
          required
        />
      </Field>

      <Field label="Prioridad" htmlFor="alert-priority" error={state.errors?.priority} required>
        <Select
          id="alert-priority"
          name="priority"
          defaultValue={EMERGENCY_TYPE_META[type].defaultPriority}
          key={`priority-${type}`}
        >
          {EMERGENCY_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {EMERGENCY_PRIORITY_META[priority].label}
            </option>
          ))}
        </Select>
      </Field>

      {confirming ? (
        <div className="space-y-3 rounded-2xl bg-berry-50 p-4 ring-1 ring-berry-200">
          <p className="flex items-start gap-2 text-sm font-semibold text-berry-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Se notificará de inmediato a todas las familias y al personal del centro.
          </p>
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="danger" size="lg" pendingText="Activando alerta…" className="flex-1">
              Sí, activar la alerta
            </SubmitButton>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-600 transition hover:bg-ink-50"
            >
              Revisar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-berry-600 px-5 text-base font-semibold text-white transition hover:bg-berry-700"
        >
          <Siren className="h-5 w-5" />
          Continuar
        </button>
      )}
    </form>
  );
}

export function TriggerEmergencyButton({
  label = "Activar emergencia",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <ModalTrigger
      label={label}
      variant="danger"
      size={size}
      icon={<Siren className="h-4 w-4" />}
      title="Activar alerta de emergencia"
      description="Se notificará a toda la comunidad escolar del centro."
      modalSize="lg"
    >
      {(close) => <EmergencyForm onDone={close} />}
    </ModalTrigger>
  );
}
