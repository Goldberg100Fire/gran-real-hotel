import { NextResponse } from "next/server";
import {
  AuthConfigError,
  createLoginCode,
  isEmailAuthConfigured,
  normalizeEmail,
} from "@/lib/auth";
import { sendLoginCodeEmail } from "@/lib/mail";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { saveLoginCode } from "@/lib/store";

export async function POST(request: Request) {
  try {
    if (!isEmailAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "El acceso por correo no está configurado. Usa Google o pide al administrador activar Resend.",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }

    const ipLimit = checkRateLimit(clientKey(request, "otp-request"), 8, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${ipLimit.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const emailLimit = checkRateLimit(`otp-request:${email}`, 5, 15 * 60 * 1000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: `Demasiados códigos para este correo. Espera ${emailLimit.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const code = createLoginCode();
    await saveLoginCode(email, code);
    await sendLoginCodeEmail({ to: email, code });

    return NextResponse.json({
      ok: true,
      email,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo enviar el código";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
