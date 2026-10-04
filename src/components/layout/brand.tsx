import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Identidad de SeguriKids: escudo (seguridad) con acento cálido (cercanía).
 * Se mantiene reconocible en tamaños pequeños y sobre fondos claros u oscuros.
 */
export function Logo({
  size = "md",
  inverted,
  withText = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  withText?: boolean;
  className?: string;
}) {
  const marks = {
    sm: "h-8 w-8 rounded-xl",
    md: "h-10 w-10 rounded-2xl",
    lg: "h-14 w-14 rounded-3xl",
  } as const;
  const icons = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" } as const;
  const texts = { sm: "text-base", md: "text-lg", lg: "text-2xl" } as const;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative grid place-items-center shadow-sm",
          marks[size],
          inverted ? "bg-white/15 ring-1 ring-white/25" : "bg-gradient-to-br from-brand-500 to-brand-700",
        )}
      >
        <ShieldCheck className={cn(icons[size], "text-white")} aria-hidden="true" />
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 rounded-full ring-2",
            size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
            inverted ? "bg-sun-300 ring-brand-700" : "bg-sun-400 ring-white",
          )}
        />
      </span>
      {withText ? (
        <span className={cn("font-extrabold tracking-tight", texts[size])}>
          <span className={inverted ? "text-white" : "text-ink-900"}>Seguri</span>
          <span className={inverted ? "text-sun-300" : "text-brand-600"}>Kids</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Aviso permanente de entorno de demostración.
 * Requisito explícito: debe quedar claro que los datos y las credenciales son
 * ficticios y que el prototipo no está endurecido para producción.
 */
export function DemoBadge({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-sun-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sun-800 ring-1 ring-sun-300",
        className,
      )}
      title="Entorno de demostración con datos ficticios"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun-500" />
      {compact ? "Demo" : "Entorno demo"}
    </span>
  );
}
