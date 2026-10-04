import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function Badge({
  children,
  className,
  dot,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  /** Clase de color del punto indicador (p. ej. `bg-mint-500`). */
  dot?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        "bg-ink-100 text-ink-700 ring-1 ring-ink-200",
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}

/** Indicador numérico para pestañas y navegación (avisos sin leer). */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "grid min-w-[1.25rem] place-items-center rounded-full bg-berry-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
