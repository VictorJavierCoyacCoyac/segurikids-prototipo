import { ArrowLeft, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportIncidentButton } from "@/components/domain/incident-form";
import { StudentDetail } from "@/components/domain/student-detail";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listStudentMovements } from "@/server/services/attendance";
import { getStudent } from "@/server/services/students";

export const metadata: Metadata = { title: "Ficha del alumno" };

export default async function StaffStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("STAFF", "ADMIN");

  const student = await getStudent(id, user.schoolId);
  if (!student) notFound();

  const movements = await listStudentMovements(student.id, 25);
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <div className="space-y-4">
      <Link
        href="/staff/alumnos"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Alumnos
      </Link>

      <StudentDetail
        student={student}
        movements={movements}
        headerActions={
          <>
            <ButtonLink href="/staff/escaner" size="md">
              <ScanLine className="h-4 w-4" />
              Escanear
            </ButtonLink>
            <ReportIncidentButton
              size="md"
              context={{
                studentId: student.id,
                studentName: fullName,
                defaultType: "OTHER",
              }}
            />
          </>
        }
      />
    </div>
  );
}
