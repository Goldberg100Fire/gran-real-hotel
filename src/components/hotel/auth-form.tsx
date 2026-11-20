"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  nextPath = "/",
  googleEnabled = false,
  title = "Accede con tu correo",
  subtitle = "Usa Google o un código enviado a tu email para reservar y ver tus comprobantes.",
}: {
  nextPath?: string;
  googleEnabled?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleHref = useMemo(
    () => `/api/auth/google?next=${encodeURIComponent(nextPath)}`,
    [nextPath],
  );

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo enviar el código");
      setDemoCode(data.demoCode ?? null);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Código inválido");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 rounded-[1.75rem] bg-white/95 p-8 shadow-xl ring-1 ring-[var(--ocean-line)]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-ink)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--ocean-muted)]">{subtitle}</p>
      </div>

      {googleEnabled && (
        <a
          href={googleHref}
          className="flex h-11 items-center justify-center rounded-full border border-[var(--ocean-line)] bg-white text-sm font-medium text-[var(--ocean-ink)] transition hover:bg-[var(--ocean-mist)]"
        >
          Continuar con Google
        </a>
      )}

      {googleEnabled && (
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--ocean-muted)]">
          <span className="h-px flex-1 bg-[var(--ocean-line)]" />
          o con código
          <span className="h-px flex-1 bg-[var(--ocean-line)]" />
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={requestCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="María López"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--ocean-deep)]"
          >
            {loading ? "Enviando..." : "Enviar código al correo"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-[var(--ocean-muted)]">
            Enviamos un código a <strong>{email}</strong>
          </p>
          {demoCode && (
            <p className="rounded-xl bg-[var(--ocean-mist)] px-3 py-2 text-xs text-[var(--ocean-ink)]">
              Modo demo (sin Resend): tu código es <strong>{demoCode}</strong>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              inputMode="numeric"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--ocean-deep)]"
          >
            {loading ? "Verificando..." : "Entrar"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-[var(--ocean-muted)] underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setDemoCode(null);
            }}
          >
            Usar otro correo
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
