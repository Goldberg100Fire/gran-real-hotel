import { NextResponse } from "next/server";

/** Mis reservas online desactivado: no hay sesión de huésped. */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Las reservas se gestionan por teléfono. Ya no hay acceso de huéspedes en línea.",
    },
    { status: 410 },
  );
}
