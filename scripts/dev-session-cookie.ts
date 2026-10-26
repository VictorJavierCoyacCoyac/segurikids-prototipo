/**
 * Utilidad de desarrollo: imprime una cookie de sesión válida para una cuenta
 * demo, de modo que se puedan comprobar las páginas autenticadas con curl u
 * otras herramientas durante el desarrollo.
 *
 * Uso:  npx tsx scripts/dev-session-cookie.ts padre@demo.local
 *
 * Imprime el par `nombre=valor` listo para `curl -b`, con el nombre de cookie
 * que corresponde al área del rol (ver `src/lib/auth/session.ts`): cada área
 * tiene su propia cookie para permitir sesiones simultáneas.
 *
 * ⚠️ Solo para desarrollo local con datos ficticios.
 */
import { createHmac } from "node:crypto";

import { prisma } from "../src/lib/db";

async function main() {
  const email = process.argv[2] ?? "admin@demo.local";
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta SESSION_SECRET en el entorno.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No existe la cuenta ${email}.`);

  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, iat: Date.now() }),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  const area = user.role === "PARENT" ? "app" : user.role === "STAFF" ? "staff" : "admin";
  process.stdout.write(`sk_session_${area}=${payload}.${signature}\n`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
