import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Botón base del sistema de diseño.
 * Las acciones principales son grandes y de alto contraste: la pantalla de
 * control de salida debe poder usarse de pie, con una sola mano y en segundos.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "white";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary:
    "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:text-brand-300",
  outline:
    "border border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100",
  ghost: "text-ink-600 hover:bg-ink-100 active:bg-ink-200",
  danger:
    "bg-berry-600 text-white shadow-sm hover:bg-berry-700 active:bg-berry-800 disabled:bg-berry-300",
  success:
    "bg-mint-600 text-white shadow-sm hover:bg-mint-700 active:bg-mint-800 disabled:bg-mint-300",
  white: "bg-white text-brand-700 shadow-sm hover:bg-brand-50 active:bg-brand-100",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-sm rounded-xl",
  md: "h-11 gap-2 px-4 text-sm rounded-2xl",
  lg: "min-h-[3.25rem] gap-2 px-5 py-3 text-base rounded-2xl",
  xl: "min-h-[3.75rem] gap-2.5 px-6 text-lg rounded-3xl py-4",
};

const BASE =
  "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition " +
  "disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-brand-500 " +
  "focus-visible:ring-offset-2";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonClasses(variant, size, cn(fullWidth && "w-full", className))}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

/** Misma apariencia que `Button`, pero navega: evita botones sin destino. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={buttonClasses(variant, size, cn(fullWidth && "w-full", className))}
    >
      {children}
    </Link>
  );
}
