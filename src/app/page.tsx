import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { SiteHeader } from "@/components/hotel/site-header";
import { RoomTypeCard } from "@/components/hotel/room-type-card";
import { formatMoney } from "@/lib/format";
import { HOTEL } from "@/lib/hotel-info";
import { getAvailability, getStorageMode } from "@/lib/store";

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
        <div className="absolute inset-0">
          <Image
            src="/hotel/matrimonial-1.png"
            alt={HOTEL.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(44,36,30,0.88)_0%,rgba(61,49,41,0.72)_45%,rgba(44,36,30,0.55)_100%)]" />
        </div>
        <div className="absolute -right-10 top-24 h-64 w-64 rounded-full bg-[var(--brand-gold)]/20 blur-3xl animate-drift" />
        <SiteHeader />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-20 pt-32 md:justify-center md:pb-28">
          <p className="animate-reveal text-sm uppercase tracking-[0.35em] text-white/70">
            {HOTEL.city} · {HOTEL.region} · ★★★
          </p>
          <h1 className="animate-reveal-delay mt-4 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-white md:text-7xl">
            {HOTEL.name}
          </h1>
          <p className="animate-reveal-delay-2 mt-5 max-w-xl text-lg text-white/85 md:text-xl">
            {HOTEL.tagline}. Hoy hay {totalAvailable} habitaciones disponibles,
            desde {formatMoney(fromPrice)} por noche.
          </p>
          <div className="animate-reveal-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/reservar"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-ink)] transition hover:bg-white/90"
            >
              Reservar
            </Link>
            <Link
              href="/habitaciones"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Ver habitaciones
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/50">
            Datos: {getStorageMode() === "firestore" ? "Firestore" : "local (configura Firebase)"}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-4xl text-[var(--brand-ink)]">
            Habitaciones
          </h2>
          <p className="mt-3 text-[var(--brand-muted)]">
            Simples, matrimoniales y dobles con baño privado, agua caliente, TV
            cable y Wi‑Fi. {HOTEL.fullAddress}.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
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
