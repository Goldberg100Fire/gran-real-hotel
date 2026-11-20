import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCatalog, listReservationsByEmail } from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión con tu correo" }, { status: 401 });
  }

  const reservations = await listReservationsByEmail(user.email);
  const { roomTypes } = await getCatalog();
  return NextResponse.json({ reservations, roomTypes, user });
}
