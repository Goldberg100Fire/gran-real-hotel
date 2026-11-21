import Image from "next/image";
import Link from "next/link";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { HOTEL } from "@/lib/hotel-info";

export async function SiteHeader() {
  const user = await getSessionUser();
  const staff = user && isStaffRole(user.role);

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 md:px-6 md:py-5">
        <Link href="/" className="flex items-center">
          <Image
            src={HOTEL.logoPath}
            alt={HOTEL.name}
            width={180}
            height={78}
            className="h-10 w-auto drop-shadow-md md:h-12"
            priority
          />
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold text-white/95 sm:gap-4 md:gap-5">
          <Link
            href="/habitaciones"
            className="hidden transition hover:text-white sm:inline"
          >
            Habitaciones
          </Link>
          <Link
            href="/reservar"
            className="rounded-full bg-[var(--brand-gold)] px-3.5 py-2 text-[var(--brand-deep)] shadow-sm transition hover:brightness-110 sm:px-4"
          >
            Reservar
          </Link>
          {user ? (
            <>
              {!staff && (
                <Link
                  href="/mis-reservas"
                  className="hidden transition hover:text-white md:inline"
                >
                  Mis reservas
                </Link>
              )}
              {staff && (
                <Link
                  href="/admin"
                  className="transition hover:text-white"
                >
                  Panel
                </Link>
              )}
            </>
          ) : (
            <Link href="/acceso" className="transition hover:text-white">
              Acceder
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
