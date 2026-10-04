import { prisma } from "@/lib/db";
import type { AuditAction } from "@/lib/domain/audit";

/**
 * Bitácora de auditoría. Único punto de escritura: cualquier operación
 * sensible debe pasar por aquí para que quede trazada.
 */
export async function logAudit(input: {
  action: AuditAction;
  summary: string;
  userId?: string | null;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        summary: input.summary,
        userId: input.userId ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    // La auditoría nunca debe tumbar la operación principal del usuario.
    console.error("[audit] no se pudo registrar la acción", input.action, error);
  }
}

export type AuditFilters = {
  action?: string;
  userId?: string;
  search?: string;
  take?: number;
};

export async function listAuditLogs(filters: AuditFilters = {}) {
  const { action, userId, search, take = 120 } = filters;

  return prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(search
        ? {
            OR: [{ summary: { contains: search } }, { action: { contains: search } }],
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, role: true, avatarTone: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function countAuditLogs(): Promise<number> {
  return prisma.auditLog.count();
}
