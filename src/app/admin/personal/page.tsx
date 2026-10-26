import { ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";

import { CreateUserButton } from "@/components/domain/user-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { ROLE_DESCRIPTION, ROLE_LABEL, type Role } from "@/lib/domain/roles";
import { TERMS_VERSION } from "@/lib/domain/terms";
import { formatDate } from "@/lib/utils/date";
import { maskPhone } from "@/lib/utils/format";
import { listStaff } from "@/server/services/users";

export const metadata: Metadata = { title: "Personal" };

/** Personal del centro y matriz de permisos vigente. */
export default async function AdminStaffPage() {
  const user = await requireRole("ADMIN");
  const staff = await listStaff(user.schoolId);

  const permissionLabels: Record<Permission, string> = {
    ACCESS_CONTROL: "Registrar entradas y salidas",
    MANAGE_USERS: "Dar de alta usuarios",
    MANAGE_STUDENTS: "Gestionar alumnos",
    MANAGE_ALL_AUTHORIZATIONS: "Gestionar todas las autorizaciones",
    MANAGE_OWN_AUTHORIZATIONS: "Gestionar autorizaciones propias",
    TRIGGER_EMERGENCY: "Activar emergencias",
    RESOLVE_EMERGENCY: "Cerrar emergencias e incidencias",
    REPORT_INCIDENT: "Reportar incidencias",
    VIEW_REPORTS: "Consultar y exportar reportes",
    VIEW_AUDIT: "Consultar la auditoría",
    VIEW_ALL_STUDENTS: "Ver el directorio completo",
  };

  return (
    <div>
      <PageHeader
        title="Personal"
        description="Cuentas del centro con acceso al control de acceso y a la administración."
        action={<CreateUserButton defaultRole="STAFF" label="Nueva cuenta de personal" />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Cuentas del centro"
          description={`${staff.length} usuario(s) con rol administrativo o de personal.`}
          icon={<Users className="h-5 w-5" />}
          className="lg:col-span-2"
        >
          <ul className="space-y-2.5">
            {staff.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 p-3.5"
              >
                <Avatar name={member.name} tone={member.avatarTone} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-ink-900">{member.name}</p>
                    <Badge
                      className={
                        member.role === "ADMIN"
                          ? "bg-brand-50 text-brand-700 ring-brand-200"
                          : "bg-mint-50 text-mint-700 ring-mint-200"
                      }
                      size="sm"
                    >
                      {ROLE_LABEL[member.role as Role]}
                    </Badge>
                    {member.termsVersion !== TERMS_VERSION ? (
                      <Badge className="bg-sun-50 text-sun-700 ring-sun-200" size="sm">
                        Términos pendientes
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {member.jobTitle ?? "Sin cargo asignado"} · {member.email} ·{" "}
                    {maskPhone(member.phone)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {member._count.registeredEvents} movimientos registrados ·{" "}
                    {member._count.createdAlerts} alertas ·{" "}
                    {member._count.reportedIncidents} incidencias
                    {member.lastLoginAt ? ` · Último acceso: ${formatDate(member.lastLoginAt)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Matriz de permisos"
          description="Capacidades de cada rol del sistema."
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          <div className="space-y-4">
            {(["ADMIN", "STAFF", "PARENT"] as Role[]).map((role) => (
              <div key={role}>
                <p className="text-sm font-bold text-ink-900">{ROLE_LABEL[role]}</p>
                <p className="mb-2 text-xs text-ink-500">{ROLE_DESCRIPTION[role]}</p>
                <ul className="space-y-1">
                  {(Object.keys(PERMISSIONS) as Permission[])
                    .filter((permission) =>
                      (PERMISSIONS[permission] as readonly Role[]).includes(role),
                    )
                    .map((permission) => (
                      <li
                        key={permission}
                        className="flex items-start gap-1.5 text-xs text-ink-600"
                      >
                        <ShieldCheck
                          className="mt-0.5 h-3 w-3 shrink-0 text-mint-600"
                          aria-hidden="true"
                        />
                        {permissionLabels[permission]}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <Alert tone="warning" className="mt-4">
        <p className="font-semibold">Alcance del prototipo</p>
        <p className="mt-0.5 leading-relaxed">
          El alta de cuentas se hace desde esta pantalla y queda auditada. Siguen fuera del alcance
          la edición y baja de usuarios, el restablecimiento de contraseñas y el doble factor para
          cuentas administrativas, que serían imprescindibles antes de un uso real.
        </p>
      </Alert>
    </div>
  );
}
