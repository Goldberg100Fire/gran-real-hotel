import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/hotel/admin-panel";
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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <AdminPanel adminEmail={user.email} adminName={user.name} />
    </main>
  );
}
