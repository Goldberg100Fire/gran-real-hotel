import Link from "next/link";
import { SiteHeader } from "@/components/hotel/site-header";

export const metadata = {
  title: "Reserva confirmada",
};

export default async function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <main>
      <div className="relative h-40 bg-[linear-gradient(120deg,#0b3d4a,#2a9d8f)]">
        <SiteHeader />
      </div>
      <section className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="rounded-3xl bg-white p-10 shadow-xl ring-1 ring-[var(--ocean-line)]">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--ocean-muted)]">
            Confirmación
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--ocean-ink)]">
            ¡Reserva lista!
          </h1>
          <p className="mt-4 text-[var(--ocean-muted)]">
            Guardamos tus datos y el método de pago. Presenta este código en
            recepción.
          </p>
          <p className="mt-8 font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-deep)]">
            {code || "BP-XXXXXX"}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-full bg-[var(--ocean-deep)] px-5 py-3 text-sm font-medium text-white"
            >
              Volver al inicio
            </Link>
            <Link
              href="/habitaciones"
              className="rounded-full border border-[var(--ocean-line)] px-5 py-3 text-sm font-medium text-[var(--ocean-ink)]"
            >
              Ver habitaciones
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
