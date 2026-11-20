import Link from "next/link";
import { PageHero } from "@/components/hotel/page-hero";
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
  const paid = detail?.reservation.paymentStatus === "pagado";

  return (
    <main>
      <PageHero
        title={paid ? "Pago recibido" : "Reserva registrada"}
        subtitle="Guarda tu código para recepción"
        imageSrc="/hotel/matrimonial-1.png"
      />
      <section className="mx-auto max-w-xl px-6 py-14 text-center">
        <div className="rounded-[1.75rem] bg-white p-10 shadow-[0_24px_60px_-32px_rgba(44,36,30,0.45)] ring-1 ring-[var(--brand-line)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand-gold)]">
            {HOTEL.name}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)]">
            {paid ? "¡Listo!" : "Te esperamos"}
          </h2>
          <p className="mt-4 text-sm text-[var(--brand-muted)]">
            {paid
              ? "Enviamos el comprobante a tu correo. Presenta este código en recepción."
              : "Si acabas de pagar, la confirmación puede tardar unos segundos. Revisa también tu correo."}
          </p>
          <p className="mt-8 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-deep)]">
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
              className="rounded-full bg-[var(--brand-deep)] px-5 py-3 text-sm font-semibold text-white"
            >
              Ver mis reservas
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[var(--brand-line)] px-5 py-3 text-sm font-semibold text-[var(--brand-ink)]"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
