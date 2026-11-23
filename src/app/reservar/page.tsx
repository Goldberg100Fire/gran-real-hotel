import { PageHero } from "@/components/hotel/page-hero";
import { PhoneCta } from "@/components/hotel/phone-cta";
import { HOTEL } from "@/lib/hotel-info";

export const metadata = {
  title: "Reservar por teléfono",
};

export default function ReservarPage() {
  return (
    <main>
      <PageHero
        title="Reservar"
        subtitle="Las reservas se confirman solo por llamada telefónica."
        imageSrc="/hotel/matrimonial-1.png"
      />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-lg leading-relaxed text-[var(--brand-muted)]">
          Ya no recibimos reservas online. Llama al hotel, indícanos fechas y
          tipo de habitación, y te confirmamos disponibilidad al momento.
        </p>
        <div className="mt-8 space-y-3 text-[var(--brand-ink)]">
          <p>
            <span className="font-semibold">Celular:</span>{" "}
            <a
              href={`tel:${HOTEL.phoneMobile}`}
              className="underline-offset-4 hover:underline"
            >
              {HOTEL.phoneMobile}
            </a>
          </p>
          <p>
            <span className="font-semibold">Fijo:</span>{" "}
            <a
              href={`tel:${HOTEL.phoneLandline.replace(/\s/g, "")}`}
              className="underline-offset-4 hover:underline"
            >
              {HOTEL.phoneLandline}
            </a>
          </p>
          <p className="text-[var(--brand-muted)]">{HOTEL.fullAddress}</p>
        </div>
        <div className="mt-10">
          <PhoneCta label="Llamar ahora" />
        </div>
      </section>
    </main>
  );
}
