import { cookies } from "next/headers";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

const COOKIE_NAME = "hotel_user_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  email: string;
  name: string;
  isAdmin: boolean;
};

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    "brisa-dev-session"
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS || "admin@brisapacifico.pe";
  return raw
    .split(/[,;\s]+/)
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(normalizeEmail(email));
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
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
      isAdmin: user.isAdmin,
      exp: expiresAt,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(
  token: string | undefined | null,
): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      email: string;
      name: string;
      isAdmin: boolean;
      exp: number;
    };
    if (!data.email || !Number.isFinite(data.exp) || data.exp < Date.now()) {
      return null;
    }
    return {
      email: normalizeEmail(data.email),
      name: data.name || data.email,
      isAdmin: Boolean(data.isAdmin) && isAdminEmail(data.email),
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return parseSessionToken(jar.get(COOKIE_NAME)?.value);
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

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return null;
  return user;
}

export function createLoginCode(): string {
  return String(randomInt(100000, 999999));
}

export function getAppOrigin(request: Request): string {
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "127.0.0.1:3451";
  return `${proto}://${host}`;
}
