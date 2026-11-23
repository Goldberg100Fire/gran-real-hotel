import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { listReservations } from "@/lib/store";

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const reservations = await listReservations();
  return NextResponse.json({ reservations });
}

/** Reservas públicas desactivadas: solo por teléfono. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Las reservas solo se hacen por teléfono. Llama al hotel para confirmar tu estadía.",
    },
    { status: 410 },
  );
}
