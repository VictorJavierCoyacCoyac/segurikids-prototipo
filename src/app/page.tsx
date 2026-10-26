import { redirect } from "next/navigation";

import { listSessions } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/domain/roles";

/**
 * Punto de entrada.
 *
 * Con una sola sesión abierta se entra directamente a su interfaz. Con varias
 * (tutor y docente en el mismo navegador) no se puede adivinar cuál se quiere,
 * así que se muestra la pantalla de acceso, que las lista.
 */
export default async function RootPage() {
  const sessions = await listSessions();
  if (sessions.length === 1) redirect(ROLE_HOME[sessions[0]!.role]);
  redirect("/login");
}
