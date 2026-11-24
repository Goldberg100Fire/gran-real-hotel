import Image from "next/image";
import Link from "next/link";
import { HOTEL } from "@/lib/hotel-info";
import { listBranches } from "@/lib/store";

export async function SiteFooter() {
  const branches = await listBranches(true);
  const primary = branches.find((branch) => branch.isPrimary) ?? branches[0];

  return (
    <footer className="border-t border-white/10 bg-[var(--brand-deep)] text-white/75">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <Image
            src={HOTEL.logoPath}
            alt={HOTEL.name}
            width={160}
            height={70}
            className="h-12 w-auto brightness-110"
          />
          <p className="mt-4 text-sm leading-relaxed">
            {primary?.fullAddress ?? HOTEL.fullAddress}
          </p>
          <p className="mt-2 text-sm">
            Cel.{" "}
            <a
              href={`tel:${primary?.phoneMobile ?? HOTEL.phoneMobile}`}
              className="hover:text-white"
            >
              {primary?.phoneMobile ?? HOTEL.phoneMobile}
            </a>
            {(primary?.phoneLandline || HOTEL.phoneLandline) && (
              <>
                {" "}
                · Telf.{" "}
                <a
                  href={`tel:${(primary?.phoneLandline || HOTEL.phoneLandline).replace(/\s/g, "")}`}
                  className="hover:text-white"
                >
                  {primary?.phoneLandline || HOTEL.phoneLandline}
                </a>
              </>
            )}
          </p>
          <p className="mt-3 text-xs text-white/55">
            Reservas solo por llamada telefónica.
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
              Explorar
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link
                href={primary ? `/sede/${primary.slug}` : "/habitaciones"}
                className="hover:text-white"
              >
                Habitaciones
              </Link>
              {branches.length > 1 && (
                <Link href="/#sedes" className="hover:text-white">
                  Nuestras sedes
                </Link>
              )}
              <Link href="/consultar" className="hover:text-white">
                Consultas
              </Link>
              <Link href="/#contacto" className="hover:text-white">
                Contacto
              </Link>
            </div>
          </div>

          {branches.length > 1 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                Sedes
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href={`/sede/${branch.slug}`}
                    className="hover:text-white"
                  >
                    {branch.city}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
