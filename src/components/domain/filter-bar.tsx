import { Filter, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

/**
 * Barra de filtros basada en un formulario GET.
 * Se resuelve en el servidor mediante searchParams: los filtros quedan en la
 * URL (compartibles y navegables con el botón atrás) y no requieren JavaScript.
 */
export function FilterBar({
  action,
  resetHref,
  children,
  className,
  submitLabel = "Aplicar filtros",
}: {
  action: string;
  resetHref: string;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  return (
    <form
      method="get"
      action={action}
      className={cn(
        "sk-card flex flex-wrap items-end gap-3 p-4",
        className,
      )}
    >
      {children}
      <div className="flex gap-2">
        <Button type="submit" size="md">
          <Filter className="h-4 w-4" />
          {submitLabel}
        </Button>
        <Link
          href={resetHref}
          className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-ink-200 px-3 text-sm font-semibold text-ink-600 transition hover:bg-ink-50"
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </Link>
      </div>
    </form>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-[9rem] flex-1", className)}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-ink-600">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FilterSelect({
  name,
  id,
  defaultValue,
  options,
  allLabel,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  return (
    <Select name={name} id={id} defaultValue={defaultValue ?? "ALL"} className="h-11 py-0">
      {allLabel ? <option value="ALL">{allLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function FilterDate({
  name,
  id,
  defaultValue,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
}) {
  return <Input type="date" name={name} id={id} defaultValue={defaultValue} className="h-11 py-0" />;
}
