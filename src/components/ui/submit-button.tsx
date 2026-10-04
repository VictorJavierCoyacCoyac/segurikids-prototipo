"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Spinner } from "./feedback";

/**
 * Botón de envío consciente del estado del formulario: muestra el texto de
 * carga y se bloquea para evitar envíos duplicados (p. ej. registrar dos veces
 * la misma salida).
 */
export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  disabled,
  icon,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      name={name}
      value={value}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingText ?? "Procesando…"}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  );
}
