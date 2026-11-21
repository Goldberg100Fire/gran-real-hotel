"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  nextPath = "/",
  googleEnabled = false,
  title = "Entra con tu correo",
  subtitle = "Te enviamos un código de acceso.",
  requireDocument = true,
  completeDocumentOnly = false,
  portal = "cliente",
}: {
  nextPath?: string;
  googleEnabled?: boolean;
  title?: string;
  subtitle?: string;
  requireDocument?: boolean;
  completeDocumentOnly?: boolean;
  portal?: "cliente" | "personal";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "document">(
    completeDocumentOnly ? "document" : "email",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleHref = useMemo(
    () => `/api/auth/google?next=${encodeURIComponent(nextPath)}&portal=${portal}`,
    [nextPath, portal],
  );

  const isStaffPortal = portal === "personal";

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, portal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo enviar el código");
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
        body: JSON.stringify({
          email,
          code,
          name,
          phone,
          document: requireDocument && !isStaffPortal ? document : undefined,
          portal,
        }),
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

  async function completeDocument(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, phone, name }),
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

  const cardClass = isStaffPortal
    ? "space-y-6 rounded-[1.75rem] bg-white p-8 text-[var(--brand-ink)] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.55)]"
    : "space-y-6 rounded-[1.75rem] bg-white p-8 shadow-[0_24px_60px_-32px_rgba(44,36,30,0.45)] ring-1 ring-[var(--brand-line)]";

  return (
    <div className={cardClass}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand-gold)]">
          Gran Real Hotel
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">{subtitle}</p>
      </div>

      {step === "email" && (
        <form onSubmit={requestCode} className="space-y-4">
          {!isStaffPortal && (
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="María López"
                className="h-11 rounded-xl"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={
                isStaffPortal ? "correo@hotel.com" : "tu@correo.com"
              }
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-[var(--brand-deep)] font-semibold hover:bg-[var(--brand-ink)]"
          >
            {loading ? "Enviando..." : "Enviar código al correo"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-[var(--brand-muted)]">
            Enviamos un código a{" "}
            <strong className="text-[var(--brand-ink)]">{email}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              inputMode="numeric"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              className="h-11 rounded-xl tracking-[0.3em]"
            />
          </div>
          {requireDocument && !isStaffPortal && (
            <>
              <div className="space-y-2">
                <Label htmlFor="document">DNI / pasaporte / carné</Label>
                <Input
                  id="document"
                  value={document}
                  onChange={(event) => setDocument(event.target.value)}
                  placeholder="Ej. 71234567"
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-[var(--brand-muted)]">
                  Obligatorio para huéspedes. Un documento = una cuenta.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="978 113 578"
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
            {loading ? "Verificando..." : isStaffPortal ? "Entrar al panel" : "Entrar"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-[var(--brand-muted)] underline underline-offset-4"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
          >
            Usar otro correo
          </button>
        </form>
      )}

      {step === "document" && (
        <form onSubmit={completeDocument} className="space-y-4">
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            Para reservar debes registrar tu documento de identidad.
          </p>
          <div className="space-y-2">
            <Label htmlFor="doc-name">Nombre completo</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-id">DNI / pasaporte / carné</Label>
            <Input
              id="doc-id"
              value={document}
              onChange={(event) => setDocument(event.target.value)}
              placeholder="Ej. 71234567"
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-phone">Teléfono</Label>
            <Input
              id="doc-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-[var(--brand-deep)] font-semibold hover:bg-[var(--brand-ink)]"
          >
            {loading ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </form>
      )}

      {googleEnabled && step === "email" && !isStaffPortal && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--brand-muted)]">
            <span className="h-px flex-1 bg-[var(--brand-line)]" />
            opcional
            <span className="h-px flex-1 bg-[var(--brand-line)]" />
          </div>
          <a
            href={googleHref}
            className="flex h-11 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white text-sm font-medium text-[var(--brand-ink)] transition hover:bg-[var(--brand-mist)]"
          >
            Continuar con Google
          </a>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
