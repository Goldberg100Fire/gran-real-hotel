import { NextResponse } from "next/server";
import { requireStaff, requireUser } from "@/lib/auth";
import { validateGuestDocument } from "@/lib/document";
import { sendReservationReceipt } from "@/lib/mail";
import {
  createReservation,
  getCatalog,
  listReservations,
} from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

const PAYMENT_METHODS: PaymentMethod[] = [
  "tarjeta",
  "yape",
  "plin",
  "transferencia",
  "pago_en_hotel",
];

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const reservations = await listReservations();
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Inicia sesión con tu correo para reservar" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      roomTypeId,
      checkIn,
      checkOut,
      guests,
      guestName,
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

    const docCheck = validateGuestDocument(String(guestDocument));
    if (!docCheck.ok) {
      return NextResponse.json({ error: docCheck.error }, { status: 400 });
    }

    // Sesión de cliente: el documento debe coincidir con el vinculado a la cuenta
    if (user.role === "cliente" && user.document && user.document !== docCheck.document) {
      return NextResponse.json(
        {
          error:
            "El documento no coincide con el de tu cuenta. Un cliente solo puede usar un documento.",
        },
        { status: 400 },
      );
    }

    const reservation = await createReservation({
      roomTypeId,
      checkIn,
      checkOut,
      guests: Number(guests) || 1,
      guestName: String(guestName),
      guestEmail: user.email,
      guestPhone: String(guestPhone),
      guestDocument: docCheck.document,
      specialRequests: specialRequests ? String(specialRequests) : "",
      paymentMethod,
    });

    const { roomTypes } = await getCatalog();
    const roomType = roomTypes.find((type) => type.id === reservation.roomTypeId);
    let mail = null;
    if (roomType) {
      mail = await sendReservationReceipt({ reservation, roomType });
    }

    return NextResponse.json(
      {
        reservation,
        receipt: mail,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la reserva";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
