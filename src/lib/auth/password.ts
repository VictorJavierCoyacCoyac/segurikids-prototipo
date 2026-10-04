import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Hashing de contraseñas del PROTOTIPO.
 *
 * ⚠️ DEMO: SHA-256 sin salt ni factor de coste. Es suficiente para no guardar
 * contraseñas en claro en la base de datos de demostración, pero NO es
 * aceptable en producción.
 *
 * ANTES DE PRODUCCIÓN: sustituir por bcrypt/argon2id con salt por usuario,
 * política de complejidad, bloqueo por intentos fallidos y 2FA para
 * administración. La firma de estas funciones está pensada para que el cambio
 * sea local a este archivo.
 */
export function hashPassword(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function verifyPassword(plain: string, hash: string): boolean {
  const candidate = Buffer.from(hashPassword(plain), "utf8");
  const expected = Buffer.from(hash, "utf8");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
