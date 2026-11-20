import Link from "next/link";
import { connection } from "next/server";
import { SiteHeader } from "@/components/hotel/site-header";
import { RoomTypeCard } from "@/components/hotel/room-type-card";
import { formatMoney } from "@/lib/format";
import { HOTEL_NAME, HOTEL_TAGLINE } from "@/lib/seed";
import { getAvailability } from "@/lib/store";

export default async function HomePage() {
  await connection();
  const availability = await getAvailability();
  const totalAvailable = availability.reduce(
    (sum, item) => sum + item.availableCount,
    0,
  );
  const fromPrice = Math.min(
    ...availability.map((item) => item.roomType.basePrice),
  );

  return (
    <main>
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#06262f_0%,#0b3d4a_42%,#1a6b7a_72%,#d8c3a5_140%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(42,157,143,0.35),transparent_40%)]" />
        <div className="absolute -right-16 top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-drift" />
        <div className="absolute bottom-10 left-10 h-56 w-56 rounded-full bg-[var(--ocean-sand)]/20 blur-3xl animate-drift" />
        <SiteHeader />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-20 pt-32 md:justify-center md:pb-28">
          <p className="animate-reveal text-sm uppercase tracking-[0.35em] text-white/70">
            Lima · Costa del Pacífico
          </p>
          <h1 className="animate-reveal-delay mt-4 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-white md:text-7xl">
            {HOTEL_NAME}
          </h1>
          <p className="animate-reveal-delay-2 mt-5 max-w-xl text-lg text-white/85 md:text-xl">
            {HOTEL_TAGLINE}. Hoy hay {totalAvailable} habitaciones disponibles,
            desde {formatMoney(fromPrice)} por noche.
          </p>
          <div className="animate-reveal-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/reservar"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--ocean-ink)] transition hover:bg-white/90"
            >
              Reservar y pagar
            </Link>
            <Link
              href="/habitaciones"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Ver tipos y precios
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-4xl text-[var(--ocean-ink)]">
            Habitaciones disponibles ahora
          </h2>
          <p className="mt-3 text-[var(--ocean-muted)]">
            Elige un tipo, revisa servicios incluidos y completa tu reserva con
            pago online o en el hotel.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {availability.map((item) => (
            <RoomTypeCard
              key={item.roomType.id}
              roomType={item.roomType}
              services={item.services}
              availableCount={item.availableCount}
              totalRooms={item.totalRooms}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
