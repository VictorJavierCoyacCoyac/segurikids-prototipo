import { ScanLine } from "lucide-react";
import type { Metadata } from "next";

import { ManualExitPanel } from "@/components/domain/manual-exit-panel";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Registrar salida" };

/**
 * Salida manual. La vía preferente es el escáner: esta pantalla cubre las
 * excepciones y exige los mismos requisitos de autorización.
 */
export default async function StaffExitPage() {
  const user = await requireRole("STAFF", "ADMIN");

  const students = await prisma.student.findMany({
    where: { schoolId: user.schoolId, active: true, status: "IN_CAMPUS" },
    include: {
      tutor: { select: { name: true } },
      authorizations: {
        include: { authorizedPerson: true },
        orderBy: [{ active: "desc" }],
      },
    },
    orderBy: [{ group: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Control de acceso"
        title="Registrar salida"
        description="Entrega de un alumno sin lectura de QR, validando igualmente la autorización."
        action={
          <ButtonLink href="/staff/escaner" variant="secondary" size="md">
            <ScanLine className="h-4 w-4" />
            Usar escáner
          </ButtonLink>
        }
      />

      <Alert tone="warning" className="mb-4">
        <p className="font-semibold">Verifica la identidad antes de entregar</p>
        <p className="mt-0.5 leading-relaxed">
          En el registro manual no hay lectura de código: solicita una identificación oficial y
          coteja los últimos dígitos que muestra el sistema.
        </p>
      </Alert>

      <ManualExitPanel
        students={students.map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          group: student.group,
          tutorName: student.tutor.name,
          avatarTone: student.avatarTone,
          people: student.authorizations.map((auth) => ({
            id: auth.authorizedPerson.id,
            name: auth.authorizedPerson.name,
            relationship: auth.relationship ?? auth.authorizedPerson.relationship,
            avatarTone: auth.authorizedPerson.avatarTone,
            qrIdentifier: auth.authorizedPerson.qrIdentifier,
            documentTail: auth.authorizedPerson.documentTail,
            active: auth.active,
            suspended: auth.authorizedPerson.status !== "ACTIVE",
          })),
        }))}
      />
    </div>
  );
}
