"use client";

import { Camera, CameraOff, Loader2, Lock, SwitchCamera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { QR_PATTERN } from "@/lib/validation/schemas";

/**
 * Lector de QR por cámara para el dispositivo del personal.
 *
 * DOS MOTORES DE DECODIFICACIÓN:
 *   1. `BarcodeDetector`, la API nativa del navegador (Chrome/Edge y Android).
 *      Es la vía rápida: decodifica en el proceso del navegador.
 *   2. `jsqr`, decodificador en JavaScript que se carga SOLO si la API nativa
 *      no existe. Cubre iOS/Safari y Firefox, donde `BarcodeDetector` no está
 *      disponible y el escáner quedaría inservible en el móvil del docente.
 *
 * El respaldo se importa de forma dinámica para no cargar 250 kB de
 * decodificador en los navegadores que no lo necesitan.
 *
 * CONTEXTO SEGURO: `getUserMedia` solo existe en https o en localhost. En un
 * teléfono conectado por IP local (http://192.168.x.x) el navegador no concede
 * la cámara, y el fallo es silencioso si no se avisa. Por eso se detecta antes
 * de pedir permiso y se explica qué hacer.
 *
 * PRIVACIDAD: los fotogramas se procesan en el dispositivo para localizar el
 * código y se descartan. No se graba ni se envía imagen a ningún servidor.
 *
 * PERMANENCIA: el código no se acepta al primer fotograma, sino cuando lleva
 * `HOLD_MS` encuadrado. Ver la constante para el motivo.
 */

type DetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

type JsQrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: "dontInvert" | "attemptBoth" },
) => { data: string } | null;

type Status = "idle" | "starting" | "scanning" | "insecure" | "unsupported" | "denied" | "error";

type Engine = "native" | "jsqr";

/** Intervalo del bucle del respaldo en JS: suficiente para leer sin saturar el móvil. */
const JSQR_INTERVAL_MS = 120;
/** Lado máximo del fotograma que se analiza (reduce el coste por intento). */
const JSQR_MAX_SIDE = 480;

/**
 * Tiempo que el código debe permanecer encuadrado antes de darlo por leído.
 *
 * Es una decisión de interfaz, no un límite técnico. El decodificador resuelve
 * el QR en cuanto asoma por el borde del encuadre, y leerlo así resulta
 * desconcertante: la persona que lo muestra no llega a ver qué ha pasado.
 * Exigir que se mantenga centrado convierte la lectura en un gesto deliberado y
 * evita registrar el código de alguien que solo pasaba por delante.
 *
 * ANTES DE PRODUCCIÓN: revisar este valor con el personal del centro. En una
 * puerta con fila, la espera que aquí aporta claridad puede estorbar.
 */
const HOLD_MS = 1250;

/**
 * Margen durante el cual una pérdida de vista no reinicia la cuenta. Un
 * fotograma movido, un reflejo o un parpadeo no deberían obligar a empezar de
 * nuevo; soltar el código de verdad, sí.
 */
const HOLD_GAP_MS = 400;

/** Resultado de evaluar un candidato del bucle de escaneo. */
type Observation = "accepted" | "holding" | "ignored";

