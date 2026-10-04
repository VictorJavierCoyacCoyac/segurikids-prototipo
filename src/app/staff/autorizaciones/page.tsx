import { BadgeCheck, Search, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { FilterBar, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { PeopleDirectory } from "@/components/domain/people-directory";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { StatCard } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { listAuthorizedPeople } from "@/server/services/authorizations";

export const metadata: Metadata = { title: "Autorizaciones" };

/** Consulta de autorizaciones para el personal del acceso (solo lectura). */
export default async function StaffAuthorizationsPage({
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
  const status = single("status") ?? "ALL";

  const people = await listAuthorizedPeople({ schoolId: user.schoolId, search, status });

  const suspended = people.filter((person) => person.status === "SUSPENDED").length;
  const withoutActive = people.filter(
    (person) => !person.authorizations.some((auth) => auth.active),
  ).length;

  return (
    <div>
      <PageHeader
        title="Autorizaciones"
        description="Consulta quién puede recoger a cada alumno y con qué identificador."
      />

      <Alert tone="info" className="mb-4">
        <p className="font-semibold">Consulta de apoyo al acceso</p>
        <p className="mt-0.5 leading-relaxed">
          El alta y la revocación de autorizaciones corresponden a la dirección del centro y a los
          tutores. Desde aquí puedes verificar la información antes de una entrega.
        </p>
      </Alert>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard
          label="Personas"
          value={people.length}
          icon={<BadgeCheck className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Suspendidas"
          value={suspended}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone={suspended > 0 ? "berry" : "ink"}
        />
        <StatCard
          label="Sin autorización"
          value={withoutActive}
          hint="No pueden recoger"
          icon={<ShieldCheck className="h-4 w-4" />}
          tone={withoutActive > 0 ? "sun" : "ink"}
        />
      </div>

      <FilterBar action="/staff/autorizaciones" resetHref="/staff/autorizaciones" className="mb-4">
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
        title="Personas autorizadas"
        description={`${people.length} registro(s) en el centro.`}
        icon={<BadgeCheck className="h-5 w-5" />}
      >
        <PeopleDirectory
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
    </div>
  );
}
