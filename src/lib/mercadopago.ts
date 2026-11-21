import { createHmac, timingSafeEqual } from "crypto";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() &&
      process.env.MERCADOPAGO_PUBLIC_KEY?.trim(),
  );
}

/** Secret de firma del webhook (Mercado Pago → Webhooks). */
export function getMercadoPagoWebhookSecret(): string | null {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function isMercadoPagoWebhookReady(): boolean {
  return isMercadoPagoConfigured() && Boolean(getMercadoPagoWebhookSecret());
}

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN.");
  }
  return token;
}

export function getMercadoPagoPublicKey(): string {
  const key = process.env.MERCADOPAGO_PUBLIC_KEY?.trim();
  if (!key) {
    throw new Error("Falta MERCADOPAGO_PUBLIC_KEY.");
  }
  return key;
}

export type MercadoPagoPreference = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

export async function createCheckoutPreference(input: {
  title: string;
  description: string;
  amount: number;
  reservationId: string;
  reservationCode: string;
  payerEmail: string;
  successUrl: string;
  pendingUrl: string;
  failureUrl: string;
  notificationUrl: string;
}): Promise<MercadoPagoPreference> {
  const response = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: input.reservationId,
            title: input.title,
            description: input.description,
            quantity: 1,
            currency_id: "PEN",
            unit_price: Number(input.amount.toFixed(2)),
          },
        ],
        payer: {
          email: input.payerEmail,
        },
        external_reference: input.reservationId,
        metadata: {
          reservationId: input.reservationId,
          reservationCode: input.reservationCode,
        },
        back_urls: {
          success: input.successUrl,
          pending: input.pendingUrl,
          failure: input.failureUrl,
        },
        auto_return: "approved",
        notification_url: input.notificationUrl,
        statement_descriptor: "GRAN REAL HOTEL",
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mercado Pago no creó el pago: ${detail}`);
  }

  return (await response.json()) as MercadoPagoPreference;
}

export type MercadoPagoPayment = {
  id: number;
  status: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  metadata?: { reservationId?: string; reservationCode?: string };
};

export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPayment> {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo leer el pago: ${detail}`);
  }

  return (await response.json()) as MercadoPagoPayment;
}

/**
 * Valida x-signature de notificaciones Mercado Pago.
 * Manifest: id:[data.id];request-id:[x-request-id];ts:[ts];
 */
export function verifyMercadoPagoWebhookSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
}): boolean {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret || !input.signatureHeader || !input.requestId || !input.dataId) {
    return false;
  }

  const parts = Object.fromEntries(
    input.signatureHeader.split(",").map((chunk) => {
      const [key, value] = chunk.split("=").map((item) => item.trim());
      return [key, value];
    }),
  ) as { ts?: string; v1?: string };

  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(parts.v1, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
