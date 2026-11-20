import { NextResponse } from "next/server";
import { getAppOrigin, requireUser } from "@/lib/auth";
import { HOTEL } from "@/lib/hotel-info";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createReservation, getCatalog } from "@/lib/store";

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Pagos no configurados. Agrega STRIPE_SECRET_KEY y STRIPE_PUBLISHABLE_KEY.",
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

    const reservation = await createReservation({
      roomTypeId: String(roomTypeId),
      checkIn: String(checkIn),
      checkOut: String(checkOut),
      guests: Number(guests) || 1,
      guestName: String(guestName),
      guestEmail: user.email,
      guestPhone: String(guestPhone),
      guestDocument: String(guestDocument),
      specialRequests: specialRequests ? String(specialRequests) : "",
      paymentMethod: "tarjeta",
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
    const stripe = getStripe();
    const amountCents = Math.round(reservation.totalAmount * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "pen",
            unit_amount: amountCents,
            product_data: {
              name: `${HOTEL.name} · ${roomType.name}`,
              description: `${reservation.checkIn} → ${reservation.checkOut} · ${reservation.nights} noche(s) · Código ${reservation.code}`,
            },
          },
        },
      ],
      metadata: {
        reservationId: reservation.id,
        reservationCode: reservation.code,
      },
      success_url: `${origin}/reservar/exito?code=${reservation.code}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/reservar?cancelado=1&tipo=${reservation.roomTypeId}`,
    });

    return NextResponse.json({
      reservation,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar el pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
