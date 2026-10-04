"use client";

import { UserPlus } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/feedback";
import { CheckCard, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ModalTrigger } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { RELATIONSHIPS, RELATIONSHIP_LABEL } from "@/lib/domain/roles";
import { createAuthorizedPersonAction } from "@/server/actions/authorizations";
import { idleState } from "@/server/actions/types";

export type SelectableStudent = { id: string; name: string; group: string };

/**
 * Alta de persona autorizada.
 * El identificador QR se genera en el servidor: quien registra a la persona no
 * puede elegirlo, evitando códigos duplicados o predecibles a propósito.
 */
export function AuthorizedPersonForm({
  students,
  onDone,
  submitLabel = "Registrar persona autorizada",
}: {
  students: SelectableStudent[];
  onDone?: () => void;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(createAuthorizedPersonAction, idleState<{
    id: string;
    qrIdentifier: string;
  }>());

  if (state.ok && state.data) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Persona autorizada registrada">
          {state.message}
        </Alert>
        <div className="rounded-2xl bg-ink-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Identificador asignado
          </p>
          <p className="mt-1 font-mono text-lg font-bold tracking-wider text-brand-700">
            {state.data.qrIdentifier}
          </p>
        </div>
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
        <Alert tone="danger" title="No se pudo registrar">
          {state.message}
        </Alert>
      ) : null}

      <Field label="Nombre completo" htmlFor="ap-name" error={state.errors?.name} required>
        <Input
          id="ap-name"
          name="name"
          placeholder="Nombre y apellidos"
          error={Boolean(state.errors?.name)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Relación con el menor"
          htmlFor="ap-relationship"
          error={state.errors?.relationship}
          required
        >
          <Select
            id="ap-relationship"
            name="relationship"
            defaultValue="GRANDPARENT"
            error={Boolean(state.errors?.relationship)}
          >
            {RELATIONSHIPS.map((relationship) => (
              <option key={relationship} value={relationship}>
                {RELATIONSHIP_LABEL[relationship]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Teléfono de contacto" htmlFor="ap-phone" error={state.errors?.phone}>
          <Input
            id="ap-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="55 1234 5678"
            error={Boolean(state.errors?.phone)}
          />
        </Field>
      </div>

      <Field
        label="Últimos dígitos de su identificación"
        htmlFor="ap-document"
        error={state.errors?.documentTail}
        hint="Solo se guardan los últimos dígitos, para el cotejo visual en la entrega."
      >
        <Input
          id="ap-document"
          name="documentTail"
          inputMode="numeric"
          placeholder="4821"
          maxLength={6}
          error={Boolean(state.errors?.documentTail)}
        />
      </Field>

      <fieldset>
        <legend className="sk-label">
          Alumnos que podrá recoger <span className="text-berry-600">*</span>
        </legend>
        {students.length === 0 ? (
          <p className="rounded-2xl bg-ink-50 p-3 text-sm text-ink-500">
            No hay alumnos disponibles para asociar.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {students.map((student) => (
              <CheckCard
                key={student.id}
                name="studentIds"
                value={student.id}
                title={student.name}
                subtitle={student.group}
              />
            ))}
          </div>
        )}
        {state.errors?.studentIds ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-berry-600">
            {state.errors.studentIds}
          </p>
        ) : null}
      </fieldset>

      <Field label="Notas (opcional)" htmlFor="ap-notes" error={state.errors?.notes}>
        <Textarea
          id="ap-notes"
          name="notes"
          rows={3}
          placeholder="Indicaciones útiles para el personal del centro."
          className="min-h-[5rem]"
        />
      </Field>

      <SubmitButton size="lg" fullWidth pendingText="Registrando…" icon={<UserPlus className="h-5 w-5" />}>
        {submitLabel}
      </SubmitButton>

      <p className="text-xs leading-relaxed text-ink-500">
        Al registrar a una persona, el sistema genera su identificador QR y avisa al tutor. La acción
        queda registrada en la bitácora de auditoría.
      </p>
    </form>
  );
}

/** Botón + modal para dar de alta a una persona autorizada. */
export function AddAuthorizedPersonButton({
  students,
  label = "Agregar persona",
  variant = "primary",
}: {
  students: SelectableStudent[];
  label?: string;
  variant?: "primary" | "secondary" | "outline";
}) {
  return (
    <ModalTrigger
      label={label}
      variant={variant}
      icon={<UserPlus className="h-4 w-4" />}
      title="Nueva persona autorizada"
      description="Define quién puede recoger al alumno y a qué alumnos queda asociada."
      modalSize="lg"
    >
      {(close) => <AuthorizedPersonForm students={students} onDone={close} />}
    </ModalTrigger>
  );
}
