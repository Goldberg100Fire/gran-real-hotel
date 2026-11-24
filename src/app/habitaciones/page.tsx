import Link from "next/link";
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
import { getAvailability, getCatalog, listBranches } from "@/lib/store";

export const metadata = {
  title: "Habitaciones",
};

export default async function HabitacionesPage() {
  const [availability, catalog, branches] = await Promise.all([
    getAvailability(),
    getCatalog(),
    listBranches(true),
  ]);
  const today = todayInLima();
  const { current, upcoming } = listPublicOffers(catalog.priceOffers, today);
  const branch = catalog.branch;
  const phone = branch?.phoneMobile ?? HOTEL.phoneMobile;

  return (
    <main>
      <PageHero
        title="Habitaciones"
        subtitle={
          branch
            ? `${branch.city}: cada ficha muestra foto, camas y servicios. Reserva por teléfono.`
            : "Cada ficha muestra foto, camas y servicios incluidos. Reserva por teléfono."
        }
        imageSrc={branch?.heroImagePath || "/hotel/doble.png"}
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-14">
        <p className="mb-8 max-w-2xl text-[var(--brand-muted)]">
          Página informativa. Todas incluyen baño privado, agua caliente, TV
          cable y Wi‑Fi; el resto varía por tipo. Para fechas y confirmación,
          llama al{" "}
          <a
            href={`tel:${phone}`}
            className="font-semibold text-[var(--brand-ink)] underline-offset-4 hover:underline"
          >
            {phone}
          </a>
          .
        </p>

        {branches.length > 1 && (
          <div className="mb-10 flex flex-wrap gap-2">
            {branches.map((item) => (
              <Link
                key={item.id}
                href={`/sede/${item.slug}`}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  item.id === branch?.id
                    ? "border-[var(--brand-deep)] bg-[var(--brand-deep)] text-white"
                    : "border-[var(--brand-line)] bg-white text-[var(--brand-ink)] hover:border-[var(--brand-gold)]"
                }`}
              >
                {item.city}
              </Link>
            ))}
          </div>
        )}

        {availability.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                  phone={phone}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-[var(--brand-line)] bg-white px-6 py-14 text-center">
            <p className="text-[var(--brand-muted)]">
              Aún no hay habitaciones publicadas
              {branch ? ` para ${branch.city}` : ""}.
            </p>
            <div className="mt-6">
              <PhoneCta phone={phone} />
            </div>
          </div>
        )}

        <div className="mt-14 space-y-4 text-center">
          <ol className="mx-auto max-w-md space-y-2 text-left text-sm text-[var(--brand-ink)]">
            <li>1. Elige el tipo de habitación.</li>
            <li>2. Llama a la sede{branch ? ` de ${branch.city}` : ""}.</li>
            <li>3. Confirma fechas, precio y forma de pago.</li>
          </ol>
          <PhoneCta phone={phone} />
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
