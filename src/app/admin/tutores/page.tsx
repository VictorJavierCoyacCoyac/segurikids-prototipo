import { Search, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FilterBar, FilterField } from "@/components/domain/filter-bar";
import { StudentStatusPill } from "@/components/domain/status-pill";
import { CreateUserButton } from "@/components/domain/user-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { TERMS_VERSION } from "@/lib/domain/terms";
import { maskPhone } from "@/lib/utils/format";
import { listTutors } from "@/server/services/users";

export const metadata: Metadata = { title: "Padres y tutores" };

/** Directorio de tutores con sus alumnos asociados y su identificador QR. */
export default async function AdminTutorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireRole("ADMIN");

  const raw = params.q;
  const search = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const tutors = await listTutors(user.schoolId, search);

  return (
    <div>
      <PageHeader
        title="Padres y tutores"
        description="Usuarios de la app familiar, alumnos asociados y credencial de recogida."
        action={<CreateUserButton defaultRole="PARENT" label="Nuevo tutor" />}
      />

      <Alert tone="info" className="mb-4">
        <p className="font-semibold">Relación tutor ↔ alumno</p>
        <p className="mt-0.5 leading-relaxed">
          Cada alumno tiene un tutor principal que recibe los avisos de entrada y salida. La
          vinculación se administra desde la ficha del alumno.
        </p>
      </Alert>

      <FilterBar
        action="/admin/tutores"
        resetHref="/admin/tutores"
        className="mb-4"
        submitLabel="Buscar"
      >
        <FilterField label="Buscar tutor" htmlFor="q" className="min-w-[16rem] flex-[2]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <Input
              id="q"
              name="q"
              defaultValue={search}
              placeholder="Nombre o correo electrónico…"
              className="h-11 py-0 pl-10"
            />
          </div>
        </FilterField>
      </FilterBar>

      <SectionCard
        title="Tutores registrados"
        description={`${tutors.length} usuario(s) con rol Padre / Tutor.`}
        icon={<UserRound className="h-5 w-5" />}
      >
        {tutors.length === 0 ? (
          <EmptyState
            icon={<UserRound className="h-6 w-6" />}
            title="No se encontraron tutores"
            description="Ajusta la búsqueda para ver más resultados."
          />
        ) : (
          <ul className="space-y-2.5">
            {tutors.map((tutor) => (
              <li
                key={tutor.id}
                className="rounded-2xl border border-ink-100 p-3.5 transition hover:border-brand-200"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar name={tutor.name} tone={tutor.avatarTone} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-ink-900">{tutor.name}</p>
                      {tutor.authorizedPersonProfile ? (
                        <Badge
                          className="bg-brand-50 font-mono text-brand-700 ring-brand-200"
                          size="sm"
                        >
                          {tutor.authorizedPersonProfile.qrIdentifier}
                        </Badge>
                      ) : (
                        <Badge className="bg-sun-50 text-sun-700 ring-sun-200" size="sm">
                          Sin credencial QR
                        </Badge>
                      )}
                      {!tutor.active ? (
                        <Badge className="bg-berry-50 text-berry-700 ring-berry-200" size="sm">
                          Cuenta inactiva
                        </Badge>
                      ) : null}
                      {tutor.termsVersion !== TERMS_VERSION ? (
                        <Badge className="bg-sun-50 text-sun-700 ring-sun-200" size="sm">
                          Términos pendientes
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {tutor.email} · {maskPhone(tutor.phone)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/tutores/${tutor.id}`}
                    className="shrink-0 rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                  >
                    Ver ficha
                  </Link>
                </div>

                {tutor.children.length > 0 ? (
                  <ul className="mt-3 grid gap-2 border-t border-ink-50 pt-3 sm:grid-cols-2">
                    {tutor.children.map((child) => (
                      <li
                        key={child.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-ink-50 px-3 py-2"
                      >
                        <Link
                          href={`/admin/alumnos/${child.id}`}
                          className="min-w-0 truncate text-sm font-medium text-ink-800 hover:text-brand-600 hover:underline"
                        >
                          {child.firstName} {child.lastName}
                          <span className="text-ink-400"> · {child.group}</span>
                        </Link>
                        <StudentStatusPill status={child.status} size="sm" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl bg-sun-50 px-3 py-2 text-xs text-sun-800">
                    Este tutor no tiene alumnos asociados.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
