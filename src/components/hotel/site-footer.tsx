import Image from "next/image";
import Link from "next/link";
import { HOTEL } from "@/lib/hotel-info";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--brand-deep)] text-white/75">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md">
          <Image
            src={HOTEL.logoPath}
            alt={HOTEL.name}
            width={160}
            height={70}
            className="h-12 w-auto brightness-110"
          />
          <p className="mt-4 text-sm leading-relaxed">{HOTEL.fullAddress}</p>
          <p className="mt-2 text-sm">
            Cel. {HOTEL.phoneMobile} · Telf. {HOTEL.phoneLandline}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
