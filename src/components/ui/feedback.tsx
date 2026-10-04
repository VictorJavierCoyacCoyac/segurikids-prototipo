import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Estados de respuesta: ninguna operación queda sin retroalimentación visible. */

export function Alert({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const tones = {
    info: { wrap: "bg-brand-50 text-brand-900 ring-brand-200", icon: "text-brand-600", Icon: Info },
    success: {
      wrap: "bg-mint-50 text-mint-900 ring-mint-200",
      icon: "text-mint-600",
      Icon: CheckCircle2,
    },
    warning: {
      wrap: "bg-sun-50 text-sun-900 ring-sun-200",
      icon: "text-sun-600",
      Icon: AlertTriangle,
    },
    danger: {
      wrap: "bg-berry-50 text-berry-900 ring-berry-200",
      icon: "text-berry-600",
      Icon: XCircle,
    },
  } as const;

  const { wrap, icon, Icon } = tones[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex animate-fade-up items-start gap-3 rounded-2xl px-4 py-3 ring-1",
        wrap,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "leading-snug")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-400 shadow-sm">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin", className)}
      aria-hidden="true"
    />
  );
}

/** Bloque de carga para listas y tarjetas. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-ink-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded-full bg-ink-100" />
              <div className="h-3 w-1/2 rounded-full bg-ink-50" />
            </div>
          </div>
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>
      ))}
    </div>
  );
}
