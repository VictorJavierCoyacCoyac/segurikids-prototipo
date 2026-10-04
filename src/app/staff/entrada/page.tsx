import { Info } from "lucide-react";
import type { Metadata } from "next";

import { ManualEntryPanel } from "@/components/domain/manual-entry-panel";
import { PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Registrar entrada" };

export default async function StaffEntryPage() {
  const user = await requireRole("STAFF", "ADMIN");

  const [students, people] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId: user.schoolId, active: true, status: { not: "IN_CAMPUS" } },
      include: { tutor: { select: { name: true } } },
      orderBy: [{ group: "asc" }, { firstName: "asc" }],
    }),
    prisma.authorizedPerson.findMany({
      where: { schoolId: user.schoolId, status: "ACTIVE" },
      select: { id: true, name: true, relationship: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Control de acceso"
        title="Registrar entrada"
        description="Registro manual para los casos en los que no se utiliza la lectura de código QR."
      />

      <Alert tone="info" className="mb-4">
        <p className="flex items-center gap-1.5 font-semibold">
          <Info className="h-4 w-4" aria-hidden="true" />
          ¿Cuándo usar el registro manual?
        </p>
        <p className="mt-0.5 leading-relaxed">
          Cuando la persona no trae su credencial o el dispositivo de lectura no está disponible. El
          movimiento se marca como manual para poder diferenciarlo en los reportes.
        </p>
      </Alert>

      <ManualEntryPanel
        students={students.map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          group: student.group,
          status: student.status,
          tutorName: student.tutor.name,
        }))}
        people={people}
      />
    </div>
  );
}
