import { GraduationCap, Search } from "lucide-react";
import type { Metadata } from "next";

import { FilterBar, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { StudentCard } from "@/components/domain/student-card";
import { StatusLegend } from "@/components/domain/status-pill";
import { PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { STUDENT_STATUSES, studentStatusMeta } from "@/lib/domain/students";
import { listGroups, listStudents } from "@/server/services/students";

export const metadata: Metadata = { title: "Alumnos" };

/** Directorio de alumnado para el personal: búsqueda rápida y estado actual. */
export default async function StaffStudentsPage({
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

  const search = single("q") ?? "";
  const group = single("group") ?? "ALL";
  const status = single("status") ?? "ALL";

  const [students, groups] = await Promise.all([
    listStudents({ schoolId: user.schoolId, search, group, status }),
    listGroups(user.schoolId),
  ]);

  return (
    <div>
      <PageHeader
        title="Alumnos"
        description="Consulta el estado actual de cada alumno y sus personas autorizadas."
      />

      <FilterBar action="/staff/alumnos" resetHref="/staff/alumnos" className="mb-4">
        <FilterField label="Buscar" htmlFor="q" className="min-w-[14rem] flex-[2]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <Input
              id="q"
              name="q"
              defaultValue={search}
              placeholder="Nombre, grupo o tutor…"
              className="h-11 py-0 pl-10"
            />
          </div>
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

        <FilterField label="Estado" htmlFor="status">
          <FilterSelect
            id="status"
            name="status"
            defaultValue={status}
            allLabel="Todos los estados"
            options={STUDENT_STATUSES.map((item) => ({
              value: item,
              label: studentStatusMeta(item).label,
            }))}
          />
        </FilterField>
      </FilterBar>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <StatusLegend
          counts={{
            inCampus: students.filter((student) => student.status === "IN_CAMPUS").length,
            offCampus: students.filter((student) => student.status === "OFF_CAMPUS").length,
            absent: students.filter((student) => student.status === "ABSENT").length,
            pending: students.filter((student) => student.status === "PENDING").length,
          }}
        />
        <p className="text-sm text-ink-500">
          {students.length} {students.length === 1 ? "alumno" : "alumnos"}
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="No se encontraron alumnos"
          description="Ajusta la búsqueda o quita los filtros aplicados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              href={`/staff/alumnos/${student.id}`}
              name={`${student.firstName} ${student.lastName}`}
              group={student.group}
              status={student.status}
              avatarTone={student.avatarTone}
              meta={`Tutor: ${student.tutor.name}`}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
