"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { Button, buttonClasses, type ButtonSize, type ButtonVariant } from "./button";

/**
 * Modal accesible y ligero (sin dependencias de UI externas).
 * Se usa para confirmar acciones importantes: registrar una salida, revocar una
 * autorización o activar una emergencia nunca deben ocurrir con un solo toque
 * accidental.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Evita el scroll del fondo mientras el modal está abierto.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto bg-white shadow-float",
          "animate-fade-up rounded-t-4xl sm:animate-scale-in sm:rounded-3xl",
          widths[size],
        )}
      >
        <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-ink-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-ink-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-ink-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-500 transition hover:bg-ink-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-white px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Abre un modal desde un disparador y expone `close()` al contenido.
 * Útil para formularios que deben cerrarse al completarse.
 */
export function ModalTrigger({
  label,
  title,
  description,
  variant = "primary",
  size = "md",
  modalSize = "md",
  icon,
  className,
  children,
}: {
  label: ReactNode;
  title: string;
  description?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  modalSize?: "sm" | "md" | "lg";
  icon?: ReactNode;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {icon}
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size={modalSize}
      >
        {children(() => setOpen(false))}
      </Modal>
    </>
  );
}

/**
 * Formulario que requiere confirmación explícita antes de enviarse.
 * El `children` es el contenido del formulario (inputs ocultos incluidos).
 */
export function ConfirmForm({
  action,
  label,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "primary",
  confirmVariant = "primary",
  size = "md",
  icon,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ButtonVariant;
  confirmVariant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {icon}
        {label}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="sm">
        <p className="text-sm leading-relaxed text-ink-600">{message}</p>
        <form action={action} className="mt-5 flex flex-wrap justify-end gap-2">
          {children}
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <button
            type="submit"
            onClick={() => setTimeout(() => setOpen(false), 120)}
            className={buttonClasses(confirmVariant, "md")}
          >
            {confirmLabel}
          </button>
        </form>
      </Modal>
    </>
  );
}
