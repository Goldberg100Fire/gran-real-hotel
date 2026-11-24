"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "setup" | "jefe-recover" | "empleado-request";

type PublicConfig = {
  emailAuthEnabled?: boolean;
  firestoreConfigured?: boolean;
  adminBootstrapEnabled?: boolean;
  storage?: string;
};

export function StaffAuthForm({ nextPath = "/admin" }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [setupStep, setSetupStep] = useState<"email" | "code">("email");
  const [jefeStep, setJefeStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [configHint, setConfigHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config/public")
      .then((response) => response.json())
      .then((data: PublicConfig) => {
        if (cancelled) return;
        if (!data.firestoreConfigured && !data.adminBootstrapEnabled) {
          setConfigHint(
            "Faltan variables en el servidor (Firestore o ADMIN_PASSWORD). El administrador debe configurarlas en Vercel.",
          );
        } else if (!data.firestoreConfigured) {
          setConfigHint(
            "Puedes entrar con la contraseña de arranque. Para guardar fotos y personal de forma permanente, configura Firestore en Vercel.",
          );
        } else if (!data.emailAuthEnabled) {
          setConfigHint(
            "El correo (Resend) no está configurado: no se podrán enviar códigos de primer acceso o recuperación.",
          );
        } else {
          setConfigHint(null);
        }
      })
      .catch(() => {
        if (!cancelled) setConfigHint(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo entrar");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onSetup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (setupStep === "email") {
        const response = await fetch("/api/auth/setup-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "request", email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo enviar");
        setInfo(data.message);
        setSetupStep("code");
        return;
      }

      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          email,
          code,
          password,
          confirm,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onJefeRecover(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (jefeStep === "email") {
        const response = await fetch("/api/auth/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "jefe-request", email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo enviar");
        setInfo(data.message);
        setJefeStep("code");
        return;
      }

      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "jefe-confirm",
          email,
          code,
          password,
          confirm,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo recuperar");
      setInfo(data.message);
      setMode("login");
      setJefeStep("email");
      setPassword("");
      setConfirm("");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onEmpleadoRequest(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "empleado-request", email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo enviar");
      setInfo(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 rounded-2xl bg-white/95 p-7 text-[var(--brand-ink)] shadow-[0_22px_50px_-30px_rgba(44,36,30,0.5)] ring-1 ring-[var(--brand-line)] backdrop-blur-sm">
      {mode === "login" && (
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
              Entrar al panel
            </h2>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              Solo correos autorizados. Correo y contraseña.
            </p>
            {configHint && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
                {configHint}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@hotel.com"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-xl"
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-[var(--brand-deep)] font-semibold hover:bg-[var(--brand-ink)]"
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </Button>
          <div className="flex flex-col gap-2 pt-1 text-sm">
            <button
              type="button"
              className="text-left text-[var(--brand-muted)] underline-offset-4 hover:underline"
              onClick={() => {
                setMode("setup");
                setSetupStep("email");
                setCode("");
                setPassword("");
                setConfirm("");
                setInfo(null);
                setError(null);
              }}
            >
              Primer acceso: verificar correo y crear contraseña
            </button>
            <button
              type="button"
              className="text-left text-[var(--brand-muted)] underline-offset-4 hover:underline"
              onClick={() => {
                setMode("jefe-recover");
                setJefeStep("email");
                setInfo(null);
                setError(null);
              }}
            >
              Soy el jefe y olvidé mi contraseña
            </button>
            <button
              type="button"
              className="text-left text-[var(--brand-muted)] underline-offset-4 hover:underline"
              onClick={() => {
                setMode("empleado-request");
                setInfo(null);
                setError(null);
              }}
            >
              Soy empleado y olvidé mi contraseña
            </button>
          </div>
        </form>
      )}

      {mode === "setup" && (
        <form onSubmit={onSetup} className="space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
              Crear contraseña
            </h2>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              Te enviamos un código a tu correo autorizado. Sin ese código no se
              puede crear la contraseña.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-email">Correo autorizado</Label>
            <Input
              id="setup-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl"
              disabled={setupStep === "code"}
            />
          </div>
          {setupStep === "code" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="setup-code">Código del correo</Label>
                <Input
                  id="setup-code"
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="h-11 rounded-xl tracking-[0.3em]"
                  placeholder="123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-password">Nueva contraseña</Label>
                <Input
                  id="setup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-confirm">Confirmar</Label>
                <Input
                  id="setup-confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-[var(--brand-deep)] font-semibold hover:bg-[var(--brand-ink)]"
          >
            {loading
              ? "Procesando..."
              : setupStep === "email"
                ? "Enviar código al correo"
                : "Verificar y entrar"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-[var(--brand-muted)] underline underline-offset-4"
            onClick={() => {
              if (setupStep === "code") {
                setSetupStep("email");
                setCode("");
                setInfo(null);
                return;
              }
              setMode("login");
              setInfo(null);
              setError(null);
            }}
          >
            {setupStep === "code" ? "Usar otro correo" : "Volver al inicio de sesión"}
          </button>
        </form>
      )}

      {mode === "jefe-recover" && (
        <form onSubmit={onJefeRecover} className="space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
              Recuperar (solo jefe)
            </h2>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              Enviamos un código al correo del jefe. Los empleados no pueden
              recuperar solos.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jefe-email">Correo del jefe</Label>
            <Input
              id="jefe-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          {jefeStep === "code" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="jefe-code">Código del correo</Label>
                <Input
                  id="jefe-code"
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="h-11 rounded-xl tracking-[0.3em]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jefe-password">Nueva contraseña</Label>
                <Input
                  id="jefe-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jefe-confirm">Confirmar</Label>
                <Input
                  id="jefe-confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-[var(--brand-deep)] font-semibold hover:bg-[var(--brand-ink)]"
          >
            {loading
              ? "Procesando..."
              : jefeStep === "email"
                ? "Enviar código"
                : "Guardar contraseña"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-[var(--brand-muted)] underline underline-offset-4"
            onClick={() => {
              setMode("login");
              setJefeStep("email");
              setInfo(null);
              setError(null);
            }}
          >
            Volver
          </button>
        </form>
      )}

      {mode === "empleado-request" && (
        <form onSubmit={onEmpleadoRequest} className="space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
              Pedir recuperación
            </h2>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              El jefe autoriza en el panel. Luego usa “Primer acceso” para
              recibir un código y crear la nueva contraseña.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-email">Tu correo autorizado</Label>
            <Input
              id="emp-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-[var(--brand-deep)] font-semibold hover:bg-[var(--brand-ink)]"
          >
            {loading ? "Enviando..." : "Enviar solicitud al jefe"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-[var(--brand-muted)] underline underline-offset-4"
            onClick={() => {
              setMode("login");
              setInfo(null);
              setError(null);
            }}
          >
            Volver
          </button>
        </form>
      )}

      {info && (
        <p className="rounded-xl bg-[var(--brand-mist)] px-3 py-2 text-sm text-[var(--brand-ink)]">
          {info}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
