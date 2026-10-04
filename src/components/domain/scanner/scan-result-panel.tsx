"use client";

import {
  AlertOctagon,
  BadgeCheck,
  Clock,
  IdCard,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  UserRound,
} from "lucide-react";
import { useActionState } from "react";

import { ReportIncidentButton } from "@/components/domain/incident-form";
import { StudentStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { CheckCard } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { VALIDATION_FAILURE_MESSAGE, type ValidationFailure } from "@/lib/domain/attendance";
import { relationshipLabel } from "@/lib/domain/roles";
import { confirmPickupAction } from "@/server/actions/attendance";
import { idleState } from "@/server/actions/types";
import type { MovementResult, ScanResult } from "@/server/services/attendance";

import { DeliveryReceipt } from "./delivery-receipt";

/**
 * Veredicto del escaneo.
 *
 * El resultado debe ser INEQUÍVOCO a un metro de distancia: verde con escudo
 * para autorizado, rojo bloqueante para no autorizado. La acción de confirmar
 * la entrega solo existe en el caso autorizado.
 */
export function ScanResultPanel({
  result,
  scannedAtLabel,
  onReset,
}: {
  result: ScanResult;
  scannedAtLabel: string;
  onReset: () => void;
}) {
  if (result.status === "DENIED") {
    return (
      <DeniedPanel result={result} scannedAtLabel={scannedAtLabel} onReset={onReset} />
    );
  }

  return (
    <AuthorizedPanel result={result} scannedAtLabel={scannedAtLabel} onReset={onReset} />
  );
}

function AuthorizedPanel({
  result,
  scannedAtLabel,
  onReset,
}: {
  result: Extract<ScanResult, { status: "AUTHORIZED" }>;
  scannedAtLabel: string;
  onReset: () => void;
}) {
  const [state, formAction] = useActionState(confirmPickupAction, idleState<MovementResult>());

  // Entrega completada: se muestra el comprobante en lugar del formulario.
  if (state.ok && state.data?.ok) {
    return (
      <DeliveryReceipt
        movement={state.data}
        personName={result.person.name}
        onReset={onReset}
      />
    );
  }

  return (
    <div className="animate-scale-in space-y-4">
      {/* Veredicto */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-mint-600 to-mint-700 text-white shadow-float">
        <div className="flex items-center gap-4 p-5">
          <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15">
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-white/30" />
            <ShieldCheck className="relative h-9 w-9" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
              Autorizado
            </p>
            <p className="mt-0.5 text-sm text-mint-50">
              La persona puede recoger a {result.deliverable.length}{" "}
              {result.deliverable.length === 1 ? "alumno" : "alumnos"}.
            </p>
          </div>
        </div>
      </div>

      {/* Identidad de la persona */}
      <div className="sk-card p-4">
        <div className="flex items-start gap-3.5">
          <Avatar name={result.person.name} tone={result.person.avatarTone} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight text-ink-900">{result.person.name}</p>
            <p className="mt-0.5 text-sm text-ink-600">
              {relationshipLabel(result.person.relationship)}
              {result.person.isTutorAccount ? " · Tutor principal" : ""}
            </p>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-ink-50 px-3 py-2">
                <dt className="flex items-center gap-1 font-medium text-ink-500">
                  <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                  Identificador
                </dt>
                <dd className="mt-0.5 font-mono font-bold text-ink-900">
                  {result.person.qrIdentifier}
                </dd>
              </div>
              <div className="rounded-xl bg-ink-50 px-3 py-2">
                <dt className="flex items-center gap-1 font-medium text-ink-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Hora del escaneo
                </dt>
                <dd className="mt-0.5 font-bold text-ink-900">{scannedAtLabel}</dd>
              </div>
            </dl>

            {result.person.documentTail ? (
              <p className="mt-2 rounded-xl bg-sun-50 px-3 py-2 text-xs text-sun-800">
                <span className="font-semibold">Verificación adicional:</span> solicita una
                identificación terminada en{" "}
                <span className="font-mono font-bold">{result.person.documentTail}</span>.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Confirmación de entrega */}
      <form action={formAction} className="sk-card space-y-3 p-4">
        <input type="hidden" name="authorizedPersonId" value={result.person.id} />
        <input type="hidden" name="method" value="QR" />

        <div>
          <p className="text-sm font-bold text-ink-900">Alumnos por entregar</p>
          <p className="text-xs text-ink-500">
            Desmarca a quien no salga en este momento. Se registrará una salida por cada alumno
            seleccionado.
          </p>
        </div>

        {state.ok === false && state.message ? (
          <Alert tone="danger">{state.message}</Alert>
        ) : null}

        <div className="space-y-2">
          {result.deliverable.map((student) => (
            <CheckCard
              key={student.id}
              name="studentIds"
              value={student.id}
              defaultChecked
              title={student.name}
              subtitle={`${student.group} · ${relationshipLabel(student.relationship)}`}
              trailing={<StudentStatusPill status={student.status} size="sm" />}
            />
          ))}
        </div>

        {result.unavailable.length > 0 ? (
          <Alert tone="warning" title="Otros alumnos autorizados no disponibles">
            <ul className="mt-1 space-y-0.5">
              {result.unavailable.map((student) => (
                <li key={student.id}>
                  {student.name} — {student.status === "OFF_CAMPUS" ? "ya fue entregado" : "no registró entrada hoy"}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <SubmitButton
          fullWidth
          size="xl"
          variant="success"
          pendingText="Registrando salida…"
          icon={<BadgeCheck className="h-6 w-6" />}
        >
          Confirmar entrega
        </SubmitButton>

        <Button type="button" variant="ghost" fullWidth size="md" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          Cancelar y escanear otro código
        </Button>
      </form>
    </div>
  );
}

function DeniedPanel({
  result,
  scannedAtLabel,
  onReset,
}: {
  result: Extract<ScanResult, { status: "DENIED" }>;
  scannedAtLabel: string;
  onReset: () => void;
}) {
  const failure = VALIDATION_FAILURE_MESSAGE[result.failure as ValidationFailure];
  // «Sin alumnos por entregar» no es un intento no autorizado: la persona sí lo
  // está, pero no hay nadie que entregar. Se distingue para no alarmar de más.
  const isBlocking = result.failure !== "NO_STUDENTS_IN_CAMPUS";

  return (
    <div className="animate-scale-in space-y-4">
      <div
        className={`overflow-hidden rounded-3xl text-white shadow-float ${
          isBlocking
            ? "bg-gradient-to-br from-berry-600 to-berry-700"
            : "bg-gradient-to-br from-sun-500 to-sun-600"
        }`}
      >
        <div className="flex items-center gap-4 p-5">
          <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15">
            {isBlocking ? (
              <ShieldX className="h-9 w-9" aria-hidden="true" />
            ) : (
              <AlertOctagon className="h-9 w-9" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold uppercase leading-tight tracking-tight sm:text-3xl">
              {isBlocking ? "No autorizado" : "Sin entregas"}
            </p>
            <p className="mt-0.5 text-sm text-white/90">{failure.title}</p>
          </div>
        </div>
        <div className="bg-black/10 px-5 py-3">
          <p className="text-sm leading-snug">{failure.detail}</p>
        </div>
      </div>

      {/* Persona identificada (si el código existe) */}
      {result.person ? (
        <div className="sk-card p-4">
          <div className="flex items-start gap-3.5">
            <Avatar name={result.person.name} tone="ink" size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-ink-900">{result.person.name}</p>
              <p className="text-sm text-ink-600">
                {relationshipLabel(result.person.relationship)}
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-ink-500">
                {result.person.qrIdentifier} · {scannedAtLabel}
              </p>
            </div>
          </div>

          {result.related.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-ink-50 pt-3">
              {result.related.map((student) => (
                <li key={student.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink-700">
                    {student.name}
                    <span className="text-ink-400"> · {student.group}</span>
                  </span>
                  <span className="shrink-0">
                    {student.authorized ? (
                      <StudentStatusPill status={student.status} size="sm" />
                    ) : (
                      <span className="rounded-full bg-berry-50 px-2 py-0.5 text-[11px] font-semibold text-berry-700 ring-1 ring-berry-200">
                        Sin autorización
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="sk-card flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink-100 text-ink-500">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-ink-600">
            El código escaneado no corresponde a ninguna persona registrada en el centro.
          </p>
        </div>
      )}

      {isBlocking ? (
        <Alert tone="danger" title="La entrega no puede continuar">
          No entregues al alumno. Verifica la identidad de la persona, informa a la dirección del
          centro y contacta con el tutor si es necesario.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="lg" onClick={onReset} className="flex-1">
          <RotateCcw className="h-5 w-5" />
          Escanear otro código
        </Button>
        {isBlocking ? (
          <ReportIncidentButton
            variant="danger"
            size="lg"
            context={{
              authorizedPersonId: result.person?.id,
              personName: result.person?.name,
              defaultType:
                result.failure === "CODE_NOT_FOUND"
                  ? "UNKNOWN_CODE"
                  : result.failure === "PERSON_SUSPENDED"
                    ? "SUSPENDED_PERSON"
                    : "UNAUTHORIZED_PICKUP",
              defaultDescription: result.person
                ? `${result.person.name} intentó recoger a un alumno sin autorización vigente (${result.person.qrIdentifier}). Se bloqueó la entrega.`
                : "Se presentó un código QR no reconocido por el sistema. Se bloqueó la entrega.",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
