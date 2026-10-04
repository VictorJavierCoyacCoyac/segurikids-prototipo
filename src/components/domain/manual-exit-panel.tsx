"use client";

import { LogOut, Search, ShieldCheck, ShieldX } from "lucide-react";
import { useActionState, useState } from "react";

import { DeliveryReceipt } from "@/components/domain/scanner/delivery-receipt";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { relationshipLabel } from "@/lib/domain/roles";
import { cn } from "@/lib/utils/cn";
import { registerMovementAction } from "@/server/actions/attendance";
import { idleState } from "@/server/actions/types";
import type { MovementResult } from "@/server/services/attendance";

export type ExitCandidate = {
  id: string;
  name: string;
  group: string;
  tutorName: string;
  avatarTone: string;
  people: Array<{
    id: string;
    name: string;
    relationship: string;
    avatarTone: string;
    qrIdentifier: string;
    documentTail: string | null;
    active: boolean;
    suspended: boolean;
  }>;
};

/**
 * Salida manual (sin lectura de QR).
 *
 * Se mantiene la misma regla de negocio que en el escáner: solo se ofrece
 * entregar al alumno a personas con autorización vigente. Las revocadas o
 * suspendidas se muestran deshabilitadas para que el personal entienda por qué
 * no puede seleccionarlas, en lugar de simplemente ocultarlas.
 */
export function ManualExitPanel({ students }: { students: ExitCandidate[] }) {
  const [key, setKey] = useState(0);
  return (
    <ExitSession key={key} students={students} onReset={() => setKey((value) => value + 1)} />
  );
}

function ExitSession({
  students,
  onReset,
}: {
  students: ExitCandidate[];
  onReset: () => void;
}) {
  const [state, formAction] = useActionState(registerMovementAction, idleState<MovementResult>());
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  const selected = students.find((student) => student.id === selectedId) ?? null;
  const selectedPerson = selected?.people.find((person) => person.id === personId) ?? null;

  if (state.ok && state.data?.ok) {
    return (
      <DeliveryReceipt
        movement={state.data}
        personName={state.data.personName}
        onReset={onReset}
      />
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<LogOut className="h-6 w-6" />}
        title="No hay alumnos en el plantel"
        description="Solo se puede registrar la salida de alumnos que se encuentran dentro del centro."
      />
    );
  }

  const filtered = search.trim()
    ? students.filter((student) =>
        `${student.name} ${student.group} ${student.tutorName}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : students;

  return (
    <div className="space-y-4">
      {state.ok === false && state.message ? (
        <Alert tone="danger" title="No se pudo registrar la salida">
          {state.message}
        </Alert>
      ) : null}

      {/* Paso 1 · Elegir alumno */}
      <div className="sk-card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
            1
          </span>
          <p className="text-sm font-bold text-ink-900">Selecciona al alumno</p>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar alumno, grupo o tutor…"
            className="h-11 py-0 pl-10"
            aria-label="Buscar alumno"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-ink-50 p-4 text-center text-sm text-ink-500">
            Ningún alumno en plantel coincide con la búsqueda.
          </p>
        ) : (
          <ul className="grid max-h-72 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
            {filtered.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(student.id);
                    setPersonId(null);
                  }}
                  aria-pressed={selectedId === student.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                    selectedId === student.id
                      ? "border-brand-400 bg-brand-50/60 ring-2 ring-brand-100"
                      : "border-ink-200 bg-white hover:border-brand-300",
                  )}
                >
                  <Avatar name={student.name} tone={student.avatarTone} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {student.name}
                    </span>
                    <span className="block truncate text-xs text-ink-500">{student.group}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Paso 2 · Elegir a quién se entrega */}
      <div className={cn("sk-card space-y-3 p-4", !selected && "opacity-60")}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white",
              selected ? "bg-brand-600" : "bg-ink-300",
            )}
          >
            2
          </span>
          <p className="text-sm font-bold text-ink-900">Identifica a quién se entrega</p>
        </div>

        {!selected ? (
          <p className="rounded-2xl bg-ink-50 p-4 text-center text-sm text-ink-500">
            Elige primero un alumno para ver sus personas autorizadas.
          </p>
        ) : selected.people.length === 0 ? (
          <Alert tone="warning" title="El alumno no tiene personas autorizadas">
            No es posible registrar la salida. Informa a la dirección del centro.
          </Alert>
        ) : (
          <ul className="space-y-2">
            {selected.people.map((person) => {
              const blocked = !person.active || person.suspended;
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => setPersonId(person.id)}
                    aria-pressed={personId === person.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                      blocked
                        ? "cursor-not-allowed border-ink-100 bg-ink-50"
                        : personId === person.id
                          ? "border-mint-400 bg-mint-50/60 ring-2 ring-mint-100"
                          : "border-ink-200 bg-white hover:border-mint-300",
                    )}
                  >
                    <Avatar name={person.name} tone={person.avatarTone} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">
                        {person.name}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {relationshipLabel(person.relationship)} ·{" "}
                        <span className="font-mono">{person.qrIdentifier}</span>
                      </span>
                      {person.documentTail && !blocked ? (
                        <span className="mt-0.5 block text-[11px] text-ink-400">
                          Verificar identificación terminada en {person.documentTail}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0">
                      {blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-berry-50 px-2 py-0.5 text-[11px] font-bold text-berry-700 ring-1 ring-berry-200">
                          <ShieldX className="h-3 w-3" />
                          {person.suspended ? "Suspendida" : "Revocada"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-bold text-mint-700 ring-1 ring-mint-200">
                          <ShieldCheck className="h-3 w-3" />
                          Autorizada
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Paso 3 · Confirmar */}
      <form action={formAction} className="sk-card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white",
              selectedPerson ? "bg-brand-600" : "bg-ink-300",
            )}
          >
            3
          </span>
          <p className="text-sm font-bold text-ink-900">Confirma la entrega</p>
        </div>

        <input type="hidden" name="type" value="EXIT" />
        <input type="hidden" name="method" value="MANUAL" />
        <input type="hidden" name="studentIds" value={selected?.id ?? ""} />
        <input type="hidden" name="authorizedPersonId" value={selectedPerson?.id ?? ""} />

        {selected && selectedPerson ? (
          <div className="rounded-2xl bg-mint-50 p-3 text-sm text-mint-900 ring-1 ring-mint-200">
            Se registrará la salida de <strong>{selected.name}</strong> entregado a{" "}
            <strong>{selectedPerson.name}</strong> ({relationshipLabel(selectedPerson.relationship)}).
          </div>
        ) : (
          <p className="rounded-2xl bg-ink-50 p-3 text-sm text-ink-500">
            Completa los pasos anteriores para habilitar la confirmación.
          </p>
        )}

        <div>
          <label htmlFor="exit-note" className="sk-label">
            Motivo del registro manual (opcional)
          </label>
          <Textarea
            id="exit-note"
            name="note"
            rows={2}
            maxLength={200}
            placeholder="Ej. La persona autorizada no traía su credencial; se verificó su identificación oficial."
            className="min-h-[4.5rem]"
          />
        </div>

        <SubmitButton
          fullWidth
          size="xl"
          variant="success"
          disabled={!selected || !selectedPerson}
          pendingText="Registrando salida…"
          icon={<LogOut className="h-6 w-6" />}
        >
          Confirmar salida
        </SubmitButton>

        <Button
          type="button"
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => {
            setSelectedId(null);
            setPersonId(null);
          }}
        >
          Limpiar selección
        </Button>
      </form>
    </div>
  );
}
