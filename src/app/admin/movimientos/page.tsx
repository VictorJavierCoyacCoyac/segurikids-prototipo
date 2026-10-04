import { ClipboardList, Download, LogIn, LogOut, QrCode } from "lucide-react";
import type { Metadata } from "next";

import { FilterBar, FilterDate, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { MovementList } from "@/components/domain/movement-list";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { addDays, fromDateInput, toDateInput } from "@/lib/utils/date";
import { percent } from "@/lib/utils/format";
import { listMovements } from "@/server/services/attendance";
import { listGroups, listStudents } from "@/server/services/students";

export const metadata: Metadata = { title: "Movimientos" };

/** Registro completo de entradas y salidas del centro, con exportación CSV. */
export default async function AdminMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireRole("ADMIN");

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const from = fromDateInput(single("from") ?? "") ?? addDays(new Date(), -7);
  const to = fromDateInput(single("to") ?? "") ?? new Date();
  const typeParam = single("type") ?? "ALL";
  const group = single("group") ?? "ALL";
  const studentId = single("studentId") ?? "ALL";

  const [movements, groups, students] = await Promise.all([
    listMovements({
      schoolId: user.schoolId,
      type: typeParam === "ENTRY" ? "ENTRY" : typeParam === "EXIT" ? "EXIT" : undefined,
      group: group !== "ALL" ? group : undefined,
      studentIds: studentId !== "ALL" ? [studentId] : undefined,
      from,
      to,
      take: 300,
    }),
    listGroups(user.schoolId),
    listStudents({ schoolId: user.schoolId }),
  ]);

  const entries = movements.filter((movement) => movement.type === "ENTRY").length;
  const exits = movements.filter((movement) => movement.type === "EXIT").length;
  const qrCount = movements.filter((movement) => movement.method === "QR").length;

  const exportUrl = `/api/reports/export?from=${toDateInput(from)}&to=${toDateInput(to)}&group=${encodeURIComponent(group)}&studentId=${encodeURIComponent(studentId)}`;

  return (
    <div>
      <PageHeader
        title="Movimientos"
        description="Trazabilidad completa de entradas y salidas del centro educativo."
        action={
          <ButtonLink href={exportUrl} variant="outline" size="md" prefetch={false}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </ButtonLink>
        }
      />

      <FilterBar action="/admin/movimientos" resetHref="/admin/movimientos" className="mb-4">
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

        <FilterField label="Alumno" htmlFor="studentId">
          <FilterSelect
            id="studentId"
            name="studentId"
            defaultValue={studentId}
            allLabel="Todos los alumnos"
            options={students.map((student) => ({
              value: student.id,
              label: `${student.firstName} ${student.lastName}`,
            }))}
          />
        </FilterField>

        <FilterField label="Desde" htmlFor="from">
          <FilterDate id="from" name="from" defaultValue={toDateInput(from)} />
        </FilterField>

        <FilterField label="Hasta" htmlFor="to">
          <FilterDate id="to" name="to" defaultValue={toDateInput(to)} />
        </FilterField>
      </FilterBar>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Movimientos"
          value={movements.length}
          hint="En el periodo"
          icon={<ClipboardList className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard label="Entradas" value={entries} icon={<LogIn className="h-4 w-4" />} tone="mint" />
        <StatCard label="Salidas" value={exits} icon={<LogOut className="h-4 w-4" />} tone="sun" />
        <StatCard
          label="Identificados con QR"
          value={`${percent(qrCount, movements.length)}%`}
          hint={`${qrCount} de ${movements.length}`}
          icon={<QrCode className="h-4 w-4" />}
          tone="ink"
        />
      </div>

      <SectionCard
        title="Registro de movimientos"
        description={`${movements.length} registro(s). Cada fila incluye método, persona y responsable.`}
        icon={<ClipboardList className="h-5 w-5" />}
      >
        <MovementList
          movements={movements}
          emptyTitle="No existen movimientos para este periodo"
          emptyDescription="Ajusta el rango de fechas o quita los filtros aplicados."
        />
      </SectionCard>
    </div>
  );
}
