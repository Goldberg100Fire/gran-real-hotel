import { NextResponse } from "next/server";
import { sendReservationReceipt } from "@/lib/mail";
import {
  extractCipFromWebhook,
  isPagoEfectivoConfigured,
  verifyPagoEfectivoWebhook,
} from "@/lib/pagoefectivo";
import {
  confirmReservationByCip,
  getReservationByCip,
  getReservationById,
} from "@/lib/store";

/**
 * Notificación de pago CIP.
 * Solo acepta firmas válidas; compara monto con la reserva.
 */
export async function POST(request: Request) {
  if (!isPagoEfectivoConfigured()) {
    return NextResponse.json(
      { error: "PagoEfectivo aún no está activo para el hotel" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  if (!verifyPagoEfectivoWebhook(request, raw)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { cip, paid, transactionCode, amount } = extractCipFromWebhook(body);
  if (!paid) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let detail = cip ? await getReservationByCip(cip) : null;
  if (!detail && transactionCode) {
    detail = await getReservationById(transactionCode);
  }

  if (!detail) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  if (amount == null || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: "El webhook no incluye el monto pagado" },
      { status: 400 },
    );
  }

  const expected = Number(detail.reservation.totalAmount);
  if (Math.abs(amount - expected) > 0.05) {
    console.error("Monto CIP no coincide", {
      cip,
      amount,
      expected,
      reservationId: detail.reservation.id,
    });
    return NextResponse.json(
      { error: "Monto de pago no coincide con la reserva" },
      { status: 400 },
    );
  }

  if (detail.reservation.paymentStatus === "pagado") {
    return NextResponse.json({ ok: true, already: true });
  }

  if (!detail.reservation.cipCode) {
    return NextResponse.json(
      { error: "La reserva no tiene CIP asociado" },
      { status: 400 },
    );
  }

  const reservation = await confirmReservationByCip(detail.reservation.cipCode);
  if (reservation) {
    const confirmed = await getReservationByCip(reservation.cipCode || "");
    if (confirmed) {
      try {
        await sendReservationReceipt(confirmed);
      } catch (error) {
        console.error("Comprobante post-CIP:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    ready: isPagoEfectivoConfigured(),
  });
}
