import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Tarjeta de identificación con código QR.
 * Es lo que el tutor muestra en el acceso: debe leerse de un vistazo y con
 * brillo alto, por eso el QR va sobre blanco puro y a gran tamaño.
 */
export function QrCard({
  code,
  name,
  subtitle,
  size = 240,
  className,
  compact,
}: {
  code: string;
  name: string;
  subtitle?: string;
  size?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl bg-white p-5 text-center shadow-card ring-1 ring-ink-100",
        className,
      )}
    >
      {!compact ? (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700 ring-1 ring-mint-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Identificación verificada
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-2 ring-1 ring-ink-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- PNG generado en /api/qr; next/image no aporta optimización aquí. */}
        <img
          src={`/api/qr?code=${encodeURIComponent(code)}&size=${size * 2}`}
          alt={`Código QR de identificación ${code}`}
          width={size}
          height={size}
          className="block h-auto w-full"
          style={{ maxWidth: size }}
        />
      </div>

      <p className="mt-4 text-lg font-bold leading-tight text-ink-900">{name}</p>
      {subtitle ? <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p> : null}

      <p className="mt-3 rounded-xl bg-ink-50 px-3 py-1.5 font-mono text-sm font-semibold tracking-wider text-ink-700">
        {code}
      </p>
    </div>
  );
}
