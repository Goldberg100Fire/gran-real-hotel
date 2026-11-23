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
  const override = offer?.prices[roomType.id];
  if (typeof override === "number" && override > 0) {
    return { price: override, offer, basePrice: roomType.basePrice };
  }
  return { price: roomType.basePrice, offer: null, basePrice: roomType.basePrice };
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
