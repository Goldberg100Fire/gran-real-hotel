import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/hotel/admin-panel";
import { PageHero } from "@/components/hotel/page-hero";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/acceso?next=/admin");
  }
  if (!user.isAdmin) {
    redirect("/mis-reservas");
  }

  return (
    <main>
      <PageHero
        title="Administración"
        subtitle={`${user.name} · panel del hotel`}
        imageSrc="/hotel/doble.png"
      />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminPanel adminEmail={user.email} adminName={user.name} />
      </div>
    </main>
  );
}
