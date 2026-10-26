"use client";

import { Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Presentación del QR a pantalla completa.
 *
 * Es el gesto real del tutor en la puerta: el docente tiene que leer el código
 * desde SU teléfono, y un QR pequeño entre tarjetas y texto se lee mal con poca
 * luz o a contraluz. Esta vista deja el código solo, al máximo tamaño, sobre
 * blanco puro.
 *
 * Además solicita `wakeLock` para que la pantalla no se apague mientras el
 * tutor espera su turno. Si el navegador no lo admite, simplemente no se pide.
 */
export function QrPresenter({
  code,
  name,
  subtitle,
}: {
  code: string;
  name: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const release = useCallback(() => {
    void wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const close = useCallback(() => {
    release();
    setOpen(false);
  }, [release]);

  useEffect(() => {
    if (!open) return;

    const node = overlayRef.current;
    void node?.requestFullscreen?.().catch(() => undefined);

    const wakeLock = (
      navigator as unknown as {
        wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
      }
    ).wakeLock;
    void wakeLock
      ?.request("screen")
      .then((sentinel) => {
        wakeLockRef.current = sentinel;
      })
      .catch(() => undefined);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // Salir del modo pantalla completa (gesto del sistema) debe cerrar la vista.
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      release();
    };
  }, [close, open, release]);

  return (
    <>
      <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>
        <Maximize2 className="h-4 w-4" />
        Mostrar a pantalla completa
      </Button>

      {open ? (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Código de identificación de ${name}`}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-5"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-ink-100 text-ink-700 transition hover:bg-ink-200"
            aria-label="Cerrar la vista a pantalla completa"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element -- PNG generado en /api/qr. */}
          <img
            src={`/api/qr?code=${encodeURIComponent(code)}&size=640`}
            alt={`Código QR de identificación ${code}`}
            className="h-auto w-full max-w-[min(85vh,26rem)]"
          />

          <p className="mt-5 text-center text-xl font-bold text-ink-900">{name}</p>
          {subtitle ? (
            <p className="mt-0.5 text-center text-sm text-ink-500">{subtitle}</p>
          ) : null}
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-2 font-mono text-base font-semibold tracking-wider text-ink-700">
            {code}
          </p>
          <p className="mt-5 max-w-xs text-center text-xs leading-snug text-ink-400">
            Sube el brillo de la pantalla y mantenla quieta frente a la cámara del personal.
          </p>
        </div>
      ) : null}
    </>
  );
}
