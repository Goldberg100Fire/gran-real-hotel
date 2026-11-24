import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 64;

/** Hash con scrypt (salt aleatorio embebido). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(
  password: string,
  stored: string | undefined | null,
): boolean {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, salt, expected] = parts;
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, KEY_LEN);
  const expectedBuf = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Comparación dummy para no filtrar longitud de forma trivial
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Contraseña de arranque del jefe desde ADMIN_PASSWORD (texto o hash scrypt$).
 * Sirve en Vercel cuando aún no hay Firestore / passwordHash guardado.
 */
export function verifyBootstrapAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected || !password) return false;
  if (expected.startsWith("scrypt$")) {
    return verifyPassword(password, expected);
  }
  return timingSafeStringEqual(password, expected);
}

export function isBootstrapAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  if (password.length > 128) {
    return "La contraseña es demasiado larga";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Usa letras y al menos un número";
  }
  return null;
}
