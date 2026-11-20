"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import type { RoomType } from "@/lib/types";

interface BookingFormProps {
  roomTypes: RoomType[];
  initialTypeId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}

export function BookingForm({
  roomTypes,
  initialTypeId,
  initialCheckIn,
  initialCheckOut,
}: BookingFormProps) {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultOut = format(addDays(new Date(), 2), "yyyy-MM-dd");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [paymentsReady, setPaymentsReady] = useState(false);

  const [roomTypeId, setRoomTypeId] = useState(
    initialTypeId && roomTypes.some((type) => type.id === initialTypeId)
      ? initialTypeId
      : roomTypes[0]?.id ?? "",
  );
  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(initialCheckOut || defaultOut);
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestDocument, setGuestDocument] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    Promise.all([
      fetch("/api/auth/me", { signal: controller.signal }).then((r) => r.json()),
      fetch("/api/config/public", { signal: controller.signal }).then((r) =>
        r.json(),
      ),
    ])
      .then(([auth, config]) => {
        if (auth.user?.email) {
          setSessionEmail(auth.user.email);
          setSessionName(auth.user.name || "");
          setGuestName((current) => current || auth.user.name || "");
        } else {
          setSessionEmail(null);
        }
        setPaymentsReady(Boolean(config.mercadopagoConfigured));
      })
      .catch(() => {
        setSessionEmail(null);
        setPaymentsReady(false);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setCheckingSession(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const selectedType = useMemo(
    () => roomTypes.find((type) => type.id === roomTypeId),
    [roomTypes, roomTypeId],
  );

  const nights = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
    const start = new Date(`${checkIn}T12:00:00`);
    const end = new Date(`${checkOut}T12:00:00`);
    return Math.max(
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      0,
    );
  }, [checkIn, checkOut]);

  const total = selectedType ? selectedType.basePrice * Math.max(nights, 1) : 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!sessionEmail) {
        throw new Error("Inicia sesión con tu correo para continuar");
      }
      if (!paymentsReady) {
        throw new Error(
          "Los pagos aún no están configurados. Falta Mercado Pago en los secretos.",
        );
      }

      const response = await fetch("/api/reservations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId,
          checkIn,
          checkOut,
          guests,
          guestName,
          guestPhone,
          guestDocument,
          specialRequests,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar el pago");
      }

      if (!data.checkoutUrl) {
        throw new Error("Mercado Pago no devolvió la URL de pago");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <p className="text-sm text-[var(--brand-muted)]">Verificando acceso...</p>;
  }

  if (!sessionEmail) {
    return (
      <div className="space-y-4 rounded-2xl bg-[var(--brand-mist)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--brand-ink)]">
          Accede con tu correo
        </h2>
        <p className="text-sm text-[var(--brand-muted)]">
          Para reservar y recibir el comprobante, inicia sesión con Google o un
          código enviado a tu email.
        </p>
        <Link
          href="/acceso?next=/reservar"
          className="inline-flex rounded-full bg-[var(--brand-deep)] px-5 py-3 text-sm font-medium text-white"
        >
          Continuar con correo
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="rounded-2xl bg-[var(--brand-mist)] px-4 py-3 text-sm text-[var(--brand-ink)]">
        Reservando como <strong>{sessionName || sessionEmail}</strong> ·{" "}
        {sessionEmail}. Tras pagar con Stripe se enviará el comprobante a este
        correo.
      </div>

      {!paymentsReady && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Mercado Pago aún no está configurado. Puedes llenar el formulario, pero
          el pago (Yape/tarjeta) no iniciará hasta agregar las claves.
        </p>
      )}

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--brand-ink)]">
          Fechas y habitación
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roomType">Tipo de habitación</Label>
            <select
              id="roomType"
              className="h-10 w-full rounded-lg border border-[var(--brand-line)] bg-white px-3 text-sm"
              value={roomTypeId}
              onChange={(event) => setRoomTypeId(event.target.value)}
              required
            >
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} — {formatMoney(type.basePrice)}/noche
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guests">Huéspedes</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={selectedType?.maxGuests ?? 5}
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkIn">Ingreso</Label>
            <Input
              id="checkIn"
              type="date"
              min={today}
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkOut">Salida</Label>
            <Input
              id="checkOut"
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--brand-ink)]">
          Datos del huésped
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="guestName">Nombre completo</Label>
            <Input
              id="guestName"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="María López Quispe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestPhone">Teléfono</Label>
            <Input
              id="guestPhone"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              placeholder="999 888 777"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestDocument">DNI / Pasaporte</Label>
            <Input
              id="guestDocument"
              value={guestDocument}
              onChange={(event) => setGuestDocument(event.target.value)}
              placeholder="12345678"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="specialRequests">Pedidos especiales (opcional)</Label>
            <Textarea
              id="specialRequests"
              value={specialRequests}
              onChange={(event) => setSpecialRequests(event.target.value)}
              placeholder="Llegada tarde, cuna, piso alto..."
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--brand-line)] bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[var(--brand-muted)]">
            {Math.max(nights, 1)} noche{nights === 1 ? "" : "s"} ·{" "}
            {selectedType?.name} · Mercado Pago (Yape / tarjeta)
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand-ink)]">
            {formatMoney(total)}
          </p>
        </div>
        <Button
          type="submit"
          disabled={loading || !paymentsReady}
          className="h-12 rounded-full bg-[var(--brand-deep)] px-8 text-white hover:bg-[var(--brand-ink)]"
        >
          {loading ? "Abriendo Mercado Pago..." : "Pagar con Yape / tarjeta"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
