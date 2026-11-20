import { HOTEL_NAME } from "./seed";
import { formatDate, formatMoney } from "./format";
import {
  PAYMENT_METHOD_LABELS,
  type Reservation,
  type RoomType,
} from "./types";

async function persistOutbox(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  mode: "resend" | "demo";
  delivered: boolean;
}) {
  const { appendMailOutbox } = await import("./store");
  return appendMailOutbox(input);
}

export type SendMailResult = {
  delivered: boolean;
  mode: "resend" | "demo";
  messageId: string;
};

async function deliverWithResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendMailResult | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const from =
    process.env.MAIL_FROM || `${HOTEL_NAME} <reservas@brisapacifico.pe>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo enviar el correo: ${detail}`);
  }

  const data = (await response.json()) as { id?: string };
  return {
    delivered: true,
    mode: "resend",
    messageId: data.id || `resend-${Date.now()}`,
  };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendMailResult> {
  try {
    const resend = await deliverWithResend(input);
    if (resend) {
      await persistOutbox({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        mode: "resend",
        delivered: true,
      });
      return resend;
    }
  } catch (error) {
    console.error("Fallo Resend, guardando en bandeja demo:", error);
  }

  const saved = await persistOutbox({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    mode: "demo",
    delivered: false,
  });

  return {
    delivered: false,
    mode: "demo",
    messageId: saved.id,
  };
}

export function buildReservationReceipt(input: {
  reservation: Reservation;
  roomType: RoomType;
}): { subject: string; html: string; text: string } {
  const { reservation, roomType } = input;
  const subject = `Comprobante ${reservation.code} · ${HOTEL_NAME}`;
  const text = [
    `${HOTEL_NAME}`,
    `Comprobante de reserva ${reservation.code}`,
    ``,
    `Huésped: ${reservation.guestName}`,
    `Correo: ${reservation.guestEmail}`,
    `Habitación: ${roomType.name}`,
    `Ingreso: ${formatDate(reservation.checkIn)}`,
    `Salida: ${formatDate(reservation.checkOut)}`,
    `Noches: ${reservation.nights}`,
    `Huéspedes: ${reservation.guests}`,
    `Pago: ${PAYMENT_METHOD_LABELS[reservation.paymentMethod]} (${reservation.paymentStatus})`,
    `Total: ${formatMoney(reservation.totalAmount)}`,
    reservation.specialRequests
      ? `Pedidos: ${reservation.specialRequests}`
      : "",
    ``,
    `Presenta este código en recepción: ${reservation.code}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <div style="font-family:Georgia,serif;background:#f4fafb;padding:24px;color:#12343f">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #c9dde3">
      <div style="background:linear-gradient(135deg,#0b3d4a,#1a6b7a);color:#fff;padding:28px 24px">
        <p style="margin:0;letter-spacing:.2em;font-size:12px;text-transform:uppercase;opacity:.8">Comprobante de reserva</p>
        <h1 style="margin:8px 0 0;font-size:28px">${HOTEL_NAME}</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:18px;margin:0 0 16px">Hola ${reservation.guestName},</p>
        <p style="margin:0 0 20px;line-height:1.5">Tu reserva quedó confirmada. Guarda este correo como comprobante.</p>
        <div style="background:#e7f2f4;border-radius:14px;padding:16px;margin-bottom:20px">
          <p style="margin:0;font-size:13px;color:#5d7380">Código</p>
          <p style="margin:4px 0 0;font-size:28px;letter-spacing:.08em">${reservation.code}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#5d7380">Habitación</td><td style="padding:8px 0;text-align:right"><strong>${roomType.name}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#5d7380">Ingreso</td><td style="padding:8px 0;text-align:right">${formatDate(reservation.checkIn)}</td></tr>
          <tr><td style="padding:8px 0;color:#5d7380">Salida</td><td style="padding:8px 0;text-align:right">${formatDate(reservation.checkOut)}</td></tr>
          <tr><td style="padding:8px 0;color:#5d7380">Noches / huéspedes</td><td style="padding:8px 0;text-align:right">${reservation.nights} · ${reservation.guests}</td></tr>
          <tr><td style="padding:8px 0;color:#5d7380">Pago</td><td style="padding:8px 0;text-align:right">${PAYMENT_METHOD_LABELS[reservation.paymentMethod]}</td></tr>
          <tr><td style="padding:8px 0;color:#5d7380">Total</td><td style="padding:8px 0;text-align:right;font-size:18px"><strong>${formatMoney(reservation.totalAmount)}</strong></td></tr>
        </table>
        <p style="margin:24px 0 0;font-size:13px;color:#5d7380">Presenta el código en recepción al momento del check-in.</p>
      </div>
    </div>
  </div>`;

  return { subject, html, text };
}

export async function sendLoginCodeEmail(input: {
  to: string;
  code: string;
}): Promise<SendMailResult> {
  const subject = `Tu código de acceso · ${HOTEL_NAME}`;
  const text = `Tu código de acceso es ${input.code}. Válido por 10 minutos.`;
  const html = `
  <div style="font-family:Georgia,serif;padding:24px;color:#12343f">
    <h2>${HOTEL_NAME}</h2>
    <p>Tu código de acceso es:</p>
    <p style="font-size:32px;letter-spacing:.2em"><strong>${input.code}</strong></p>
    <p style="color:#5d7380">Válido por 10 minutos.</p>
  </div>`;
  return sendEmail({ to: input.to, subject, html, text });
}

export async function sendReservationReceipt(input: {
  reservation: Reservation;
  roomType: RoomType;
}): Promise<SendMailResult> {
  const content = buildReservationReceipt(input);
  return sendEmail({
    to: input.reservation.guestEmail,
    ...content,
  });
}
