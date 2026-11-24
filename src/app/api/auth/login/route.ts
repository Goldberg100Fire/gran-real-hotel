import { NextResponse } from "next/server";
import {
  AuthConfigError,
  buildSessionUser,
  isOwnerEmail,
  isStaffRole,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import {
  isBootstrapAdminPasswordConfigured,
  verifyBootstrapAdminPassword,
  verifyPassword,
} from "@/lib/passwords";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { getAuthorizedStaff } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    const ipLimit = checkRateLimit(
      clientKey(request, "staff-login"),
      20,
      15 * 60 * 1000,
    );
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${ipLimit.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios" },
        { status: 400 },
      );
    }

    const emailLimit = checkRateLimit(
      `staff-login:${email}`,
      12,
      15 * 60 * 1000,
    );
    if (!emailLimit.ok) {
      return NextResponse.json(
        {
          error: `Demasiados intentos con este correo. Espera ${emailLimit.retryAfterSec}s.`,
        },
        { status: 429 },
      );
    }

    const member = await getAuthorizedStaff(email);
    const invalid = () =>
      NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 },
      );

    if (!member) {
      return invalid();
    }

    const storedOk = Boolean(
      member.passwordHash && verifyPassword(password, member.passwordHash),
    );
    const bootstrapOk =
      isOwnerEmail(email) &&
      isBootstrapAdminPasswordConfigured() &&
      verifyBootstrapAdminPassword(password);

    // Sin filtrar: no password / no autorizado / mala clave → misma respuesta.
    if (!storedOk && !bootstrapOk) {
      return invalid();
    }

    const user = await buildSessionUser({
      email: member.email,
      name: member.name,
    });
    if (!isStaffRole(user.role)) {
      return invalid();
    }

    await setSessionCookie(user);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar sesión";
    const isConfig =
      /Firestore|FIREBASE_|ADMIN_SESSION_SECRET|variables de entorno/i.test(
        message,
      );
    return NextResponse.json(
      { error: message },
      { status: isConfig ? 503 : 400 },
    );
  }
}
