import { NextResponse } from "next/server";
import { sendReservationReceipt } from "@/lib/mail";
import { getStripe } from "@/lib/stripe";
import {
  confirmReservationPayment,
  getReservationById,
} from "@/lib/store";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook de Stripe no configurado" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Firma de webhook inválida";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservationId;

    if (reservationId) {
      const reservation = await confirmReservationPayment(reservationId);
      const detail = await getReservationById(reservation.id);
      if (detail) {
        try {
          await sendReservationReceipt(detail);
        } catch (error) {
          console.error("No se pudo enviar comprobante:", error);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
