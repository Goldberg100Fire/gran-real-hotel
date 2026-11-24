import Image from "next/image";
import Link from "next/link";
import type { HotelBranch } from "@/lib/types";

export function BranchCards({ branches }: { branches: HotelBranch[] }) {
  if (branches.length <= 1) return null;

  return (
    <section id="sedes" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
          Nuestras sedes
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--brand-ink)] md:text-5xl">
          Cada hotel con su propia identidad
        </h2>
        <p className="mt-3 text-[var(--brand-muted)]">
          Dirección, teléfonos, fotos y habitaciones son propios de cada
          sucursal. Elige la sede que te interesa.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {branches.map((branch) => (
          <Link
            key={branch.id}
            href={`/sede/${branch.slug}`}
            className="group relative block min-h-[280px] overflow-hidden rounded-[1.5rem] ring-1 ring-[var(--brand-line)]"
          >
            <Image
              src={branch.heroImagePath}
              alt={branch.name}
              fill
              unoptimized={branch.heroImagePath.startsWith("/api/media/")}
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(24,18,14,0.92)] via-[rgba(24,18,14,0.35)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                {branch.city}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">
                {branch.name}
              </h3>
              <p className="mt-2 text-sm text-white/85">{branch.fullAddress}</p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-gold)]">
                Ver sede →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
