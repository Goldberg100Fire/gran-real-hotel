import Link from "next/link";
import { HOTEL_NAME } from "@/lib/seed";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--ocean-line)] bg-[var(--ocean-deep)] text-white/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl text-white">
            {HOTEL_NAME}
          </p>
          <p className="mt-1 text-sm">Av. Costanera 220 · Lima, Perú</p>
        </div>
        <div className="flex gap-6 text-sm">
          <Link href="/habitaciones" className="hover:text-white">
            Habitaciones
          </Link>
          <Link href="/reservar" className="hover:text-white">
            Reservar
          </Link>
          <Link href="/acceso" className="hover:text-white">
            Acceder
          </Link>
          <Link href="/mis-reservas" className="hover:text-white">
            Mis reservas
          </Link>
        </div>
      </div>
    </footer>
  );
}
