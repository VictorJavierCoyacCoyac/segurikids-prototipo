import { GraduationCap, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FilterBar, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { StudentStatusPill } from "@/components/domain/status-pill";
import { CreateStudentButton } from "@/components/domain/student-form";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { STUDENT_STATUSES, studentStatusMeta } from "@/lib/domain/students";
import { listGroups, listStudents } from "@/server/services/students";
import { listTutors } from "@/server/services/users";

export const metadata: Metadata = { title: "Alumnos" };

/** Gestión del alumnado: listado, búsqueda, filtros y alta. */
export default async function AdminStudentsPage({
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

  const search = single("q") ?? "";
  const group = single("group") ?? "ALL";
  const status = single("status") ?? "ALL";

  const [students, groups, tutors] = await Promise.all([
    listStudents({ schoolId: user.schoolId, search, group, status }),
    listGroups(user.schoolId),
    listTutors(user.schoolId),
  ]);

  const tutorOptions = tutors.map((tutor) => ({
    id: tutor.id,
    name: tutor.name,
    childrenCount: tutor.children.length,
  }));

  return (
    <div>
      <PageHeader
        title="Alumnos"
        description="Alta, consulta y seguimiento del alumnado del centro."
        action={<CreateStudentButton tutors={tutorOptions} groups={groups} />}
      />

      <FilterBar action="/admin/alumnos" resetHref="/admin/alumnos" className="mb-4">
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

      <SectionCard
        title="Listado de alumnos"
        description={`${students.length} registro(s).`}
        icon={<GraduationCap className="h-5 w-5" />}
        bodyClassName="px-4 py-3 sm:px-5"
      >
        {students.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title="No se encontraron alumnos"
            description="Ajusta la búsqueda o registra un nuevo alumno."
            action={<CreateStudentButton tutors={tutorOptions} groups={groups} />}
          />
        ) : (
          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Grupo</th>
                  <th>Estado</th>
                  <th>Tutor principal</th>
                  <th>Autorizados</th>
                  <th className="text-right">Ficha</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={`${student.firstName} ${student.lastName}`}
                          tone={student.avatarTone}
                          size="xs"
                        />
                        <span className="font-semibold text-ink-900">
                          {student.firstName} {student.lastName}
                        </span>
                      </div>
                    </td>
                    <td>{student.group}</td>
                    <td>
                      <StudentStatusPill status={student.status} size="sm" />
                    </td>
                    <td className="whitespace-nowrap">{student.tutor.name}</td>
                    <td className="tabular-nums">{student._count.authorizations}</td>
                    <td className="text-right">
                      <Link
                        href={`/admin/alumnos/${student.id}`}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
