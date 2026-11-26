import nodemailer from "nodemailer";
import { HOTEL } from "./hotel-info";
import { formatDate, formatMoney } from "./format";
import {
  PAYMENT_METHOD_LABELS,
  type Reservation,
  type RoomType,
} from "./types";

export type SendMailResult = {
  delivered: boolean;
  mode: "resend" | "smtp" | "demo";
  messageId: string;
};

async function persistOutbox(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  mode: "resend" | "smtp" | "demo";
  delivered: boolean;
}) {
  const { appendMailOutbox } = await import("./store");
  return appendMailOutbox(input);
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim(),
  );
}

export function isResendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim(),
  );
}

/** Traduce errores técnicos de Resend/SMTP a mensajes claros para el dueño. */
export function humanizeMailError(raw: unknown): string {
  const text =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : "No se pudo enviar el correo";

  if (/only send testing emails to your own email/i.test(text)) {
    return (
      "Resend solo envía a tu propio correo sin dominio. " +
      "Configura SMTP_USER y SMTP_PASS (Gmail con contraseña de aplicación) para invitar empleados sin comprar dominio."
    );
  }
  if (/Invalid login|EAUTH|Username and Password not accepted/i.test(text)) {
    return (
      "Gmail rechazó el acceso. Usa una “contraseña de aplicación” (no la clave normal) en SMTP_PASS y activa 2 pasos en la cuenta."
    );
  }
  if (/domain is not verified|not verified/i.test(text)) {
    return (
      "El dominio de Resend no está verificado. Usa Gmail SMTP (SMTP_USER / SMTP_PASS) para enviar sin dominio."
    );
  }
  if (/Correo no configurado|SMTP_|RESEND_API_KEY|MAIL_FROM/i.test(text)) {
    return text;
  }
  if (/No se pudo enviar el correo:/i.test(text)) {
    return text.replace(/^No se pudo enviar el correo:\s*/i, "").length > 180
      ? "No se pudo enviar el correo. Revisa SMTP (Gmail) o Resend."
      : text;
  }
  return text;
}

async function resolveFromAddress(): Promise<string> {
  const { getResolvedMailFrom } = await import("./store");
  const resolved = await getResolvedMailFrom();
  if (resolved) return resolved;
  if (process.env.MAIL_FROM?.trim()) return process.env.MAIL_FROM.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  if (smtpUser) return `${HOTEL.name} <${smtpUser}>`;
  throw new Error(
    "Correo no configurado. Define SMTP_USER/SMTP_PASS (Gmail) o RESEND_API_KEY/MAIL_FROM.",
  );
}

async function sendWithSmtp(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
}): Promise<SendMailResult> {
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  // Gmail exige que el remitente sea la cuenta autenticada (no onboarding@resend.dev).
  const from = input.from.includes(user)
    ? input.from
    : `${HOTEL.name} <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  const messageId = info.messageId || `smtp-${Date.now()}`;
  try {
    await persistOutbox({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      mode: "smtp",
      delivered: true,
    });
  } catch (error) {
    console.error("No se pudo guardar el correo en el outbox:", error);
  }

  return { delivered: true, mode: "smtp", messageId };
}

async function sendWithResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
}): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
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
    console.error("No se pudo guardar el correo en el outbox:", error);
  }

  return { delivered: true, mode: "resend", messageId };
}

/**
 * Preferir Gmail/SMTP (sin dominio) y usar Resend solo si SMTP no está.
 * Si Resend falla por modo prueba y hay SMTP, no aplica: SMTP va primero.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendMailResult> {
  const from = await resolveFromAddress();

  if (isSmtpConfigured()) {
    try {
      return await sendWithSmtp({ ...input, from });
    } catch (error) {
      throw new Error(humanizeMailError(error));
    }
  }

  if (isResendConfigured()) {
    return sendWithResend({ ...input, from });
  }

  throw new Error(
    "Correo no configurado. Para invitar empleados sin dominio: define SMTP_USER y SMTP_PASS (Gmail con contraseña de aplicación).",
  );
}

/** Guarda la invitación en Correos aunque el envío falle. */
export async function recordUndeliveredInvite(input: {
  to: string;
  name: string;
  inviteUrl: string;
  reason: string;
}) {
  const name = input.name.trim() || "equipo";
  const subject = `Crea tu acceso · ${HOTEL.name} (pendiente de envío)`;
  const text = [
    `Hola ${name},`,
    ``,
    `Te autorizaron como personal de ${HOTEL.name}.`,
    `Abre este enlace para crear tu contraseña:`,
    input.inviteUrl,
    ``,
    `Motivo: ${input.reason}`,
    `El enlace vale 48 horas.`,
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

/** Invitación al crear personal: un solo enlace para crear la contraseña. */
export async function sendStaffInviteEmail(input: {
  to: string;
  name: string;
  inviteUrl: string;
}): Promise<SendMailResult> {
  const name = input.name.trim() || "equipo";
  const subject = `Crea tu cuenta · ${HOTEL.name}`;
  const text = [
    `Hola ${name},`,
    ``,
    `Te autorizaron como personal de ${HOTEL.name}.`,
    `Abre este enlace para crear tu contraseña:`,
    input.inviteUrl,
    ``,
    `El enlace vale 48 horas. Si ya lo usaste, entra con tu correo y contraseña en /personal.`,
  ].join("\n");
  const html = `
  <div style="font-family:Georgia,serif;background:#f7f3ef;padding:24px;color:#3d3129">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #d8cfc4">
      <div style="background:linear-gradient(135deg,#3d3129,#6b5344);color:#fff;padding:28px 24px">
        <p style="margin:0;letter-spacing:.2em;font-size:12px;text-transform:uppercase;opacity:.8">Invitación de personal</p>
        <h1 style="margin:8px 0 0;font-size:26px">${HOTEL.name}</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:18px;margin:0 0 12px">Hola ${name},</p>
        <p style="margin:0 0 20px;line-height:1.5">Te autorizaron para entrar al panel del hotel. Pulsa el botón y elige tu contraseña:</p>
        <p style="margin:0 0 24px;text-align:center">
          <a href="${input.inviteUrl}" style="display:inline-block;background:#3d3129;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700">
            Crear mi cuenta
          </a>
        </p>
        <p style="margin:0;font-size:13px;color:#6b5344;line-height:1.5">Si el botón no funciona, copia este enlace:<br/>
          <a href="${input.inviteUrl}" style="color:#3d3129;word-break:break-all">${input.inviteUrl}</a>
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#6b5344">Válido 48 horas · solo para ${input.to}</p>
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
