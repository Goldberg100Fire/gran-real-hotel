import { NextResponse } from "next/server";
import { createLoginCode, normalizeEmail } from "@/lib/auth";
import { sendLoginCodeEmail } from "@/lib/mail";
import { saveLoginCode } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    }

    const code = createLoginCode();
    await saveLoginCode(email, code);
    const mail = await sendLoginCodeEmail({ to: email, code });

    return NextResponse.json({
      ok: true,
      email,
      mailMode: mail.mode,
      // En modo demo devolvemos el código para poder probar sin Resend.
      demoCode: mail.mode === "demo" ? code : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo enviar el código";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
