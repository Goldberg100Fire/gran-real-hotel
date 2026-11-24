import Link from "next/link";
import { PageHero } from "@/components/hotel/page-hero";
import { PhoneCta } from "@/components/hotel/phone-cta";
import { HOTEL } from "@/lib/hotel-info";
import { listBranches } from "@/lib/store";

export const metadata = {
  title: "Reservar por teléfono",
};

export default async function ReservarPage() {
  const branches = await listBranches(true);
  const primary = branches.find((branch) => branch.isPrimary) ?? branches[0];

  return (
    <main>
      <PageHero
        title="Reservar"
        subtitle="Las reservas se confirman solo por llamada telefónica."
        imageSrc={primary?.heroImagePath || "/hotel/matrimonial-1.png"}
      />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-lg leading-relaxed text-[var(--brand-muted)]">
          No hay reservas online. Llama a la sede, indica fechas y tipo de
          habitación, y te confirmamos disponibilidad al momento.
        </p>

        <ol className="mt-8 space-y-3 text-sm text-[var(--brand-ink)]">
          <li>1. Elige la sede y el tipo de habitación.</li>
          <li>2. Llama al celular o al teléfono fijo de esa sede.</li>
          <li>3. Confirma fechas, precio y forma de pago.</li>
        </ol>

        {branches.length > 1 ? (
          <div className="mt-10 space-y-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="rounded-2xl border border-[var(--brand-line)] bg-white px-5 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                  {branch.city}
                </p>
                <p className="mt-1 font-semibold text-[var(--brand-ink)]">
                  {branch.name}
                </p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                  {branch.fullAddress}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <PhoneCta
                    phone={branch.phoneMobile}
                    label={`Llamar ${branch.city}`}
                  />
                  <Link
                    href={`/sede/${branch.slug}`}
                    className="text-sm font-semibold text-[var(--brand-ink)] underline-offset-4 hover:underline"
                  >
                    Ver sede
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-3 text-[var(--brand-ink)]">
            <p>
              <span className="font-semibold">Celular:</span>{" "}
              <a
                href={`tel:${primary?.phoneMobile ?? HOTEL.phoneMobile}`}
                className="underline-offset-4 hover:underline"
              >
                {primary?.phoneMobile ?? HOTEL.phoneMobile}
              </a>
            </p>
            {(primary?.phoneLandline || HOTEL.phoneLandline) && (
              <p>
                <span className="font-semibold">Fijo:</span>{" "}
                <a
                  href={`tel:${(primary?.phoneLandline || HOTEL.phoneLandline).replace(/\s/g, "")}`}
                  className="underline-offset-4 hover:underline"
                >
                  {primary?.phoneLandline || HOTEL.phoneLandline}
                </a>
              </p>
            )}
            <p className="text-[var(--brand-muted)]">
              {primary?.fullAddress ?? HOTEL.fullAddress}
            </p>
            <div className="pt-4">
              <PhoneCta
                phone={primary?.phoneMobile ?? HOTEL.phoneMobile}
                label="Llamar ahora"
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
