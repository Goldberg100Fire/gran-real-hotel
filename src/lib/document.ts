/** Normaliza y valida documento de identidad del huésped (Perú). */

export function normalizeDocument(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s.\-_/]/g, "");
}

export function validateGuestDocument(raw: string): {
  ok: true;
  document: string;
  kind: "dni" | "pasaporte" | "ce";
} | {
  ok: false;
  error: string;
} {
  const document = normalizeDocument(raw);
  if (!document) {
    return { ok: false, error: "El documento de identidad es obligatorio" };
  }
  if (document.length < 8 || document.length > 15) {
    return {
      ok: false,
      error: "El documento debe tener entre 8 y 15 caracteres",
    };
  }

  // DNI Perú: 8 dígitos
  if (/^\d{8}$/.test(document)) {
    return { ok: true, document, kind: "dni" };
  }

  // Carné de extranjería: 9–12 alfanumérico típico
  if (/^[A-Z0-9]{9,12}$/.test(document) && /\d/.test(document)) {
    return { ok: true, document, kind: "ce" };
  }

  // Pasaporte: letras + números
  if (/^[A-Z0-9]{8,15}$/.test(document) && /[A-Z]/.test(document)) {
    return { ok: true, document, kind: "pasaporte" };
  }

  return {
    ok: false,
    error:
      "Documento inválido. Usa DNI (8 dígitos), carné de extranjería o pasaporte.",
  };
}
