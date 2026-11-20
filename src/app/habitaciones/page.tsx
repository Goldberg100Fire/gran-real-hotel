import Link from "next/link";
import { SiteHeader } from "@/components/hotel/site-header";
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
      <div className="relative h-56 overflow-hidden bg-[linear-gradient(120deg,#0b3d4a,#1a6b7a,#d8c3a5)]">
        <SiteHeader />
        <div className="relative mx-auto flex h-full max-w-6xl items-end px-6 pb-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl text-white md:text-5xl">
              Tipos de habitación
            </h1>
            <p className="mt-2 max-w-xl text-white/80">
              Precios por noche, capacidad y servicios incluidos. Consulta
              disponibilidad por fechas.
            </p>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <form className="mb-10 grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-[var(--ocean-line)] md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--ocean-muted)]">
              Ingreso
            </label>
            <input
              type="date"
              name="checkIn"
              defaultValue={checkIn}
              className="h-10 w-full rounded-lg border border-[var(--ocean-line)] px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--ocean-muted)]">
              Salida
            </label>
            <input
              type="date"
              name="checkOut"
              defaultValue={checkOut}
              className="h-10 w-full rounded-lg border border-[var(--ocean-line)] px-3 text-sm"
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              className="h-10 w-full rounded-full bg-[var(--ocean-deep)] text-sm font-medium text-white"
            >
              Consultar disponibilidad
            </button>
          </div>
        </form>

        <div className="grid gap-6 md:grid-cols-2">
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

        <p className="mt-10 text-center text-sm text-[var(--ocean-muted)]">
          ¿Listo para confirmar?{" "}
          <Link href="/reservar" className="text-[var(--ocean-deep)] underline">
            Ir al formulario de reserva
          </Link>
        </p>
      </section>
    </main>
  );
}
