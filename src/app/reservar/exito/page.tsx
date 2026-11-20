import Link from "next/link";
import { SiteHeader } from "@/components/hotel/site-header";

export const metadata = {
  title: "Reserva confirmada",
};

export default async function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; mail?: string }>;
}) {
  const { code, mail } = await searchParams;
  const demoMail = mail === "demo";

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
            Enviamos el comprobante a tu correo de acceso. Presenta este código
            en recepción.
          </p>
          <p className="mt-8 font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-deep)]">
            {code || "BP-XXXXXX"}
          </p>
          {demoMail && (
            <p className="mt-4 rounded-xl bg-[var(--ocean-mist)] px-4 py-3 text-left text-sm text-[var(--ocean-ink)]">
              Modo demo: el comprobante quedó en la bandeja del admin (pestaña
              Comprobantes) hasta configurar el envío real por correo.
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/mis-reservas"
              className="rounded-full bg-[var(--ocean-deep)] px-5 py-3 text-sm font-medium text-white"
            >
              Ver mis reservas
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[var(--ocean-line)] px-5 py-3 text-sm font-medium text-[var(--ocean-ink)]"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
