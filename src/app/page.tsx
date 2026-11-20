import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { SiteHeader } from "@/components/hotel/site-header";
import { RoomTypeCard } from "@/components/hotel/room-type-card";
import { formatMoney } from "@/lib/format";
import { HOTEL } from "@/lib/hotel-info";
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
        <div className="absolute inset-0">
          <Image
            src="/hotel/matrimonial-1.png"
            alt={HOTEL.name}
            fill
            priority
            className="object-cover scale-105 animate-[drift_18s_ease-in-out_infinite_alternate]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(30,24,20,0.88)_0%,rgba(44,36,30,0.62)_48%,rgba(30,24,20,0.35)_100%)]" />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[var(--brand-cream)] to-transparent" />
        <SiteHeader />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-24 pt-28 md:justify-center md:pb-32">
          <Image
            src={HOTEL.logoPath}
            alt={HOTEL.name}
            width={420}
            height={180}
            priority
            className="animate-reveal h-auto w-[min(88vw,380px)] drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          />
          <p className="animate-reveal-delay mt-6 max-w-lg text-lg text-white/90 md:text-xl">
            {HOTEL.tagline}. Habitaciones disponibles hoy: {totalAvailable},
            desde {formatMoney(fromPrice)} la noche.
          </p>
          <div className="animate-reveal-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/reservar"
              className="rounded-full bg-[var(--brand-gold)] px-7 py-3.5 text-sm font-bold text-[var(--brand-deep)] shadow-lg transition hover:brightness-110"
            >
              Reservar ahora
            </Link>
            <Link
              href="/habitaciones"
              className="rounded-full border border-white/50 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Ver habitaciones
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
              Otuzco · 3 estrellas
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-ink)] md:text-5xl">
              Habitaciones
            </h2>
            <p className="mt-3 text-[var(--brand-muted)]">
              Simple, matrimonial y doble. Todas con baño privado, agua caliente,
              TV cable y Wi‑Fi.
            </p>
          </div>
          <p className="text-sm text-[var(--brand-muted)]">{HOTEL.fullAddress}</p>
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

      <section className="border-y border-[var(--brand-line)] bg-[var(--brand-deep)] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold md:text-4xl">
              Servicios en cada habitación
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Baño privado", "Agua caliente", "TV cable", "Wi‑Fi"].map(
                (item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] ring-1 ring-white/10">
            <Image
              src="/hotel/doble.png"
              alt="Habitación doble"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
          Contacto
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)]">
          {HOTEL.name}
        </h2>
        <p className="mt-3 text-[var(--brand-muted)]">{HOTEL.fullAddress}</p>
        <p className="mt-1 text-[var(--brand-ink)]">
          Cel. {HOTEL.phoneMobile} · Telf. {HOTEL.phoneLandline}
        </p>
        <Link
          href="/acceso?next=/reservar"
          className="mt-8 inline-flex rounded-full bg-[var(--brand-deep)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
        >
          Acceder y reservar
        </Link>
      </section>
    </main>
  );
}
