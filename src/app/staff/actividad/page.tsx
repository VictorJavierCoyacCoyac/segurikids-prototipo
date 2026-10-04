import { Activity, LogIn, LogOut } from "lucide-react";
import type { Metadata } from "next";

import { FilterBar, FilterDate, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { MovementList } from "@/components/domain/movement-list";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { fromDateInput, toDateInput } from "@/lib/utils/date";
import { listMovements } from "@/server/services/attendance";
import { listGroups } from "@/server/services/students";

export const metadata: Metadata = { title: "Actividad reciente" };

/** Bitácora operativa de la jornada para el personal escolar. */
export default async function StaffActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireRole("STAFF", "ADMIN");

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const today = new Date();
  const from = fromDateInput(single("from") ?? "") ?? today;
  const to = fromDateInput(single("to") ?? "") ?? today;
  const typeParam = single("type") ?? "ALL";
  const group = single("group") ?? "ALL";

  const [movements, groups] = await Promise.all([
    listMovements({
      schoolId: user.schoolId,
      type: typeParam === "ENTRY" ? "ENTRY" : typeParam === "EXIT" ? "EXIT" : undefined,
      group: group !== "ALL" ? group : undefined,
      from,
      to,
      take: 200,
    }),
    listGroups(user.schoolId),
  ]);

  const entries = movements.filter((movement) => movement.type === "ENTRY").length;
  const exits = movements.filter((movement) => movement.type === "EXIT").length;
  const qrShare =
    movements.length > 0
      ? Math.round(
          (movements.filter((movement) => movement.method === "QR").length / movements.length) * 100,
        )
      : 0;

  return (
    <div>
      <PageHeader
        title="Actividad reciente"
        description="Movimientos registrados en el control de acceso del centro."
      />

      <FilterBar action="/staff/actividad" resetHref="/staff/actividad" className="mb-4">
        <FilterField label="Movimiento" htmlFor="type">
          <FilterSelect
            id="type"
            name="type"
            defaultValue={typeParam}
            allLabel="Entradas y salidas"
            options={[
              { value: "ENTRY", label: "Solo entradas" },
              { value: "EXIT", label: "Solo salidas" },
            ]}
          />
        </FilterField>

        <FilterField label="Grupo" htmlFor="group">
          <FilterSelect
            id="group"
            name="group"
            defaultValue={group}
            allLabel="Todos los grupos"
            options={groups.map((item) => ({ value: item, label: item }))}
          />
        </FilterField>

        <FilterField label="Desde" htmlFor="from">
          <FilterDate id="from" name="from" defaultValue={toDateInput(from)} />
        </FilterField>

        <FilterField label="Hasta" htmlFor="to">
          <FilterDate id="to" name="to" defaultValue={toDateInput(to)} />
        </FilterField>
      </FilterBar>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Entradas" value={entries} icon={<LogIn className="h-4 w-4" />} tone="mint" />
        <StatCard label="Salidas" value={exits} icon={<LogOut className="h-4 w-4" />} tone="brand" />
        <StatCard
          label="Con QR"
          value={`${qrShare}%`}
          hint="Del total de movimientos"
          icon={<Activity className="h-4 w-4" />}
          tone="sun"
        />
      </div>

      <SectionCard
        title="Movimientos"
        description={`${movements.length} registro(s) en el periodo seleccionado.`}
        icon={<Activity className="h-5 w-5" />}
      >
        <MovementList
          movements={movements}
          emptyTitle="No existen movimientos para este periodo"
          emptyDescription="Amplía el rango de fechas o quita los filtros para ver más registros."
        />
      </SectionCard>
    </div>
  );
}
