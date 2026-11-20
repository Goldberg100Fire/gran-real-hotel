"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-full border border-[var(--ocean-line)] bg-white px-5 py-2 text-sm text-[var(--ocean-ink)]"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Cerrar sesión
    </button>
  );
}
