"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Cierra la sesión del panel tras inactividad (por defecto 30 min). */
export function SessionGuard({
  idleMinutes = 30,
}: {
  idleMinutes?: number;
}) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const idleMs = Math.max(1, idleMinutes) * 60 * 1000;

    async function logout() {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // igual redirigimos
      }
      router.replace("/personal?next=/admin&error=session");
      router.refresh();
    }

    function resetTimer() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void logout();
      }, idleMs);
    }

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "visibilitychange",
    ];

    const onActivity = () => {
      if (document.visibilityState === "hidden") return;
      resetTimer();
    };

    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    resetTimer();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [idleMinutes, router]);

  return null;
}
