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
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(24,18,14,0.92)_0%,rgba(44,36,30,0.55)_52%,rgba(24,18,14,0.28)_100%)]" />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-[var(--brand-cream)] to-transparent" />
        <SiteHeader />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-24 pt-28 md:justify-center md:pb-28">
          <Image
            src={HOTEL.logoPath}
            alt={HOTEL.name}
            width={420}
            height={180}
            priority
            className="animate-reveal h-auto w-[min(90vw,400px)] drop-shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          />
          <p className="animate-reveal-delay mt-6 max-w-md text-lg leading-relaxed text-white/90 md:text-xl">
            {HOTEL.tagline}. Descanso en el corazón de Otuzco.
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
              className="rounded-full border border-white/45 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Ver habitaciones
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            Otuzco · 3 estrellas
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-ink)] md:text-5xl">
            Habitaciones
          </h2>
          <p className="mt-3 text-[var(--brand-muted)]">
            Simple, matrimonial y doble. Hoy hay {totalAvailable} disponibles,
            desde {formatMoney(fromPrice)} la noche.
          </p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {availability.map((item, index) => (
            <div
              key={item.roomType.id}
              className={
                index === 1
                  ? "animate-reveal-delay"
                  : index === 2
                    ? "animate-reveal-delay-2"
                    : "animate-reveal"
              }
            >
              <RoomTypeCard
                roomType={item.roomType}
                services={item.services}
                availableCount={item.availableCount}
                totalRooms={item.totalRooms}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--brand-deep)] text-white">
        <div className="absolute inset-0 opacity-30">
          <Image
            src="/hotel/matrimonial-2.png"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[var(--brand-deep)]/80" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            En cada habitación
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl font-extrabold md:text-4xl">
            Comodidad sencilla, bien cuidada
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:max-w-2xl">
            {["Baño privado", "Agua caliente", "TV cable", "Wi‑Fi"].map(
              (item) => (
                <li key={item} className="flex items-center gap-3 text-base">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-gold)]" />
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden md:aspect-[5/6]">
            <Image
              src="/hotel/doble.png"
              alt="Habitación doble Gran Real"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
              Contacto
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)] md:text-4xl">
              Te esperamos en Otuzco
            </h2>
            <p className="mt-4 text-[var(--brand-muted)]">{HOTEL.fullAddress}</p>
            <p className="mt-2 text-[var(--brand-ink)]">
              <a
                href={`tel:${HOTEL.phoneMobile}`}
                className="font-semibold underline-offset-4 hover:underline"
              >
                Cel. {HOTEL.phoneMobile}
              </a>
              <span className="text-[var(--brand-muted)]"> · </span>
              <a
                href={`tel:${HOTEL.phoneLandline.replace(/\s/g, "")}`}
                className="underline-offset-4 hover:underline"
              >
                Telf. {HOTEL.phoneLandline}
              </a>
            </p>
            <Link
              href="/reservar"
              className="mt-8 inline-flex rounded-full bg-[var(--brand-deep)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
            >
              Reservar estadía
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
