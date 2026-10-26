import { Bot, Megaphone } from "lucide-react";
import type { Metadata } from "next";

import { AssistantPanel } from "@/components/domain/voice/assistant-panel";
import { CallStudentPanel } from "@/components/domain/voice/call-student-panel";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { listStudents } from "@/server/services/students";

export const metadata: Metadata = { title: "Voceo y asistente" };

/**
 * Voceo de recogida.
 *
 * El escáner ya vocea automáticamente cada entrega autorizada; esta pantalla
 * añade el voceo manual y el asistente de apoyo para el mostrador.
 */
export default async function VoicePage() {
  const user = await requireRole("STAFF", "ADMIN");

  const [snapshot, students] = await Promise.all([
    getDashboardSnapshot(user.schoolId),
    listStudents({ schoolId: user.schoolId, status: "IN_CAMPUS" }),
  ]);

  const callable = students.map((student) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    group: student.group,
    status: student.status,
    avatarTone: student.avatarTone,
    tutorName: student.tutor.name,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Comunicación"
        title="Voceo y asistente"
        description="Avisa al aula de que han llegado por un alumno y consulta el protocolo sin salir del mostrador."
      />

      <Alert tone="info" className="mb-4">
        <p className="font-semibold">Cómo encaja con el escáner</p>
        <p className="mt-0.5 leading-relaxed">
          Cuando el escáner valida un QR con resultado «Autorizado», el voceo se dispara solo con el
          nombre del alumno y quién lo espera. Aquí puedes repetirlo manualmente o vocear un aviso
          propio. Vocear no registra ninguna salida: la entrega sigue exigiendo la confirmación en el
          escáner.
        </p>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Vocear la llegada de un alumno"
          description={`${callable.length} alumno(s) en el plantel ahora mismo.`}
          icon={<Megaphone className="h-5 w-5" />}
        >
          <CallStudentPanel students={callable} />
        </SectionCard>

        <SectionCard
          title="Asistente del mostrador"
          description="Resumen de la jornada, protocolo de entrega y voceo por texto."
          icon={<Bot className="h-5 w-5" />}
          bodyClassName="p-0 sm:p-0"
        >
          <AssistantPanel
            context={{
              inCampus: snapshot.inCampus,
              offCampus: snapshot.offCampus,
              absent: snapshot.absent,
              pending: snapshot.pending,
              entriesToday: snapshot.entriesToday,
              exitsToday: snapshot.exitsToday,
              activeAlerts: snapshot.activeAlerts,
              schoolName: user.schoolName,
            }}
          />
        </SectionCard>
      </div>

      <p className="mt-5 px-1 text-xs leading-relaxed text-ink-400">
        El voceo usa la síntesis de voz del propio navegador y suena únicamente en el altavoz de este
        dispositivo. El asistente responde a partir de un catálogo cerrado de respuestas: no hay
        modelo de lenguaje ni servicios externos, por lo que ningún dato del centro sale del
        dispositivo.
      </p>
    </div>
  );
}
