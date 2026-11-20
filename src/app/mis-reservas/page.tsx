import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/hotel/logout-button";
import { SiteHeader } from "@/components/hotel/site-header";
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
      <div className="relative h-44 bg-[linear-gradient(120deg,#0b3d4a,#1a6b7a)]">
        <SiteHeader />
        <div className="relative mx-auto flex h-full max-w-6xl items-end px-6 pb-8">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl text-white">
              Mis reservas
            </h1>
            <p className="mt-2 text-white/80">
              Sesión: {user.name} · {user.email}
            </p>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-4xl space-y-4 px-6 py-12">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/reservar"
            className="rounded-full bg-[var(--ocean-deep)] px-5 py-2 text-sm text-white"
          >
            Nueva reserva
          </Link>
          <LogoutButton />
        </div>

        {reservations.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-[var(--ocean-line)]">
            <p className="text-[var(--ocean-muted)]">
              Aún no tienes reservas con este correo.
            </p>
            <Link
              href="/habitaciones"
              className="mt-4 inline-block text-[var(--ocean-deep)] underline"
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
                className="rounded-3xl bg-white p-6 ring-1 ring-[var(--ocean-line)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--ocean-muted)]">
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </p>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
                      {reservation.code}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--ocean-muted)]">
                      {typeName}
                    </p>
                  </div>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-deep)]">
                    {formatMoney(reservation.totalAmount)}
                  </p>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--ocean-muted)]">Ingreso</dt>
                    <dd>{formatDate(reservation.checkIn)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ocean-muted)]">Salida</dt>
                    <dd>{formatDate(reservation.checkOut)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ocean-muted)]">Pago</dt>
                    <dd>
                      {PAYMENT_METHOD_LABELS[reservation.paymentMethod]} ·{" "}
                      {reservation.paymentStatus}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ocean-muted)]">Huéspedes</dt>
                    <dd>{reservation.guests}</dd>
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
