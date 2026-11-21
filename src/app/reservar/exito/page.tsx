import Link from "next/link";
import { PageHero } from "@/components/hotel/page-hero";
import { formatDate, formatMoney } from "@/lib/format";
import { HOTEL } from "@/lib/hotel-info";
import { getReservationByCode } from "@/lib/store";

export const metadata = {
  title: "Código de pago",
};

export default async function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; cip?: string; session_id?: string }>;
}) {
  const { code, cip } = await searchParams;
  const detail = code ? await getReservationByCode(code) : null;
  const paid = detail?.reservation.paymentStatus === "pagado";
  const cipCode = detail?.reservation.cipCode || cip || null;
  const cipUrl = detail?.reservation.cipUrl;
  const demo = detail?.reservation.cipMode === "demo";

  return (
    <main>
      <PageHero
        title={paid ? "Pago recibido" : "Tu código CIP"}
        subtitle={
          paid
            ? "Reserva confirmada"
            : "Paga con PagoEfectivo en agentes o banca móvil"
        }
        imageSrc="/hotel/matrimonial-1.png"
      />
      <section className="mx-auto max-w-xl px-6 py-14 text-center">
        <div className="bg-white p-10 shadow-[0_24px_60px_-32px_rgba(44,36,30,0.45)] ring-1 ring-[var(--brand-line)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand-gold)]">
            {HOTEL.name}
          </p>

          {paid ? (
            <>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)]">
                ¡Pago confirmado!
              </h2>
              <p className="mt-4 text-sm text-[var(--brand-muted)]">
                Enviamos el comprobante a tu correo. Presenta tu código de
                reserva en recepción.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)]">
                Paga con este CIP
              </h2>
              <p className="mt-4 text-sm text-[var(--brand-muted)]">
                Es un código único. Puedes pagarlo en agentes BCP, Interbank,
                Kasnet, farmacias afiliadas o en la app de tu banco (pago de
                servicios → PagoEfectivo).
              </p>
              {cipCode && (
                <div className="mt-8 rounded-2xl bg-[var(--brand-mist)] px-4 py-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                    Código CIP
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-wider text-[var(--brand-deep)]">
                    {cipCode}
                  </p>
                  {detail && (
                    <p className="mt-3 text-sm text-[var(--brand-ink)]">
                      Monto exacto:{" "}
                      <strong>
                        {formatMoney(detail.reservation.totalAmount)}
                      </strong>
                    </p>
                  )}
                  {detail?.reservation.cipExpiresAt && (
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                      Válido hasta{" "}
                      {new Date(
                        detail.reservation.cipExpiresAt,
                      ).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                    </p>
                  )}
                </div>
              )}
              {cipUrl && (
                <a
                  href={cipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex rounded-full bg-[var(--brand-gold)] px-6 py-3 text-sm font-bold text-[var(--brand-deep)]"
                >
                  Abrir instructivo PagoEfectivo
                </a>
              )}
              {demo && (
                <p className="mt-4 text-xs text-amber-800">
                  CIP de prueba: la cuenta real de PagoEfectivo del dueño aún no
                  está conectada.
                </p>
              )}
            </>
          )}

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-muted)]">
            Código de reserva
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
            {code || detail?.reservation.code || "GR-XXXXXX"}
          </p>
          {detail && (
            <p className="mt-3 text-sm text-[var(--brand-muted)]">
              {detail.roomType.name} · {formatDate(detail.reservation.checkIn)} →{" "}
              {formatDate(detail.reservation.checkOut)}
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
