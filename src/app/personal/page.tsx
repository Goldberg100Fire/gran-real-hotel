import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffAuthForm } from "@/components/hotel/staff-auth-form";
import { getSessionUser, isStaffRole, safeNextPath } from "@/lib/auth";
import { HOTEL } from "@/lib/hotel-info";

export const metadata = {
  title: "Acceso personal",
  robots: { index: false, follow: false },
};

export default async function PersonalAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const nextPath = safeStaffNext(params.next);
  const inviteToken = params.invite?.trim() || "";
  const sessionExpired = params.error === "session";

  if (user && isStaffRole(user.role)) {
    redirect(nextPath);
  }
  if (user && !isStaffRole(user.role)) {
    redirect("/");
  }

  return (
    <main className="relative isolate min-h-[100svh] overflow-hidden bg-[var(--brand-deep)]">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/hotel/matrimonial-1.png"
          alt=""
          fill
          priority
          className="object-cover object-[center_40%] scale-105"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(28,22,18,0.88)_0%,rgba(28,22,18,0.72)_38%,rgba(28,22,18,0.45)_62%,rgba(28,22,18,0.55)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(201,162,39,0.18)_0%,transparent_50%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[420px] animate-reveal">
          <div className="overflow-hidden rounded-3xl bg-[var(--brand-cream)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.65)] ring-1 ring-white/15">
            <div className="border-b border-[var(--brand-line)]/70 bg-white px-7 pb-5 pt-6 sm:px-8">
              <div className="flex items-center justify-between gap-3">
                <Image
                  src={HOTEL.logoPath}
                  alt={HOTEL.name}
                  width={200}
                  height={88}
                  priority
                  className="h-12 w-auto object-contain sm:h-14"
                />
                <Link
                  href="/"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)] transition hover:text-[var(--brand-ink)]"
                >
                  Sitio web
                </Link>
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
                Personal autorizado
              </p>
              <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-[1.65rem] font-extrabold leading-tight text-[var(--brand-ink)] sm:text-3xl">
                Acceso al panel
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
                {inviteToken
                  ? "Elige tu contraseña para activar tu cuenta de personal."
                  : "Correo y contraseña del hotel. Sin registro público."}
              </p>
            </div>

            <div className="px-7 py-6 sm:px-8 sm:py-7">
              {sessionExpired ? (
                <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
                  La sesión se cerró por inactividad o venció. Vuelve a iniciar
                  sesión.
                </p>
              ) : null}
              <StaffAuthForm
                nextPath={nextPath}
                compact
                inviteToken={inviteToken || undefined}
              />
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-white/55">
            {HOTEL.name} · {HOTEL.city}
          </p>
        </div>
      </div>
    </main>
  );
}

function safeStaffNext(next: string | null | undefined): string {
  const path = safeNextPath(next);
  if (path === "/admin" || path.startsWith("/admin/") || path === "/personal") {
    return path === "/personal" ? "/admin" : path;
  }
  return "/admin";
}
