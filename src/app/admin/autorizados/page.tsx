import { BadgeCheck, Search, ShieldAlert, ShieldX } from "lucide-react";
import type { Metadata } from "next";

import { AddAuthorizedPersonButton } from "@/components/domain/authorized-person-form";
import { FilterBar, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { PeopleDirectory } from "@/components/domain/people-directory";
import { PersonStatusToggle } from "@/components/domain/person-status-toggle";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { listAuthorizedPeople } from "@/server/services/authorizations";
import { listStudents } from "@/server/services/students";

export const metadata: Metadata = { title: "Personas autorizadas" };

/**
 * Gestión de personas autorizadas: la función más sensible del sistema.
 * Desde aquí la dirección registra, suspende y reactiva a quien puede recoger
 * a cada alumno.
 */
export default async function AdminAuthorizedPage({
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
  const status = single("status") ?? "ALL";

  const [people, students] = await Promise.all([
    listAuthorizedPeople({ schoolId: user.schoolId, search, status }),
    listStudents({ schoolId: user.schoolId }),
  ]);

  const selectableStudents = students.map((student) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    group: student.group,
  }));

  const suspended = people.filter((person) => person.status === "SUSPENDED").length;
  const withoutActive = people.filter(
    (person) => !person.authorizations.some((auth) => auth.active),
  ).length;

  return (
    <div>
      <PageHeader
        title="Personas autorizadas"
        description="Quién puede recoger a cada alumno, con qué identificador y en qué estado."
        action={<AddAuthorizedPersonButton students={selectableStudents} label="Nueva persona" />}
      />

      <Alert tone="warning" className="mb-4">
        <p className="font-semibold">Función crítica de seguridad</p>
        <p className="mt-0.5 leading-relaxed">
          Cada alta, suspensión o revocación queda registrada en la bitácora de auditoría y se avisa
          al tutor afectado. La suspensión bloquea a la persona en todo el centro de forma inmediata.
        </p>
      </Alert>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard
          label="Personas registradas"
          value={people.length}
          icon={<BadgeCheck className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Suspendidas"
          value={suspended}
          hint="Bloqueadas en el acceso"
          icon={<ShieldX className="h-4 w-4" />}
          tone={suspended > 0 ? "berry" : "ink"}
        />
        <StatCard
          label="Sin autorización activa"
          value={withoutActive}
          hint="No pueden recoger"
          icon={<ShieldAlert className="h-4 w-4" />}
          tone={withoutActive > 0 ? "sun" : "ink"}
        />
      </div>

      <FilterBar action="/admin/autorizados" resetHref="/admin/autorizados" className="mb-4">
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
              placeholder="Nombre o código SK-DEMO-…"
              className="h-11 py-0 pl-10"
            />
          </div>
        </FilterField>

        <FilterField label="Estado" htmlFor="status">
          <FilterSelect
            id="status"
            name="status"
            defaultValue={status}
            allLabel="Todos"
            options={[
              { value: "ACTIVE", label: "Activas" },
              { value: "SUSPENDED", label: "Suspendidas" },
            ]}
          />
        </FilterField>
      </FilterBar>

      <SectionCard
        title="Directorio de personas autorizadas"
        description={`${people.length} registro(s). Pulsa una fila para ver su historial de recogidas.`}
        icon={<BadgeCheck className="h-5 w-5" />}
      >
        <PeopleDirectory
          detailBasePath="/admin/autorizados"
          emptyAction={<AddAuthorizedPersonButton students={selectableStudents} />}
          people={people.map((person) => ({
            id: person.id,
            name: person.name,
            relationship: person.relationship,
            status: person.status,
            qrIdentifier: person.qrIdentifier,
            avatarTone: person.avatarTone,
            phone: person.phone,
            isAccount: Boolean(person.user),
            pickups: person._count.attendanceEvents,
            students: person.authorizations.map((auth) => ({
              id: auth.student.id,
              name: `${auth.student.firstName} ${auth.student.lastName}`,
              group: auth.student.group,
              active: auth.active,
            })),
          }))}
        />
      </SectionCard>

      {/* Acciones de suspensión fuera del enlace de fila, para no competir con la navegación */}
      <SectionCard
        title="Estado de las autorizaciones"
        description="Suspende o reactiva a una persona en todo el centro."
        icon={<ShieldAlert className="h-5 w-5" />}
        className="mt-4"
      >
        <ul className="divide-y divide-ink-50">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-800">{person.name}</p>
                <p className="truncate font-mono text-[11px] text-ink-400">
                  {person.qrIdentifier}
                </p>
              </div>
              <PersonStatusToggle
                personId={person.id}
                personName={person.name}
                status={person.status}
              />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
