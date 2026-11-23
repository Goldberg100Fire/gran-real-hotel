import { NextResponse } from "next/server";

/** El personal ya no usa OTP para entrar; solo correo y contraseña. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "El acceso del personal es con correo y contraseña. Ve a /personal.",
    },
    { status: 410 },
  );
}
