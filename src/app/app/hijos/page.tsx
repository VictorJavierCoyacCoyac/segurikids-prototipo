import { Users } from "lucide-react";
import type { Metadata } from "next";

import { StudentCard } from "@/components/domain/student-card";
import { StatusLegend } from "@/components/domain/status-pill";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { listChildren } from "@/server/services/students";

export const metadata: Metadata = { title: "Mis hijos" };

export default async function ChildrenPage() {
  const user = await requireRole("PARENT");
  const children = await listChildren(user.id);

  return (
    <div>
      <PageHeader
        title="Mis hijos"
        description="Estado actual de cada alumno y personas autorizadas para recogerlo."
      />

      {children.length > 0 ? (
        <div className="mb-4">
          <StatusLegend
            counts={{
              inCampus: children.filter((child) => child.status === "IN_CAMPUS").length,
              offCampus: children.filter((child) => child.status === "OFF_CAMPUS").length,
              absent: children.filter((child) => child.status === "ABSENT").length,
              pending: children.filter((child) => child.status === "PENDING").length,
            }}
          />
        </div>
      ) : null}

      {children.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Sin alumnos asociados"
          description="Solicita a la dirección del centro que vincule a tus hijos con tu cuenta."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {children.map((child) => {
            const lastEvent = child.attendanceEvents[0];
            return (
              <StudentCard
                key={child.id}
                href={`/app/hijos/${child.id}`}
                name={`${child.firstName} ${child.lastName}`}
                group={child.group}
                status={child.status}
                avatarTone={child.avatarTone}
                meta={`${child.authorizations.length} personas autorizadas`}
                lastEvent={
                  lastEvent
                    ? {
                        type: lastEvent.type,
                        timestamp: lastEvent.timestamp,
                        personName: lastEvent.authorizedPerson?.name ?? null,
                      }
                    : null
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
