import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/hotel/logout-button";
import { PageHero } from "@/components/hotel/page-hero";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getCatalog, listReservationsByEmail } from "@/lib/store";
import {
  PAYMENT_METHOD_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/types";

export const metadata = {
  title: "Mis reservas",
};

export default async function MisReservasPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/acceso?next=/mis-reservas");
  }

  const reservations = await listReservationsByEmail(user.email);
  const { roomTypes } = await getCatalog();

  return (
    <main>
      <PageHero
        title="Mis reservas"
        subtitle={`${user.name} · ${user.email}`}
        imageSrc="/hotel/matrimonial-2.png"
      />

      <section className="mx-auto max-w-4xl space-y-4 px-6 py-12">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/reservar"
            className="rounded-full bg-[var(--brand-deep)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Nueva reserva
          </Link>
          <LogoutButton />
        </div>

        {reservations.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white p-10 text-center ring-1 ring-[var(--brand-line)]">
            <p className="text-[var(--brand-muted)]">
              Aún no tienes reservas con este correo.
            </p>
            <Link
              href="/habitaciones"
              className="mt-4 inline-block font-semibold text-[var(--brand-deep)] underline underline-offset-4"
            >
              Ver habitaciones
            </Link>
          </div>
        ) : (
          reservations.map((reservation) => {
            const typeName =
              roomTypes.find((type) => type.id === reservation.roomTypeId)
                ?.name ?? "Habitación";
            return (
              <article
                key={reservation.id}
                className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_50px_-30px_rgba(44,36,30,0.4)] ring-1 ring-[var(--brand-line)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
                      {reservation.code}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--brand-muted)]">
                      {typeName}
                    </p>
                  </div>
                  <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-deep)]">
                    {formatMoney(reservation.totalAmount)}
                  </p>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--brand-muted)]">Ingreso</dt>
                    <dd className="font-medium">{formatDate(reservation.checkIn)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--brand-muted)]">Salida</dt>
                    <dd className="font-medium">{formatDate(reservation.checkOut)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--brand-muted)]">Pago</dt>
                    <dd className="font-medium">
                      {PAYMENT_METHOD_LABELS[reservation.paymentMethod]} ·{" "}
                      {reservation.paymentStatus}
                    </dd>
                    {reservation.cipCode && (
                      <dd className="mt-1 text-xs text-[var(--brand-ink)]">
                        CIP: <strong>{reservation.cipCode}</strong>
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-[var(--brand-muted)]">Huéspedes</dt>
                    <dd className="font-medium">{reservation.guests}</dd>
                  </div>
                </dl>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
