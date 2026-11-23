import { OffersSection } from "@/components/hotel/offers-section";
import { PageHero } from "@/components/hotel/page-hero";
import { PhoneCta } from "@/components/hotel/phone-cta";
import { RoomTypeCard } from "@/components/hotel/room-type-card";
import { HOTEL } from "@/lib/hotel-info";
import {
  listPublicOffers,
  resolveNightlyPrice,
  todayInLima,
} from "@/lib/pricing";
import { getAvailability, getCatalog } from "@/lib/store";

export const metadata = {
  title: "Habitaciones",
};

export default async function HabitacionesPage() {
  const [availability, catalog] = await Promise.all([
    getAvailability(),
    getCatalog(),
  ]);
  const today = todayInLima();
  const { current, upcoming } = listPublicOffers(catalog.priceOffers, today);

  return (
    <main>
      <PageHero
        title="Habitaciones"
        subtitle="Simple, matrimonial y doble. Todas incluyen baño privado, agua caliente, TV cable y Wi‑Fi."
        imageSrc="/hotel/doble.png"
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-14">
        <p className="mb-10 max-w-2xl text-[var(--brand-muted)]">
          Esta página es informativa. Para consultar disponibilidad y reservar,
          llama al hotel:{" "}
          <a
            href={`tel:${HOTEL.phoneMobile}`}
            className="font-semibold text-[var(--brand-ink)] underline-offset-4 hover:underline"
          >
            {HOTEL.phoneMobile}
          </a>
          .
        </p>

        <div className="grid gap-8 md:grid-cols-3">
          {availability.map((item) => {
            const resolved = resolveNightlyPrice(
              item.roomType,
              catalog.priceOffers,
              today,
            );
            return (
              <RoomTypeCard
                key={item.roomType.id}
                roomType={item.roomType}
                services={item.services}
                displayPrice={resolved.price}
                offerLabel={resolved.offer?.title}
                basePriceLabel
              />
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <PhoneCta />
        </div>
      </section>

      <OffersSection
        current={current}
        upcoming={upcoming}
        roomTypes={catalog.roomTypes}
      />
    </main>
  );
}
