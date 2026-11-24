import { formatDate, formatMoney } from "@/lib/format";
import { describeOfferForPublic } from "@/lib/pricing";
import {
  PRICE_OFFER_KIND_LABELS,
  type PriceOffer,
  type RoomType,
} from "@/lib/types";

export function OffersSection({
  current,
  upcoming,
  roomTypes,
}: {
  current: PriceOffer[];
  upcoming: PriceOffer[];
  roomTypes: RoomType[];
}) {
  const offers = [...current, ...upcoming];
  if (offers.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
          Ofertas y fiestas
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-ink)] md:text-5xl">
          Ofertas vigentes
        </h2>
        <p className="mt-3 text-[var(--brand-muted)]">
          Descuentos por noches y paquetes de fiesta con días y costo definidos
          por el hotel. Confirma al llamar.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {offers.map((offer) => {
          const isCurrent = current.some((item) => item.id === offer.id);
          return (
            <article
              key={offer.id}
              className="rounded-[1.5rem] bg-white p-6 shadow-[0_22px_50px_-34px_rgba(44,36,30,0.45)] ring-1 ring-[var(--brand-line)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                {PRICE_OFFER_KIND_LABELS[offer.kind]}
                {isCurrent ? " · vigente" : " · próximo"}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
                {offer.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                {formatDate(offer.startDate)} → {formatDate(offer.endDate)}
              </p>
              <p className="mt-3 text-sm font-medium text-[var(--brand-ink)]">
                {describeOfferForPublic(offer, roomTypes)}
              </p>
              {offer.description && (
                <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
                  {offer.description}
                </p>
              )}

              {offer.kind === "oferta" && (
                <div className="mt-5 rounded-xl bg-[var(--brand-mist)] px-4 py-3 text-sm">
                  <p className="font-semibold text-[var(--brand-ink)]">
                    {offer.discountPercent}% de descuento
                  </p>
                  <p className="mt-1 text-[var(--brand-muted)]">
                    Aplica desde {offer.minNights} noche
                    {(offer.minNights ?? 1) === 1 ? "" : "s"} de hospedaje.
                    Ejemplo matrimonial: de{" "}
                    {formatMoney(
                      roomTypes.find((t) => t.id.includes("matrimonial"))
                        ?.basePrice ??
                        roomTypes[0]?.basePrice ??
                        0,
                    )}{" "}
                    a{" "}
                    {formatMoney(
                      Math.max(
                        1,
                        Math.round(
                          (roomTypes.find((t) => t.id.includes("matrimonial"))
                            ?.basePrice ??
                            roomTypes[0]?.basePrice ??
                            0) *
                            (1 - (offer.discountPercent ?? 0) / 100),
                        ),
                      ),
                    )}{" "}
                    / noche.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {roomTypes.map((type) => {
                      const discounted = Math.max(
                        1,
                        Math.round(
                          type.basePrice * (1 - (offer.discountPercent ?? 0) / 100),
                        ),
                      );
                      return (
                        <li
                          key={`${offer.id}-${type.id}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-[var(--brand-muted)]">
                            {type.name}
                          </span>
                          <span className="font-semibold text-[var(--brand-ink)]">
                            <span className="mr-2 text-xs font-normal line-through opacity-60">
                              {formatMoney(type.basePrice)}
                            </span>
                            {formatMoney(discounted)} / noche
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {offer.kind === "fiesta" && (
                <ul className="mt-5 space-y-2">
                  <li className="rounded-xl bg-[var(--brand-mist)] px-4 py-2 text-sm font-semibold text-[var(--brand-ink)]">
                    Paquete de {offer.packageNights} noche
                    {(offer.packageNights ?? 1) === 1 ? "" : "s"}
                  </li>
                  {roomTypes.map((type) => {
                    const total = offer.packagePrices?.[type.id];
                    if (!total) return null;
                    const perNight = Math.round(
                      total / Math.max(1, offer.packageNights ?? 1),
                    );
                    return (
                      <li
                        key={`${offer.id}-${type.id}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-[var(--brand-muted)]">
                          {type.name}
                        </span>
                        <span className="text-right font-semibold text-[var(--brand-ink)]">
                          {formatMoney(total)}
                          <span className="block text-xs font-normal text-[var(--brand-muted)]">
                            (~{formatMoney(perNight)} / noche)
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {offer.kind !== "oferta" && offer.kind !== "fiesta" && (
                <ul className="mt-5 space-y-2">
                  {roomTypes.map((type) => {
                    const price = offer.prices[type.id];
                    if (!price) return null;
                    return (
                      <li
                        key={`${offer.id}-${type.id}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-[var(--brand-muted)]">
                          {type.name}
                        </span>
                        <span className="font-semibold text-[var(--brand-ink)]">
                          {formatMoney(price)} / noche
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
