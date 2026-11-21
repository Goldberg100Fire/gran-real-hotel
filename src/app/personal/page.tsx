import { redirect } from "next/navigation";
import { AuthForm } from "@/components/hotel/auth-form";
import { getSessionUser, isStaffRole, safeNextPath } from "@/lib/auth";

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(201,162,39,0.18),transparent_45%),radial-gradient(ellipse_at_90%_80%,rgba(240,232,223,0.08),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
          Solo personal autorizado
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold">
          Acceso del hotel
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Jefe y empleados. Esta página no es para huéspedes. Los clientes
          reservan desde el sitio público.
        </p>
        <div className="mt-8">
          <AuthForm
            portal="personal"
            nextPath={nextPath}
            googleEnabled={false}
            requireDocument={false}
            title="Entrar al panel"
            subtitle="Usa el correo autorizado por el jefe. Te enviamos un código."
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
