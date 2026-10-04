import { BadgeCheck, ChevronRight, QrCode } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PersonStatusPill } from "@/components/domain/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { relationshipLabel } from "@/lib/domain/roles";
import { maskPhone } from "@/lib/utils/format";

export type DirectoryPerson = {
  id: string;
  name: string;
  relationship: string;
  status: string;
  qrIdentifier: string;
  avatarTone: string;
  phone: string | null;
  isAccount: boolean;
  pickups: number;
  students: Array<{ id: string; name: string; group: string; active: boolean }>;
};

/**
 * Directorio de personas autorizadas con sus alumnos y estado.
 * Se usa tanto en consulta (personal) como en gestión (dirección).
 */
export function PeopleDirectory({
  people,
  detailBasePath,
  rowAction,
  emptyAction,
}: {
  people: DirectoryPerson[];
  /** Si se indica, cada fila enlaza a la ficha completa. */
  detailBasePath?: string;
  rowAction?: (person: DirectoryPerson) => ReactNode;
  emptyAction?: ReactNode;
}) {
  if (people.length === 0) {
    return (
      <EmptyState
        icon={<BadgeCheck className="h-6 w-6" />}
        title="No hay personas autorizadas"
        description="Registra a las personas que pueden recoger a cada alumno del centro."
        action={emptyAction}
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {people.map((person) => {
        const activeStudents = person.students.filter((student) => student.active);
        const revokedCount = person.students.length - activeStudents.length;

        const body = (
          <>
            <Avatar name={person.name} tone={person.avatarTone} size="md" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-ink-900">{person.name}</p>
                <PersonStatusPill status={person.status} size="sm" />
                {person.isAccount ? (
                  <Badge className="bg-brand-50 text-brand-700 ring-brand-200" size="sm">
                    Tutor con app
                  </Badge>
                ) : null}
              </div>

              <p className="mt-0.5 truncate text-xs text-ink-500">
                {relationshipLabel(person.relationship)} · {maskPhone(person.phone)}
              </p>

              <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-brand-600">
                <QrCode className="h-3 w-3" aria-hidden="true" />
                {person.qrIdentifier}
              </p>

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activeStudents.length === 0 ? (
                  <span className="rounded-full bg-berry-50 px-2 py-0.5 text-[11px] font-semibold text-berry-700 ring-1 ring-berry-200">
                    Sin autorizaciones vigentes
                  </span>
                ) : (
                  activeStudents.slice(0, 3).map((student) => (
                    <span
                      key={student.id}
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700"
                    >
                      {student.name}
                    </span>
                  ))
                )}
                {activeStudents.length > 3 ? (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                    +{activeStudents.length - 3}
                  </span>
                ) : null}
                {revokedCount > 0 ? (
                  <span className="rounded-full bg-sun-50 px-2 py-0.5 text-[11px] font-medium text-sun-700 ring-1 ring-sun-200">
                    {revokedCount} revocada(s)
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-[11px] text-ink-400">{person.pickups} recogidas</span>
              {rowAction ? rowAction(person) : null}
              {detailBasePath ? (
                <ChevronRight className="h-5 w-5 text-ink-300" aria-hidden="true" />
              ) : null}
            </div>
          </>
        );

        return (
          <li key={person.id}>
            {detailBasePath ? (
              <Link
                href={`${detailBasePath}/${person.id}`}
                className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 transition hover:border-brand-200 hover:shadow-card"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-3.5">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
