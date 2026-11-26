import { HOTEL } from "./hotel-info";
import { formatDate, formatMoney } from "./format";
import {
  PAYMENT_METHOD_LABELS,
  type Reservation,
  type RoomType,
} from "./types";

export type SendMailResult = {
  delivered: boolean;
  mode: "resend" | "demo";
  messageId: string;
};

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

/** Traduce errores técnicos de Resend a mensajes claros para el dueño. */
export function humanizeMailError(raw: unknown): string {
  const text =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : "No se pudo enviar el correo";

  if (/only send testing emails to your own email/i.test(text)) {
    return (
      "Resend está en modo prueba: solo puede enviar a tu propio correo. " +
      "Verifica un dominio en resend.com/domains y cambia MAIL_FROM a un correo de ese dominio. " +
      "Mientras tanto, comparte el código de acceso con el empleado manualmente."
    );
  }
  if (/domain is not verified|not verified/i.test(text)) {
    return (
      "El dominio de MAIL_FROM no está verificado en Resend. " +
      "Verifícalo en resend.com/domains o usa un remitente del dominio verificado."
    );
  }
  if (/RESEND_API_KEY|MAIL_FROM|Correo no configurado/i.test(text)) {
    return "El correo no está configurado (RESEND_API_KEY / MAIL_FROM).";
  }
  if (/No se pudo enviar el correo:/i.test(text)) {
    return text.replace(/^No se pudo enviar el correo:\s*/i, "").length > 180
      ? "No se pudo enviar el correo. Revisa Resend (dominio y MAIL_FROM)."
      : text;
  }
  return text;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "Correo no configurado. Define RESEND_API_KEY y MAIL_FROM en los secretos.",
    );
  }

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
    throw new Error(humanizeMailError(`No se pudo enviar el correo: ${detail}`));
  }

  const data = (await response.json()) as { id?: string };
  const messageId = data.id || `resend-${Date.now()}`;

  try {
    await persistOutbox({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      mode: "resend",
      delivered: true,
    });
  } catch (error) {
    // El correo ya salió; no fallar el login/OTP por el historial.
    console.error("No se pudo guardar el correo en el outbox:", error);
  }

  return { delivered: true, mode: "resend", messageId };
}

/** Guarda la invitación en Correos aunque Resend no la haya entregado. */
export async function recordUndeliveredInvite(input: {
  to: string;
  name: string;
  code: string;
  loginUrl: string;
  reason: string;
}) {
  const name = input.name.trim() || "equipo";
  const subject = `Crea tu acceso · ${HOTEL.name} (pendiente de envío)`;
  const text = [
    `Hola ${name},`,
    ``,
    `Te autorizaron como personal de ${HOTEL.name}.`,
    `Código: ${input.code}`,
    `Enlace: ${input.loginUrl}`,
    ``,
    `Motivo: ${input.reason}`,
    `Comparte este código con el empleado. Válido 10 minutos.`,
  ].join("\n");
  try {
    await persistOutbox({
      to: input.to,
      subject,
      html: `<pre style="font-family:Georgia,serif;white-space:pre-wrap">${text}</pre>`,
      text,
      mode: "demo",
      delivered: false,
    });
  } catch (error) {
    console.error("No se pudo guardar la invitación en el outbox:", error);
  }
}

