"use client";

import { Keyboard, ScanLine, Search, ShieldQuestion, Sparkles } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Avatar } from "@/components/ui/avatar";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { relationshipLabel } from "@/lib/domain/roles";
import { formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { scanCodeAction } from "@/server/actions/attendance";
import { idleState } from "@/server/actions/types";
import type { ScannablePerson } from "@/server/services/authorizations";
import type { ScanResult } from "@/server/services/attendance";

import { CameraReader } from "./camera-reader";
import { ScanResultPanel } from "./scan-result-panel";

type Mode = "camera" | "manual" | "simulate";

/**
 * Consola de control de salida.
 *
 * Los tres modos de entrada (cámara, código manual y simulación) desembocan en
 * la MISMA server action de validación, por lo que la demostración no depende
 * del hardware disponible y el comportamiento es siempre idéntico.
 */
export function ScannerConsole({ people }: { people: ScannablePerson[] }) {
  const [sessionKey, setSessionKey] = useState(0);
  return (
    <ScannerSession
      key={sessionKey}
      people={people}
      onReset={() => setSessionKey((value) => value + 1)}
    />
  );
}

function ScannerSession({
  people,
  onReset,
}: {
  people: ScannablePerson[];
  onReset: () => void;
}) {
  const [state, formAction] = useActionState(scanCodeAction, idleState<ScanResult>());
  const [mode, setMode] = useState<Mode>("manual");
  const [search, setSearch] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const result = state.data;

  // Con un veredicto en pantalla, el resto de la interfaz desaparece: el
  // operador solo debe decidir entregar o no entregar.
  if (result) {
    return (
      <ScanResultPanel
        result={result}
        scannedAtLabel={formatTime(result.scannedAt)}
        onReset={onReset}
      />
    );
  }

  /** Rellena el código detectado/elegido y envía el formulario de validación. */
  const submitCode = (code: string) => {
    if (codeRef.current) codeRef.current.value = code;
    formRef.current?.requestSubmit();
  };

  const filtered = search.trim()
    ? people.filter((person) =>
        `${person.name} ${person.qrIdentifier}`.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : people;

  const MODES: Array<{ id: Mode; label: string; icon: typeof ScanLine }> = [
    { id: "manual", label: "Código", icon: Keyboard },
    { id: "camera", label: "Cámara", icon: ScanLine },
    { id: "simulate", label: "Simular", icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      {/* Selector de modo */}
      <div
        role="tablist"
        aria-label="Modo de identificación"
        className="grid grid-cols-3 gap-1 rounded-2xl bg-ink-100 p-1"
      >
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => setMode(item.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition",
              mode === item.id
                ? "bg-white text-brand-700 shadow-sm"
                : "text-ink-600 hover:text-ink-900",
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {state.ok === false && state.message ? (
        <Alert tone="danger" title="No se pudo validar el código">
          {state.message}
          {state.errors?.code ? <p className="mt-0.5">{state.errors.code}</p> : null}
        </Alert>
      ) : null}

      {/* Formulario único de validación: lo comparten los tres modos */}
      <form ref={formRef} action={formAction} className="sk-card space-y-3 p-4">
        <input ref={codeRef} type="hidden" name="code" defaultValue="" />
        {/*
          Botón de envío siempre presente: los modos «Cámara» y «Simular» envían
          el formulario mediante requestSubmit(), que necesita un submitter
          válido en el árbol aunque no sea visible.
        */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Validar
        </button>

        {mode === "camera" ? (
          <CameraReader onDetected={submitCode} />
        ) : mode === "manual" ? (
          <ManualEntry codeRef={codeRef} error={state.errors?.code} />
        ) : (
          <SimulatePicker
            people={filtered}
            search={search}
            onSearch={setSearch}
            onPick={submitCode}
          />
        )}

        <PendingNotice />
      </form>

      {mode !== "simulate" ? (
        <Alert tone="info">
          <p className="font-semibold">Validación en el servidor</p>
          <p className="mt-0.5 leading-relaxed">
            El código solo identifica a la persona. El sistema comprueba que existe, que está activa,
            que tiene autorización vigente para el alumno y que el alumno está en el plantel antes de
            permitir la entrega.
          </p>
        </Alert>
      ) : null}
    </div>
  );
}

/** Aviso de progreso mientras la server action valida el código. */
function PendingNotice() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <p
      className="flex animate-fade-in items-center gap-2 text-xs font-semibold text-brand-600"
      aria-live="polite"
    >
      <Spinner />
      Validando identificación…
    </p>
  );
}

function ManualEntry({
  codeRef,
  error,
}: {
  codeRef: React.RefObject<HTMLInputElement | null>;
  error?: string;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="manual-code" className="sk-label">
          Identificador de la persona
        </label>
        <Input
          id="manual-code"
          name="manualCode"
          value={value}
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            setValue(next);
            if (codeRef.current) codeRef.current.value = next;
          }}
          placeholder="SK-DEMO-000101"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          error={Boolean(error)}
          className="font-mono text-lg tracking-wider"
        />
        <p className="mt-1.5 text-xs text-ink-500">
          Formato <span className="font-mono font-semibold">SK-DEMO-000000</span>. Se admite el
          código impreso en la credencial de la persona autorizada.
        </p>
      </div>

      <SubmitButton
        fullWidth
        size="xl"
        pendingText="Validando identificación…"
        icon={<ShieldQuestion className="h-6 w-6" />}
        disabled={value.trim().length === 0}
      >
        Validar identificación
      </SubmitButton>
    </div>
  );
}

/**
 * Simulación de escaneo.
 * Cada opción indica el resultado esperado para que quien presenta el prototipo
 * pueda demostrar a voluntad el caso autorizado y el caso bloqueado.
 */
function SimulatePicker({
  people,
  search,
  onSearch,
  onPick,
}: {
  people: ScannablePerson[];
  search: string;
  onSearch: (value: string) => void;
  onPick: (code: string) => void;
}) {
  const EXPECTED = {
    AUTHORIZED: { label: "Autorizado", className: "bg-mint-50 text-mint-700 ring-mint-200" },
    UNAUTHORIZED: {
      label: "Sin autorización",
      className: "bg-berry-50 text-berry-700 ring-berry-200",
    },
    SUSPENDED: { label: "Suspendida", className: "bg-berry-50 text-berry-700 ring-berry-200" },
    UNAVAILABLE: { label: "Sin alumnos", className: "bg-sun-50 text-sun-700 ring-sun-200" },
  } as const;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-ink-900">Simular escaneo</p>
        <p className="text-xs leading-snug text-ink-500">
          Elige una persona para ejecutar exactamente el mismo flujo que produciría un escaneo real.
          La etiqueta indica el resultado que devolverá la validación.
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          // Enter aquí filtra; no debe enviar el formulario con el código vacío.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Buscar por nombre o código…"
          className="h-11 py-0 pl-10"
          aria-label="Buscar persona autorizada"
        />
      </div>

      {people.length === 0 ? (
        <p className="rounded-2xl bg-ink-50 p-4 text-center text-sm text-ink-500">
          No se encontraron personas con ese criterio.
        </p>
      ) : (
        <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-0.5">
          {people.map((person) => {
            const expected = EXPECTED[person.expected];
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => onPick(person.qrIdentifier)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
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
                    {person.studentNames.length > 0 ? (
                      <span className="mt-0.5 block truncate text-[11px] text-ink-400">
                        {person.studentNames.join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                      expected.className,
                    )}
                  >
                    {expected.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onPick("SK-DEMO-999999")}
        className="w-full rounded-2xl border border-dashed border-ink-300 px-3 py-2.5 text-xs font-semibold text-ink-500 transition hover:border-berry-300 hover:text-berry-600"
      >
        Simular un código inexistente (SK-DEMO-999999)
      </button>
    </div>
  );
}
