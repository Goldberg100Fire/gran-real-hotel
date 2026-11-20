import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createReservation, listReservations } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

const PAYMENT_METHODS: PaymentMethod[] = [
  "tarjeta",
  "yape",
  "plin",
  "transferencia",
  "pago_en_hotel",
];

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const reservations = await listReservations();
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomTypeId,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      guestDocument,
      specialRequests,
      paymentMethod,
    } = body ?? {};

    if (
      !roomTypeId ||
      !checkIn ||
      !checkOut ||
      !guestName ||
      !guestEmail ||
      !guestPhone ||
      !guestDocument ||
      !paymentMethod
    ) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios de la reserva" },
        { status: 400 },
      );
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Método de pago no válido" },
        { status: 400 },
      );
    }

    const reservation = await createReservation({
      roomTypeId,
      checkIn,
      checkOut,
      guests: Number(guests) || 1,
      guestName: String(guestName),
      guestEmail: String(guestEmail),
      guestPhone: String(guestPhone),
      guestDocument: String(guestDocument),
      specialRequests: specialRequests ? String(specialRequests) : "",
      paymentMethod,
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la reserva";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
