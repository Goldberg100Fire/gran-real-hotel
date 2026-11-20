import Link from "next/link";
import { SiteHeader } from "@/components/hotel/site-header";
import { HOTEL } from "@/lib/hotel-info";
import { getReservationByCode } from "@/lib/store";

export const metadata = {
  title: "Reserva confirmada",
};

export default async function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; session_id?: string }>;
}) {
  const { code } = await searchParams;
  const detail = code ? await getReservationByCode(code) : null;

  return (
    <main>
      <div className="relative h-40 bg-[linear-gradient(120deg,#2c241e,#6b5344)]">
        <SiteHeader />
      </div>
      <section className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="rounded-3xl bg-white p-10 shadow-xl ring-1 ring-[var(--brand-line)]">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--brand-muted)]">
            {HOTEL.name}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--brand-ink)]">
            {detail?.reservation.paymentStatus === "pagado"
              ? "¡Pago recibido!"
              : "Reserva registrada"}
          </h1>
          <p className="mt-4 text-[var(--brand-muted)]">
            {detail?.reservation.paymentStatus === "pagado"
              ? "Enviamos el comprobante a tu correo. Presenta este código en recepción."
              : "Si acabas de pagar, la confirmación puede tardar unos segundos. Revisa también tu correo."}

          </p>
          <p className="mt-8 font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)]">
            {code || "GR-XXXXXX"}
          </p>
          {detail && (
            <p className="mt-3 text-sm text-[var(--brand-muted)]">
              {detail.roomType.name} · {detail.reservation.checkIn} →{" "}
              {detail.reservation.checkOut}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/mis-reservas"
              className="rounded-full bg-[var(--brand-deep)] px-5 py-3 text-sm font-medium text-white"
            >
              Ver mis reservas
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[var(--brand-line)] px-5 py-3 text-sm font-medium text-[var(--brand-ink)]"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
