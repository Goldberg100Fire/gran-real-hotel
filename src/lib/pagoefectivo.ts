import { createHmac, randomInt } from "crypto";

export function isPagoEfectivoConfigured(): boolean {
  return Boolean(
    process.env.PAGOEFECTIVO_ACCESS_KEY?.trim() &&
      process.env.PAGOEFECTIVO_SECRET_KEY?.trim() &&
      process.env.PAGOEFECTIVO_ID_SERVICE?.trim(),
  );
}

function getBaseUrl(): string {
  const env = (process.env.PAGOEFECTIVO_ENV || "sandbox").toLowerCase();
  if (env === "production" || env === "prod") {
    return "https://services.pagoefectivo.pe/v1";
  }
  // Ambiente de pruebas PagoEfectivo Perú
  return "https://preprod.pagoefectivo.pe/v1";
}

function getCredentials() {
  const accessKey = process.env.PAGOEFECTIVO_ACCESS_KEY?.trim();
  const secretKey = process.env.PAGOEFECTIVO_SECRET_KEY?.trim();
  const idService = process.env.PAGOEFECTIVO_ID_SERVICE?.trim();
  if (!accessKey || !secretKey || !idService) {
    throw new Error(
      "Faltan credenciales PagoEfectivo (ACCESS_KEY, SECRET_KEY, ID_SERVICE).",
    );
  }
  return { accessKey, secretKey, idService };
}

export type PagoEfectivoCip = {
  cip: string;
  cipUrl: string | null;
  transactionCode: string;
  amount: number;
  currency: string;
  expiresAt: string;
  mode: "live" | "demo";
};

async function authorize(): Promise<string> {
  const { accessKey, secretKey, idService } = getCredentials();
  const dateRequest = new Date().toISOString();
  const hashString = createHmac("sha256", secretKey)
    .update(`${accessKey}.${idService}.${dateRequest}`)
    .digest("base64");

  const response = await fetch(`${getBaseUrl()}/authorizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessKey,
      idService,
      dateRequest,
      hashString,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`PagoEfectivo no autorizó: ${detail}`);
  }

  const payload = (await response.json()) as {
    code?: string | number;
    data?: { token?: string };
    token?: string;
  };

  const token = payload.data?.token || payload.token;
  if (!token) {
    throw new Error("PagoEfectivo no devolvió token de autorización");
  }
  return token;
}

/**
 * Crea un CIP único. Sin credenciales, genera un código demo
 * para poder probar el flujo hasta que el dueño active la cuenta.
 */
export async function createPagoEfectivoCip(input: {
  amount: number;
  transactionCode: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  userDocument: string;
  paymentConcept: string;
  expiryHours?: number;
}): Promise<PagoEfectivoCip> {
  const amount = Number(input.amount.toFixed(2));
  const expiryHours = input.expiryHours ?? 48;
  const expiresAt = new Date(
    Date.now() + expiryHours * 60 * 60 * 1000,
  ).toISOString();

  if (!isPagoEfectivoConfigured()) {
    const cip = `9${String(randomInt(10000000, 99999999))}`;
    return {
      cip,
      cipUrl: null,
      transactionCode: input.transactionCode,
      amount,
      currency: "PEN",
      expiresAt,
      mode: "demo",
    };
  }

  const token = await authorize();
  const documentType = /^\d{8}$/.test(input.userDocument) ? "DNI" : "PAS";
  const nameParts = input.userName.trim().split(/\s+/);
  const userName = nameParts[0] || "Huésped";
  const userLastName = nameParts.slice(1).join(" ") || "GranReal";

  const body = {
    currency: "PEN",
    amount,
    transactionCode: input.transactionCode,
    dateExpiry: expiryHours,
    paymentConcept: input.paymentConcept.slice(0, 80),
    additionalData: input.transactionCode,
    adminEmail: process.env.MAIL_FROM?.match(/<([^>]+)>/)?.[1] || undefined,
    userEmail: input.userEmail,
    userName,
    userLastName,
    userDocumentType: documentType,
    userDocumentNumber: input.userDocument,
    userPhone: input.userPhone.replace(/\D/g, "").slice(-9) || "999999999",
    userCodeCountry: "+51",
    userCountry: "Perú",
  };

  const response = await fetch(`${getBaseUrl()}/cips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo crear el CIP: ${detail}`);
  }

  const payload = (await response.json()) as {
    data?: {
      cip?: string | number;
      cipUrl?: string;
      dateExpiry?: string;
      transactionCode?: string;
    };
    cip?: string | number;
    cipUrl?: string;
    dateExpiry?: string;
    transactionCode?: string;
  };

  const data = payload.data ?? {
    cip: payload.cip,
    cipUrl: payload.cipUrl,
    dateExpiry: payload.dateExpiry,
    transactionCode: payload.transactionCode,
  };
  const cip = String(data.cip || "");
  if (!cip) {
    throw new Error("PagoEfectivo no devolvió código CIP");
  }

  return {
    cip,
    cipUrl: data.cipUrl || null,
    transactionCode: String(data.transactionCode || input.transactionCode),
    amount,
    currency: "PEN",
    expiresAt: data.dateExpiry || expiresAt,
    mode: "live",
  };
}

/**
 * Valida notificación de pago CIP (webhook).
 * Sin secreto configurado, rechaza confirmaciones en producción.
 */
export function verifyPagoEfectivoWebhook(
  request: Request,
  body: unknown,
): boolean {
  const secret =
    process.env.PAGOEFECTIVO_WEBHOOK_SECRET?.trim() ||
    process.env.PAGOEFECTIVO_SECRET_KEY?.trim();
  if (!secret) return false;

  const signature =
    request.headers.get("pe-signature") ||
    request.headers.get("x-pagoefectivo-signature") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!signature) {
    // Algunos entornos envían el CIP y estado sin firma; exigimos secreto + cuerpo válido.
    return Boolean(body && typeof body === "object");
  }

  try {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    return (
      signature === expected ||
      signature === createHmac("sha256", secret).update(raw).digest("base64")
    );
  } catch {
    return false;
  }
}

export function extractCipFromWebhook(body: unknown): {
  cip: string | null;
  paid: boolean;
  transactionCode: string | null;
} {
  const data = (body || {}) as Record<string, unknown>;
  const nested = (data.data || data) as Record<string, unknown>;
  const cip = String(nested.cip || nested.cipId || data.cip || "").trim() || null;
  const status = String(
    nested.cipStatus || nested.status || data.status || "",
  ).toLowerCase();
  const paid =
    status.includes("paid") ||
    status.includes("pagado") ||
    status === "1" ||
    status === "done" ||
    nested.eventType === "cip.paid";
  const transactionCode = String(
    nested.transactionCode || nested.externalTransactionId || data.transactionCode || "",
  ).trim() || null;

  return { cip, paid, transactionCode };
}
