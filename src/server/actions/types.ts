/**
 * Contrato común de todas las server actions.
 * La UI solo necesita interpretar `ok`, `message`, `errors` y `data`, lo que
 * permite reutilizar los mismos componentes de estado (loading/success/error).
 */
export type ActionState<TData = undefined> = {
  /** `null` = aún no se ha ejecutado. */
  ok: boolean | null;
  message?: string;
  /** Errores por campo, para mostrarlos junto a cada input. */
  errors?: Record<string, string>;
  data?: TData;
};

export function idleState<TData = undefined>(): ActionState<TData> {
  return { ok: null };
}

export function errorState<TData = undefined>(
  message: string,
  errors?: Record<string, string>,
): ActionState<TData> {
  return { ok: false, message, errors };
}

export function successState<TData = undefined>(
  message: string,
  data?: TData,
): ActionState<TData> {
  return { ok: true, message, data };
}

/**
 * Convierte cualquier excepción en un estado de error legible.
 * Evita filtrar trazas internas a la interfaz.
 */
export function toErrorState<TData = undefined>(error: unknown): ActionState<TData> {
  const message =
    error instanceof Error && error.message && !error.message.includes("Prisma")
      ? error.message
      : "No se pudo completar la operación. Inténtalo de nuevo.";
  console.error("[action]", error);
  return { ok: false, message };
}
