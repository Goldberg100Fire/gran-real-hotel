import { AdminPanel } from "@/components/hotel/admin-panel";
import { isUsingDemoAdminPassword } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <AdminPanel
        demoPasswordHint={
          isUsingDemoAdminPassword() ? "brisa-admin" : undefined
        }
      />
    </main>
  );
}
