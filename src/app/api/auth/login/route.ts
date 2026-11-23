import { NextResponse } from "next/server";
import {
  AuthConfigError,
  buildSessionUser,
  isStaffRole,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  getAuthorizedStaff,
  isStaffResetAuthorized,
} from "@/lib/store";

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

    // Misma respuesta genérica si no existe / no autorizado / mala clave.
    if (!member) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 },
      );
    }

    if (!member.passwordHash) {
      return NextResponse.json({
        needsSetup: true,
        email: member.email,
        message:
          "Es tu primer acceso. Crea tu contraseña para entrar al panel.",
      });
    }

    if (!verifyPassword(password, member.passwordHash)) {
      if (isStaffResetAuthorized(member)) {
        return NextResponse.json({
          needsReset: true,
          email: member.email,
          message:
            "El jefe autorizó un cambio de contraseña. Define una nueva.",
        });
      }
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 },
      );
    }

    const user = await buildSessionUser({
      email: member.email,
      name: member.name,
    });
    if (!isStaffRole(user.role)) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 },
      );
    }

    await setSessionCookie(user);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar sesión";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
