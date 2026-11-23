import { NextResponse } from "next/server";

/** Perfil de huésped desactivado: no hay login de clientes. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Ya no hay perfiles de huésped en línea. Las reservas se hacen por teléfono.",
    },
    { status: 410 },
  );
}
