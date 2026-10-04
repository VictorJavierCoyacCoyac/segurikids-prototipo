import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddAuthorizedPersonButton } from "@/components/domain/authorized-person-form";
import { AuthorizationToggle } from "@/components/domain/authorization-toggle";
import { StudentDetail } from "@/components/domain/student-detail";
import { EditStudentButton } from "@/components/domain/student-form";
import { requireRole } from "@/lib/auth/session";
import { toDateInput } from "@/lib/utils/date";
import { listStudentMovements } from "@/server/services/attendance";
import { getStudent, listGroups } from "@/server/services/students";
import { listTutors } from "@/server/services/users";

export const metadata: Metadata = { title: "Ficha del alumno" };

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ADMIN");

  const student = await getStudent(id, user.schoolId);
  if (!student) notFound();

  const [movements, groups, tutors] = await Promise.all([
    listStudentMovements(student.id, 30),
    listGroups(user.schoolId),
    listTutors(user.schoolId),
  ]);

  const fullName = `${student.firstName} ${student.lastName}`;
  const tutorOptions = tutors.map((tutor) => ({
    id: tutor.id,
    name: tutor.name,
    childrenCount: tutor.children.length,
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/admin/alumnos"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Alumnos
      </Link>

      <StudentDetail
        student={student}
        movements={movements}
        tutorHref={`/admin/tutores/${student.tutor.id}`}
        headerActions={
          <>
            <AddAuthorizedPersonButton
              variant="secondary"
              label="Autorizar persona"
              students={[{ id: student.id, name: fullName, group: student.group }]}
            />
            <EditStudentButton
              tutors={tutorOptions}
              groups={groups}
              values={{
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                group: student.group,
                status: student.status,
                tutorId: student.tutorId,
                birthDate: student.birthDate ? toDateInput(student.birthDate) : "",
                bloodType: student.bloodType ?? "",
                allergies: student.allergies ?? "",
                notes: student.notes ?? "",
              }}
            />
          </>
        }
        authorizationAction={(authorization) => (
          <AuthorizationToggle
            authorizationId={authorization.id}
            active={authorization.active}
            personName={authorization.authorizedPerson.name}
            studentName={fullName}
          />
        )}
      />
    </div>
  );
}
