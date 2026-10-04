import { CalendarClock, LogIn, LogOut } from "lucide-react";
import type { Metadata } from "next";

import { FilterBar, FilterDate, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { MovementList } from "@/components/domain/movement-list";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { addDays, fromDateInput, toDateInput } from "@/lib/utils/date";
import { listMovements } from "@/server/services/attendance";
import { listChildren } from "@/server/services/students";

export const metadata: Metadata = { title: "Historial" };

/**
 * Historial de accesos del tutor, filtrable por alumno, tipo y rango de fechas.
 * Por defecto muestra los últimos 30 días, que es el periodo que cubre el seed.
 */
export default async function ParentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireRole("PARENT");
  const children = await listChildren(user.id);

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const defaultFrom = addDays(new Date(), -30);
  const from = fromDateInput(single("from") ?? "") ?? defaultFrom;
  const to = fromDateInput(single("to") ?? "") ?? new Date();
  const studentParam = single("studentId") ?? "ALL";
  const typeParam = single("type") ?? "ALL";

  const childIds = children.map((child) => child.id);
  const selectedIds =
    studentParam !== "ALL" && childIds.includes(studentParam) ? [studentParam] : childIds;

  const movements =
    childIds.length === 0
      ? []
      : await listMovements({
          schoolId: user.schoolId,
          studentIds: selectedIds,
          type: typeParam === "ENTRY" ? "ENTRY" : typeParam === "EXIT" ? "EXIT" : undefined,
          from,
          to,
          take: 200,
        });

  const entries = movements.filter((movement) => movement.type === "ENTRY").length;
  const exits = movements.filter((movement) => movement.type === "EXIT").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Historial de accesos"
        description="Consulta las entradas y salidas de tus hijos en los últimos 30 días."
      />

      <FilterBar action="/app/historial" resetHref="/app/historial">
        <FilterField label="Alumno" htmlFor="studentId">
          <FilterSelect
            id="studentId"
            name="studentId"
            defaultValue={studentParam}
            allLabel="Todos mis hijos"
            options={children.map((child) => ({
              value: child.id,
              label: `${child.firstName} ${child.lastName}`,
            }))}
          />
        </FilterField>

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

        <FilterField label="Desde" htmlFor="from">
          <FilterDate id="from" name="from" defaultValue={toDateInput(from)} />
        </FilterField>

        <FilterField label="Hasta" htmlFor="to">
          <FilterDate id="to" name="to" defaultValue={toDateInput(to)} />
        </FilterField>
      </FilterBar>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Entradas"
          value={entries}
          icon={<LogIn className="h-4 w-4" />}
          tone="mint"
        />
        <StatCard label="Salidas" value={exits} icon={<LogOut className="h-4 w-4" />} tone="brand" />
        <StatCard
          label="Movimientos"
          value={movements.length}
          hint="En el periodo seleccionado"
          icon={<CalendarClock className="h-4 w-4" />}
          tone="ink"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <SectionCard
        title="Movimientos registrados"
        description={
          movements.length > 0
            ? `${movements.length} registro(s) en el periodo seleccionado.`
            : "Ajusta los filtros para ampliar la búsqueda."
        }
        icon={<CalendarClock className="h-5 w-5" />}
      >
        <MovementList
          movements={movements}
          emptyTitle="No existen movimientos para este periodo"
          emptyDescription="Prueba a ampliar el rango de fechas o a quitar los filtros aplicados."
        />
      </SectionCard>
    </div>
  );
}
