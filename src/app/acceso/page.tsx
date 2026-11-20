import { redirect } from "next/navigation";
import { AuthForm } from "@/components/hotel/auth-form";
import { PageHero } from "@/components/hotel/page-hero";
import { getSessionUser, isGoogleAuthConfigured } from "@/lib/auth";

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
      ? "Google no está disponible aquí. Usa el código por correo."
      : params.error
        ? "No se pudo completar el acceso con Google. Usa el código por correo."
        : null;

  return (
    <main>
      <PageHero
        title="Acceso"
        subtitle="Ingresa con tu correo. Te enviamos un código para reservar y ver tus comprobantes."
        imageSrc="/hotel/simple.png"
      />
      <section className="mx-auto max-w-md px-6 py-12">
        {errorMessage && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            {errorMessage}
          </p>
        )}
        <AuthForm
          nextPath={nextPath}
          googleEnabled={isGoogleAuthConfigured()}
          title="Entra con tu correo"
          subtitle="Recibirás un código de acceso en tu email. Así también te llega el comprobante de reserva."
        />
      </section>
    </main>
  );
}
