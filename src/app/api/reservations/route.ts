import { NextResponse } from "next/server";
import { canManageStaff, requireStaff } from "@/lib/auth";
import { redactReservationForStaff } from "@/lib/privacy";
import { listReservations } from "@/lib/store";

export async function GET() {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const fullAccess = canManageStaff(user.role);
  const reservations = await listReservations();
  return NextResponse.json({
    reservations: reservations.map((reservation) =>
      redactReservationForStaff(reservation, fullAccess),
    ),
  });
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
