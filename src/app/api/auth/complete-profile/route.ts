import { NextResponse } from "next/server";
import {
  AuthConfigError,
  getSessionUser,
  isStaffRole,
  setSessionCookie,
} from "@/lib/auth";
import { validateGuestDocument } from "@/lib/document";
import { bindGuestIdentity } from "@/lib/store";

/** Completa DNI/pasaporte para clientes (p. ej. tras Google). */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
    }
    if (isStaffRole(user.role)) {
      return NextResponse.json({ user });
    }

    const body = await request.json();
    const document = String(body.document ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const name = String(body.name ?? user.name).trim();

    const validated = validateGuestDocument(document);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const guest = await bindGuestIdentity({
      email: user.email,
      name,
      phone,
      document: validated.document,
    });

    const nextUser = {
      ...user,
      name: guest.name,
      document: guest.document,
      role: "cliente" as const,
      isAdmin: false,
    };
    await setSessionCookie(nextUser);
    return NextResponse.json({ user: nextUser });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No se pudo completar el perfil";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
