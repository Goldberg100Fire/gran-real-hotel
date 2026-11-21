import { NextResponse } from "next/server";
import { sendReservationReceipt } from "@/lib/mail";
import {
  getMercadoPagoPayment,
  isMercadoPagoWebhookReady,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago";
import {
  confirmReservationPayment,
  getReservationById,
} from "@/lib/store";

/**
 * Webhook de Mercado Pago.
 * Mientras el dueño no active pagos (token + secreto de firma),
 * este endpoint NO confirma reservas: responde 503.
 */
export async function POST(request: Request) {
  if (!isMercadoPagoWebhookReady()) {
    return NextResponse.json(
      {
        error:
          "Pagos en línea aún no activos. Se configurarán cuando el dueño cree la cuenta de Mercado Pago.",
      },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    let paymentId =
      url.searchParams.get("data.id") || url.searchParams.get("id") || "";

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
      return NextResponse.json({ ok: true });
    }

    const signatureHeader = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id");
    const valid = verifyMercadoPagoWebhookSignature({
      signatureHeader,
      requestId,
      dataId: paymentId,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Firma de webhook inválida" },
        { status: 401 },
      );
    }

    const payment = await getMercadoPagoPayment(paymentId);
    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true, status: payment.status });
    }

    const reservationId =
      payment.metadata?.reservationId || payment.external_reference;
    if (!reservationId) {
      return NextResponse.json({ ok: true, skipped: "sin_reserva" });
    }

    const detail = await getReservationById(reservationId);
    if (!detail) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const paidAmount = Number(payment.transaction_amount ?? 0);
    const expected = Number(detail.reservation.totalAmount);
    if (
      !Number.isFinite(paidAmount) ||
      Math.abs(paidAmount - expected) > 0.01
    ) {
      console.error("Monto de pago no coincide con la reserva", {
        reservationId,
        paidAmount,
        expected,
      });
      return NextResponse.json(
        { error: "Monto de pago no coincide" },
        { status: 400 },
      );
    }

    if (detail.reservation.paymentStatus === "pagado") {
      return NextResponse.json({ ok: true, already: true });
    }

    const reservation = await confirmReservationPayment(reservationId);
    const confirmed = await getReservationById(reservation.id);
    if (confirmed) {
      try {
        await sendReservationReceipt(confirmed);
      } catch (error) {
        console.error("No se pudo enviar comprobante:", error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Mercado Pago:", error);
    return NextResponse.json({ error: "Error de webhook" }, { status: 500 });
  }
}

export async function GET() {
  // No procesar pagos por GET (evita confirmaciones accidentales / sondeos).
  if (!isMercadoPagoWebhookReady()) {
    return NextResponse.json(
      { error: "Pagos en línea aún no activos" },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, ready: true });
}
