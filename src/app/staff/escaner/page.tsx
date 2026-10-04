import { Info, ScanLine } from "lucide-react";
import type { Metadata } from "next";

import { ScannerConsole } from "@/components/domain/scanner/scanner-console";
import { StatusLegend } from "@/components/domain/status-pill";
import { PageHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listScannablePeople } from "@/server/services/authorizations";
import { getDashboardSnapshot } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Escáner QR" };

/**
 * Pantalla de control de salida.
 * Es la pantalla más importante del sistema: debe resolverse en segundos, por
 * lo que no compite con ningún otro contenido y ocupa una sola columna.
 */
export default async function ScannerPage() {
  const user = await requireRole("STAFF", "ADMIN");

  const [people, snapshot] = await Promise.all([
    listScannablePeople(user.schoolId),
    getDashboardSnapshot(user.schoolId),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Control de acceso"
        title="Escáner de identificación"
        description="Identifica a la persona que recoge, valida su autorización y confirma la entrega."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-3">
        <StatusLegend
          counts={{
            inCampus: snapshot.inCampus,
            offCampus: snapshot.offCampus,
            absent: snapshot.absent,
            pending: snapshot.pending,
          }}
        />
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
          {snapshot.exitsToday} salidas hoy
        </span>
      </div>

      <ScannerConsole people={people} />

      <p className="mt-5 flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Prototipo: la lectura por cámara usa la API nativa del navegador y puede no estar disponible
        en todos los dispositivos. La entrada manual y la simulación ejecutan la misma validación en
        el servidor, por lo que la demostración es siempre reproducible.
      </p>
    </div>
  );
}