export function buildReservationReceipt(input: {
  reservation: Reservation;
  roomType: RoomType;
}): { subject: string; html: string; text: string } {
  const { reservation, roomType } = input;
  const subject = `Comprobante ${reservation.code} · ${HOTEL.name}`;
  const text = [
    HOTEL.name,
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
    reservation.cipCode ? `CIP PagoEfectivo: ${reservation.cipCode}` : "",
    `Total: ${formatMoney(reservation.totalAmount)}`,
    reservation.specialRequests
      ? `Pedidos: ${reservation.specialRequests}`
      : "",
    ``,
    `Dirección: ${HOTEL.fullAddress}`,
    `Cel: ${HOTEL.phoneMobile} · Telf: ${HOTEL.phoneLandline}`,
    `Presenta este código en recepción: ${reservation.code}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <div style="font-family:Georgia,serif;background:#f7f3ef;padding:24px;color:#3d3129">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #d8cfc4">
      <div style="background:linear-gradient(135deg,#3d3129,#6b5344);color:#fff;padding:28px 24px">
        <p style="margin:0;letter-spacing:.2em;font-size:12px;text-transform:uppercase;opacity:.8">Comprobante de reserva</p>
        <h1 style="margin:8px 0 0;font-size:28px">${HOTEL.name}</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:18px;margin:0 0 16px">Hola ${reservation.guestName},</p>
        <p style="margin:0 0 20px;line-height:1.5">Tu reserva en Otuzco quedó confirmada. Guarda este correo como comprobante.</p>
        <div style="background:#f0e8df;border-radius:14px;padding:16px;margin-bottom:20px">
          <p style="margin:0;font-size:13px;color:#6b5344">Código de reserva</p>
          <p style="margin:4px 0 0;font-size:28px;letter-spacing:.08em">${reservation.code}</p>
          ${
            reservation.cipCode
              ? `<p style="margin:16px 0 0;font-size:13px;color:#6b5344">CIP PagoEfectivo</p>
          <p style="margin:4px 0 0;font-size:26px;letter-spacing:.12em"><strong>${reservation.cipCode}</strong></p>`
              : ""
          }
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6b5344">Habitación</td><td style="padding:8px 0;text-align:right"><strong>${roomType.name}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b5344">Ingreso</td><td style="padding:8px 0;text-align:right">${formatDate(reservation.checkIn)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b5344">Salida</td><td style="padding:8px 0;text-align:right">${formatDate(reservation.checkOut)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b5344">Noches / huéspedes</td><td style="padding:8px 0;text-align:right">${reservation.nights} · ${reservation.guests}</td></tr>
          <tr><td style="padding:8px 0;color:#6b5344">Pago</td><td style="padding:8px 0;text-align:right">${PAYMENT_METHOD_LABELS[reservation.paymentMethod]}</td></tr>
          <tr><td style="padding:8px 0;color:#6b5344">Total</td><td style="padding:8px 0;text-align:right;font-size:18px"><strong>${formatMoney(reservation.totalAmount)}</strong></td></tr>
        </table>
        <p style="margin:24px 0 0;font-size:13px;color:#6b5344">${HOTEL.fullAddress}<br/>Cel. ${HOTEL.phoneMobile} · Telf. ${HOTEL.phoneLandline}</p>
      </div>
    </div>
  </div>`;

  return { subject, html, text };
}

export async function sendLoginCodeEmail(input: {
  to: string;
  code: string;
}): Promise<SendMailResult> {
  const subject = `Tu código de acceso · ${HOTEL.name}`;
  const text = `Tu código de acceso es ${input.code}. Válido por 10 minutos.`;
  const html = `
  <div style="font-family:Georgia,serif;padding:24px;color:#3d3129">
    <h2>${HOTEL.name}</h2>
    <p>Tu código de acceso es:</p>
    <p style="font-size:32px;letter-spacing:.2em"><strong>${input.code}</strong></p>
    <p style="color:#6b5344">Válido por 10 minutos.</p>
  </div>`;
  return sendEmail({ to: input.to, subject, html, text });
}

/** Invitación al crear personal: código + enlace para crear contraseña. */
export async function sendStaffInviteEmail(input: {
  to: string;
  name: string;
  code: string;
  loginUrl: string;
}): Promise<SendMailResult> {
  const name = input.name.trim() || "equipo";
  const subject = `Crea tu acceso · ${HOTEL.name}`;
  const text = [
    `Hola ${name},`,
    ``,
    `Te autorizaron como personal de ${HOTEL.name}.`,
    `1) Entra a ${input.loginUrl}`,
    `2) Elige “Crear contraseña” / primer acceso`,
    `3) Usa tu correo y este código: ${input.code}`,
    `4) Define tu contraseña`,
    ``,
    `El código vale 10 minutos. Si venció, en la misma página puedes pedir otro.`,
  ].join("\n");
  const html = `
  <div style="font-family:Georgia,serif;background:#f7f3ef;padding:24px;color:#3d3129">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #d8cfc4">
      <div style="background:linear-gradient(135deg,#3d3129,#6b5344);color:#fff;padding:28px 24px">
        <p style="margin:0;letter-spacing:.2em;font-size:12px;text-transform:uppercase;opacity:.8">Personal autorizado</p>
        <h1 style="margin:8px 0 0;font-size:26px">${HOTEL.name}</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:18px;margin:0 0 12px">Hola ${name},</p>
        <p style="margin:0 0 16px;line-height:1.5">Te autorizaron para entrar al panel del hotel. Crea tu contraseña con este código:</p>
        <div style="background:#f0e8df;border-radius:14px;padding:16px;margin-bottom:20px;text-align:center">
          <p style="margin:0;font-size:13px;color:#6b5344">Código de acceso</p>
          <p style="margin:8px 0 0;font-size:32px;letter-spacing:.18em"><strong>${input.code}</strong></p>
          <p style="margin:10px 0 0;font-size:12px;color:#6b5344">Válido 10 minutos</p>
        </div>
        <p style="margin:0 0 8px;line-height:1.5">Entra aquí:</p>
        <p style="margin:0 0 20px"><a href="${input.loginUrl}" style="color:#3d3129;font-weight:700">${input.loginUrl}</a></p>
        <ol style="margin:0;padding-left:18px;line-height:1.6;color:#6b5344;font-size:14px">
          <li>Abre el enlace</li>
          <li>Elige crear contraseña / primer acceso</li>
          <li>Ingresa tu correo y el código</li>
          <li>Define tu contraseña</li>
        </ol>
      </div>
    </div>
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
