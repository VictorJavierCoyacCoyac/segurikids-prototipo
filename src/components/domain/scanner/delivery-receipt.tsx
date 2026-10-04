"use client";

import { BellRing, CheckCircle2, ClipboardList, RotateCcw, ScanLine } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import type { MovementResult } from "@/server/services/attendance";

/**
 * Comprobante de la entrega.
 *
 * Cierra el ciclo de la demostración: muestra qué se registró y qué efectos
 * automáticos tuvo (cambio de estado, aviso al tutor, historial y auditoría).
 */
export function DeliveryReceipt({
  movement,
  personName,
  onReset,
}: {
  movement: MovementResult;
  personName: string | null;
  onReset: () => void;
}) {
  const count = movement.registered.length;
  const isExit = movement.type === "EXIT";
  const timeLabel = movement.registered[0]?.at
    ? new Date(movement.registered[0].at!).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="animate-scale-in space-y-4">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-mint-600 to-mint-700 text-white shadow-float">
        <div className="flex items-center gap-4 p-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-extrabold leading-tight sm:text-2xl">
              {isExit ? "Salida registrada" : "Entrada registrada"}
            </p>
            <p className="mt-0.5 text-sm text-mint-50">
              {count === 1
                ? movement.registered[0]!.studentName
                : `${count} alumnos registrados`}
              {timeLabel ? ` · ${timeLabel}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Detalle del registro */}
      <div className="sk-card divide-y divide-ink-50 p-0">
        <ul className="divide-y divide-ink-50">
          {movement.registered.map((item) => (
            <li key={item.studentId} className="flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{item.studentName}</p>
                <p className="text-xs text-ink-500">
                  {isExit ? "Fuera del plantel" : "En plantel"}
                  {personName ? ` · Entregado a ${personName}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {movement.rejected.length > 0 ? (
          <ul className="divide-y divide-ink-50 bg-sun-50/60">
            {movement.rejected.map((item) => (
              <li key={item.studentId} className="px-4 py-3 text-xs text-sun-800">
                <span className="font-semibold">{item.studentName || "Registro omitido"}:</span>{" "}
                {item.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Efectos automáticos del registro */}
      <div className="rounded-3xl border border-ink-100 bg-white p-4">
        <p className="text-sm font-bold text-ink-900">El sistema completó automáticamente:</p>
        <ul className="mt-2.5 space-y-2">
          {[
            {
              icon: ClipboardList,
              text: "Estado del alumno actualizado y movimiento guardado en el historial.",
            },
            {
              icon: BellRing,
              text: "Notificación enviada al tutor con la confirmación de la salida.",
            },
            {
              icon: ScanLine,
              text: "Registro en la bitácora de auditoría con hora, método y responsable.",
            },
          ].map((effect) => (
            <li key={effect.text} className="flex items-start gap-2.5 text-xs text-ink-600">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-mint-50 text-mint-600">
                <effect.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="leading-snug">{effect.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" onClick={onReset} className="flex-1">
          <RotateCcw className="h-5 w-5" />
          Siguiente entrega
        </Button>
        <ButtonLink href="/staff/actividad" variant="outline" size="lg">
          Ver actividad
        </ButtonLink>
      </div>
    </div>
  );
}
