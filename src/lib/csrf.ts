import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { AuthConfigError, getAppOrigin } from "@/lib/auth";

export const CSRF_COOKIE = "hotel_csrf";
export const CSRF_HEADER = "x-csrf-token";

function getCsrfSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new AuthConfigError(
      "Falta ADMIN_SESSION_SECRET para proteger formularios del panel.",
    );
  }
  return secret;
}

function signToken(nonce: string): string {
  return createHmac("sha256", getCsrfSecret()).update(nonce).digest("base64url");
}

export function createCsrfToken(): string {
  const nonce = randomBytes(24).toString("base64url");
  return `${nonce}.${signToken(nonce)}`;
}

export function isValidCsrfToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature) return false;
  try {
    const expected = signToken(nonce);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function ensureCsrfCookie(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CSRF_COOKIE)?.value;
  if (existing && isValidCsrfToken(existing)) {
    return existing;
  }

  const token = createCsrfToken();
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

function allowedOrigins(request: Request): string[] {
  const origins = new Set<string>();
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) origins.add(envUrl.replace(/\/$/, ""));

  try {
    origins.add(getAppOrigin(request));
  } catch {
    // APP_URL puede faltar en local; se valida loopback abajo.
  }

  const host = (request.headers.get("host") || "").split(",")[0]?.trim();
  if (
    host &&
    (host.startsWith("127.0.0.1") ||
      host.startsWith("localhost") ||
      host.startsWith("[::1]"))
  ) {
    origins.add(`http://${host}`);
  }

  return [...origins];
}

export function assertSameOrigin(request: Request): void {
  const allowed = allowedOrigins(request);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    const ok = allowed.some((base) => origin === base || origin.startsWith(`${base}/`));
    if (!ok) {
      throw new Error("Origen no permitido");
    }
    return;
  }

  if (referer) {
    const ok = allowed.some(
      (base) => referer === base || referer.startsWith(`${base}/`),
    );
    if (!ok) {
      throw new Error("Referer no permitido");
    }
    return;
  }

  // Sin Origin/Referer (algunos clientes): exigir al menos token CSRF válido.
}

export async function assertCsrf(request: Request): Promise<void> {
  assertSameOrigin(request);

  const headerToken = request.headers.get(CSRF_HEADER);
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;

  if (
    !headerToken ||
    !cookieToken ||
    !isValidCsrfToken(headerToken) ||
    !isValidCsrfToken(cookieToken)
  ) {
    throw new Error("Token CSRF inválido");
  }

  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Token CSRF no coincide");
  }
}

export function csrfErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Protección CSRF falló";
  return { error: message, status: 403 as const };
}
