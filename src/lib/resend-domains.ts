export type ResendDnsRecord = {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl?: string;
  status?: string;
  priority?: number;
};

export type ResendDomain = {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  region?: string;
  records?: ResendDnsRecord[];
};

function apiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("Falta RESEND_API_KEY en los secretos de Vercel.");
  }
  return key;
}

async function resendFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : text || `Error Resend ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export function normalizeDomainName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidDomainName(domain: string): boolean {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(
    domain,
  );
}

export async function listResendDomains(): Promise<ResendDomain[]> {
  const data = await resendFetch<{ data?: ResendDomain[] }>("/domains");
  return data.data ?? [];
}

export async function getResendDomain(id: string): Promise<ResendDomain> {
  return resendFetch<ResendDomain>(`/domains/${id}`);
}

export async function createResendDomain(name: string): Promise<ResendDomain> {
  const domain = normalizeDomainName(name);
  if (!isValidDomainName(domain)) {
    throw new Error("Dominio inválido. Ejemplo: granrealhotel.com");
  }
  if (
    domain.endsWith(".vercel.app") ||
    domain.endsWith(".edu.pe") ||
    domain === "resend.dev"
  ) {
    throw new Error(
      "Ese dominio no sirve para enviar (vercel.app / edu.pe / resend.dev). Usa un dominio propio que controles en DNS.",
    );
  }
  return resendFetch<ResendDomain>("/domains", {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
}

export async function verifyResendDomain(id: string): Promise<ResendDomain> {
  await resendFetch<{ object?: string }>(`/domains/${id}/verify`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return getResendDomain(id);
}

export function buildMailFrom(domain: string, displayName = "Gran Real Hotel") {
  const clean = normalizeDomainName(domain);
  return `${displayName} <noreply@${clean}>`;
}
