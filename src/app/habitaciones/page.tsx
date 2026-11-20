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
        subtitle="Consulta disponibilidad por fechas. Precios por noche e incluye baño privado, agua caliente, TV cable y Wi‑Fi."
        imageSrc="/hotel/doble.png"
      />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <form className="mb-10 grid gap-3 rounded-[1.5rem] bg-white p-5 shadow-[0_18px_50px_-28px_rgba(44,36,30,0.35)] ring-1 ring-[var(--brand-line)] md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">
              Ingreso
            </label>
            <input
              type="date"
              name="checkIn"
              defaultValue={checkIn}
              className="h-11 w-full rounded-xl border border-[var(--brand-line)] px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">
              Salida
            </label>
            <input
              type="date"
              name="checkOut"
              defaultValue={checkOut}
              className="h-11 w-full rounded-xl border border-[var(--brand-line)] px-3 text-sm"
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              className="h-11 w-full rounded-full bg-[var(--brand-deep)] text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
            >
              Consultar disponibilidad
            </button>
          </div>
        </form>

        <div className="grid gap-6 md:grid-cols-3">
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

        <p className="mt-12 text-center text-sm text-[var(--brand-muted)]">
          ¿Listo para confirmar?{" "}
          <Link
            href="/reservar"
            className="font-semibold text-[var(--brand-deep)] underline underline-offset-4"
          >
            Ir a reservar
          </Link>
        </p>
      </section>
    </main>
  );
}
