import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Tarjeta de indicador para los dashboards. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "brand" | "mint" | "sun" | "berry" | "ink";
  href?: string;
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    mint: "bg-mint-50 text-mint-600",
    sun: "bg-sun-50 text-sun-600",
    berry: "bg-berry-50 text-berry-600",
    ink: "bg-ink-100 text-ink-600",
  } as const;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon ? (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", tones[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "sk-card block animate-fade-up p-5 transition hover:border-brand-200 hover:shadow-float",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn("sk-card animate-fade-up p-5", className)}>{content}</div>;
}

/**
 * Gráfica de barras agrupadas en SVG puro.
 * Se evita una librería de charts: el prototipo solo necesita dos series y así
 * el bundle se mantiene pequeño y el render es idéntico en servidor y cliente.
 */
export function GroupedBarChart({
  data,
  seriesLabels = ["Entradas", "Salidas"],
  className,
  height = 180,
}: {
  data: Array<{ label: string; a: number; b: number }>;
  seriesLabels?: [string, string] | string[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((item) => [item.a, item.b]));

  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-mint-500" />
          {seriesLabels[0]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
          {seriesLabels[1]}
        </span>
      </div>

      <div className="sk-no-scrollbar overflow-x-auto">
        <div
          className="flex min-w-full items-end gap-1"
          style={{ height }}
          role="img"
          aria-label={`Gráfica de ${seriesLabels[0]} y ${seriesLabels[1]} por periodo`}
        >
          {data.map((item) => (
            <div key={item.label} className="flex min-w-[2.25rem] flex-1 flex-col justify-end gap-1">
              <div className="flex h-full items-end justify-center gap-[3px]">
                <div
                  className="w-2.5 rounded-t-md bg-mint-500 transition-all sm:w-3"
                  style={{ height: `${Math.max(item.a > 0 ? 6 : 0, (item.a / max) * 100)}%` }}
                  title={`${seriesLabels[0]}: ${item.a}`}
                />
                <div
                  className="w-2.5 rounded-t-md bg-brand-500 transition-all sm:w-3"
                  style={{ height: `${Math.max(item.b > 0 ? 6 : 0, (item.b / max) * 100)}%` }}
                  title={`${seriesLabels[1]}: ${item.b}`}
                />
              </div>
              <span className="truncate text-center text-[10px] tabular-nums text-ink-400">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Barra de progreso simple con etiqueta (tasas de asistencia, puntualidad). */
export function MeterBar({
  label,
  value,
  total,
  tone = "brand",
  suffix,
}: {
  label: string;
  value: number;
  total?: number;
  tone?: "brand" | "mint" | "sun" | "berry";
  suffix?: string;
}) {
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : value;
  const tones = {
    brand: "bg-brand-500",
    mint: "bg-mint-500",
    sun: "bg-sun-500",
    berry: "bg-berry-500",
  } as const;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium text-ink-700">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-ink-900">
          {total ? `${value}/${total}` : `${percentage}%`}
          {suffix ? <span className="ml-1 text-xs font-normal text-ink-500">{suffix}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full transition-all", tones[tone])}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
