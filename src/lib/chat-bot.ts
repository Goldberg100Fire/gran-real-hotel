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

function mapsLine(): string {
  return `Ubicación en Google Maps: ${HOTEL.mapsUrl}`;
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
  const phones = `Cel. ${phoneMobile}${phoneLandline ? ` · Fijo ${phoneLandline}` : ""}`;

  if (!message) {
    return {
      reply: `Hola, soy el asistente de ${HOTEL.name} en ${city}. Puedo ayudarte con ubicación, habitaciones, precios, ofertas, cómo llegar y cómo reservar por teléfono.`,
      suggestions: [
        "¿Dónde quedan?",
        "¿Cómo reservo?",
        "Precios",
        "Habitaciones",
      ],
    };
  }

  if (
    includesAny(message, [
      "hola",
      "buenas",
      "buen dia",
      "buenos dias",
      "buenas tardes",
      "buenas noches",
      "hey",
      "saludos",
    ])
  ) {
    return {
      reply: `¡Hola! Bienvenido a ${HOTEL.name} (${HOTEL.stars}★) en ${city}. Pregúntame por ubicación, precios, habitaciones u ofertas. Las reservas se confirman solo por teléfono (${phoneMobile}).`,
      suggestions: ["Ubicación", "Reservar", "Precios", "Ofertas"],
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
      "maps",
      "google",
      "como llego",
      "address",
      "sede",
      "local",
    ])
  ) {
    return {
      reply: `Estamos en ${fullAddress}, ${branch?.country ?? HOTEL.country}. ${mapsLine()}. Si vienes de Trujillo u otra ciudad, llega a Otuzco y busca Calle Tacna Nº 542. ¿Necesitas el teléfono para preguntar cómo llegar?`,
      suggestions: ["Abrir mapa", "Teléfono", "Reservar", "Precios"],
    };
  }

  if (includesAny(message, ["abrir mapa", "ver mapa", "link mapa", "enlace mapa"])) {
    return {
      reply: `Aquí tienes la ubicación: ${HOTEL.mapsUrl}`,
      suggestions: ["Reservar", "Precios", "Habitaciones"],
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
      "numero",
    ])
  ) {
    return {
      reply: `Las reservas se hacen solo por teléfono (no hay reservas online). Llama al ${phones}. Al llamar ten a mano: fechas de ingreso y salida, cantidad de personas y tipo de habitación. Te confirmamos disponibilidad y el precio final.`,
      suggestions: ["Precios", "Habitaciones", "Ubicación", "Ofertas"],
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
      "descuento",
      "paquete",
    ])
  ) {
    return {
      reply: `Temporadas, ofertas y fiestas publicadas: ${offerSummary([...current, ...upcoming], roomTypes)}. Si no ves una oferta para tus fechas, aplica la tarifa habitual y te confirmamos al llamar.`,
      suggestions: ["Precios", "Reservar", "Habitaciones"],
    };
  }

  if (
    includesAny(message, ["precio", "cuesta", "tarifa", "cuanto", "costo", "soles", "barato"])
  ) {
    const habitual =
      roomTypes.length > 0
        ? `Tarifas habituales por noche: ${priceLines(roomTypes)}.`
        : "Consulta tarifas al llamar.";
    const special =
      current.length || upcoming.length
        ? ` Temporadas vigentes: ${offerSummary([...current, ...upcoming], roomTypes)}.`
        : "";
    return {
      reply: `${habitual}${special} El precio final depende de fechas y tipo de habitación; se confirma al llamar al ${phoneMobile}.`,
      suggestions: ["Ofertas", "Reservar", "Habitaciones", "Ubicación"],
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
      "capacidad",
      "persona",
      "huesped",
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
              return `${type.name}: ${type.description} · hasta ${type.maxGuests} personas · ${formatMoney(type.basePrice)}/noche${extras ? ` · incluye: ${extras}` : ""}`;
            })
            .join(" | ")
        : "Tenemos Simple, Matrimonial, Doble, Familiar y Suite Matrimonial.";
    return {
      reply: `${detail}. En la web verás la foto de cada tipo. Para confirmar disponibilidad llama al ${phoneMobile}.`,
      suggestions: ["Precios", "Reservar", "Servicios", "Ubicación"],
    };
  }

  if (
    includesAny(message, [
      "servicio",
      "wifi",
      "wi fi",
      "internet",
      "bano",
      "agua",
      "tv",
      "incluye",
      "toalla",
      "armario",
      "estacionamiento",
      "parqueo",
      "desayuno",
      "mascota",
      "pet",
    ])
  ) {
    const services = context?.services ?? [];
    if (includesAny(message, ["estacionamiento", "parqueo"])) {
      return {
        reply: `Sobre estacionamiento o parqueo, consulta al llamar al ${phoneMobile}: depende de la sede y la ocupación del día.`,
        suggestions: ["Reservar", "Ubicación", "Habitaciones"],
      };
    }
    if (includesAny(message, ["desayuno"])) {
      return {
        reply: `El desayuno no se publica como servicio fijo en la web. Pregunta al reservar por teléfono (${phoneMobile}) si hay opciones cerca o convenios.`,
        suggestions: ["Reservar", "Servicios", "Ubicación"],
      };
    }
    if (includesAny(message, ["mascota", "pet"])) {
      return {
        reply: `La política de mascotas se confirma por teléfono según la habitación y la sede. Llama al ${phoneMobile} antes de viajar.`,
        suggestions: ["Reservar", "Habitaciones"],
      };
    }
    const catalog =
      services.length > 0
        ? `Servicios del hotel: ${services.map((s) => s.name).join(", ")}.`
        : "Baño privado, agua caliente, TV cable y Wi‑Fi son la base.";
    return {
      reply: `${catalog} Cada tipo de habitación puede incluir un conjunto distinto; revísalo en Habitaciones o al llamar.`,
      suggestions: ["Habitaciones", "Precios", "Reservar"],
    };
  }

  if (
    includesAny(message, [
      "horario",
      "check in",
      "checkin",
      "check out",
      "checkout",
      "hora",
      "llegada",
      "salida",
    ])
  ) {
    return {
      reply: `El horario de ingreso (check-in) y salida (check-out) se confirma al reservar por teléfono, según la fecha y la ocupación. Llama al ${phoneMobile} y te indicamos la hora exacta.`,
      suggestions: ["Reservar", "Teléfono", "Ubicación"],
    };
  }

  if (
    includesAny(message, [
      "pago",
      "yape",
      "efectivo",
      "tarjeta",
      "cip",
      "transferencia",
      "adelanto",
      "señal",
      "senal",
    ])
  ) {
    return {
      reply: `Las formas de pago (efectivo, Yape, transferencia u otras) se acuerdan al confirmar la reserva por teléfono. No hay pagos ni reservas online en esta página. Contacto: ${phones}.`,
      suggestions: ["Reservar", "Precios", "Ubicación"],
    };
  }

  if (
    includesAny(message, [
      "estrellas",
      "categoria",
      "hotel",
      "que es",
      "quienes son",
      "acerca",
      "sobre",
    ])
  ) {
    return {
      reply: `${HOTEL.name} es un hotel de ${HOTEL.stars} estrellas en ${city}, ${HOTEL.region}. ${HOTEL.tagline}. Dirección: ${fullAddress}. ${mapsLine()}. Reservas solo por teléfono: ${phoneMobile}.`,
      suggestions: ["Habitaciones", "Precios", "Ubicación", "Reservar"],
    };
  }

  if (includesAny(message, ["nino", "niño", "bebes", "bebe", "familia", "menores"])) {
    return {
      reply: `Recibimos familias. La capacidad depende del tipo (Familiar u otras). Al llamar indica cuántos adultos y niños viajan para recomendarte la habitación adecuada. Tel: ${phoneMobile}.`,
      suggestions: ["Habitaciones", "Precios", "Reservar"],
    };
  }

  if (includesAny(message, ["gracias", "chao", "adios", "hasta luego", "ok gracias"])) {
    return {
      reply: `¡Con gusto! Si quieres reservar, llama al ${phoneMobile}. ${mapsLine()}. Que tengas un buen día.`,
      suggestions: ["Reservar", "Ubicación"],
    };
  }

  return {
    reply: `Puedo ayudarte con: ubicación y mapa, habitaciones y fotos, precios, ofertas/fiestas, servicios, horarios y cómo reservar por teléfono (${phoneMobile}). ¿Qué te gustaría saber?`,
    suggestions: [
      "¿Dónde quedan?",
      "¿Cómo reservo?",
      "Precios",
      "Habitaciones",
      "Ofertas",
    ],
  };
}
