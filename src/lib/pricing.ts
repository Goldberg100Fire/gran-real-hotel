import type { PriceOffer, RoomType } from "./types";

function toDay(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function offerCoversDate(offer: PriceOffer, isoDate: string): boolean {
  if (!offer.active) return false;
  const day = toDay(isoDate);
  return day >= offer.startDate && day <= offer.endDate;
}

export function isOfferUpcoming(offer: PriceOffer, todayIso = todayInLima()): boolean {
  return offer.active && offer.startDate > todayIso;
}

export function isOfferCurrent(offer: PriceOffer, todayIso = todayInLima()): boolean {
  return offerCoversDate(offer, todayIso);
}

export function todayInLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Elige la oferta vigente para una fecha (prioridad, luego más reciente). */
export function pickOfferForDate(
  offers: PriceOffer[],
  isoDate: string,
): PriceOffer | null {
  const matches = offers
    .filter((offer) => offerCoversDate(offer, isoDate))
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  return matches[0] ?? null;
}

export function resolveNightlyPrice(
  roomType: RoomType,
  offers: PriceOffer[],
  isoDate: string,
): { price: number; offer: PriceOffer | null; basePrice: number } {
  const offer = pickOfferForDate(offers, isoDate);
  if (!offer) {
    return { price: roomType.basePrice, offer: null, basePrice: roomType.basePrice };
  }

  // Fiesta: el público ve el paquete; la "noche" de referencia es total/noches.
  if (offer.kind === "fiesta") {
    const packageTotal = offer.packagePrices?.[roomType.id];
    const nights = offer.packageNights ?? 0;
    if (typeof packageTotal === "number" && packageTotal > 0 && nights > 0) {
      return {
        price: Math.round(packageTotal / nights),
        offer,
        basePrice: roomType.basePrice,
      };
    }
  }

  // Oferta por descuento: muestra precio con descuento (1 noche de referencia).
  if (offer.kind === "oferta") {
    const percent = offer.discountPercent ?? 0;
    if (percent > 0) {
      const discounted = Math.max(
        1,
        Math.round(roomType.basePrice * (1 - percent / 100)),
      );
      return { price: discounted, offer, basePrice: roomType.basePrice };
    }
  }

  const override = offer.prices[roomType.id];
  if (typeof override === "number" && override > 0) {
    return { price: override, offer, basePrice: roomType.basePrice };
  }
  return { price: roomType.basePrice, offer: null, basePrice: roomType.basePrice };
}

/** Texto público resumido de una oferta. */
export function describeOfferForPublic(
  offer: PriceOffer,
  roomTypes: RoomType[],
): string {
  if (offer.kind === "oferta") {
    const nights = offer.minNights ?? 1;
    const percent = offer.discountPercent ?? 0;
    return `Desde ${nights} noche${nights === 1 ? "" : "s"}: ${percent}% de descuento sobre la tarifa habitual`;
  }
  if (offer.kind === "fiesta") {
    const nights = offer.packageNights ?? 0;
    const priced = roomTypes
      .map((type) => {
        const total = offer.packagePrices?.[type.id];
        return typeof total === "number" && total > 0
          ? `${type.name}`
          : null;
      })
      .filter(Boolean);
    return `Paquete de ${nights} noche${nights === 1 ? "" : "s"} · ${priced.length} tipos con tarifa especial`;
  }
  return "Tarifa especial por temporada";
}

export function listPublicOffers(
  offers: PriceOffer[],
  todayIso = todayInLima(),
): { current: PriceOffer[]; upcoming: PriceOffer[] } {
  const active = offers.filter((offer) => offer.active);
  return {
    current: active
      .filter((offer) => offerCoversDate(offer, todayIso))
      .sort((a, b) => b.priority - a.priority),
    upcoming: active
      .filter((offer) => offer.startDate > todayIso)
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  };
}

export function validateOfferDates(startDate: string, endDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return "Usa fechas en formato AAAA-MM-DD";
  }
  if (endDate < startDate) {
    return "La fecha de fin debe ser igual o posterior al inicio";
  }
  return null;
}
