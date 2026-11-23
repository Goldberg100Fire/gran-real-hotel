import { NextResponse } from "next/server";

/** Checkout online desactivado: reservas solo por teléfono. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Las reservas solo se hacen por teléfono. Llama al hotel para confirmar tu estadía.",
    },
    { status: 410 },
  );
}
