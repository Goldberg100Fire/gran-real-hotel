export function isMercadoPagoConfigured(): boolean {
  return Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() &&
      process.env.MERCADOPAGO_PUBLIC_KEY?.trim(),
  );
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

export async function getMercadoPagoPayment(paymentId: string) {
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

  return (await response.json()) as {
    id: number;
    status: string;
    external_reference?: string;
    metadata?: { reservationId?: string; reservationCode?: string };
  };
}
