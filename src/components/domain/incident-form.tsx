"use client";

import { FileWarning } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ModalTrigger } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABEL,
} from "@/lib/domain/alerts";
import { createIncidentAction } from "@/server/actions/emergencies";
import { idleState } from "@/server/actions/types";

export type IncidentContext = {
  studentId?: string;
  studentName?: string;
  authorizedPersonId?: string;
  personName?: string;
  defaultType?: string;
  defaultDescription?: string;
};

/** Reporte de incidencia operativa por parte del personal escolar. */
export function IncidentForm({
  context,
  onDone,
}: {
  context?: IncidentContext;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(createIncidentAction, idleState<{ id: string }>());

  if (state.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Incidencia registrada">
          {state.message}
        </Alert>
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

      {context?.studentName || context?.personName ? (
        <div className="rounded-2xl bg-ink-50 p-3 text-sm">
          {context.personName ? (
            <p className="text-ink-700">
              <span className="font-semibold">Persona:</span> {context.personName}
            </p>
          ) : null}
          {context.studentName ? (
            <p className="mt-0.5 text-ink-700">
              <span className="font-semibold">Alumno:</span> {context.studentName}
            </p>
          ) : null}
        </div>
      ) : null}

      {context?.studentId ? (
        <input type="hidden" name="studentId" value={context.studentId} />
      ) : null}
      {context?.authorizedPersonId ? (
        <input type="hidden" name="authorizedPersonId" value={context.authorizedPersonId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de incidencia" htmlFor="incident-type" error={state.errors?.type} required>
          <Select
            id="incident-type"
            name="type"
            defaultValue={context?.defaultType ?? "OTHER"}
            error={Boolean(state.errors?.type)}
          >
            {INCIDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {INCIDENT_TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Severidad" htmlFor="incident-severity" error={state.errors?.severity}>
          <Select id="incident-severity" name="severity" defaultValue="MEDIUM">
            {INCIDENT_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {INCIDENT_SEVERITY_LABEL[severity]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="¿Qué ocurrió?"
        htmlFor="incident-description"
        error={state.errors?.description}
        hint="Describe los hechos de forma objetiva. Este texto queda en la bitácora del centro."
        required
      >
        <Textarea
          id="incident-description"
          name="description"
          rows={4}
          defaultValue={context?.defaultDescription}
          placeholder="Ej. Se presentó una persona sin autorización vigente para recoger a la alumna."
          error={Boolean(state.errors?.description)}
          required
        />
      </Field>

      <SubmitButton
        fullWidth
        size="lg"
        variant="danger"
        pendingText="Registrando incidencia…"
        icon={<FileWarning className="h-5 w-5" />}
      >
        Reportar incidencia
      </SubmitButton>
    </form>
  );
}

export function ReportIncidentButton({
  context,
  label = "Reportar incidencia",
  variant = "outline",
  size = "md",
}: {
  context?: IncidentContext;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <ModalTrigger
      label={label}
      variant={variant}
      size={size}
      icon={<FileWarning className="h-4 w-4" />}
      title="Reportar incidencia"
      description="Queda registrada para la dirección del centro."
    >
      {(close) => <IncidentForm context={context} onDone={close} />}
    </ModalTrigger>
  );
}
