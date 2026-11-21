import { NextResponse } from "next/server";
import {
  AuthConfigError,
  buildSessionUser,
  isStaffRole,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { validateGuestDocument } from "@/lib/document";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { bindGuestIdentity, consumeLoginCode, getGuestByEmail } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const code = String(body.code ?? "").trim();
    const name = String(body.name ?? "").trim();
    const documentRaw = String(body.document ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Correo y código son obligatorios" },
        { status: 400 },
      );
    }

    const ipLimit = checkRateLimit(clientKey(request, "otp-verify"), 20, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${ipLimit.retryAfterSec}s.` },
        { status: 429 },
      );
    }
    const emailLimit = checkRateLimit(`otp-verify:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos con este correo. Espera ${emailLimit.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const ok = await consumeLoginCode(email, code);
    if (!ok) {
      return NextResponse.json(
        { error: "Código inválido o vencido" },
        { status: 401 },
      );
    }

    const user = await buildSessionUser({
      email,
      name: name || email.split("@")[0],
    });

    // Clientes: documento de identidad obligatorio y único
    if (!isStaffRole(user.role)) {
      const existing = await getGuestByEmail(email);
      let document = documentRaw;

      if (!document && existing) {
        document = existing.document;
      }

      if (!document) {
        return NextResponse.json(
          {
            error:
              "Los clientes deben registrar su DNI, carné o pasaporte. Así tu cuenta queda vinculada a una sola identidad.",
          },
          { status: 400 },
        );
      }

      const validated = validateGuestDocument(document);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }

      const guest = await bindGuestIdentity({
        email,
        name: name || existing?.name || email.split("@")[0],
        phone: phone || existing?.phone || "",
        document: validated.document,
      });

      user.name = guest.name || user.name;
      user.document = guest.document;
    }

    await setSessionCookie(user);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo verificar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
