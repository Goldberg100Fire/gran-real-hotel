"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Oculta chrome público (footer, chat) en login y panel del personal. */
export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStaffSurface =
    pathname === "/personal" ||
    pathname.startsWith("/personal/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (isStaffSurface) return null;
  return <>{children}</>;
}
