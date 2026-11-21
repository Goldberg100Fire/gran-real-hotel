import { redirect } from "next/navigation";
import { AuthForm } from "@/components/hotel/auth-form";
import { PageHero } from "@/components/hotel/page-hero";
import {
  getSessionUser,
  isGoogleAuthConfigured,
  isStaffRole,
  safeNextPath,
} from "@/lib/auth";

export const metadata = {
  title: "Acceso",
};

function safeClientNext(next: string | null | undefined): string {
  const path = safeNextPath(next);
  // Clientes no deben aterrizar en el panel del personal
  if (path.startsWith("/admin") || path.startsWith("/personal")) {
    return "/mis-reservas";
  }
  return path === "/" ? "/mis-reservas" : path;
}

export default async function AccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; completar?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const nextPath = safeClientNext(params.next);
  const needsDocument =
    params.completar === "documento" ||
    (user && !isStaffRole(user.role) && !user.document);

  if (user && isStaffRole(user.role)) {
    redirect("/admin");
  }

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
        title="Acceso huéspedes"
        subtitle="Reserva y consulta tus comprobantes con correo y documento de identidad."
        imageSrc="/hotel/simple.png"
      />
      <section className="mx-auto max-w-md px-6 py-12">
        {errorMessage && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            {errorMessage}
          </p>
        )}
        <AuthForm
          portal="cliente"
          nextPath={nextPath}
          googleEnabled={isGoogleAuthConfigured() && !needsDocument}
          completeDocumentOnly={Boolean(needsDocument && user)}
          requireDocument
          title={
            needsDocument && user
              ? "Completa tu identidad"
              : "Entra con tu correo"
          }
          subtitle={
            needsDocument && user
              ? "Registra tu DNI, carné o pasaporte para vincular la cuenta."
              : "Solo para huéspedes. Un documento = una cuenta."
          }
        />
      </section>
    </main>
  );
}
