import {
  Clock,
  Cog,
  Database,
  KeyRound,
  Rocket,
  School,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";

import { DemoBadge } from "@/components/layout/brand";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { getSchool } from "@/server/services/users";

import { ResetDayForm } from "./reset-day-form";

export const metadata: Metadata = { title: "Configuración" };

/**
 * Configuración del centro y ficha técnica del prototipo.
 * Deja explícito qué es demostración y qué debería endurecerse antes de
 * cualquier uso real, tal y como exige un sistema que trata datos de menores.
 */
export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN");
  const school = await getSchool(user.schoolId);

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const productionChecklist = [
    {
      title: "Autenticación",
      demo: "Cookie firmada con HMAC y contraseñas con SHA-256 sin salt.",
      production: "Proveedor de identidad real, hash argon2/bcrypt, 2FA y bloqueo por intentos.",
    },
    {
      title: "Base de datos",
      demo: "SQLite local, sin cifrado en reposo.",
      production: "PostgreSQL gestionado, cifrado en reposo, copias de seguridad y retención.",
    },
    {
      title: "Notificaciones",
      demo: "Avisos internos guardados en la base de datos.",
      production: "Push real (FCM/APNs) con preferencias y consentimiento por usuario.",
    },
    {
      title: "Lectura de QR",
      demo: "API nativa del navegador con alternativa manual y simulada.",
      production: "App nativa con lector dedicado, credenciales rotables y códigos con caducidad.",
    },
    {
      title: "Datos personales",
      demo: "Datos ficticios; teléfonos enmascarados en pantallas operativas.",
      production:
        "Aviso de privacidad, consentimiento del tutor, minimización y derechos ARCO/GDPR.",
    },
    {
      title: "Auditoría",
      demo: "Bitácora en la misma base de datos, sin IP ni dispositivo.",
      production: "Almacenamiento inmutable, alertas ante anomalías y revisión periódica.",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        description="Parámetros del centro educativo y alcance técnico del prototipo."
        action={<DemoBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Centro educativo */}
        <SectionCard
          title="Centro educativo"
          description="Datos del plantel utilizados por el sistema."
          icon={<School className="h-5 w-5" />}
        >
          <dl className="space-y-3 text-sm">
            {[
              { label: "Nombre", value: school?.name ?? "—" },
              { label: "Código", value: school?.code ?? "—" },
              { label: "Dirección", value: school?.address ?? "No registrada" },
              { label: "Teléfono", value: school?.phone ?? "No registrado" },
              { label: "Zona horaria", value: school?.timezone ?? "—" },
            ].map((row) => (
              <div key={row.label} className="flex flex-wrap justify-between gap-2">
                <dt className="text-ink-500">{row.label}</dt>
                <dd className="font-semibold text-ink-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
            <div className="rounded-2xl bg-mint-50 p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-mint-700">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Hora de entrada
              </p>
              <p className="mt-0.5 text-xl font-bold text-mint-900">{school?.entryTime}</p>
              <p className="text-[11px] text-mint-700">Base del cálculo de puntualidad</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-brand-700">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Hora de salida
              </p>
              <p className="mt-0.5 text-xl font-bold text-brand-900">{school?.exitTime}</p>
              <p className="text-[11px] text-brand-700">Referencia de la jornada</p>
            </div>
          </div>
        </SectionCard>

        {/* Estado del sistema */}
        <SectionCard
          title="Estado del sistema"
          description="Configuración activa de esta instalación."
          icon={<Cog className="h-5 w-5" />}
        >
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink-600">
                <Rocket className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Modo demostración
              </span>
              <Badge
                className={
                  demoMode
                    ? "bg-sun-50 text-sun-700 ring-sun-200"
                    : "bg-ink-100 text-ink-600 ring-ink-200"
                }
                size="sm"
              >
                {demoMode ? "Activado" : "Desactivado"}
              </Badge>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink-600">
                <Database className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Base de datos
              </span>
              <Badge className="bg-brand-50 text-brand-700 ring-brand-200" size="sm">
                SQLite (Prisma)
              </Badge>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink-600">
                <KeyRound className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Sesiones
              </span>
              <Badge className="bg-ink-100 text-ink-600 ring-ink-200" size="sm">
                Cookie firmada · 12 h
              </Badge>
            </li>
          </ul>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4 text-center">
            {[
              { label: "Alumnos", value: school?._count.students ?? 0 },
              { label: "Usuarios", value: school?._count.users ?? 0 },
              { label: "Autorizados", value: school?._count.authorizedPeople ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-ink-50 p-3">
                <p className="text-2xl font-bold text-ink-900">{stat.value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <Alert tone="warning">
        <p className="flex items-center gap-1.5 font-semibold">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          Este prototipo no está listo para producción
        </p>
        <p className="mt-0.5 leading-relaxed">
          Los datos son ficticios y las credenciales son públicas por diseño. Antes de operar con
          información real de menores deben cubrirse los puntos de la siguiente tabla, además del
          marco legal de protección de datos aplicable.
        </p>
      </Alert>

      <SectionCard
        title="De prototipo a producción"
        description="Qué resuelve hoy la demostración y qué debe endurecerse antes de un piloto real."
        icon={<ShieldAlert className="h-5 w-5" />}
        bodyClassName="px-4 py-3 sm:px-5"
      >
        <div className="sk-table-wrap">
          <table className="sk-table min-w-[720px]">
            <thead>
              <tr>
                <th>Área</th>
                <th>En el prototipo</th>
                <th>Antes de producción</th>
              </tr>
            </thead>
            <tbody>
              {productionChecklist.map((row) => (
                <tr key={row.title}>
                  <td className="font-semibold text-ink-900">{row.title}</td>
                  <td className="text-ink-600">{row.demo}</td>
                  <td className="text-ink-800">{row.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Reiniciar los datos de demostración"
        description="Vuelve a dejar el prototipo en su estado inicial antes de una presentación."
        icon={<Database className="h-5 w-5" />}
      >
        <p className="text-sm leading-relaxed text-ink-600">
          Durante una demostración el guion se agota: al registrar una salida, el alumno queda fuera
          del plantel y el siguiente escaneo del mismo código responde —correctamente— que ya no
          está. Este botón repone el estado de la jornada para volver a mostrarlo.
        </p>

        <div className="mt-4">
          <ResetDayForm />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-500">
          Repone el estado operativo de los alumnos y elimina los movimientos y avisos generados al
          demostrar. <strong>No cierra ninguna sesión</strong>: las cuentas, las autorizaciones y los
          identificadores no se tocan, de modo que los dispositivos conectados siguen dentro. El
          reinicio queda anotado en la bitácora de auditoría, igual que los escaneos de la
          demostración, que tampoco se borran.
        </p>

        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Para volver al escenario completo desde cero —alumnado, tutores, autorizaciones, 30 días de
          movimientos, notificaciones y auditoría— se ejecuta el seed en la terminal del proyecto.
          Ten en cuenta que regenera todos los identificadores y, con ello,{" "}
          <strong>cierra la sesión de todos los dispositivos</strong>.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink-950 p-4 text-sm text-mint-300">
          <code>npm run db:seed</code>
        </pre>
      </SectionCard>
    </div>
  );
}
