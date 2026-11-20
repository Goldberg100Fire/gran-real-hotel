import { NextResponse } from "next/server";
import {
  AuthConfigError,
  isAdminEmail,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { consumeLoginCode } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const code = String(body.code ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Correo y código son obligatorios" },
        { status: 400 },
      );
    }

    const ok = await consumeLoginCode(email, code);
    if (!ok) {
      return NextResponse.json(
        { error: "Código inválido o vencido" },
        { status: 401 },
      );
    }

    const user = {
      email,
      name: name || email.split("@")[0],
      isAdmin: isAdminEmail(email),
    };
    await setSessionCookie(user);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo verificar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
