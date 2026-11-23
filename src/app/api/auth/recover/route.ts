import { NextResponse } from "next/server";
import {
  AuthConfigError,
  createLoginCode,
  isEmailAuthConfigured,
  isOwnerEmail,
  normalizeEmail,
} from "@/lib/auth";
import { sendLoginCodeEmail } from "@/lib/mail";
import { validatePasswordStrength } from "@/lib/passwords";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  consumeLoginCode,
  getAuthorizedStaff,
  requestStaffPasswordReset,
  saveLoginCode,
  setStaffPassword,
} from "@/lib/store";

/**
 * Recuperación del jefe (OTP por correo) o solicitud de empleado.
 * action: "jefe-request" | "jefe-confirm" | "empleado-request"
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const email = normalizeEmail(String(body.email ?? ""));

    const ipLimit = checkRateLimit(
      clientKey(request, "staff-recover"),
      12,
      15 * 60 * 1000,
    );
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${ipLimit.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    if (!email) {
      return NextResponse.json({ error: "Correo obligatorio" }, { status: 400 });
    }

    if (action === "empleado-request") {
      try {
        await requestStaffPasswordReset(email);
      } catch {
        // No revelar si el correo existe
      }
      return NextResponse.json({
        ok: true,
        message:
          "Si el correo está autorizado, el jefe verá tu solicitud y podrá autorizar el cambio.",
      });
    }

    if (action === "jefe-request") {
      if (!isEmailAuthConfigured()) {
        return NextResponse.json(
          {
            error:
              "La recuperación por correo no está configurada (Resend).",
          },
          { status: 503 },
        );
      }

      const member = await getAuthorizedStaff(email);
      const isJefe =
        member?.role === "jefe" || (member && isOwnerEmail(member.email));

      // Respuesta uniforme para no filtrar correos
      if (!isJefe || !member?.passwordHash) {
        return NextResponse.json({
          ok: true,
          message:
            "Si el correo es del jefe y tiene contraseña, enviamos un código.",
        });
      }

      const codeLimit = checkRateLimit(
        `staff-recover-jefe:${email}`,
        5,
        15 * 60 * 1000,
      );
      if (!codeLimit.ok) {
        return NextResponse.json(
          {
            error: `Demasiados códigos. Espera ${codeLimit.retryAfterSec}s.`,
          },
          { status: 429 },
        );
      }

      const code = createLoginCode();
      await saveLoginCode(email, code);
      await sendLoginCodeEmail({ to: email, code });
      return NextResponse.json({
        ok: true,
        needsCode: true,
        message: "Revisa tu correo: te enviamos un código de recuperación.",
      });
    }

    if (action === "jefe-confirm") {
      const code = String(body.code ?? "").trim();
      const password = String(body.password ?? "");
      const confirm = String(body.confirm ?? "");

      if (!code || !password) {
        return NextResponse.json(
          { error: "Código y nueva contraseña son obligatorios" },
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
      const isJefe =
        member?.role === "jefe" || (member && isOwnerEmail(member.email));
      if (!isJefe) {
        return NextResponse.json(
          { error: "Solo el jefe puede recuperar así" },
          { status: 403 },
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
      return NextResponse.json({
        ok: true,
        message: "Contraseña actualizada. Ya puedes iniciar sesión.",
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo recuperar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
