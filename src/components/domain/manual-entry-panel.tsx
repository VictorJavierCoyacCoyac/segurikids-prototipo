"use client";

import { LogIn, Search } from "lucide-react";
import { useActionState, useState } from "react";

import { DeliveryReceipt } from "@/components/domain/scanner/delivery-receipt";
import { StudentStatusPill } from "@/components/domain/status-pill";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { CheckCard, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerMovementAction } from "@/server/actions/attendance";
import { idleState } from "@/server/actions/types";
import type { MovementResult } from "@/server/services/attendance";

export type ManualStudent = {
  id: string;
  name: string;
  group: string;
  status: string;
  tutorName: string;
};

export type ManualPerson = { id: string; name: string; relationship: string };

/**
 * Registro manual de entradas.
 *
 * Existe porque en la operación real siempre hay excepciones: un tutor que
 * olvidó su credencial, un fallo de red o una entrada autorizada por teléfono.
 * El método queda marcado como MANUAL para poder auditarlo aparte del flujo QR.
 */
export function ManualEntryPanel({
  students,
  people,
}: {
  students: ManualStudent[];
  people: ManualPerson[];
}) {
  const [key, setKey] = useState(0);
  return (
    <EntrySession
      key={key}
      students={students}
      people={people}
      onReset={() => setKey((value) => value + 1)}
    />
  );
}

function EntrySession({
  students,
  people,
  onReset,
}: {
  students: ManualStudent[];
  people: ManualPerson[];
  onReset: () => void;
}) {
  const [state, formAction] = useActionState(registerMovementAction, idleState<MovementResult>());
  const [search, setSearch] = useState("");

  if (state.ok && state.data?.ok) {
    return <DeliveryReceipt movement={state.data} personName={null} onReset={onReset} />;
  }

  const filtered = search.trim()
    ? students.filter((student) =>
        `${student.name} ${student.group} ${student.tutorName}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : students;

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<LogIn className="h-6 w-6" />}
        title="Todos los alumnos tienen entrada registrada"
        description="No queda ningún alumno pendiente de registrar entrada en la jornada de hoy."
      />
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value="ENTRY" />
      <input type="hidden" name="method" value="MANUAL" />

      {state.ok === false && state.message ? (
        <Alert tone="danger" title="No se pudo registrar la entrada">
          {state.message}
        </Alert>
      ) : null}

      <div className="sk-card space-y-3 p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            // Enter filtra la lista; no debe registrar la entrada por accidente.
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Buscar alumno, grupo o tutor…"
            className="h-11 py-0 pl-10"
            aria-label="Buscar alumno"
          />
        </div>

        <fieldset>
          <legend className="sk-label">Alumnos pendientes de entrada</legend>
          {filtered.length === 0 ? (
            <p className="rounded-2xl bg-ink-50 p-4 text-center text-sm text-ink-500">
              Ningún alumno coincide con la búsqueda.
            </p>
          ) : (
            <div className="grid max-h-[24rem] gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {filtered.map((student) => (
                <CheckCard
                  key={student.id}
                  name="studentIds"
                  value={student.id}
                  title={student.name}
                  subtitle={`${student.group} · ${student.tutorName}`}
                  trailing={<StudentStatusPill status={student.status} size="sm" />}
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
      </div>

      <div className="sk-card space-y-3 p-4">
        <div>
          <label htmlFor="entry-person" className="sk-label">
            Persona que acompaña (opcional)
          </label>
          <Select id="entry-person" name="authorizedPersonId" defaultValue="">
            <option value="">Sin persona registrada</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="entry-note" className="sk-label">
            Nota del registro (opcional)
          </label>
          <Textarea
            id="entry-note"
            name="note"
            rows={2}
            maxLength={200}
            placeholder="Ej. Entrada autorizada por la dirección tras llamada del tutor."
            className="min-h-[4.5rem]"
          />
        </div>

        <SubmitButton
          fullWidth
          size="xl"
          pendingText="Registrando entrada…"
          icon={<LogIn className="h-6 w-6" />}
        >
          Registrar entrada
        </SubmitButton>

        <p className="text-xs leading-relaxed text-ink-500">
          El registro actualiza el estado del alumno a «En plantel», avisa al tutor y queda en la
          bitácora de auditoría como registro manual.
        </p>
      </div>
    </form>
  );
}
