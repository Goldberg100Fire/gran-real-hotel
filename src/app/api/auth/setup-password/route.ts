import { NextResponse } from "next/server";
import {
  AuthConfigError,
  buildSessionUser,
  isStaffRole,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { validatePasswordStrength } from "@/lib/passwords";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  getAuthorizedStaff,
  isStaffResetAuthorized,
  setStaffPassword,
} from "@/lib/store";

/**
 * Primer acceso (sin contraseña) o cambio autorizado por el jefe.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const confirm = String(body.confirm ?? "");

    const ipLimit = checkRateLimit(
      clientKey(request, "staff-setup"),
      10,
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
    if (password !== confirm) {
      return NextResponse.json(
        { error: "Las contraseñas no coinciden" },
        { status: 400 },
      );
    }

    const strength = validatePasswordStrength(password);
    if (strength) {
      return NextResponse.json({ error: strength }, { status: 400 });
    }

    const member = await getAuthorizedStaff(email);
    if (!member) {
      return NextResponse.json(
        { error: "Este correo no está autorizado por el jefe" },
        { status: 403 },
      );
    }

    const firstSetup = !member.passwordHash;
    const authorizedReset = isStaffResetAuthorized(member);
    if (!firstSetup && !authorizedReset) {
      return NextResponse.json(
        {
          error:
            "Ya tienes contraseña. Si la olvidaste, pide al jefe que autorice la recuperación.",
        },
        { status: 403 },
      );
    }

    await setStaffPassword(email, password);
    const user = await buildSessionUser({
      email: member.email,
      name: member.name,
    });
    if (!isStaffRole(user.role)) {
      return NextResponse.json(
        { error: "Este correo no está autorizado" },
        { status: 403 },
      );
    }

    await setSessionCookie(user);
    return NextResponse.json({ user, created: firstSetup });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo guardar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
