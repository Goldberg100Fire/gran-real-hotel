import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "hotel_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "brisa-admin";
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || getAdminPassword();
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const expected = Buffer.from(getAdminPassword());
  const received = Buffer.from(password);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `admin:${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiresAt = Number(payload.split(":")[1]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function setAdminSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return isValidAdminSessionToken(jar.get(COOKIE_NAME)?.value);
}

export function isUsingDemoAdminPassword(): boolean {
  return !process.env.ADMIN_PASSWORD;
}
