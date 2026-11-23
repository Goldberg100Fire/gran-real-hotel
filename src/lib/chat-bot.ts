import { HOTEL } from "./hotel-info";

export type ChatReply = {
  reply: string;
  suggestions?: string[];
};

const PRICES = {
  simple: 80,
  matrimonial: 120,
  doble: 140,
} as const;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Bot de consultas públicas del hotel (sin login).
 * Responde con información fija del establecimiento.
 */
export function answerHotelQuestion(rawMessage: string): ChatReply {
  const message = normalize(rawMessage);

  if (!message) {
    return {
      reply: `Hola, soy el asistente de ${HOTEL.name}. Puedo ayudarte con habitaciones, precios, ubicación o cómo reservar.`,
      suggestions: ["¿Cómo reservo?", "Precios", "Ubicación", "Habitaciones"],
    };
  }

  if (includesAny(message, ["hola", "buenas", "buen dia", "buenos dias", "hey"])) {
    return {
      reply: `¡Hola! Bienvenido a ${HOTEL.name} en ${HOTEL.city}. ¿En qué te ayudo?`,
      suggestions: ["Reservar", "Habitaciones", "Precios", "Teléfono"],
    };
  }

  if (
    includesAny(message, [
      "reserv",
      "disponib",
      "ocupad",
      "llamar",
      "telefono",
      "celular",
      "whatsapp",
      "contacto",
    ])
  ) {
    return {
      reply: `Las reservas se hacen solo por teléfono. Llama al celular ${HOTEL.phoneMobile} o al fijo ${HOTEL.phoneLandline}. Te confirmamos disponibilidad y te guiamos en la reserva.`,
      suggestions: ["Precios", "Habitaciones", "Ubicación"],
    };
  }

  if (includesAny(message, ["precio", "cuesta", "tarifa", "cuanto", "costo", "soles"])) {
    return {
      reply: `Tarifas referenciales por noche: Simple S/ ${PRICES.simple}, Matrimonial S/ ${PRICES.matrimonial} y Doble S/ ${PRICES.doble}. El precio final se confirma al llamar.`,
      suggestions: ["Reservar", "Habitaciones", "Servicios"],
    };
  }

  if (
    includesAny(message, [
      "habitacion",
      "simple",
      "matrimonial",
      "doble",
      "cama",
      "tipos",
    ])
  ) {
    return {
      reply:
        "Tenemos tres tipos: Simple (1 persona), Matrimonial (cama matrimonial, hasta 2 huéspedes) y Doble (2 camas individuales). Todas incluyen baño privado, agua caliente, TV cable y Wi‑Fi.",
      suggestions: ["Precios", "Reservar", "Servicios"],
    };
  }

  if (
    includesAny(message, [
      "donde",
      "ubicacion",
      "direccion",
      "otuzco",
      "llegar",
      "mapa",
      "address",
    ])
  ) {
    return {
      reply: `Estamos en ${HOTEL.fullAddress}, ${HOTEL.country}.`,
      suggestions: ["Reservar", "Teléfono", "Habitaciones"],
    };
  }

  if (
    includesAny(message, [
      "servicio",
      "wifi",
      "wi fi",
      "bano",
      "agua",
      "tv",
      "incluye",
    ])
  ) {
    return {
      reply:
        "En cada habitación: baño privado, agua caliente, TV cable y Wi‑Fi. Si necesitas algo más, consulta al personal al momento de reservar.",
      suggestions: ["Precios", "Reservar", "Ubicación"],
    };
  }

  if (includesAny(message, ["horario", "check in", "checkin", "check out", "checkout", "hora"])) {
    return {
      reply:
        "El horario de ingreso y salida se confirma al reservar por teléfono. Llámanos y te indicamos según tu fecha.",
      suggestions: ["Reservar", "Teléfono"],
    };
  }

  if (includesAny(message, ["pago", "yape", "efectivo", "tarjeta", "cip", "transferencia"])) {
    return {
      reply:
        "Las formas de pago se acuerdan al confirmar la reserva por teléfono. No hay reservas ni pagos online en esta página.",
      suggestions: ["Reservar", "Precios"],
    };
  }

  if (includesAny(message, ["gracias", "chao", "adios", "hasta luego"])) {
    return {
      reply: `¡Con gusto! Si quieres reservar, llama al ${HOTEL.phoneMobile}. Que tengas un buen día.`,
    };
  }

  return {
    reply: `Puedo ayudarte con habitaciones, precios, ubicación y reservas por teléfono (${HOTEL.phoneMobile}). ¿Qué te gustaría saber?`,
    suggestions: ["¿Cómo reservo?", "Precios", "Ubicación", "Habitaciones"],
  };
}
