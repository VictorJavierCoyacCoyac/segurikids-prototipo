import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/domain/roles";

/** Punto de entrada: cada rol aterriza directamente en su propia interfaz. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? ROLE_HOME[user.role] : "/login");
}
