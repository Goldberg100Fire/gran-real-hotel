import Link from "next/link";
import { HOTEL_NAME } from "@/lib/seed";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-white drop-shadow-sm md:text-3xl"
        >
          {HOTEL_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-white/90 md:gap-8">
          <Link href="/habitaciones" className="transition hover:text-white">
            Habitaciones
          </Link>
          <Link
            href="/reservar"
            className="rounded-full bg-white px-4 py-2 text-[var(--ocean-ink)] shadow-sm transition hover:bg-white/90"
          >
            Reservar
          </Link>
          <Link href="/admin" className="hidden text-white/70 transition hover:text-white sm:inline">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
