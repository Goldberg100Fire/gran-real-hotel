import { formatDate, formatMoney } from "./format";
import { HOTEL } from "./hotel-info";
import {
  describeOfferForPublic,
  listPublicOffers,
  todayInLima,
} from "./pricing";
import type { HotelBranch, PriceOffer, RoomType, Service } from "./types";

export type ChatReply = {
  reply: string;
  suggestions?: string[];
};

export type ChatContext = {
  roomTypes: RoomType[];
  priceOffers: PriceOffer[];
  services?: Service[];
  branch?: HotelBranch | null;
};

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

function priceLines(roomTypes: RoomType[]): string {
  return roomTypes
    .map((type) => `${type.name} ${formatMoney(type.basePrice)}`)
    .join(", ");
}

function offerSummary(offers: PriceOffer[], roomTypes: RoomType[]): string {
  if (offers.length === 0) {
    return "Ahora no hay ofertas ni paquetes de fiesta publicados; aplica la tarifa habitual.";
  }
  return offers
    .map((offer) => {
      const detail = describeOfferForPublic(offer, roomTypes);
      if (offer.kind === "fiesta" && offer.packagePrices) {
        const prices = roomTypes
          .map((type) => {
            const total = offer.packagePrices?.[type.id];
            return total
              ? `${type.name} ${formatMoney(total)} (${offer.packageNights} noches)`
              : null;
          })
          .filter(Boolean)
          .join(", ");
        return `${offer.title} (${formatDate(offer.startDate)} al ${formatDate(offer.endDate)}): ${detail}. ${prices}`;
      }
      if (offer.kind === "oferta") {
        return `${offer.title} (${formatDate(offer.startDate)} al ${formatDate(offer.endDate)}): ${detail}`;
      }
      const prices = roomTypes
        .map((type) =>
          offer.prices[type.id]
            ? `${type.name} ${formatMoney(offer.prices[type.id])}`
            : null,
        )
        .filter(Boolean)
        .join(", ");
      return `${offer.title} (${formatDate(offer.startDate)} al ${formatDate(offer.endDate)}): ${prices || detail}`;
    })
    .join(" · ");
}

/**
 * Bot de consultas públicas del hotel (sin login).
 */
export function answerHotelQuestion(
  rawMessage: string,
  context?: ChatContext,
): ChatReply {
  const message = normalize(rawMessage);
  const roomTypes = context?.roomTypes ?? [];
  const priceOffers = context?.priceOffers ?? [];
  const branch = context?.branch;
  const city = branch?.city ?? HOTEL.city;
  const phoneMobile = branch?.phoneMobile ?? HOTEL.phoneMobile;
  const phoneLandline = branch?.phoneLandline || HOTEL.phoneLandline;
  const fullAddress = branch?.fullAddress ?? HOTEL.fullAddress;
  const { current, upcoming } = listPublicOffers(priceOffers, todayInLima());

  if (!message) {
    return {
      reply: `Hola, soy el asistente de ${HOTEL.name}. Puedo ayudarte con habitaciones, precios, fiestas o cómo reservar.`,
      suggestions: ["¿Cómo reservo?", "Precios", "Ofertas", "Ubicación"],
    };
  }

  if (includesAny(message, ["hola", "buenas", "buen dia", "buenos dias", "hey"])) {
    return {
      reply: `¡Hola! Bienvenido a ${HOTEL.name} en ${city}. ¿En qué te ayudo?`,
      suggestions: ["Reservar", "Habitaciones", "Precios", "Ofertas"],
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
      reply: `Las reservas se hacen solo por teléfono. Llama al celular ${phoneMobile}${phoneLandline ? ` o al fijo ${phoneLandline}` : ""}. Te confirmamos disponibilidad y tarifa según las fechas.`,
      suggestions: ["Precios", "Ofertas", "Habitaciones"],
    };
  }

  if (
    includesAny(message, [
      "oferta",
      "fiesta",
      "temporada",
      "feriado",
      "semana santa",
      "navidad",
      "año nuevo",
      "ano nuevo",
      "patronal",
    ])
  ) {
    return {
      reply: `Temporadas y fiestas: ${offerSummary([...current, ...upcoming], roomTypes)}`,
      suggestions: ["Precios", "Reservar", "Habitaciones"],
    };
  }

  if (includesAny(message, ["precio", "cuesta", "tarifa", "cuanto", "costo", "soles"])) {
    const habitual =
      roomTypes.length > 0
        ? `Tarifas habituales por noche: ${priceLines(roomTypes)}.`
        : "Consulta tarifas al llamar.";
    const special =
      current.length || upcoming.length
        ? ` Temporadas: ${offerSummary([...current, ...upcoming], roomTypes)}`
        : "";
    return {
      reply: `${habitual}${special} El precio final se confirma al llamar.`,
      suggestions: ["Ofertas", "Reservar", "Habitaciones"],
    };
  }

  if (
    includesAny(message, [
      "habitacion",
      "simple",
      "matrimonial",
      "doble",
      "familiar",
      "suite",
      "cama",
      "tipos",
      "foto",
    ])
  ) {
    const services = context?.services ?? [];
    const detail =
      roomTypes.length > 0
        ? roomTypes
            .map((type) => {
              const extras = services
                .filter((service) => type.serviceIds.includes(service.id))
                .map((service) => service.name)
                .join(", ");
              return `${type.name}: ${type.description} (${formatMoney(type.basePrice)}/noche${extras ? `; servicios: ${extras}` : ""})`;
            })
            .join(" ")
        : "Tenemos Simple, Matrimonial, Doble, Familiar y Suite Matrimonial.";
    return {
      reply: `${detail} En la web también verás la foto de cada tipo.`,
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
      reply: `Estamos en ${fullAddress}, ${branch?.country ?? HOTEL.country}.`,
      suggestions: ["Reservar", "Precios", "Habitaciones"],
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
      "toalla",
      "armario",
    ])
  ) {
    const services = context?.services ?? [];
    const catalog =
      services.length > 0
        ? `Catálogo de servicios: ${services.map((s) => s.name).join(", ")}.`
        : "Baño privado, agua caliente, TV cable y Wi‑Fi son la base.";
    return {
      reply: `${catalog} Cada tipo de habitación puede incluir un conjunto distinto; revísalo en Habitaciones o al llamar.`,
      suggestions: ["Habitaciones", "Precios", "Reservar"],
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
      reply: `¡Con gusto! Si quieres reservar, llama al ${phoneMobile}. Que tengas un buen día.`,
    };
  }

  return {
    reply: `Puedo ayudarte con habitaciones, precios, fiestas y reservas por teléfono (${phoneMobile}). ¿Qué te gustaría saber?`,
    suggestions: ["¿Cómo reservo?", "Precios", "Ofertas", "Habitaciones"],
  };
}
