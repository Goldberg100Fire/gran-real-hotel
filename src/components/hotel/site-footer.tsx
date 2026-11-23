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
            Cel.{" "}
            <a href={`tel:${HOTEL.phoneMobile}`} className="hover:text-white">
              {HOTEL.phoneMobile}
            </a>{" "}
            · Telf.{" "}
            <a
              href={`tel:${HOTEL.phoneLandline.replace(/\s/g, "")}`}
              className="hover:text-white"
            >
              {HOTEL.phoneLandline}
            </a>
          </p>
          <p className="mt-3 text-xs text-white/55">
            Reservas solo por llamada telefónica.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/habitaciones" className="hover:text-white">
            Habitaciones
          </Link>
          <Link href="/#contacto" className="hover:text-white">
            Contacto
          </Link>
          <a href={`tel:${HOTEL.phoneMobile}`} className="hover:text-white">
            Llamar
          </a>
        </div>
      </div>
    </footer>
  );
}
