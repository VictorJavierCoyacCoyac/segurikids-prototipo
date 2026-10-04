"use client";

import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Límite de error de la aplicación.
 * Muestra un mensaje comprensible en lugar de una traza técnica: el detalle se
 * envía a la consola del servidor, no a la persona que usa el sistema.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SeguriKids] error no controlado:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-5 py-10">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-berry-50 text-berry-600 shadow-card">
          <TriangleAlert className="h-8 w-8" aria-hidden="true" />
        </span>

        <h1 className="mt-5 text-2xl font-bold text-ink-900">Algo no funcionó como esperábamos</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          La operación no pudo completarse. Vuelve a intentarlo; si el problema continúa, reinicia
          los datos de demostración con <code className="font-mono">npm run db:seed</code>.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-ink-400">Referencia: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" size="lg" onClick={reset}>
            <RotateCcw className="h-5 w-5" />
            Reintentar
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-[3.25rem] items-center gap-2 rounded-2xl border border-ink-200 bg-white px-5 text-base font-semibold text-ink-700 transition hover:bg-ink-50"
          >
            <Home className="h-5 w-5" />
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
