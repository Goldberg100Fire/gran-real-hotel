import { NextResponse } from "next/server";
import { sendReservationReceipt } from "@/lib/mail";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import {
  confirmReservationPayment,
  getReservationById,
} from "@/lib/store";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let paymentId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      "";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      paymentId =
        paymentId ||
        String(body?.data?.id || body?.id || body?.resource || "");
      if (!paymentId && typeof body?.resource === "string") {
        const match = body.resource.match(/\/payments\/(\d+)/);
        if (match) paymentId = match[1];
      }
    }

    if (!paymentId || paymentId === "undefined") {
      // Mercado Pago a veces hace pings sin id; respondemos 200.
      return NextResponse.json({ ok: true });
    }

    const payment = await getMercadoPagoPayment(paymentId);
    if (payment.status === "approved") {
      const reservationId =
        payment.metadata?.reservationId || payment.external_reference;

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Mercado Pago:", error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET(request: Request) {
  // Algunos entornos validan el endpoint con GET.
  return POST(request);
}
