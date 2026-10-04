"use client";

import { Save, UserPlus } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ModalTrigger } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { STUDENT_STATUSES, studentStatusMeta } from "@/lib/domain/students";
import { createStudentAction, updateStudentAction } from "@/server/actions/students";
import { idleState } from "@/server/actions/types";

export type TutorOption = { id: string; name: string; childrenCount: number };

export type StudentFormValues = {
  id?: string;
  firstName?: string;
  lastName?: string;
  group?: string;
  status?: string;
  tutorId?: string;
  birthDate?: string;
  bloodType?: string;
  allergies?: string;
  notes?: string;
};

/**
 * Formulario de alta y edición de alumno.
 * Un mismo componente cubre ambos casos para que las validaciones y el diseño
 * no se dupliquen; la acción cambia según exista `values.id`.
 */
export function StudentForm({
  tutors,
  groups,
  values,
  onDone,
}: {
  tutors: TutorOption[];
  groups: string[];
  values?: StudentFormValues;
  onDone?: () => void;
}) {
  const isEdit = Boolean(values?.id);
  const [state, formAction] = useActionState(
    isEdit ? updateStudentAction : createStudentAction,
    idleState<{ id: string }>(),
  );

  if (state.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title={isEdit ? "Alumno actualizado" : "Alumno registrado"}>
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
      {values?.id ? <input type="hidden" name="studentId" value={values.id} /> : null}

      {state.ok === false && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="firstName" error={state.errors?.firstName} required>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={values?.firstName}
            placeholder="Sofía"
            error={Boolean(state.errors?.firstName)}
            required
          />
        </Field>

        <Field label="Apellidos" htmlFor="lastName" error={state.errors?.lastName} required>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={values?.lastName}
            placeholder="Martínez"
            error={Boolean(state.errors?.lastName)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Grupo" htmlFor="group" error={state.errors?.group} required>
          <Input
            id="group"
            name="group"
            list="group-options"
            defaultValue={values?.group}
            placeholder="Kínder A"
            error={Boolean(state.errors?.group)}
            required
          />
          <datalist id="group-options">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Tutor principal"
          htmlFor="tutorId"
          error={state.errors?.tutorId}
          hint="Recibirá los avisos de entrada y salida."
          required
        >
          <Select
            id="tutorId"
            name="tutorId"
            defaultValue={values?.tutorId ?? ""}
            error={Boolean(state.errors?.tutorId)}
          >
            <option value="" disabled>
              Selecciona un tutor
            </option>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.name}
                {tutor.childrenCount > 0 ? ` (${tutor.childrenCount} alumno/s)` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fecha de nacimiento" htmlFor="birthDate" error={state.errors?.birthDate}>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={values?.birthDate}
            error={Boolean(state.errors?.birthDate)}
          />
        </Field>

        <Field label="Tipo de sangre" htmlFor="bloodType" error={state.errors?.bloodType}>
          <Input
            id="bloodType"
            name="bloodType"
            defaultValue={values?.bloodType}
            placeholder="O+"
            maxLength={8}
          />
        </Field>

        <Field
          label="Estado operativo"
          htmlFor="status"
          error={state.errors?.status}
          hint={isEdit ? "Cámbialo solo por corrección administrativa." : undefined}
        >
          <Select id="status" name="status" defaultValue={values?.status ?? "ABSENT"}>
            {STUDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {studentStatusMeta(status).label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Alergias o condiciones" htmlFor="allergies" error={state.errors?.allergies}>
        <Input
          id="allergies"
          name="allergies"
          defaultValue={values?.allergies}
          placeholder="Ninguna registrada"
        />
      </Field>

      <Field label="Notas internas" htmlFor="notes" error={state.errors?.notes}>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={values?.notes}
          placeholder="Indicaciones relevantes para el personal del centro."
          className="min-h-[5rem]"
        />
      </Field>

      <SubmitButton
        fullWidth
        size="lg"
        pendingText={isEdit ? "Guardando cambios…" : "Registrando alumno…"}
        icon={isEdit ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
      >
        {isEdit ? "Guardar cambios" : "Registrar alumno"}
      </SubmitButton>

      {!isEdit ? (
        <p className="text-xs leading-relaxed text-ink-500">
          Al registrar al alumno, su tutor principal queda autorizado automáticamente para recogerlo
          y el alta se registra en la bitácora de auditoría.
        </p>
      ) : null}
    </form>
  );
}

export function CreateStudentButton({
  tutors,
  groups,
}: {
  tutors: TutorOption[];
  groups: string[];
}) {
  return (
    <ModalTrigger
      label="Nuevo alumno"
      icon={<UserPlus className="h-4 w-4" />}
      title="Registrar alumno"
      description="Los datos mínimos necesarios para operar el control de acceso."
      modalSize="lg"
    >
      {(close) => <StudentForm tutors={tutors} groups={groups} onDone={close} />}
    </ModalTrigger>
  );
}

export function EditStudentButton({
  tutors,
  groups,
  values,
}: {
  tutors: TutorOption[];
  groups: string[];
  values: StudentFormValues;
}) {
  return (
    <ModalTrigger
      label="Editar"
      variant="outline"
      icon={<Save className="h-4 w-4" />}
      title="Editar alumno"
      description="Los cambios quedan registrados en la auditoría del centro."
      modalSize="lg"
    >
      {(close) => <StudentForm tutors={tutors} groups={groups} values={values} onDone={close} />}
    </ModalTrigger>
  );
}
