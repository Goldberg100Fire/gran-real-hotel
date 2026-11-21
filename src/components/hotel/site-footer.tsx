import Link from "next/link";
import { HOTEL } from "@/lib/hotel-info";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--brand-line)] bg-[var(--brand-deep)] text-white/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl text-white">
            {HOTEL.name}
          </p>
          <p className="mt-1 text-sm">{HOTEL.fullAddress}</p>
          <p className="mt-1 text-sm">
            Cel. {HOTEL.phoneMobile} · Telf. {HOTEL.phoneLandline}
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <Link href="/habitaciones" className="hover:text-white">
            Habitaciones
          </Link>
          <Link href="/reservar" className="hover:text-white">
            Reservar
          </Link>
          <Link href="/acceso" className="hover:text-white">
            Acceso huéspedes
          </Link>
        </div>
      </div>
    </footer>
  );
}
