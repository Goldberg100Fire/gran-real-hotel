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
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type RoomType,
} from "@/lib/types";

interface BookingFormProps {
  roomTypes: RoomType[];
  initialTypeId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tarjeta");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.user?.email) {
          setSessionEmail(data.user.email);
          setSessionName(data.user.name || "");
          setGuestName((current) => current || data.user.name || "");
        } else {
          setSessionEmail(null);
        }
      })
      .finally(() => setCheckingSession(false));
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
      if (paymentMethod === "tarjeta" && cardNumber.replace(/\s/g, "").length < 12) {
        throw new Error("Ingresa un número de tarjeta de demostración (12+ dígitos)");
      }

      const response = await fetch("/api/reservations", {
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
          paymentMethod,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo completar la reserva");
      }

      const receiptMode = data.receipt?.mode || "demo";
      router.push(
        `/reservar/exito?code=${data.reservation.code}&mail=${receiptMode}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <p className="text-sm text-[var(--ocean-muted)]">Verificando acceso...</p>;
  }

  if (!sessionEmail) {
    return (
      <div className="space-y-4 rounded-2xl bg-[var(--ocean-mist)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
          Accede con tu correo
        </h2>
        <p className="text-sm text-[var(--ocean-muted)]">
          Para reservar y recibir el comprobante, inicia sesión con Google o un
          código enviado a tu email.
        </p>
        <Link
          href="/acceso?next=/reservar"
          className="inline-flex rounded-full bg-[var(--ocean-deep)] px-5 py-3 text-sm font-medium text-white"
        >
          Continuar con correo
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="rounded-2xl bg-[var(--ocean-mist)] px-4 py-3 text-sm text-[var(--ocean-ink)]">
        Reservando como <strong>{sessionName || sessionEmail}</strong> ·{" "}
        {sessionEmail}. El comprobante se enviará a este correo.
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
          Fechas y habitación
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roomType">Tipo de habitación</Label>
            <select
              id="roomType"
              className="h-10 w-full rounded-lg border border-[var(--ocean-line)] bg-white px-3 text-sm"
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
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
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

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
          Pago
        </h2>
        <p className="text-sm text-[var(--ocean-muted)]">
          El cobro online funciona en modo demostración. El comprobante se envía
          al correo de tu sesión.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METHODS.map((method) => (
            <label
              key={method}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                paymentMethod === method
                  ? "border-[var(--ocean-deep)] bg-[var(--ocean-mist)]"
                  : "border-[var(--ocean-line)] bg-white"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
              />
              {PAYMENT_METHOD_LABELS[method]}
            </label>
          ))}
        </div>

        {paymentMethod === "tarjeta" && (
          <div className="grid gap-4 rounded-2xl bg-[var(--ocean-mist)] p-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cardName">Nombre en la tarjeta</Label>
              <Input
                id="cardName"
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
                placeholder="MARIA LOPEZ"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cardNumber">Número de tarjeta (demo)</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                placeholder="4111 1111 1111 1111"
                inputMode="numeric"
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--ocean-line)] bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[var(--ocean-muted)]">
            {Math.max(nights, 1)} noche{nights === 1 ? "" : "s"} ·{" "}
            {selectedType?.name}
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-ink)]">
            {formatMoney(total)}
          </p>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 rounded-full bg-[var(--ocean-deep)] px-8 text-white hover:bg-[var(--ocean-ink)]"
        >
          {loading ? "Procesando..." : "Confirmar y enviar comprobante"}
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
