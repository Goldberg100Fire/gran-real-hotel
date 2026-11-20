import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password ?? "");

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 },
    );
  }

  await setAdminSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
