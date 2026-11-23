import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/hotel/auth-form";
import { getSessionUser, isStaffRole, safeNextPath } from "@/lib/auth";
import { HOTEL } from "@/lib/hotel-info";

export const metadata = {
  title: "Acceso personal",
  robots: { index: false, follow: false },
};

export default async function PersonalAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const nextPath = safeStaffNext(params.next);

  if (user && isStaffRole(user.role)) {
    redirect(nextPath);
  }
  if (user && !isStaffRole(user.role)) {
    redirect("/");
  }

  return (
    <main className="relative isolate min-h-[100svh] overflow-hidden bg-[var(--brand-cream)]">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/hotel/matrimonial-1.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(247,243,239,0.97)_0%,rgba(247,243,239,0.88)_42%,rgba(44,36,30,0.35)_72%,rgba(44,36,30,0.55)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_40%,rgba(247,243,239,0.5)_0%,transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl items-center px-6 py-14 md:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-start gap-4">
            <div className="rounded-2xl bg-[var(--brand-cream)]/95 px-5 py-4 shadow-[0_18px_40px_-28px_rgba(44,36,30,0.45)] ring-1 ring-[var(--brand-line)]/70 backdrop-blur-sm">
              <Image
                src={HOTEL.logoPath}
                alt={HOTEL.name}
                width={320}
                height={140}
                priority
                className="h-auto w-[min(72vw,260px)] object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
                Solo personal autorizado
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)] md:text-4xl">
                Acceso del hotel
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--brand-muted)]">
                Jefe y empleados. El público consulta en la web y reserva por
                teléfono.
              </p>
            </div>
          </div>

          <AuthForm
            portal="personal"
            nextPath={nextPath}
            googleEnabled={false}
            requireDocument={false}
            title="Entrar al panel"
            subtitle="Correo autorizado. Te enviamos un código de 6 dígitos."
          />
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
