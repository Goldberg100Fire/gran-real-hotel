import { NextResponse } from "next/server";

/** Callback Google desactivado junto con el login de huéspedes. */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "El acceso con Google ya no está disponible. El personal entra por /personal.",
    },
    { status: 410 },
  );
}
