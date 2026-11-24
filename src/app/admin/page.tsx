import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/hotel/admin-panel";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { HOTEL } from "@/lib/hotel-info";
import { USER_ROLE_LABELS } from "@/lib/types";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/personal?next=/admin");
  }
  if (!isStaffRole(user.role)) {
    redirect("/");
  }

  return (
    <main className="min-h-[100svh] bg-[linear-gradient(180deg,#f3eee8_0%,#f7f3ef_28%,#f7f3ef_100%)]">
      <header className="sticky top-0 z-30 border-b border-[var(--brand-line)]/80 bg-[var(--brand-cream)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src={HOTEL.logoPath}
              alt={HOTEL.name}
              width={140}
              height={56}
              className="h-9 w-auto object-contain"
              priority
            />
            <div className="hidden h-6 w-px bg-[var(--brand-line)] sm:block" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                Panel interno
              </p>
              <p className="text-sm font-semibold text-[var(--brand-ink)]">
                {USER_ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-[220px] truncate text-[var(--brand-muted)] md:inline">
              {user.name}
            </span>
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-[var(--brand-muted)] transition hover:bg-white hover:text-[var(--brand-ink)]"
            >
              Sitio
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--brand-ink)] sm:text-4xl">
            Administración
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--brand-muted)]">
            Gestiona habitaciones, fotos, personal y reservas del{" "}
            {HOTEL.name}.
          </p>
        </div>
        <AdminPanel
          adminEmail={user.email}
          adminName={user.name}
          role={user.role}
        />
      </div>
    </main>
  );
}
