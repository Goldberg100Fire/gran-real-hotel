import { NextResponse } from "next/server";

/** Verificación OTP de huéspedes/personal deshabilitada. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "El acceso del personal es con correo y contraseña. Ve a /personal.",
    },
    { status: 410 },
  );
}
