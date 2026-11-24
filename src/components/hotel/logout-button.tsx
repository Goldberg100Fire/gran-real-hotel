"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-lg border border-[var(--brand-line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--brand-ink)] transition hover:bg-[var(--brand-mist)]"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/personal");
        router.refresh();
      }}
    >
      Cerrar sesión
    </button>
  );
}
