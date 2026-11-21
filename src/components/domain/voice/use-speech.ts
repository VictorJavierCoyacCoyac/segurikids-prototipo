"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Síntesis de voz del navegador (Web Speech API) para el voceo de recogida.
 *
 * No hay dependencias ni servicios externos: la voz la genera el propio
 * dispositivo, por lo que el nombre del alumno no sale de él.
 *
 * El silencio se recuerda en `localStorage` porque es una preferencia del
 * dispositivo (la tablet de recepción vocea; el móvil de un docente en el aula
 * quizá no debe), no de la cuenta.
 */

const MUTE_KEY = "sk:voceo:silencio";

export type SpeechState = {
  /** El navegador puede sintetizar voz. */
  supported: boolean;
  /** Se está reproduciendo un aviso. */
  speaking: boolean;
  muted: boolean;
  toggleMuted: () => void;
  /** Reproduce el texto. Devuelve `false` si no se pudo (silencio o sin soporte). */
  speak: (text: string) => boolean;
  cancel: () => void;
};

export function useSpeech(): SpeechState {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    try {
      setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
    } catch {
      // Navegación privada o almacenamiento bloqueado: se asume voceo activo.
    }

    /**
     * Se prefiere una voz en español latinoamericano; si no hay, cualquier
     * español, y si tampoco, la predeterminada del sistema.
     *
     * El orden importa porque la Web Speech API no trae voces propias: usa las
     * del sistema operativo, y el catálogo cambia de un equipo a otro. En Linux
     * con espeak-ng, por ejemplo, no existe `es-MX` pero sí `es-419`, y sin
     * esta preferencia el voceo saldría con acento de España aunque haya una
     * voz latinoamericana disponible.
     */
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const byPrefix = (prefix: string) =>
        voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
      voiceRef.current =
        byPrefix("es-mx") ?? // México
        byPrefix("es-419") ?? // español latinoamericano (espeak-ng)
        byPrefix("es-us") ??
        byPrefix("es") ?? // cualquier español, incluido es-ES
        null;
    };

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string): boolean => {
      if (!supported || muted || !text.trim()) return false;

      const synthesis = window.speechSynthesis;
      // Un aviso nuevo sustituye al anterior: en una fila de recogida, el
      // importante siempre es el último.
      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceRef.current?.lang ?? "es-MX";
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = 0.95; // Algo más lento: se entiende mejor en un pasillo.
      utterance.pitch = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      setSpeaking(true);
      synthesis.speak(utterance);
      return true;
    },
    [muted, supported],
  );

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        // La preferencia no se puede recordar; el cambio sigue aplicando ahora.
      }
      if (next && "speechSynthesis" in window) window.speechSynthesis.cancel();
      return next;
    });
  }, []);

  return { supported, speaking, muted, toggleMuted, speak, cancel };
}
