import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
import {
  getAvailability,
  getBranchBySlug,
  getCatalog,
  listBranches,
} from "@/lib/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const branch = await getBranchBySlug(slug);
  if (!branch) return { title: "Sede" };
  return {
    title: branch.name,
    description: `${branch.name}: ${branch.fullAddress}. Reservas al ${branch.phoneMobile}.`,
  };
}

export default async function SedePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const branch = await getBranchBySlug(slug);
  if (!branch) notFound();

  const [availability, catalog, branches] = await Promise.all([
    getAvailability(undefined, undefined, branch.id),
    getCatalog(branch.id),
    listBranches(true),
  ]);
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
  const fromPrice =
    priced.length > 0
      ? Math.min(...priced.map((item) => item.resolved.price))
      : null;
  const otherBranches = branches.filter((item) => item.id !== branch.id);

  return (
    <main>
      <section className="relative isolate min-h-[78svh] overflow-hidden md:min-h-[90svh]">
        <div className="absolute inset-0">
          <Image
            src={branch.heroImagePath}
            alt={branch.name}
            fill
            priority
            unoptimized={branch.heroImagePath.startsWith("/api/media/")}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(24,18,14,0.92)_0%,rgba(44,36,30,0.55)_52%,rgba(24,18,14,0.28)_100%)]" />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[var(--brand-cream)] to-transparent" />
        <SiteHeader phone={branch.phoneMobile} />

        <div className="relative mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end px-6 pb-20 pt-28 md:min-h-[90svh] md:pb-24">
          <Image
            src={HOTEL.logoPath}
            alt={HOTEL.name}
            width={280}
            height={120}
            priority
            className="h-auto w-[min(70vw,240px)] drop-shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            {branch.city} · hotel 3 estrellas
          </p>
          <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-extrabold text-white md:text-6xl">
            {branch.name}
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/90">
            {branch.tagline}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PhoneCta phone={branch.phoneMobile} label="Llamar a esta sede" />
            <a
              href="#habitaciones"
              className="rounded-full border border-white/45 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Ver habitaciones
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            Dirección y contacto
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)] md:text-4xl">
            Te esperamos en {branch.city}
          </h2>
          <p className="mt-4 text-lg text-[var(--brand-ink)]">
            {branch.fullAddress}
          </p>
          <p className="mt-3 text-[var(--brand-ink)]">
            <a
              href={`tel:${branch.phoneMobile}`}
              className="font-semibold underline-offset-4 hover:underline"
            >
              Cel. {branch.phoneMobile}
            </a>
            {branch.phoneLandline ? (
              <>
                <span className="text-[var(--brand-muted)]"> · </span>
                <a
                  href={`tel:${branch.phoneLandline.replace(/\s/g, "")}`}
                  className="underline-offset-4 hover:underline"
                >
                  Telf. {branch.phoneLandline}
                </a>
              </>
            ) : null}
          </p>
          <p className="mt-4 text-sm text-[var(--brand-muted)]">
            Las reservas de esta sede se confirman solo por teléfono.
          </p>
        </div>
      </section>

      <section id="habitaciones" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            Habitaciones · {branch.city}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)] md:text-4xl">
            Nuestras habitaciones
          </h2>
          <p className="mt-3 text-[var(--brand-muted)]">
            {priced.length === 0
              ? "Aún no hay habitaciones publicadas para esta sede. Llama para consultar."
              : fromPrice != null
                ? `Desde ${formatMoney(fromPrice)} la noche. Fotos y tarifas de ${branch.city}.`
                : null}
          </p>
        </div>

        {priced.length > 0 ? (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {priced.map((item) => (
              <RoomTypeCard
                key={item.roomType.id}
                roomType={item.roomType}
                services={item.services}
                displayPrice={item.resolved.price}
                offerLabel={item.resolved.offer?.title}
                basePriceLabel
                phone={branch.phoneMobile}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[1.5rem] border border-[var(--brand-line)] bg-white px-6 py-12 text-center">
            <p className="text-[var(--brand-muted)]">
              El catálogo de esta sede se está preparando.
            </p>
          </div>
        )}

        <div className="mt-12">
          <PhoneCta phone={branch.phoneMobile} />
        </div>
      </section>

      <OffersSection
        current={current}
        upcoming={upcoming}
        roomTypes={catalog.roomTypes}
      />

      {otherBranches.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
            Otras sedes
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {otherBranches.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/sede/${item.slug}`}
                  className="rounded-full border border-[var(--brand-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-ink)] transition hover:border-[var(--brand-gold)]"
                >
                  {item.city}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/"
                className="rounded-full border border-[var(--brand-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-muted)] transition hover:border-[var(--brand-gold)]"
              >
                Inicio
              </Link>
            </li>
          </ul>
        </section>
      ) : null}
    </main>
  );
}
