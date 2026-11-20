import { PageHero } from "@/components/hotel/page-hero";
import { BookingForm } from "@/components/hotel/booking-form";
import { getCatalog } from "@/lib/store";

export const metadata = {
  title: "Reservar",
};

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    checkIn?: string;
    checkOut?: string;
    cancelado?: string;
  }>;
}) {
  const params = await searchParams;
  const { roomTypes } = await getCatalog();

  return (
    <main>
      <PageHero
        title="Reservar"
        subtitle="Elige fechas, completa tus datos y confirma tu estadía en Otuzco."
        imageSrc="/hotel/matrimonial-1.png"
      />

      <section className="mx-auto max-w-3xl px-6 py-12">
        {params.cancelado && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            El pago se canceló. Puedes intentarlo de nuevo cuando quieras.
          </p>
        )}
        <div className="rounded-[1.75rem] bg-white/95 p-6 shadow-[0_24px_60px_-32px_rgba(44,36,30,0.45)] ring-1 ring-[var(--brand-line)] md:p-10">
          <BookingForm
            roomTypes={roomTypes}
            initialTypeId={params.tipo}
            initialCheckIn={params.checkIn}
            initialCheckOut={params.checkOut}
          />
        </div>
      </section>
    </main>
  );
}
