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
    redirect("/mis-reservas");
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[var(--brand-deep)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/hotel/simple.png"
          alt=""
          fill
          className="object-cover opacity-25"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(28,22,18,0.96)_0%,rgba(44,36,30,0.88)_55%,rgba(28,22,18,0.94)_100%)]" />
      </div>
      <div className="relative mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-16">
        <Image
          src={HOTEL.logoPath}
          alt={HOTEL.name}
          width={200}
          height={86}
          className="mb-8 h-14 w-auto"
          priority
        />
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
          Solo personal autorizado
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold">
          Acceso del hotel
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Jefe y empleados. Los huéspedes reservan desde el sitio público.
        </p>
        <div className="mt-8">
          <AuthForm
            portal="personal"
            nextPath={nextPath}
            googleEnabled={false}
            requireDocument={false}
            title="Entrar al panel"
            subtitle="Correo autorizado por el jefe. Te enviamos un código."
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
