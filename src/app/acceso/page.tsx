import { redirect } from "next/navigation";
import { AuthForm } from "@/components/hotel/auth-form";
import { PageHero } from "@/components/hotel/page-hero";
import { getSessionUser, isGoogleAuthConfigured, isStaffRole } from "@/lib/auth";

export const metadata = {
  title: "Acceso",
};

export default async function AccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; completar?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/mis-reservas";
  const needsDocument =
    params.completar === "documento" ||
    (user && !isStaffRole(user.role) && !user.document);

  if (user && !needsDocument) {
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
        title="Acceso seguro"
        subtitle="Clientes con documento único. Personal del hotel solo con correo autorizado."
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
          googleEnabled={isGoogleAuthConfigured() && !needsDocument}
          completeDocumentOnly={Boolean(needsDocument && user)}
          title={
            needsDocument && user
              ? "Completa tu identidad"
              : "Entra con tu correo"
          }
          subtitle={
            needsDocument && user
              ? "Registra tu DNI, carné o pasaporte para vincular la cuenta."
              : "Huéspedes: correo + documento. Personal: solo correos autorizados por el jefe."
          }
        />
      </section>
    </main>
  );
}