export function CameraReader({
  onDetected,
  disabled,
}: {
  onDetected: (code: string) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);
  const jsQrRef = useRef<JsQrFn | null>(null);
  // Código que se está manteniendo a la vista, cuándo empezó y cuándo se vio
  // por última vez. En refs y no en estado: se consultan en cada fotograma.
  const holdCodeRef = useRef<string | null>(null);
  const holdStartRef = useRef(0);
  const holdSeenRef = useRef(0);

  const [status, setStatus] = useState<Status>("idle");
  const [engine, setEngine] = useState<Engine | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  // Reinicio solicitado al cambiar de cámara: la bandera evita que el efecto
  // vuelva a arrancar el vídeo por un simple cambio de identidad de `start`.
  const restartRef = useRef(false);
  const [restartToken, setRestartToken] = useState(0);
  // Progreso de la permanencia (0 a 1), solo para la barra de la interfaz.
  const [holdProgress, setHoldProgress] = useState(0);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus((current) => (current === "scanning" || current === "starting" ? "idle" : current));
  }, []);

  const resetHold = useCallback(() => {
    holdCodeRef.current = null;
    holdStartRef.current = 0;
    holdSeenRef.current = 0;
    setHoldProgress((current) => (current === 0 ? current : 0));
  }, []);

  /**
   * Evalúa un candidato del bucle de escaneo.
   *
   * Solo devuelve `accepted` cuando el mismo código lleva `HOLD_MS` encuadrado.
   * Las demás llamadas acumulan tiempo (`holding`) o lo descartan por formato
   * (`ignored`).
   */
  const observe = useCallback(
    (raw: string | null | undefined): Observation => {
      const value = (raw ?? "").trim().toUpperCase();
      if (!QR_PATTERN.test(value)) return "ignored";

      const now = performance.now();
      const continues =
        holdCodeRef.current === value && now - holdSeenRef.current <= HOLD_GAP_MS;

      if (!continues) {
        holdCodeRef.current = value;
        holdStartRef.current = now;
      }
      holdSeenRef.current = now;

      const elapsed = now - holdStartRef.current;
      if (elapsed >= HOLD_MS) {
        lockedRef.current = true;
        setHoldProgress(1);
        onDetected(value);
        stop();
        return "accepted";
      }

      // La barra se repinta a saltos para no provocar un render por fotograma.
      const progress = Math.min(1, elapsed / HOLD_MS);
      setHoldProgress((current) => (Math.abs(current - progress) < 0.04 ? current : progress));
      return "holding";
    },
    [onDetected, stop],
  );

  /** Fotograma sin código legible: pasado el margen, se reinicia la cuenta. */
  const missed = useCallback(() => {
    if (holdCodeRef.current === null) return;
    if (performance.now() - holdSeenRef.current <= HOLD_GAP_MS) return;
    resetHold();
  }, [resetHold]);

  const start = useCallback(async () => {
    // 1. ¿Se puede usar la cámara en este origen?
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("insecure");
      setMessage(
        "El navegador solo concede la cámara en conexiones seguras (https) o en localhost. Abre el prototipo por su enlace https o usa la entrada manual.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setMessage(
        "Este navegador no expone la cámara a la aplicación. Usa la entrada manual o «Simular escaneo».",
      );
      return;
    }

    setStatus("starting");
    setMessage(null);
    lockedRef.current = false;
    resetHold();

    // 2. Motor de decodificación: nativo si existe, respaldo en JS si no.
    const detectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (options?: { formats: string[] }) => DetectorLike;
      }
    ).BarcodeDetector;

    let detector: DetectorLike | null = null;
    let selected: Engine = "native";

    if (detectorCtor) {
      try {
        detector = new detectorCtor({ formats: ["qr_code"] });
      } catch {
        detector = null;
      }
    }

    if (!detector) {
      selected = "jsqr";
      if (!jsQrRef.current) {
        try {
          const imported = (await import("jsqr")) as unknown as { default?: JsQrFn };
          jsQrRef.current = (imported.default ?? (imported as unknown as JsQrFn)) || null;
        } catch {
          setStatus("unsupported");
          setMessage(
            "No se pudo cargar el decodificador de códigos. Usa la entrada manual o «Simular escaneo».",
          );
          return;
        }
      }
      if (!jsQrRef.current) {
        setStatus("unsupported");
        setMessage("No hay ningún decodificador disponible en este navegador.");
        return;
      }
    }

    setEngine(selected);

    // 3. Cámara.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");

      if (detector) {
        const nativeTick = async () => {
          const current = videoRef.current;
          if (!current || lockedRef.current) return;
          try {
            const found = await detector.detect(current);
            let holding = false;
            for (const item of found) {
              const result = observe(item.rawValue);
              if (result === "accepted") return;
              if (result === "holding") holding = true;
            }
            if (!holding) missed();
          } catch {
            // Un fotograma ilegible no debe detener el bucle de escaneo.
          }
          rafRef.current = requestAnimationFrame(() => void nativeTick());
        };
        rafRef.current = requestAnimationFrame(() => void nativeTick());
        return;
      }

      // Respaldo: se muestrea el vídeo en un canvas y se decodifica en JS.
      const decode = jsQrRef.current!;
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      const jsTick = () => {
        const current = videoRef.current;
        if (!current || !context || lockedRef.current) return;

        const width = current.videoWidth;
        const height = current.videoHeight;
        if (width > 0 && height > 0) {
          const scale = Math.min(1, JSQR_MAX_SIDE / Math.max(width, height));
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          context.drawImage(current, 0, 0, canvas.width, canvas.height);

          try {
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            const found = decode(frame.data, canvas.width, canvas.height, {
              inversionAttempts: "dontInvert",
            });
            const result = found ? observe(found.data) : "ignored";
            if (result === "accepted") return;
            if (result !== "holding") missed();
          } catch {
            // Igual que arriba: se intenta con el siguiente fotograma.
          }
        }

        timerRef.current = setTimeout(jsTick, JSQR_INTERVAL_MS);
      };

      timerRef.current = setTimeout(jsTick, JSQR_INTERVAL_MS);
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setMessage(
          "No se concedió permiso para usar la cámara. Revisa los permisos del sitio en el navegador y vuelve a intentarlo.",
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("error");
        setMessage("No se encontró ninguna cámara disponible en este dispositivo.");
      } else {
        setStatus("error");
        setMessage("No fue posible iniciar la cámara en este dispositivo.");
      }
    }
  }, [facingMode, missed, observe, resetHold]);

  // Liberar la cámara al desmontar: nunca debe quedar activa en segundo plano.
  useEffect(() => stop, [stop]);

  // Reapertura con la otra cámara (frontal/trasera) tras detener la actual.
  useEffect(() => {
    if (!restartRef.current) return;
    restartRef.current = false;
    void start();
  }, [restartToken, start]);

  const active = status === "scanning" || status === "starting";
  const failed =
    status === "insecure" || status === "unsupported" || status === "denied" || status === "error";

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-ink-950">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${active ? "opacity-100" : "opacity-0"}`}
        />

        {/* Marco de guía del escáner */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative h-3/5 w-3/5">
            {[
              "left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl",
              "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl",
              "left-0 bottom-0 border-b-4 border-l-4 rounded-bl-2xl",
              "right-0 bottom-0 border-b-4 border-r-4 rounded-br-2xl",
            ].map((corner) => (
              <span
                key={corner}
                className={`absolute h-8 w-8 transition-colors ${
                  holdProgress > 0 ? "border-mint-400" : "border-white/90"
                } ${corner}`}
              />
            ))}
            {status === "scanning" ? (
              <span className="absolute inset-x-2 top-0 h-0.5 animate-scan-line rounded-full bg-mint-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.8)]" />
            ) : null}
          </div>
        </div>

        {!active ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white">
                {status === "insecure" ? (
                  <Lock className="h-7 w-7" />
                ) : failed ? (
                  <CameraOff className="h-7 w-7" />
                ) : (
                  <Camera className="h-7 w-7" />
                )}
              </span>
              <p className="mt-3 text-sm font-semibold text-white">
                {status === "idle"
                  ? "Cámara lista"
                  : status === "insecure"
                    ? "Se requiere conexión segura"
                    : "Cámara no disponible"}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-snug text-white/70">
                {message ??
                  "Activa la cámara y mantén dentro del marco el código QR que el tutor muestra en su teléfono."}
              </p>
            </div>
          </div>
        ) : null}

        {status === "starting" ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Iniciando cámara…
            </span>
          </div>
        ) : null}

        {status === "scanning" ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center px-6">
            {holdProgress > 0 ? (
              <span className="w-full max-w-[15rem] rounded-2xl bg-black/65 px-3 py-2 text-center text-xs font-semibold text-white">
                Mantén el código dentro del marco
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/25">
                  <span
                    className="block h-full rounded-full bg-mint-400"
                    style={{ width: `${Math.round(holdProgress * 100)}%` }}
                  />
                </span>
              </span>
            ) : (
              <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white/90">
                Buscando código ·{" "}
                {engine === "native" ? "lector del navegador" : "lector compatible (jsQR)"}
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {active ? (
          <>
            <Button type="button" variant="outline" size="md" onClick={stop}>
              <CameraOff className="h-4 w-4" />
              Detener cámara
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                stop();
                setFacingMode((current) => (current === "environment" ? "user" : "environment"));
                restartRef.current = true;
                setRestartToken((value) => value + 1);
              }}
            >
              <SwitchCamera className="h-4 w-4" />
              Cambiar cámara
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => void start()}
            disabled={disabled || status === "unsupported"}
          >
            <Camera className="h-4 w-4" />
            {failed ? "Reintentar cámara" : "Activar cámara"}
          </Button>
        )}
        <p className="flex-1 self-center text-xs leading-snug text-ink-500">
          Los fotogramas se analizan en este dispositivo y se descartan: no se graba ni se envía
          imagen. ¿Sin cámara? Escribe el código o usa «Simular escaneo»: la validación es idéntica.
        </p>
      </div>
    </div>
  );
}
