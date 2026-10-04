"use client";

import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { QR_PATTERN } from "@/lib/validation/schemas";

/**
 * Lector de QR por cámara usando la API nativa `BarcodeDetector`.
 *
 * DECISIÓN TÉCNICA: se evita una librería externa de escaneo para mantener el
 * prototipo ligero. La API está disponible en Chrome/Edge y en Android; cuando
 * no existe, el componente lo indica y el operador usa la entrada manual o la
 * simulación, que ejecutan exactamente el mismo flujo de validación.
 */
type DetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

type Status = "idle" | "starting" | "scanning" | "unsupported" | "denied" | "error";

export function CameraReader({
  onDetected,
  disabled,
}: {
  onDetected: (code: string) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockedRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    const detectorCtor = (
      window as unknown as { BarcodeDetector?: new (options?: { formats: string[] }) => DetectorLike }
    ).BarcodeDetector;

    if (!detectorCtor) {
      setStatus("unsupported");
      setMessage(
        "Este navegador no permite leer códigos con la cámara. Usa la entrada manual o «Simular escaneo».",
      );
      return;
    }

    setStatus("starting");
    setMessage(null);
    lockedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new detectorCtor({ formats: ["qr_code"] });
      setStatus("scanning");

      const tick = async () => {
        if (!videoRef.current || lockedRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          const match = found
            .map((item) => item.rawValue.trim().toUpperCase())
            .find((value) => QR_PATTERN.test(value));

          if (match) {
            // Bloquea lecturas repetidas del mismo código mientras se valida.
            lockedRef.current = true;
            onDetected(match);
            stop();
            return;
          }
        } catch {
          // Un fotograma ilegible no debe detener el bucle de escaneo.
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };

      rafRef.current = requestAnimationFrame(() => void tick());
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setMessage("No se concedió permiso para usar la cámara.");
      } else {
        setStatus("error");
        setMessage("No fue posible iniciar la cámara en este dispositivo.");
      }
    }
  }, [onDetected, stop]);

  // Liberar la cámara al desmontar: nunca debe quedar activa en segundo plano.
  useEffect(() => stop, [stop]);

  const active = status === "scanning" || status === "starting";

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
              <span key={corner} className={`absolute h-8 w-8 border-white/90 ${corner}`} />
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
                {status === "unsupported" || status === "denied" || status === "error" ? (
                  <CameraOff className="h-7 w-7" />
                ) : (
                  <Camera className="h-7 w-7" />
                )}
              </span>
              <p className="mt-3 text-sm font-semibold text-white">
                {status === "idle" ? "Cámara lista" : "Cámara no disponible"}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-snug text-white/70">
                {message ??
                  "Activa la cámara para leer el código QR de la persona que llega a recoger."}
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
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {active ? (
          <Button type="button" variant="outline" size="md" onClick={stop}>
            <CameraOff className="h-4 w-4" />
            Detener cámara
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => void start()}
            disabled={disabled || status === "unsupported"}
          >
            <Camera className="h-4 w-4" />
            Activar cámara
          </Button>
        )}
        <p className="flex-1 self-center text-xs leading-snug text-ink-500">
          ¿Sin cámara? Escribe el código manualmente o usa «Simular escaneo»: el flujo de validación
          es idéntico.
        </p>
      </div>
    </div>
  );
}
