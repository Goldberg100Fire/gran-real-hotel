import { NextResponse } from "next/server";

/** Login Google de huéspedes desactivado: reservas solo por teléfono. */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "El acceso con Google ya no está disponible. El personal entra por /personal.",
    },
    { status: 410 },
  );
}
