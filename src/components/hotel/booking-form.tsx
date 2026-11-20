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
  const [sessionDocument, setSessionDocument] = useState<string | null>(null);
  const [needsDocument, setNeedsDocument] = useState(false);
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
          const doc = auth.user.document ? String(auth.user.document) : "";
          setSessionDocument(doc || null);
          setNeedsDocument(auth.user.role === "cliente" && !doc);
          if (doc) setGuestDocument(doc);
        } else {
          setSessionEmail(null);
          setNeedsDocument(false);
        }
        setPaymentsReady(Boolean(config.mercadopagoConfigured));
      })
      .catch(() => {
        setSessionEmail(null);
        setNeedsDocument(false);
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

  const payload = {
    roomTypeId,
    checkIn,
    checkOut,
    guests,
    guestName,
    guestPhone,
    guestDocument,
    specialRequests,
  };

  async function confirmAtHotel(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!sessionEmail) {
        throw new Error("Inicia sesión con tu correo para continuar");
      }

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          paymentMethod: "pago_en_hotel",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la reserva");
      }

      const code = data.reservation?.code as string | undefined;
      router.push(code ? `/reservar/exito?code=${encodeURIComponent(code)}` : "/mis-reservas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  async function payOnline() {
    setError(null);
    setLoading(true);

    try {
      if (!sessionEmail) {
        throw new Error("Inicia sesión con tu correo para continuar");
      }
      if (!paymentsReady) {
        throw new Error("El pago en línea se activará más adelante.");
      }

      const response = await fetch("/api/reservations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar el pago");
      }
      if (!data.checkoutUrl) {
        throw new Error("No se generó la URL de pago");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <p className="text-sm text-[var(--brand-muted)]">Verificando acceso...</p>
    );
  }

  if (!sessionEmail || needsDocument) {
    return (
      <div className="space-y-4 rounded-2xl bg-[var(--brand-mist)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
          {needsDocument ? "Completa tu documento" : "Accede con tu correo"}
        </h2>
        <p className="text-sm text-[var(--brand-muted)]">
          {needsDocument
            ? "Debes vincular tu DNI, carné o pasaporte a la cuenta antes de reservar."
            : "Para reservar necesitas correo verificado y documento de identidad único."}
        </p>
        <Link
          href={
            needsDocument
              ? "/acceso?next=/reservar&completar=documento"
              : "/acceso?next=/reservar"
          }
          className="inline-flex rounded-full bg-[var(--brand-deep)] px-5 py-3 text-sm font-semibold text-white"
        >
          {needsDocument ? "Registrar documento" : "Continuar con correo"}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={confirmAtHotel} className="space-y-8">
      <div className="rounded-2xl bg-[var(--brand-mist)] px-4 py-3 text-sm text-[var(--brand-ink)]">
        Reservando como <strong>{sessionName || sessionEmail}</strong> ·{" "}
        {sessionEmail}. Te enviaremos el comprobante a este correo.
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
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
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
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
              onChange={(event) => {
                if (!sessionDocument) setGuestDocument(event.target.value);
              }}
              placeholder="12345678"
              required
              readOnly={Boolean(sessionDocument)}
              className={sessionDocument ? "bg-[var(--brand-mist)]" : undefined}
            />
            {sessionDocument && (
              <p className="text-xs text-[var(--brand-muted)]">
                Documento vinculado a tu cuenta (no se puede cambiar).
              </p>
            )}
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
            {selectedType?.name} · pago en el hotel
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--brand-ink)]">
            {formatMoney(total)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full bg-[var(--brand-deep)] px-8 font-semibold text-white hover:bg-[var(--brand-ink)]"
          >
            {loading ? "Confirmando..." : "Confirmar reserva"}
          </Button>
          {paymentsReady && (
            <button
              type="button"
              disabled={loading}
              onClick={payOnline}
              className="text-sm font-medium text-[var(--brand-muted)] underline underline-offset-4"
            >
              O pagar ahora con Yape / tarjeta
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
