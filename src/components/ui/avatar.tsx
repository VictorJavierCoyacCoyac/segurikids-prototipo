import { avatarToneClass, initials } from "@/lib/domain/students";
import { cn } from "@/lib/utils/cn";

/**
 * Avatar generado a partir de las iniciales.
 *
 * DECISIÓN DE DISEÑO: el prototipo no almacena fotografías de menores ni de
 * adultos. Se usan iniciales con color estable por persona, suficiente para el
 * cotejo visual en la entrega y sin tratar datos biométricos.
 */
export function Avatar({
  name,
  tone,
  size = "md",
  className,
  ring,
}: {
  name: string;
  tone?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}) {
  const sizes = {
    xs: "h-7 w-7 text-[11px]",
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-2xl",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold uppercase",
        sizes[size],
        avatarToneClass(tone),
        ring && "ring-2 ring-white",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
