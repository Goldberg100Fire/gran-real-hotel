import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { BranchCards } from "@/components/hotel/branch-cards";
import { OffersSection } from "@/components/hotel/offers-section";
import { PhoneCta } from "@/components/hotel/phone-cta";
import { RoomTypeCard } from "@/components/hotel/room-type-card";
import { SiteHeader } from "@/components/hotel/site-header";
import { formatMoney } from "@/lib/format";
import { HOTEL } from "@/lib/hotel-info";
import {
  listPublicOffers,
  resolveNightlyPrice,
  todayInLima,
} from "@/lib/pricing";
import { getAvailability, getCatalog, listBranches } from "@/lib/store";

export default async function HomePage() {
  await connection();
  const [availability, catalog, branches] = await Promise.all([
    getAvailability(),
    getCatalog(),
    listBranches(true),
  ]);
  const primary = catalog.branch;
  const today = todayInLima();
  const { current, upcoming } = listPublicOffers(catalog.priceOffers, today);
  const priced = availability.map((item) => {
    const resolved = resolveNightlyPrice(
      item.roomType,
      catalog.priceOffers,
      today,
    );
    return { ...item, resolved };
  });
  const fromPrice = Math.min(...priced.map((item) => item.resolved.price));
  const activeOffer = current[0] ?? null;

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
            {primary?.tagline ?? HOTEL.tagline}. Hotel 3 estrellas
            {primary ? ` en ${primary.city}` : " en Otuzco"}.
          </p>
          <div className="animate-reveal-delay-2 mt-8 flex flex-wrap gap-3">
            <PhoneCta
              label="Llamar para reservar"
              phone={primary?.phoneMobile ?? HOTEL.phoneMobile}
            />
            <Link
              href={primary ? `/sede/${primary.slug}` : "/habitaciones"}
              className="rounded-full border border-white/45 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Ver sede
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            El hotel
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-ink)] md:text-5xl">
            Descanso cercano y bien cuidado
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--brand-muted)] md:text-lg">
            {HOTEL.name} ofrece hospedaje sencillo y cálido en{" "}
            {primary?.fullAddress ?? HOTEL.fullAddress}. Cada sucursal tiene su
            propia dirección, fotos y habitaciones; para confirmar tu estadía,
            llama a esa sede.
          </p>
        </div>
      </section>

      <BranchCards branches={branches} />

      <section className="relative mx-auto max-w-6xl px-6 pb-16 md:pb-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            {primary?.city ?? "Otuzco"} · 3 estrellas
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-ink)] md:text-5xl">
            Habitaciones
          </h2>
          <p className="mt-3 text-[var(--brand-muted)]">
            Simple, matrimonial, doble, familiar y suite, desde{" "}
            {formatMoney(fromPrice)} la noche
            {activeOffer ? ` (${activeOffer.title})` : ""}. Cada tipo muestra su
            foto y servicios. La disponibilidad se confirma por teléfono.
          </p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {priced.map((item, index) => (
            <div
              key={item.roomType.id}
              className={
                index % 3 === 1
                  ? "animate-reveal-delay"
                  : index % 3 === 2
                    ? "animate-reveal-delay-2"
                    : "animate-reveal"
              }
            >
              <RoomTypeCard
                roomType={item.roomType}
                services={item.services}
                displayPrice={item.resolved.price}
                offerLabel={item.resolved.offer?.title}
                basePriceLabel
              />
            </div>
          ))}
        </div>
      </section>

      <OffersSection
        current={current}
        upcoming={upcoming}
        roomTypes={catalog.roomTypes}
      />

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
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:max-w-3xl">
            {[
              "Baño privado",
              "Agua caliente",
              "TV cable",
              "Wi‑Fi",
              "Toallas",
              "Armario",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-base">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-gold)]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-xl text-sm text-white/70">
            Cada tipo de habitación puede incluir servicios adicionales (escritorio,
            ambiente familiar o premium). Revísalos en la ficha de cada habitación.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
              Cómo reservar
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)] md:text-4xl">
              Solo por llamada telefónica
            </h2>
            <p className="mt-4 text-[var(--brand-muted)]">
              No hay reservas online ni registro de huéspedes en esta página.
              Llama, consulta fechas y confirma tu habitación con el hotel.
            </p>
            <ol className="mt-6 space-y-3 text-sm text-[var(--brand-ink)]">
              <li>1. Elige el tipo de habitación que te interesa.</li>
              <li>2. Llama al celular o al teléfono fijo.</li>
              <li>3. Confirma fechas, precio y forma de pago.</li>
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <PhoneCta phone={primary?.phoneMobile ?? HOTEL.phoneMobile} />
              {(primary?.phoneLandline || HOTEL.phoneLandline) && (
                <a
                  href={`tel:${(primary?.phoneLandline || HOTEL.phoneLandline).replace(/\s/g, "")}`}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--brand-line)] bg-white px-7 py-3.5 text-sm font-semibold text-[var(--brand-ink)] transition hover:border-[var(--brand-gold)]"
                >
                  Fijo {primary?.phoneLandline || HOTEL.phoneLandline}
                </a>
              )}
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden md:aspect-[5/6]">
            <Image
              src="/hotel/doble.png"
              alt="Habitación doble Gran Real"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section id="contacto" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="border-t border-[var(--brand-line)] pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            Contacto
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)] md:text-4xl">
            Te esperamos en {primary?.city ?? "Otuzco"}
          </h2>
          <p className="mt-4 max-w-xl text-[var(--brand-muted)]">
            {primary?.fullAddress ?? HOTEL.fullAddress}
          </p>
          <p className="mt-3 text-[var(--brand-ink)]">
            <a
              href={`tel:${primary?.phoneMobile ?? HOTEL.phoneMobile}`}
              className="font-semibold underline-offset-4 hover:underline"
            >
              Cel. {primary?.phoneMobile ?? HOTEL.phoneMobile}
            </a>
            {(primary?.phoneLandline || HOTEL.phoneLandline) && (
              <>
                <span className="text-[var(--brand-muted)]"> · </span>
                <a
                  href={`tel:${(primary?.phoneLandline || HOTEL.phoneLandline).replace(/\s/g, "")}`}
                  className="underline-offset-4 hover:underline"
                >
                  Telf. {primary?.phoneLandline || HOTEL.phoneLandline}
                </a>
              </>
            )}
          </p>
          <p className="mt-6 max-w-lg text-sm text-[var(--brand-muted)]">
            También puedes usar el botón <strong>Consultar</strong> en la
            esquina para preguntar por precios, habitaciones o ubicación sin
            iniciar sesión.
          </p>
        </div>
      </section>
    </main>
  );
}
