import { cookies } from "next/headers";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { StaffMember, StaffRole, UserRole } from "@/lib/types";

const COOKIE_NAME = "hotel_user_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
  /** true si es jefe o empleado (acceso al panel) */
  isAdmin: boolean;
  /** Documento vinculado (solo clientes) */
  document?: string;
};

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new AuthConfigError(
      "Falta ADMIN_SESSION_SECRET (mínimo 32 caracteres). Configúralo en los secretos del entorno.",
    );
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Correos del dueño/jefe definidos en secretos (arranque seguro). */
export function getOwnerEmails(): string[] {
  const raw =
    process.env.ADMIN_OWNER_EMAILS || process.env.ADMIN_ALLOWED_EMAILS || "";
  return raw
    .split(/[,;\s]+/)
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export function isOwnerEmail(email: string): boolean {
  const owners = getOwnerEmails();
  if (owners.length === 0) return false;
  return owners.includes(normalizeEmail(email));
}

/** @deprecated usar isOwnerEmail / resolveUserRole */
export function isAdminEmail(email: string): boolean {
  return isOwnerEmail(email);
}

export function isStaffRole(role: UserRole): boolean {
  return role === "jefe" || role === "empleado";
}

export function canManageStaff(role: UserRole): boolean {
  return role === "jefe";
}

export function canEditPricing(role: UserRole): boolean {
  return role === "jefe";
}

export function canCreateRooms(role: UserRole): boolean {
  return role === "jefe";
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isEmailAuthConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

export function createSessionToken(user: SessionUser): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({
      email: normalizeEmail(user.email),
      name: user.name,
      role: user.role,
      document: user.document || undefined,
      exp: expiresAt,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function coerceRole(value: unknown): UserRole {
  if (value === "jefe" || value === "empleado" || value === "cliente") {
    return value;
  }
  return "cliente";
}

export function parseSessionToken(
  token: string | undefined | null,
): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  try {
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      email: string;
      name: string;
      role?: UserRole;
      isAdmin?: boolean;
      document?: string;
      exp: number;
    };
    if (!data.email || !Number.isFinite(data.exp) || data.exp < Date.now()) {
      return null;
    }

    // Compat: tokens viejos con isAdmin sin role
    let role = coerceRole(data.role);
    if (!data.role && data.isAdmin) {
      role = isOwnerEmail(data.email) ? "jefe" : "empleado";
    }

    return {
      email: normalizeEmail(data.email),
      name: data.name || data.email,
      role,
      isAdmin: isStaffRole(role),
      document: data.document ? String(data.document) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Resuelve el rol real al iniciar sesión (no confiar solo en la cookie).
 * Dueños del env > staff activo en base > cliente.
 */
export async function resolveUserRole(
  email: string,
  staffLookup?: (email: string) => Promise<StaffMember | null>,
): Promise<UserRole> {
  const normalized = normalizeEmail(email);
  if (isOwnerEmail(normalized)) return "jefe";

  if (staffLookup) {
    const member = await staffLookup(normalized);
    if (member?.active) return member.role;
  } else {
    const { getStaffByEmail } = await import("@/lib/store");
    const member = await getStaffByEmail(normalized);
    if (member?.active) return member.role;
  }

  return "cliente";
}

export async function buildSessionUser(input: {
  email: string;
  name: string;
  document?: string;
}): Promise<SessionUser> {
  const email = normalizeEmail(input.email);
  const role = await resolveUserRole(email);
  return {
    email,
    name: input.name || email.split("@")[0],
    role,
    isAdmin: isStaffRole(role),
    document: role === "cliente" ? input.document : undefined,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const parsed = parseSessionToken(jar.get(COOKIE_NAME)?.value);
    if (!parsed) return null;

    // Revalidar rol de personal (revocación inmediata si se desactiva)
    const liveRole = await resolveUserRole(parsed.email);
    if (isStaffRole(parsed.role) && liveRole === "cliente") {
      return null;
    }

    if (isStaffRole(liveRole)) {
      return {
        email: parsed.email,
        name: parsed.name,
        role: liveRole,
        isAdmin: true,
      };
    }

    return {
      email: parsed.email,
      name: parsed.name,
      role: "cliente",
      isAdmin: false,
      document: parsed.document,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Personal del hotel (jefe o empleado). */
export async function requireStaff(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}

/** @deprecated usar requireStaff */
export async function requireAdmin(): Promise<SessionUser | null> {
  return requireStaff();
}

/** Solo el jefe / dueño. */
export async function requireOwner(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "jefe") return null;
  return user;
}

export function createLoginCode(): string {
  return String(randomInt(100000, 999999));
}

export function getAppOrigin(request: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  // Sin APP_URL no confiamos en Host / X-Forwarded-* (riesgo de open redirect).
  // Solo permitimos loopback en desarrollo local.
  const host = (request.headers.get("host") || "").split(",")[0]?.trim() || "";
  const isLocal =
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]");
  if (process.env.NODE_ENV !== "production" && isLocal) {
    return `http://${host}`;
  }

  throw new AuthConfigError(
    "Falta APP_URL (URL pública de la app). Configúrala en los secretos antes de usar Google OAuth o pagos.",
  );
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/";
  // Solo rutas relativas internas; bloquea //evil.com, /\evil, protocol-relative, etc.
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  if (next.includes("://") || next.includes("@")) return "/";
  return next;
}

export function assertStaffRole(role: string): asserts role is StaffRole {
  if (role !== "jefe" && role !== "empleado") {
    throw new Error("Rol de personal inválido");
  }
}
