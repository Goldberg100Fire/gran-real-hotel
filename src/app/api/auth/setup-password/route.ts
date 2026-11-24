import { NextResponse } from "next/server";
import {
  AuthConfigError,
  buildSessionUser,
  createLoginCode,
  isEmailAuthConfigured,
  isStaffRole,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { sendLoginCodeEmail } from "@/lib/mail";
import { validatePasswordStrength } from "@/lib/passwords";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  consumeLoginCode,
  getAuthorizedStaff,
  isStaffResetAuthorized,
  saveLoginCode,
  setStaffPassword,
} from "@/lib/store";

const UNIFORM_REQUEST_MESSAGE =
  "Si tu correo está autorizado y puedes crear o restablecer la contraseña, te enviamos un código. Revisa tu bandeja.";

/**
 * Primer acceso o reset autorizado: siempre exige código OTP al correo.
 * action: "request" | "confirm"
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "confirm");
    const email = normalizeEmail(String(body.email ?? ""));

    const ipLimit = checkRateLimit(
      clientKey(request, "staff-setup"),
      12,
      15 * 60 * 1000,
    );
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${ipLimit.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }

    if (action === "request") {
      if (!isEmailAuthConfigured()) {
        return NextResponse.json(
          {
            error:
              "El correo no está configurado. No se puede verificar el acceso.",
          },
          { status: 503 },
        );
      }

      const emailLimit = checkRateLimit(
        `staff-setup-request:${email}`,
        5,
        15 * 60 * 1000,
      );
      if (!emailLimit.ok) {
        return NextResponse.json(
          {
            error: `Demasiados códigos. Espera ${emailLimit.retryAfterSec}s.`,
          },
          { status: 429 },
        );
      }

      const member = await getAuthorizedStaff(email);
      const canSetup =
        member &&
        (!member.passwordHash || isStaffResetAuthorized(member));

      // Respuesta uniforme: no filtrar si el correo existe.
      if (canSetup && member) {
        const code = createLoginCode();
        await saveLoginCode(email, code);
        try {
          await sendLoginCodeEmail({ to: email, code });
        } catch {
          // No revelar fallo de envío ligado a existencia del correo
        }
      }

      return NextResponse.json({
        ok: true,
        message: UNIFORM_REQUEST_MESSAGE,
      });
    }

    if (action === "confirm") {
      const code = String(body.code ?? "").trim();
      const password = String(body.password ?? "");
      const confirm = String(body.confirm ?? "");

      if (!code || !password) {
        return NextResponse.json(
          { error: "Código y contraseña son obligatorios" },
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
          { error: "Código inválido o correo no autorizado" },
          { status: 401 },
        );
      }

      const firstSetup = !member.passwordHash;
      const authorizedReset = isStaffResetAuthorized(member);
      if (!firstSetup && !authorizedReset) {
        return NextResponse.json(
          { error: "Código inválido o correo no autorizado" },
          { status: 401 },
        );
      }

      const ok = await consumeLoginCode(email, code);
      if (!ok) {
        return NextResponse.json(
          { error: "Código inválido o vencido" },
          { status: 401 },
        );
      }

      await setStaffPassword(email, password);
      const user = await buildSessionUser({
        email: member.email,
        name: member.name,
      });
      if (!isStaffRole(user.role)) {
        return NextResponse.json(
          { error: "Código inválido o correo no autorizado" },
          { status: 401 },
        );
      }

      await setSessionCookie(user);
      return NextResponse.json({ user, created: firstSetup });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo guardar";
    const isConfig =
      /Firestore|FIREBASE_|ADMIN_SESSION_SECRET|correo no está configurado|variables de entorno/i.test(
        message,
      );
    return NextResponse.json(
      { error: message },
      { status: isConfig ? 503 : 400 },
    );
  }
}
