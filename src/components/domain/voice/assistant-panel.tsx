"use client";

import { Bot, Megaphone, Send, User, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import {
  ASSISTANT_SUGGESTIONS,
  assistantReply,
  type AssistantContext,
} from "@/lib/domain/announcements";
import { cn } from "@/lib/utils/cn";

import { useSpeech } from "./use-speech";

/**
 * Asistente de voceo.
 *
 * Chat de apoyo para el personal de recepción: vocea avisos, resume la jornada
 * y recuerda el protocolo de entrega.
 *
 * ⚠️ GUIONIZADO, no inteligencia artificial: las respuestas salen de un
 * catálogo cerrado por palabras clave (`src/lib/domain/announcements.ts`). No
 * hay modelo de lenguaje ni llamadas de red, por lo que ningún dato del centro
 * sale del dispositivo. Se indica en la propia interfaz para no dar a entender
 * una capacidad que el prototipo no tiene.
 */

type Turn = {
  id: number;
  author: "assistant" | "operator";
  text: string;
  suggestions?: string[];
};

export function AssistantPanel({ context }: { context: AssistantContext }) {
  const { supported, speaking, muted, toggleMuted, speak } = useSpeech();
  const [turns, setTurns] = useState<Turn[]>([
    {
      id: 0,
      author: "assistant",
      text: `Listo para vocear en ${context.schoolName}. Escribe «vocea:» y el aviso, o pregúntame por la jornada.`,
      suggestions: ASSISTANT_SUGGESTIONS,
    },
  ]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  // El último turno siempre visible: en un mostrador no hay tiempo de buscar.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const send = (message: string) => {
    const text = message.trim();
    if (!text) return;

    const reply = assistantReply(text, context);
    setTurns((current) => [
      ...current,
      { id: nextId.current++, author: "operator", text },
      {
        id: nextId.current++,
        author: "assistant",
        text: reply.text,
        suggestions: reply.suggestions,
      },
    ]);
    setDraft("");

    // Solo se vocea lo que se pide explícitamente con «vocea:».
    if (reply.speak) speak(reply.speak);
  };

  return (
    <div className="flex h-[32rem] flex-col overflow-hidden rounded-3xl border border-ink-200 bg-white">
      <header className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900">Asistente de voceo</p>
          <p className="truncate text-xs text-ink-500">
            Respuestas guionizadas · sin IA ni conexión externa
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={muted}
          title={muted ? "Activar el voceo" : "Silenciar el voceo"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
            muted
              ? "bg-ink-100 text-ink-600 hover:bg-ink-200"
              : "bg-mint-50 text-mint-700 ring-1 ring-mint-200 hover:bg-mint-100",
          )}
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {muted ? "Silenciado" : speaking ? "Voceando…" : "Voz activa"}
        </button>
      </header>

      <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turns.map((turn) => (
          <div key={turn.id}>
            <div
              className={cn(
                "flex gap-2.5",
                turn.author === "operator" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                  turn.author === "assistant"
                    ? "bg-brand-50 text-brand-600"
                    : "bg-ink-100 text-ink-500",
                )}
              >
                {turn.author === "assistant" ? (
                  <Bot className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <User className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <p
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug",
                  turn.author === "assistant"
                    ? "bg-ink-50 text-ink-700"
                    : "bg-brand-600 text-white",
                )}
              >
                {turn.text}
              </p>
            </div>

            {turn.suggestions && turn.suggestions.length > 0 ? (
              <div className="ml-10 mt-2 flex flex-wrap gap-1.5">
                {turn.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 border-t border-ink-100 px-3 py-3"
      >
        <label htmlFor="asistente-mensaje" className="sr-only">
          Mensaje para el asistente
        </label>
        <Input
          id="asistente-mensaje"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="vocea: ya pueden pasar por Kínder A"
          autoComplete="off"
          className="h-11 py-0"
        />
        <Button type="submit" size="md" disabled={draft.trim().length === 0}>
          <Send className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Enviar</span>
        </Button>
      </form>

      {!supported ? (
        <p className="flex items-start gap-1.5 border-t border-ink-100 bg-sun-50 px-4 py-2 text-xs leading-snug text-sun-800">
          <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Este navegador no sintetiza voz: los avisos se mostrarán solo en texto.
        </p>
      ) : null}
    </div>
  );
}
