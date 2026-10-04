import { Badge } from "@/components/ui/badge";
import { personStatusMeta } from "@/lib/domain/attendance";
import { studentStatusMeta } from "@/lib/domain/students";
import { cn } from "@/lib/utils/cn";

/** Estado operativo del alumno: el dato que más se consulta en todo el sistema. */
export function StudentStatusPill({
  status,
  size = "md",
  className,
}: {
  status: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = studentStatusMeta(status);
  return (
    <Badge className={cn(meta.pill, className)} dot={meta.dot} size={size}>
      {meta.label}
    </Badge>
  );
}

export function PersonStatusPill({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const meta = personStatusMeta(status);
  return (
    <Badge className={meta.pill} size={size}>
      {meta.label}
    </Badge>
  );
}

/** Resumen de estados para cabeceras de listados. */
export function StatusLegend({
  counts,
}: {
  counts: { inCampus: number; offCampus: number; absent: number; pending?: number };
}) {
  const items = [
    { status: "IN_CAMPUS", value: counts.inCampus },
    { status: "OFF_CAMPUS", value: counts.offCampus },
    { status: "ABSENT", value: counts.absent },
    ...(counts.pending ? [{ status: "PENDING", value: counts.pending }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const meta = studentStatusMeta(item.status);
        return (
          <span
            key={item.status}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              meta.pill,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            {meta.label}
            <span className="tabular-nums">{item.value}</span>
          </span>
        );
      })}
    </div>
  );
}
