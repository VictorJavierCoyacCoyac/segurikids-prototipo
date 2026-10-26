"use client";

import { IdCard, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { ModalTrigger } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  RELATIONSHIPS,
  RELATIONSHIP_LABEL,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  ROLES,
  type Role,
} from "@/lib/domain/roles";
import { cn } from "@/lib/utils/cn";
import { createUserAction, type CreatedUser } from "@/server/actions/users";
import { idleState } from "@/server/actions/types";

/**
 * Alta de cuentas de usuario (solo dirección).
 *
 * El formulario cambia según el rol: el personal del centro necesita un cargo,
 * mientras que un tutor necesita declarar su relación con el menor, porque de
 * ahí sale su credencial de recogida.
 */
export function UserForm({
  defaultRole = "PARENT",
  onDone,
}: {
  defaultRole?: Role;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(createUserAction, idleState<CreatedUser>());
  const [role, setRole] = useState<Role>(defaultRole);

  if (state.ok && state.data) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Cuenta creada">
          {state.message}
        </Alert>

        <dl className="space-y-2 rounded-2xl bg-ink-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Nombre</dt>
            <dd className="font-semibold text-ink-900">{state.data.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Correo de acceso</dt>
            <dd className="font-mono text-xs font-semibold text-ink-900">{state.data.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Rol</dt>
            <dd className="font-semibold text-ink-900">
              {ROLE_LABEL[state.data.role as Role] ?? state.data.role}
            </dd>
          </div>
          {state.data.qrIdentifier ? (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Credencial de recogida</dt>
              <dd className="font-mono text-xs font-bold text-brand-700">
                {state.data.qrIdentifier}
              </dd>
            </div>
          ) : null}
        </dl>

        <Alert tone="warning">
          <p className="font-semibold">Primer acceso</p>
          <p className="mt-0.5 leading-relaxed">
            En su primer inicio de sesión, la cuenta deberá aceptar los términos de uso y el aviso de
            privacidad antes de poder operar. La aceptación queda registrada en la auditoría.
          </p>
        </Alert>

        {state.data.role === "PARENT" ? (
          <Alert tone="info">
            <p className="font-semibold">Siguiente paso</p>
            <p className="mt-0.5 leading-relaxed">
              La cuenta todavía no tiene alumnos asociados. Vincúlala desde la ficha de cada alumno,
              en el campo «Tutor principal».
            </p>
          </Alert>
        ) : null}

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
        <Alert tone="danger" title="No se pudo crear la cuenta">
          {state.message}
        </Alert>
      ) : null}

      <fieldset>
        <legend className="sk-label">
          Rol de la cuenta <span className="text-berry-600">*</span>
        </legend>
        <div className="grid gap-2">
          {ROLES.map((option) => {
            const selected = role === option;
            return (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition",
                  selected
                    ? "border-brand-400 bg-brand-50/60 ring-2 ring-brand-100"
                    : "border-ink-200 bg-white hover:border-brand-300",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={selected}
                  onChange={() => setRole(option)}
                  className="mt-0.5 h-4 w-4 shrink-0 border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink-900">{ROLE_LABEL[option]}</span>
                  <span className="block text-xs leading-snug text-ink-500">
                    {ROLE_DESCRIPTION[option]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {state.errors?.role ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-berry-600">
            {state.errors.role}
          </p>
        ) : null}
      </fieldset>

      <Field label="Nombre completo" htmlFor="user-name" error={state.errors?.name} required>
        <Input
          id="user-name"
          name="name"
          placeholder="Nombre y apellidos"
          error={Boolean(state.errors?.name)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Correo electrónico"
          htmlFor="user-email"
          error={state.errors?.email}
          hint="Será su usuario para iniciar sesión."
          required
        >
          <Input
            id="user-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="nombre@centro.local"
            error={Boolean(state.errors?.email)}
            required
          />
        </Field>

        <Field label="Teléfono" htmlFor="user-phone" error={state.errors?.phone}>
          <Input
            id="user-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="55 1234 5678"
            error={Boolean(state.errors?.phone)}
          />
        </Field>
      </div>

      {/* Campos propios de cada rol */}
      {role === "PARENT" ? (
        <Field
          label="Relación con el menor"
          htmlFor="user-relationship"
          error={state.errors?.relationship}
          hint="Se usa para generar su credencial de recogida."
          required
        >
          <Select
            id="user-relationship"
            name="relationship"
            defaultValue="MOTHER"
            error={Boolean(state.errors?.relationship)}
          >
            {RELATIONSHIPS.map((relationship) => (
              <option key={relationship} value={relationship}>
                {RELATIONSHIP_LABEL[relationship]}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field
          label="Cargo en el centro"
          htmlFor="user-jobtitle"
          error={state.errors?.jobTitle}
          required
        >
          <Input
            id="user-jobtitle"
            name="jobTitle"
            placeholder="Ej. Docente · Kínder A"
            error={Boolean(state.errors?.jobTitle)}
          />
        </Field>
      )}

      <Field
        label="Contraseña inicial"
        htmlFor="user-password"
        error={state.errors?.password}
        hint="Mínimo 8 caracteres. Entrégasela por un canal seguro."
        required
      >
        <div className="relative">
          <KeyRound
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            id="user-password"
            name="password"
            type="text"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            error={Boolean(state.errors?.password)}
            className="pl-12 font-mono"
            required
          />
        </div>
      </Field>

      {role === "PARENT" ? (
        <Alert tone="info">
          <p className="flex items-center gap-1.5 font-semibold">
            <IdCard className="h-4 w-4" aria-hidden="true" />
            Se generará su credencial automáticamente
          </p>
          <p className="mt-0.5 leading-relaxed">
            Al crear la cuenta, el sistema le asigna un identificador QR propio para la recogida.
            Después deberás vincular a sus hijos desde la ficha de cada alumno.
          </p>
        </Alert>
      ) : null}

      <SubmitButton
        fullWidth
        size="lg"
        pendingText="Creando cuenta…"
        icon={<UserPlus className="h-5 w-5" />}
      >
        Crear cuenta
      </SubmitButton>

      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
        El alta queda registrada en la bitácora de auditoría. En un entorno real esto sería una
        invitación por correo con cambio de contraseña obligatorio en el primer acceso.
      </p>
    </form>
  );
}

export function CreateUserButton({
  defaultRole = "PARENT",
  label = "Nuevo usuario",
  variant = "primary",
}: {
  defaultRole?: Role;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
}) {
  return (
    <ModalTrigger
      label={label}
      variant={variant}
      icon={<UserPlus className="h-4 w-4" />}
      title="Dar de alta una cuenta"
      description="Solo la dirección del centro puede crear usuarios."
      modalSize="lg"
    >
      {(close) => <UserForm defaultRole={defaultRole} onDone={close} />}
    </ModalTrigger>
  );
}
