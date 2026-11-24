import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/hotel/admin-panel";
import { LogoutButton } from "@/components/hotel/logout-button";
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
    <main className="min-h-[100svh] bg-[#efe9e2]">
      <header className="sticky top-0 z-30 border-b border-[var(--brand-line)] bg-[#f7f3ef]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src={HOTEL.logoPath}
              alt={HOTEL.name}
              width={140}
              height={56}
              className="h-9 w-auto object-contain"
              priority
            />
            <div className="hidden h-8 w-px bg-[var(--brand-line)] sm:block" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-gold)]">
                Panel interno
              </p>
              <p className="truncate text-sm font-semibold text-[var(--brand-ink)]">
                {USER_ROLE_LABELS[user.role]}
                <span className="hidden font-normal text-[var(--brand-muted)] sm:inline">
                  {" "}
                  · {user.email}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-[var(--brand-muted)] transition hover:bg-white hover:text-[var(--brand-ink)]"
            >
              Sitio
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-6 sm:py-9">
        <AdminPanel
          adminEmail={user.email}
          adminName={user.name}
          role={user.role}
        />
      </div>
    </main>
  );
}
