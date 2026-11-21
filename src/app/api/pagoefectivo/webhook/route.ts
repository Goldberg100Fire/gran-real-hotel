import { NextResponse } from "next/server";
import { sendReservationReceipt } from "@/lib/mail";
import {
  extractCipFromWebhook,
  isPagoEfectivoConfigured,
  verifyPagoEfectivoWebhook,
} from "@/lib/pagoefectivo";
import {
  confirmReservationByCip,
  confirmReservationPayment,
  getReservationByCip,
  getReservationById,
} from "@/lib/store";

/**
 * Notificación de pago CIP.
 * Sin cuenta PagoEfectivo activa, no confirma reservas.
 */
export async function POST(request: Request) {
  if (!isPagoEfectivoConfigured()) {
    return NextResponse.json(
      { error: "PagoEfectivo aún no está activo para el hotel" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  if (!verifyPagoEfectivoWebhook(request, body)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const { cip, paid, transactionCode } = extractCipFromWebhook(body);
  if (!paid) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let reservation = cip ? await confirmReservationByCip(cip) : null;

  if (!reservation && transactionCode) {
    const byId = await getReservationById(transactionCode);
    if (byId?.reservation.cipCode) {
      reservation = await confirmReservationByCip(byId.reservation.cipCode);
    } else if (byId) {
      reservation = await confirmReservationPayment(byId.reservation.id);
    }
  }

  if (reservation?.cipCode) {
    const detail = await getReservationByCip(reservation.cipCode);
    if (detail) {
      try {
        await sendReservationReceipt(detail);
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
