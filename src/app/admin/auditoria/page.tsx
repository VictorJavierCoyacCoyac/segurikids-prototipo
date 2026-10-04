import { ScrollText, Search, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { FilterBar, FilterField, FilterSelect } from "@/components/domain/filter-bar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/lib/auth/session";
import { AUDIT_ACTIONS, AUDIT_TONE_CLASS, auditActionMeta } from "@/lib/domain/audit";
import { ROLE_LABEL, type Role } from "@/lib/domain/roles";
import { formatDate, formatTime } from "@/lib/utils/date";
import { countAuditLogs, listAuditLogs } from "@/server/services/audit";

export const metadata: Metadata = { title: "Auditoría" };

/**
 * Bitácora de auditoría.
 * Registra quién hizo qué y cuándo: es el respaldo de trazabilidad que exige un
 * sistema centrado en la seguridad de menores.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  await requireRole("ADMIN");

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const action = single("action") ?? "ALL";
  const search = single("q") ?? "";

  const [logs, total] = await Promise.all([
    listAuditLogs({
      action: action !== "ALL" ? action : undefined,
      search: search || undefined,
      take: 150,
    }),
    countAuditLogs(),
  ]);

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description={`${total} acciones registradas en el sistema. Se muestran las 150 más recientes.`}
      />

      <Alert tone="info" className="mb-4">
        <p className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Qué se registra
        </p>
        <p className="mt-0.5 leading-relaxed">
          Inicios de sesión, escaneos de QR (válidos y rechazados), registros de entrada y salida,
          altas y modificaciones de alumnos, cambios de autorización, activación y cierre de
          emergencias y exportaciones de datos.
        </p>
      </Alert>

      <FilterBar action="/admin/auditoria" resetHref="/admin/auditoria" className="mb-4">
        <FilterField label="Buscar" htmlFor="q" className="min-w-[14rem] flex-[2]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <Input
              id="q"
              name="q"
              defaultValue={search}
              placeholder="Buscar en el resumen de la acción…"
              className="h-11 py-0 pl-10"
            />
          </div>
        </FilterField>

        <FilterField label="Acción" htmlFor="action">
          <FilterSelect
            id="action"
            name="action"
            defaultValue={action}
            allLabel="Todas las acciones"
            options={AUDIT_ACTIONS.map((item) => ({
              value: item,
              label: auditActionMeta(item).label,
            }))}
          />
        </FilterField>
      </FilterBar>

      <SectionCard
        title="Bitácora de actividad"
        description={`${logs.length} registro(s) coinciden con el filtro.`}
        icon={<ScrollText className="h-5 w-5" />}
        bodyClassName="px-4 py-3 sm:px-5"
      >
        {logs.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title="No hay registros para este filtro"
            description="Prueba con otra acción o limpia la búsqueda."
          />
        ) : (
          <div className="sk-table-wrap">
            <table className="sk-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = auditActionMeta(log.action);
                  return (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap tabular-nums">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap">
                        {log.user ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={log.user.name} tone={log.user.avatarTone} size="xs" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink-900">
                                {log.user.name}
                              </span>
                              <span className="block text-[11px] text-ink-400">
                                {ROLE_LABEL[log.user.role as Role] ?? log.user.role}
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink-400">Sistema</span>
                        )}
                      </td>
                      <td>
                        <Badge className={AUDIT_TONE_CLASS[meta.tone]} size="sm">
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="max-w-md">{log.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <p className="mt-4 px-1 text-xs leading-relaxed text-ink-400">
        Nota del prototipo: la bitácora es de solo lectura y no incluye dirección IP ni huella del
        dispositivo. En producción debería almacenarse en un medio inmutable, con retención definida
        y acceso restringido.
      </p>
    </div>
  );
}
