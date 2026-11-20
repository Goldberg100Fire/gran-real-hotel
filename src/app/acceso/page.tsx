import { AuthForm } from "@/components/hotel/auth-form";
import { SiteHeader } from "@/components/hotel/site-header";
import { getSessionUser, isGoogleAuthConfigured } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Acceso",
};

export default async function AccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/mis-reservas";

  if (user) {
    redirect(nextPath);
  }

  const errorMessage =
    params.error === "google_no_configurado"
      ? "Google aún no está configurado en este entorno. Usa el código por correo."
      : params.error
        ? "No se pudo completar el acceso con Google. Prueba el código por correo."
        : null;

  return (
    <main>
      <div className="relative h-40 bg-[linear-gradient(135deg,#06262f,#0b3d4a_60%,#2a9d8f)]">
        <SiteHeader />
      </div>
      <section className="mx-auto max-w-md px-6 py-12">
        {errorMessage && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errorMessage}
          </p>
        )}
        <AuthForm
          nextPath={nextPath}
          googleEnabled={isGoogleAuthConfigured()}
        />
      </section>
    </main>
  );
}
