import { SiteHeader } from "@/components/hotel/site-header";
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
  }>;
}) {
  const params = await searchParams;
  const { roomTypes } = await getCatalog();

  return (
    <main>
      <div className="relative h-48 overflow-hidden bg-[linear-gradient(135deg,#06262f,#0b3d4a_55%,#2a9d8f)]">
        <SiteHeader />
        <div className="relative mx-auto flex h-full max-w-6xl items-end px-6 pb-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl text-white md:text-5xl">
              Reserva y pago
            </h1>
            <p className="mt-2 max-w-xl text-white/80">
              Ingresa tus datos, elige el método de pago y confirma tu estadía.
            </p>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-[1.75rem] bg-white/90 p-6 shadow-xl ring-1 ring-[var(--ocean-line)] md:p-10">
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
