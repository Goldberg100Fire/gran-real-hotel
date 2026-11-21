import Link from "next/link";
import { PageHero } from "@/components/hotel/page-hero";
import { RoomTypeCard } from "@/components/hotel/room-type-card";
import { getAvailability } from "@/lib/store";

export const metadata = {
  title: "Habitaciones",
};

export default async function HabitacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const params = await searchParams;
  const checkIn = params.checkIn;
  const checkOut = params.checkOut;
  const availability = await getAvailability(checkIn, checkOut);

  return (
    <main>
      <PageHero
        title="Habitaciones"
        subtitle="Elige fechas y revisa qué hay libre. Todas incluyen baño privado, agua caliente, TV cable y Wi‑Fi."
        imageSrc="/hotel/doble.png"
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-14">
        <form className="mb-12 grid gap-4 border-b border-[var(--brand-line)] pb-8 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
              Ingreso
            </label>
            <input
              type="date"
              name="checkIn"
              defaultValue={checkIn}
              className="h-11 w-full border border-[var(--brand-line)] bg-white px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
              Salida
            </label>
            <input
              type="date"
              name="checkOut"
              defaultValue={checkOut}
              className="h-11 w-full border border-[var(--brand-line)] bg-white px-3 text-sm outline-none focus:border-[var(--brand-gold)]"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-full bg-[var(--brand-deep)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
          >
            Consultar
          </button>
        </form>

        <div className="grid gap-8 md:grid-cols-3">
          {availability.map((item) => (
            <RoomTypeCard
              key={item.roomType.id}
              roomType={item.roomType}
              services={item.services}
              availableCount={item.availableCount}
              totalRooms={item.totalRooms}
              checkIn={checkIn}
              checkOut={checkOut}
            />
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/reservar"
            className="inline-flex rounded-full bg-[var(--brand-gold)] px-7 py-3.5 text-sm font-bold text-[var(--brand-deep)] transition hover:brightness-110"
          >
            Ir a reservar
          </Link>
        </div>
      </section>
    </main>
  );
}
