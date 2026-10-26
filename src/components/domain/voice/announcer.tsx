"use client";

import { Megaphone, Repeat, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

import { useSpeech } from "./use-speech";

/**
 * Voceo de recogida.
 *
 * Al obtenerse un veredicto AUTORIZADO, este componente anuncia por el altavoz
 * del dispositivo que ya han llegado por el alumno, y deja el texto visible.
 * El texto siempre se muestra: si el navegador no tiene voz, si está silenciado
 * o si hay ruido, el aviso sigue siendo utilizable.
 */
export function Announcer({
  text,
  auto = true,
  className,
}: {
  text: string;
  auto?: boolean;
  className?: string;
}) {
  const { supported, speaking, muted, toggleMuted, speak } = useSpeech();
  const announcedRef = useRef<string | null>(null);

  // Un aviso se vocea UNA vez por texto: evita que un re-render repita el
  // anuncio en mitad del pasillo.
  useEffect(() => {
    if (!auto || !text || announcedRef.current === text) return;
    if (speak(text)) announcedRef.current = text;
  }, [auto, speak, text]);

  if (!text) return null;

  return (
    <div
      className={cn(
        "rounded-3xl bg-ink-900 p-4 text-white shadow-float",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10">
          {speaking ? (
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-white/20" />
          ) : null}
          <Megaphone className="relative h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
            Voceo de recogida
          </p>
          {/* `aria-live`: un lector de pantalla también debe anunciarlo. */}
          <p className="mt-1 text-sm font-semibold leading-snug" aria-live="polite">
            {text}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => speak(text)}
              disabled={!supported || muted}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              Vocear de nuevo
            </button>

            <button
              type="button"
              onClick={toggleMuted}
              aria-pressed={muted}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {muted ? "Voceo silenciado" : "Voceo activo"}
            </button>
          </div>

          {!supported ? (
            <p className="mt-2 text-[11px] leading-snug text-white/60">
              Este navegador no sintetiza voz: el aviso queda solo en pantalla.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
