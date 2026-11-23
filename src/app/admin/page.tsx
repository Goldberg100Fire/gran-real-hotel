import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/hotel/admin-panel";
import { PageHero } from "@/components/hotel/page-hero";
import { getSessionUser, isStaffRole } from "@/lib/auth";
import { USER_ROLE_LABELS } from "@/lib/types";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/personal?next=/admin");
  }
  if (!isStaffRole(user.role)) {
    redirect("/");
  }

  return (
    <main>
      <PageHero
        title="Administración"
        subtitle={`${USER_ROLE_LABELS[user.role]} · ${user.name}`}
        imageSrc="/hotel/doble.png"
      />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminPanel
          adminEmail={user.email}
          adminName={user.name}
          role={user.role}
        />
      </div>
    </main>
  );
}
