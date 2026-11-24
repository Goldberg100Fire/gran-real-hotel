import Image from "next/image";
import Link from "next/link";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { HOTEL } from "@/lib/hotel-info";
import { listBranches } from "@/lib/store";

export async function SiteHeader({ phone }: { phone?: string } = {}) {
  const user = await getSessionUser();
  const staff = user && isStaffRole(user.role);
  const branches = await listBranches(true);
  const primary = branches.find((branch) => branch.isPrimary) ?? branches[0];
  const callPhone = phone || primary?.phoneMobile || HOTEL.phoneMobile;

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
        <nav className="flex items-center gap-2.5 text-sm font-semibold text-white/95 sm:gap-4 md:gap-5">
          <Link
            href={primary ? `/sede/${primary.slug}` : "/habitaciones"}
            className="transition hover:text-white"
          >
            Habitaciones
          </Link>
          {branches.length > 1 && (
            <Link
              href="/#sedes"
              className="hidden transition hover:text-white sm:inline"
            >
              Sedes
            </Link>
          )}
          <Link
            href="/#contacto"
            className="hidden transition hover:text-white sm:inline"
          >
            Contacto
          </Link>
          <a
            href={`tel:${callPhone}`}
            className="rounded-full bg-[var(--brand-gold)] px-3.5 py-2 text-[var(--brand-deep)] shadow-sm transition hover:brightness-110 sm:px-4"
          >
            <span className="sm:hidden">Llamar</span>
            <span className="hidden sm:inline">Reservar por teléfono</span>
          </a>
          {staff && (
            <Link href="/admin" className="transition hover:text-white">
              Panel
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
