import { formatDate, formatMoney } from "@/lib/format";
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
          Temporadas y fiestas
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-ink)] md:text-5xl">
          Precios especiales
        </h2>
        <p className="mt-3 text-[var(--brand-muted)]">
          En feriados y temporada alta las tarifas pueden subir. Confirma al
          llamar.
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
              {offer.description && (
                <p className="mt-3 text-sm leading-relaxed text-[var(--brand-ink)]">
                  {offer.description}
                </p>
              )}
              <ul className="mt-5 space-y-2">
                {roomTypes.map((type) => {
                  const price = offer.prices[type.id];
                  if (!price) return null;
                  return (
                    <li
                      key={`${offer.id}-${type.id}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-[var(--brand-muted)]">{type.name}</span>
                      <span className="font-semibold text-[var(--brand-ink)]">
                        {formatMoney(price)} / noche
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
