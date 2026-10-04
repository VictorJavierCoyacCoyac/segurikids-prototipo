import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Envoltorio de campo: etiqueta, ayuda y mensaje de error accesibles. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={htmlFor} className="sk-label">
        {label}
        {required ? <span className="ml-0.5 text-berry-600">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm font-medium text-berry-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  error,
  className,
  ...props
}: ComponentProps<"input"> & { error?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={error || undefined}
      className={cn("sk-input", error && "sk-input-error", className)}
    />
  );
}

export function Textarea({
  error,
  className,
  ...props
}: ComponentProps<"textarea"> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={error || undefined}
      className={cn("sk-input min-h-[7rem] resize-y", error && "sk-input-error", className)}
    />
  );
}

export function Select({
  error,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { error?: boolean }) {
  return (
    <select
      {...props}
      aria-invalid={error || undefined}
      className={cn("sk-input appearance-none pr-10", error && "sk-input-error", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23667590' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.85rem center",
      }}
    >
      {children}
    </select>
  );
}

/** Casilla grande, cómoda de pulsar en móvil (selección de alumnos). */
export function CheckCard({
  name,
  value,
  defaultChecked,
  title,
  subtitle,
  trailing,
  disabled,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 transition",
        "has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/60 has-[:checked]:ring-2 has-[:checked]:ring-brand-100",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="h-5 w-5 shrink-0 rounded-md border-ink-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-ink-500">{subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </label>
  );
}
