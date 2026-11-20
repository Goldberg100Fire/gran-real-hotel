"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatMoney } from "@/lib/format";
import { useRouter } from "next/navigation";
import {
  PAYMENT_METHOD_LABELS,
  RESERVATION_STATUS_LABELS,
  ROOM_STATUS_LABELS,
  type MailMessage,
  type Reservation,
  type ReservationStatus,
  type Room,
  type RoomStatus,
  type RoomType,
  type Service,
} from "@/lib/types";

interface Snapshot {
  rooms: Room[];
  roomTypes: RoomType[];
  services: Service[];
  reservations: Reservation[];
  mailOutbox: MailMessage[];
  stats: {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    activeReservations: number;
  };
}

const ROOM_STATUSES = Object.keys(ROOM_STATUS_LABELS) as RoomStatus[];
const RES_STATUSES = Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[];

export function AdminPanel({
  adminEmail,
  adminName,
}: {
  adminEmail: string;
  adminName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<
    "habitaciones" | "tipos" | "reservas" | "correos"
  >("habitaciones");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomTypeId, setNewRoomTypeId] = useState("");

  const loadSummary = useCallback(async () => {
    const response = await fetch("/api/admin/summary");
    if (response.status === 401) {
      router.push("/acceso?next=/admin");
      return;
    }
    if (!response.ok) {
      throw new Error("No se pudo cargar el panel");
    }
    const data = (await response.json()) as Snapshot;
    setSnapshot(data);
    setNewRoomTypeId((current) => current || data.roomTypes[0]?.id || "");
  }, [router]);

  useEffect(() => {
    loadSummary().catch((err) =>
      setError(err instanceof Error ? err.message : "Error"),
    );
  }, [loadSummary]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function patchRoom(id: string, patch: Record<string, unknown>) {
    const response = await fetch("/api/admin/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function patchRoomType(id: string, patch: Record<string, unknown>) {
    const response = await fetch("/api/admin/room-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function patchReservation(id: string, status: ReservationStatus) {
    const response = await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function addRoom(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/admin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: newRoomNumber,
        floor: newRoomFloor,
        roomTypeId: newRoomTypeId,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo crear");
      return;
    }
    setNewRoomNumber("");
    await loadSummary();
  }

  if (!snapshot) {
    return <p className="text-center text-[var(--ocean-muted)]">Cargando panel...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--ocean-ink)]">
            Administración
          </h1>
          <p className="mt-2 text-[var(--ocean-muted)]">
            Sesión admin: {adminName} · {adminEmail}
          </p>
        </div>
        <Button variant="outline" onClick={logout} className="rounded-full">
          Cerrar sesión
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Habitaciones", snapshot.stats.totalRooms],
          ["Disponibles", snapshot.stats.availableRooms],
          ["Ocupadas", snapshot.stats.occupiedRooms],
          ["Reservas activas", snapshot.stats.activeReservations],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-2xl bg-white p-5 ring-1 ring-[var(--ocean-line)]"
          >
            <p className="text-sm text-[var(--ocean-muted)]">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ocean-ink)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["habitaciones", "Habitaciones"],
            ["tipos", "Tipos y servicios"],
            ["reservas", "Reservas"],
            ["correos", "Comprobantes"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              tab === key
                ? "bg-[var(--ocean-deep)] text-white"
                : "bg-white text-[var(--ocean-ink)] ring-1 ring-[var(--ocean-line)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {tab === "habitaciones" && (
        <div className="space-y-6">
          <form
            onSubmit={addRoom}
            className="grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-[var(--ocean-line)] md:grid-cols-4"
          >
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={newRoomNumber}
                onChange={(event) => setNewRoomNumber(event.target.value)}
                placeholder="205"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Piso</Label>
              <Input
                type="number"
                min={1}
                value={newRoomFloor}
                onChange={(event) => setNewRoomFloor(Number(event.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 w-full rounded-lg border px-3 text-sm"
                value={newRoomTypeId}
                onChange={(event) => setNewRoomTypeId(event.target.value)}
              >
                {snapshot.roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full rounded-full bg-[var(--ocean-deep)]">
                Agregar habitación
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-[var(--ocean-line)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-[var(--ocean-mist)] text-[var(--ocean-muted)]">
                <tr>
                  <th className="px-4 py-3">Nº</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rooms.map((room) => {
                  const typeName =
                    snapshot.roomTypes.find((type) => type.id === room.roomTypeId)
                      ?.name ?? "—";
                  return (
                    <tr key={room.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{room.number}</td>
                      <td className="px-4 py-3">
                        <select
                          className="h-9 rounded-lg border px-2"
                          value={room.roomTypeId}
                          onChange={(event) =>
                            patchRoom(room.id, { roomTypeId: event.target.value }).catch(
                              (err) => setError(err.message),
                            )
                          }
                        >
                          {snapshot.roomTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-[var(--ocean-muted)]">{typeName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="h-9 rounded-lg border px-2"
                          value={room.status}
                          onChange={(event) =>
                            patchRoom(room.id, { status: event.target.value }).catch(
                              (err) => setError(err.message),
                            )
                          }
                        >
                          {ROOM_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {ROOM_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          defaultValue={room.notes}
                          placeholder="Notas"
                          onBlur={(event) =>
                            patchRoom(room.id, { notes: event.target.value }).catch(
                              (err) => setError(err.message),
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "tipos" && (
        <div className="grid gap-6">
          {snapshot.roomTypes.map((type) => (
            <div
              key={type.id}
              className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-[var(--ocean-line)]"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    defaultValue={type.name}
                    onBlur={(event) =>
                      patchRoomType(type.id, { name: event.target.value }).catch(
                        (err) => setError(err.message),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio por noche (S/)</Label>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={type.basePrice}
                    onBlur={(event) =>
                      patchRoomType(type.id, {
                        basePrice: Number(event.target.value),
                      }).catch((err) => setError(err.message))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Descripción</Label>
                  <Input
                    defaultValue={type.description}
                    onBlur={(event) =>
                      patchRoomType(type.id, {
                        description: event.target.value,
                      }).catch((err) => setError(err.message))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de cama</Label>
                  <Input
                    defaultValue={type.bedType}
                    onBlur={(event) =>
                      patchRoomType(type.id, { bedType: event.target.value }).catch(
                        (err) => setError(err.message),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. huéspedes</Label>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={type.maxGuests}
                    onBlur={(event) =>
                      patchRoomType(type.id, {
                        maxGuests: Number(event.target.value),
                      }).catch((err) => setError(err.message))
                    }
                  />
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-[var(--ocean-ink)]">
                  Servicios incluidos
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {snapshot.services.map((service) => {
                    const checked = type.serviceIds.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        className="flex items-start gap-2 rounded-xl border border-[var(--ocean-line)] px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...type.serviceIds, service.id]
                              : type.serviceIds.filter((id) => id !== service.id);
                            patchRoomType(type.id, { serviceIds: next }).catch(
                              (err) => setError(err.message),
                            );
                          }}
                        />
                        <span>
                          <span className="font-medium">{service.name}</span>
                          <span className="block text-xs text-[var(--ocean-muted)]">
                            {service.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <p className="text-sm text-[var(--ocean-muted)]">
                Tarifa actual: {formatMoney(type.basePrice)} / noche
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "reservas" && (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-[var(--ocean-line)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-[var(--ocean-mist)] text-[var(--ocean-muted)]">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Huésped</th>
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.reservations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--ocean-muted)]">
                    Aún no hay reservas.
                  </td>
                </tr>
              )}
              {snapshot.reservations.map((reservation) => {
                const typeName =
                  snapshot.roomTypes.find((type) => type.id === reservation.roomTypeId)
                    ?.name ?? "—";
                return (
                  <tr key={reservation.id} className="border-b last:border-0 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{reservation.code}</p>
                      <p className="text-xs text-[var(--ocean-muted)]">{typeName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{reservation.guestName}</p>
                      <p className="text-xs text-[var(--ocean-muted)]">
                        {reservation.guestEmail} · {reservation.guestPhone}
                      </p>
                      <p className="text-xs text-[var(--ocean-muted)]">
                        Doc: {reservation.guestDocument}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
                      <p className="text-xs text-[var(--ocean-muted)]">
                        {reservation.nights} noche(s) · {formatMoney(reservation.totalAmount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHOD_LABELS[reservation.paymentMethod]}
                      <p className="text-xs capitalize text-[var(--ocean-muted)]">
                        {reservation.paymentStatus}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 rounded-lg border px-2"
                        value={reservation.status}
                        onChange={(event) =>
                          patchReservation(
                            reservation.id,
                            event.target.value as ReservationStatus,
                          ).catch((err) => setError(err.message))
                        }
                      >
                        {RES_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {RESERVATION_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "correos" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--ocean-muted)]">
            Códigos de acceso y comprobantes enviados. Si Resend no está
            configurado, quedan aquí en modo demo.
          </p>
          {(snapshot.mailOutbox ?? []).length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-[var(--ocean-muted)] ring-1 ring-[var(--ocean-line)]">
              Aún no hay correos registrados.
            </div>
          ) : (
            (snapshot.mailOutbox ?? []).map((mail) => (
              <article
                key={mail.id}
                className="rounded-2xl bg-white p-5 ring-1 ring-[var(--ocean-line)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--ocean-ink)]">
                      {mail.subject}
                    </p>
                    <p className="text-sm text-[var(--ocean-muted)]">
                      Para {mail.to} · {mail.mode}
                      {mail.delivered ? " · enviado" : " · demo"}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--ocean-muted)]">
                    {new Date(mail.createdAt).toLocaleString("es-PE", {
                      timeZone: "America/Lima",
                    })}
                  </p>
                </div>
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--ocean-mist)] p-3 text-xs text-[var(--ocean-ink)]">
                  {mail.text}
                </pre>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
