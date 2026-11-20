import { NextResponse } from "next/server";
import { getAppOrigin, requireUser } from "@/lib/auth";
import { validateGuestDocument } from "@/lib/document";
import { HOTEL } from "@/lib/hotel-info";
import {
  createCheckoutPreference,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";
import { createReservation, getCatalog } from "@/lib/store";

export async function POST(request: Request) {
  try {
    if (!isMercadoPagoConfigured()) {
      return NextResponse.json(
        {
          error:
            "Pagos no configurados. Agrega MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY.",
        },
        { status: 503 },
      );
    }

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
    } = body ?? {};

    if (
      !roomTypeId ||
      !checkIn ||
      !checkOut ||
      !guestName ||
      !guestPhone ||
      !guestDocument
    ) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios de la reserva" },
        { status: 400 },
      );
    }

    const docCheck = validateGuestDocument(String(guestDocument));
    if (!docCheck.ok) {
      return NextResponse.json({ error: docCheck.error }, { status: 400 });
    }
    if (user.role === "cliente" && !user.document) {
      return NextResponse.json(
        { error: "Completa tu documento de identidad antes de pagar" },
        { status: 400 },
      );
    }
    if (
      user.role === "cliente" &&
      user.document &&
      user.document !== docCheck.document
    ) {
      return NextResponse.json(
        {
          error:
            "El documento no coincide con el de tu cuenta. Un cliente = un documento.",
        },
        { status: 400 },
      );
    }

    const reservation = await createReservation({
      roomTypeId: String(roomTypeId),
      checkIn: String(checkIn),
      checkOut: String(checkOut),
      guests: Number(guests) || 1,
      guestName: String(guestName),
      guestEmail: user.email,
      guestPhone: String(guestPhone),
      guestDocument: docCheck.document,
      specialRequests: specialRequests ? String(specialRequests) : "",
      paymentMethod: "yape",
      paymentStatus: "pendiente",
      status: "pendiente",
    });

    const { roomTypes } = await getCatalog();
    const roomType = roomTypes.find((type) => type.id === reservation.roomTypeId);
    if (!roomType) {
      return NextResponse.json(
        { error: "Tipo de habitación no encontrado" },
        { status: 400 },
      );
    }

    const origin = getAppOrigin(request);
    const preference = await createCheckoutPreference({
      title: `${HOTEL.name} · ${roomType.name}`,
      description: `${reservation.checkIn} → ${reservation.checkOut} · ${reservation.nights} noche(s) · ${reservation.code}`,
      amount: reservation.totalAmount,
      reservationId: reservation.id,
      reservationCode: reservation.code,
      payerEmail: user.email,
      successUrl: `${origin}/reservar/exito?code=${reservation.code}`,
      pendingUrl: `${origin}/reservar/exito?code=${reservation.code}&pending=1`,
      failureUrl: `${origin}/reservar?cancelado=1&tipo=${reservation.roomTypeId}`,
      notificationUrl: `${origin}/api/mercadopago/webhook`,
    });

    const checkoutUrl =
      preference.init_point || preference.sandbox_init_point || null;

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Mercado Pago no devolvió URL de pago" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      reservation,
      checkoutUrl,
      preferenceId: preference.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar el pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
