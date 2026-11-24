"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney } from "@/lib/format";
import { HOTEL_ROOM_IMAGES } from "@/lib/hotel-images";
import { compressImageFile } from "@/lib/image-compress";
import { useRouter } from "next/navigation";
import {
  PAYMENT_METHOD_LABELS,
  PRICE_OFFER_KIND_LABELS,
  RESERVATION_STATUS_LABELS,
  ROOM_STATUS_LABELS,
  STAFF_ROLE_LABELS,
  USER_ROLE_LABELS,
  type GuestProfile,
  type MailMessage,
  type PriceOffer,
  type PriceOfferKind,
  type Reservation,
  type ReservationStatus,
  type Room,
  type RoomStatus,
  type RoomType,
  type Service,
  type StaffMemberPublic,
  type StaffRole,
  type UserRole,
} from "@/lib/types";

interface Snapshot {
  rooms: Room[];
  roomTypes: RoomType[];
  services: Service[];
  reservations: Reservation[];
  mailOutbox: MailMessage[];
  staffMembers: StaffMemberPublic[];
  guests: GuestProfile[];
  priceOffers: PriceOffer[];
  ownersFromSecrets?: string[];
  csrfToken?: string | null;
  me?: {
    email: string;
    name: string;
    role: UserRole;
    permissions: {
      manageStaff: boolean;
      editPricing: boolean;
      createRooms: boolean;
      viewGuestPii?: boolean;
    };
  };
  stats: {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    activeReservations: number;
    guestsRegistered?: number;
    staffActive?: number;
    activeOffers?: number;
  };
}

const OFFER_KINDS = Object.keys(PRICE_OFFER_KIND_LABELS) as PriceOfferKind[];

const ROOM_STATUSES = Object.keys(ROOM_STATUS_LABELS) as RoomStatus[];
const RES_STATUSES = Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[];

export function AdminPanel({
  adminEmail,
  adminName,
  role,
}: {
  adminEmail: string;
  adminName: string;
  role: UserRole;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<
    | "habitaciones"
    | "tipos"
    | "servicios"
    | "ofertas"
    | "reservas"
    | "correos"
    | "personal"
    | "clientes"
  >("habitaciones");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomTypeId, setNewRoomTypeId] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("empleado");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerKind, setOfferKind] = useState<PriceOfferKind>("fiesta");
  const [offerStart, setOfferStart] = useState("");
  const [offerEnd, setOfferEnd] = useState("");
  const [offerPriority, setOfferPriority] = useState(1);
  const [offerPrices, setOfferPrices] = useState<Record<string, string>>({});
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("150");
  const [newTypeGuests, setNewTypeGuests] = useState("2");
  const [newTypeBeds, setNewTypeBeds] = useState("1 cama matrimonial");
  const [newTypeImage, setNewTypeImage] = useState<string>(
    HOTEL_ROOM_IMAGES[0].path,
  );
  const [newTypeServices, setNewTypeServices] = useState<string[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");

  const loadSummary = useCallback(async () => {
    const response = await fetch("/api/admin/summary");
    if (response.status === 401) {
      router.push("/personal?next=/admin");
      return;
    }
    if (response.status === 403) {
      throw new Error("No tienes permiso de administración");
    }
    if (!response.ok) {
      throw new Error("No se pudo cargar el panel");
    }
    const data = (await response.json()) as Snapshot;
    setSnapshot(data);
    if (data.csrfToken) setCsrfToken(data.csrfToken);
    setNewRoomTypeId((current) => current || data.roomTypes[0]?.id || "");
    setOfferPrices((current) => {
      if (Object.keys(current).length > 0) return current;
      const next: Record<string, string> = {};
      for (const type of data.roomTypes) {
        next[type.id] = String(type.basePrice);
      }
      return next;
    });
    setNewTypeServices((current) => {
      if (current.length > 0) return current;
      return data.services.slice(0, 4).map((service) => service.id);
    });
  }, [router]);

  const adminFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
      }
      if (csrfToken) headers.set("x-csrf-token", csrfToken);
      return fetch(url, { ...init, headers });
    },
    [csrfToken],
  );

  useEffect(() => {
    loadSummary().catch((err) =>
      setError(err instanceof Error ? err.message : "Error"),
    );
  }, [loadSummary]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/personal");
    router.refresh();
  }

  async function patchRoom(id: string, patch: Record<string, unknown>) {
    const response = await adminFetch("/api/admin/rooms", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function patchRoomType(id: string, patch: Record<string, unknown>) {
    const response = await adminFetch("/api/admin/room-types", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function uploadRoomPhoto(typeId: string, file: File) {
    setError(null);
    const compressed = await compressImageFile(file);
    const response = await adminFetch("/api/admin/room-images", {
      method: "POST",
      body: JSON.stringify({
        roomTypeId: typeId,
        contentType: compressed.contentType,
        data: compressed.dataBase64,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudo subir la foto");
    }
    await loadSummary();
  }

  function roomImageSrc(type: RoomType): string {
    if (!type.imagePath) return "";
    if (type.imagePath.startsWith("/api/media/") && type.imageUpdatedAt) {
      return `${type.imagePath}?v=${encodeURIComponent(type.imageUpdatedAt)}`;
    }
    return type.imagePath;
  }

  async function patchReservation(id: string, status: ReservationStatus) {
    const response = await adminFetch("/api/admin/reservations", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function addRoom(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await adminFetch("/api/admin/rooms", {
      method: "POST",
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

  async function addStaff(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await adminFetch("/api/admin/staff", {
      method: "POST",
      body: JSON.stringify({
        email: staffEmail,
        name: staffName,
        role: staffRole,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo agregar");
      return;
    }
    setStaffEmail("");
    setStaffName("");
    setStaffRole("empleado");
    await loadSummary();
  }

  async function toggleStaff(email: string, active: boolean) {
    setError(null);
    const response = await adminFetch("/api/admin/staff", {
      method: "PATCH",
      body: JSON.stringify({ email, active }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo actualizar");
      return;
    }
    await loadSummary();
  }

  async function authorizeStaffReset(email: string) {
    setError(null);
    const response = await adminFetch("/api/admin/staff", {
      method: "PATCH",
      body: JSON.stringify({ email, authorizeReset: true }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo autorizar");
      return;
    }
    await loadSummary();
  }

  async function addOffer(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const prices: Record<string, number> = {};
    for (const [id, value] of Object.entries(offerPrices)) {
      const amount = Number(value);
      if (Number.isFinite(amount) && amount > 0) prices[id] = amount;
    }
    const response = await adminFetch("/api/admin/offers", {
      method: "POST",
      body: JSON.stringify({
        title: offerTitle,
        description: offerDescription,
        kind: offerKind,
        startDate: offerStart,
        endDate: offerEnd,
        priority: offerPriority,
        prices,
        active: true,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo crear la oferta");
      return;
    }
    setOfferTitle("");
    setOfferDescription("");
    setOfferKind("fiesta");
    setOfferStart("");
    setOfferEnd("");
    setOfferPriority(1);
    await loadSummary();
  }

  async function patchOffer(id: string, patch: Record<string, unknown>) {
    const response = await adminFetch("/api/admin/offers", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function removeOffer(id: string) {
    const response = await adminFetch("/api/admin/offers", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al eliminar");
    await loadSummary();
  }

  async function addRoomType(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await adminFetch("/api/admin/room-types", {
      method: "POST",
      body: JSON.stringify({
        name: newTypeName,
        description: newTypeDescription,
        basePrice: Number(newTypePrice),
        maxGuests: Number(newTypeGuests),
        bedType: newTypeBeds,
        imagePath: newTypeImage,
        serviceIds: newTypeServices,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo crear el tipo");
      return;
    }
    setNewTypeName("");
    setNewTypeDescription("");
    setNewTypePrice("150");
    setNewTypeGuests("2");
    setNewTypeBeds("1 cama matrimonial");
    setNewTypeImage(HOTEL_ROOM_IMAGES[0].path);
    await loadSummary();
  }

  async function toggleTypeService(typeId: string, serviceId: string) {
    if (!snapshot) return;
    const type = snapshot.roomTypes.find((item) => item.id === typeId);
    if (!type) return;
    const next = type.serviceIds.includes(serviceId)
      ? type.serviceIds.filter((id) => id !== serviceId)
      : [...type.serviceIds, serviceId];
    await patchRoomType(typeId, { serviceIds: next });
  }

  async function addService(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await adminFetch("/api/admin/services", {
      method: "POST",
      body: JSON.stringify({
        name: newServiceName,
        description: newServiceDescription,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo crear el servicio");
      return;
    }
    setNewServiceName("");
    setNewServiceDescription("");
    await loadSummary();
  }

  async function patchService(id: string, patch: Record<string, unknown>) {
    const response = await adminFetch("/api/admin/services", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  async function removeService(id: string) {
    const response = await adminFetch("/api/admin/services", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al eliminar");
    await loadSummary();
  }

  if (!snapshot) {
    return (
      <p className="text-center text-[var(--brand-muted)]">Cargando panel...</p>
    );
  }

  const permissions = snapshot.me?.permissions ?? {
    manageStaff: role === "jefe",
    editPricing: role === "jefe",
    createRooms: role === "jefe",
  };

  const tabs = (
    [
      ["habitaciones", "Habitaciones"],
      ...(permissions.editPricing
        ? ([
            ["tipos", "Tipos y fotos"],
            ["servicios", "Servicios"],
            ["ofertas", "Ofertas y fiestas"],
          ] as const)
        : []),
      ["reservas", "Reservas"],
      ...(permissions.manageStaff ? [["clientes", "Clientes"] as const] : []),
      ...(permissions.manageStaff ? [["personal", "Personal"] as const] : []),
      ...(permissions.manageStaff ? [["correos", "Comprobantes"] as const] : []),
    ] as const
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[var(--brand-muted)]">
            {adminName} · {adminEmail}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
            {USER_ROLE_LABELS[snapshot.me?.role ?? role]}
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
          ["Ofertas activas", snapshot.stats.activeOffers ?? snapshot.priceOffers?.filter((o) => o.active).length ?? 0],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-2xl bg-white p-5 ring-1 ring-[var(--brand-line)]"
          >
            <p className="text-sm text-[var(--brand-muted)]">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--brand-ink)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              tab === key
                ? "bg-[var(--brand-deep)] text-white"
                : "bg-white text-[var(--brand-ink)] ring-1 ring-[var(--brand-line)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {tab === "habitaciones" && (
        <div className="space-y-6">
          {permissions.createRooms ? (
            <form
              onSubmit={addRoom}
              className="grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-[var(--brand-line)] md:grid-cols-4"
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
                  onChange={(event) =>
                    setNewRoomFloor(Number(event.target.value))
                  }
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
                <Button
                  type="submit"
                  className="w-full rounded-full bg-[var(--brand-deep)]"
                >
                  Agregar habitación
                </Button>
              </div>
            </form>
          ) : (
            <p className="rounded-2xl bg-[var(--brand-mist)] px-4 py-3 text-sm text-[var(--brand-muted)]">
              Como empleado puedes cambiar estado y notas. Solo el jefe agrega
              habitaciones o cambia tipos.
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-[var(--brand-line)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-[var(--brand-mist)] text-[var(--brand-muted)]">
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
                    snapshot.roomTypes.find(
                      (type) => type.id === room.roomTypeId,
                    )?.name ?? "—";
                  return (
                    <tr key={room.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{room.number}</td>
                      <td className="px-4 py-3">
                        {permissions.createRooms ? (
                          <select
                            className="h-9 rounded-lg border px-2"
                            value={room.roomTypeId}
                            onChange={(event) =>
                              patchRoom(room.id, {
                                roomTypeId: event.target.value,
                              }).catch((err) => setError(err.message))
                            }
                          >
                            {snapshot.roomTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{typeName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="h-9 rounded-lg border px-2"
                          value={room.status}
                          onChange={(event) =>
                            patchRoom(room.id, {
                              status: event.target.value,
                            }).catch((err) => setError(err.message))
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
                            patchRoom(room.id, {
                              notes: event.target.value,
                            }).catch((err) => setError(err.message))
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

      {tab === "tipos" && permissions.editPricing && (
        <div className="space-y-8">
          <form
            onSubmit={addRoomType}
            className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-[var(--brand-line)]"
          >
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
                Nuevo tipo de habitación
              </h3>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Asigna foto, precio, descripción y servicios. Se verá en la web
                pública.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={newTypeName}
                  onChange={(event) => setNewTypeName(event.target.value)}
                  placeholder="Suite familiar"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Precio / noche (S/)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newTypePrice}
                  onChange={(event) => setNewTypePrice(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Camas</Label>
                <Input
                  value={newTypeBeds}
                  onChange={(event) => setNewTypeBeds(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. huéspedes</Label>
                <Input
                  type="number"
                  min={1}
                  value={newTypeGuests}
                  onChange={(event) => setNewTypeGuests(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={newTypeDescription}
                  onChange={(event) => setNewTypeDescription(event.target.value)}
                  rows={2}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Foto</Label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {HOTEL_ROOM_IMAGES.map((image) => (
                  <button
                    key={image.path}
                    type="button"
                    onClick={() => setNewTypeImage(image.path)}
                    className={`overflow-hidden rounded-xl ring-2 ${
                      newTypeImage === image.path
                        ? "ring-[var(--brand-gold)]"
                        : "ring-transparent"
                    }`}
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={image.path}
                        alt={image.label}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    </div>
                    <p className="bg-[var(--brand-mist)] px-2 py-1 text-xs">
                      {image.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Servicios incluidos</Label>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {snapshot.services.map((service) => {
                  const checked = newTypeServices.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--brand-line)] px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNewTypeServices((prev) =>
                            checked
                              ? prev.filter((id) => id !== service.id)
                              : [...prev, service.id],
                          )
                        }
                      />
                      {service.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <Button type="submit" className="rounded-full">
              Crear tipo
            </Button>
          </form>

          <div className="grid gap-6">
            {snapshot.roomTypes.map((type) => (
              <div
                key={type.id}
                className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-[var(--brand-line)]"
              >
                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--brand-mist)]">
                    {type.imagePath ? (
                      <Image
                        src={roomImageSrc(type)}
                        alt={type.name}
                        fill
                        unoptimized={type.imagePath.startsWith("/api/media/")}
                        className="object-cover"
                        sizes="180px"
                      />
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        defaultValue={type.name}
                        onBlur={(event) =>
                          patchRoomType(type.id, {
                            name: event.target.value,
                          }).catch((err) => setError(err.message))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio habitual / noche (S/)</Label>
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
                    <div className="space-y-2">
                      <Label>Camas</Label>
                      <Input
                        defaultValue={type.bedType}
                        onBlur={(event) =>
                          patchRoomType(type.id, {
                            bedType: event.target.value,
                          }).catch((err) => setError(err.message))
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
                    <div className="space-y-2 md:col-span-2">
                      <Label>Descripción pública</Label>
                      <Textarea
                        defaultValue={type.description}
                        rows={2}
                        onBlur={(event) =>
                          patchRoomType(type.id, {
                            description: event.target.value,
                          }).catch((err) => setError(err.message))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Foto pública</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--brand-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-ink)]">
                      Subir foto nueva
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          uploadRoomPhoto(type.id, file).catch((err) =>
                            setError(err.message),
                          );
                        }}
                      />
                    </label>
                    <p className="text-xs text-[var(--brand-muted)]">
                      JPG, PNG o WebP. Se comprime al subir. También puedes
                      elegir una foto de ejemplo abajo.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {HOTEL_ROOM_IMAGES.map((image) => (
                      <button
                        key={`${type.id}-${image.path}`}
                        type="button"
                        onClick={() =>
                          patchRoomType(type.id, {
                            imagePath: image.path,
                          }).catch((err) => setError(err.message))
                        }
                        className={`overflow-hidden rounded-lg ring-2 ${
                          type.imagePath === image.path
                            ? "ring-[var(--brand-gold)]"
                            : "ring-transparent"
                        }`}
                      >
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={image.path}
                            alt={image.label}
                            fill
                            className="object-cover"
                            sizes="140px"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Servicios de esta habitación</Label>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {snapshot.services.map((service) => {
                      const checked = type.serviceIds.includes(service.id);
                      return (
                        <label
                          key={`${type.id}-${service.id}`}
                          className="flex items-center gap-2 rounded-lg border border-[var(--brand-line)] px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleTypeService(type.id, service.id).catch(
                                (err) => setError(err.message),
                              )
                            }
                          />
                          {service.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "servicios" && permissions.editPricing && (
        <div className="space-y-8">
          <form
            onSubmit={addService}
            className="grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-[var(--brand-line)] md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <div className="space-y-2">
              <Label>Nuevo servicio</Label>
              <Input
                value={newServiceName}
                onChange={(event) => setNewServiceName(event.target.value)}
                placeholder="Caja fuerte"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={newServiceDescription}
                onChange={(event) =>
                  setNewServiceDescription(event.target.value)
                }
                placeholder="Seguridad para valores"
              />
            </div>
            <Button type="submit" className="rounded-full">
              Agregar
            </Button>
          </form>

          <div className="grid gap-4">
            {snapshot.services.map((service) => (
              <div
                key={service.id}
                className="grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-[var(--brand-line)] md:grid-cols-[1fr_1fr_auto]"
              >
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    defaultValue={service.name}
                    onBlur={(event) =>
                      patchService(service.id, {
                        name: event.target.value,
                      }).catch((err) => setError(err.message))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    defaultValue={service.description}
                    onBlur={(event) =>
                      patchService(service.id, {
                        description: event.target.value,
                      }).catch((err) => setError(err.message))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      removeService(service.id).catch((err) =>
                        setError(err.message),
                      )
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "ofertas" && permissions.editPricing && (
        <div className="space-y-8">
          <form
            onSubmit={addOffer}
            className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-[var(--brand-line)]"
          >
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--brand-ink)]">
                Nueva temporada u oferta
              </h3>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Ej.: Semana Santa, Fiestas Patronales, Año Nuevo. Define fechas y
                el precio de cada tipo de habitación.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={offerTitle}
                  onChange={(event) => setOfferTitle(event.target.value)}
                  placeholder="Semana Santa 2027"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                  value={offerKind}
                  onChange={(event) =>
                    setOfferKind(event.target.value as PriceOfferKind)
                  }
                >
                  {OFFER_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {PRICE_OFFER_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={offerStart}
                  onChange={(event) => setOfferStart(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={offerEnd}
                  onChange={(event) => setOfferEnd(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descripción (visible al público)</Label>
                <Textarea
                  value={offerDescription}
                  onChange={(event) => setOfferDescription(event.target.value)}
                  placeholder="Precios especiales por fiestas. Reserva con anticipación."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridad (si se solapan fechas)</Label>
                <Input
                  type="number"
                  value={offerPriority}
                  onChange={(event) =>
                    setOfferPriority(Number(event.target.value))
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {snapshot.roomTypes.map((type) => (
                <div key={type.id} className="space-y-2">
                  <Label>
                    {type.name} (S/ noche)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={offerPrices[type.id] ?? ""}
                    onChange={(event) =>
                      setOfferPrices((prev) => ({
                        ...prev,
                        [type.id]: event.target.value,
                      }))
                    }
                    required
                  />
                  <p className="text-xs text-[var(--brand-muted)]">
                    Habitual: {formatMoney(type.basePrice)}
                  </p>
                </div>
              ))}
            </div>
            <Button type="submit" className="rounded-full">
              Guardar oferta
            </Button>
          </form>

          <div className="space-y-4">
            {(snapshot.priceOffers ?? []).length === 0 && (
              <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-[var(--brand-muted)] ring-1 ring-[var(--brand-line)]">
                Aún no hay ofertas. Crea una para Semana Santa u otras fiestas.
              </p>
            )}
            {(snapshot.priceOffers ?? [])
              .slice()
              .sort((a, b) => b.startDate.localeCompare(a.startDate))
              .map((offer) => (
                <div
                  key={offer.id}
                  className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-[var(--brand-line)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                        {PRICE_OFFER_KIND_LABELS[offer.kind]}
                        {!offer.active ? " · pausada" : ""}
                      </p>
                      <h4 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
                        {offer.title}
                      </h4>
                      <p className="mt-1 text-sm text-[var(--brand-muted)]">
                        {formatDate(offer.startDate)} → {formatDate(offer.endDate)}
                      </p>
                      {offer.description && (
                        <p className="mt-2 text-sm text-[var(--brand-ink)]">
                          {offer.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() =>
                          patchOffer(offer.id, { active: !offer.active }).catch(
                            (err) => setError(err.message),
                          )
                        }
                      >
                        {offer.active ? "Pausar" : "Activar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() =>
                          removeOffer(offer.id).catch((err) =>
                            setError(err.message),
                          )
                        }
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {snapshot.roomTypes.map((type) => (
                      <div
                        key={`${offer.id}-${type.id}`}
                        className="rounded-xl bg-[var(--brand-mist)] px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-[var(--brand-ink)]">
                          {type.name}
                        </p>
                        <p className="text-[var(--brand-muted)]">
                          {offer.prices[type.id]
                            ? formatMoney(offer.prices[type.id])
                            : "Sin precio"}{" "}
                          / noche
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "reservas" && (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-[var(--brand-line)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-[var(--brand-mist)] text-[var(--brand-muted)]">
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
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[var(--brand-muted)]"
                  >
                    Aún no hay reservas.
                  </td>
                </tr>
              )}
              {snapshot.reservations.map((reservation) => {
                const typeName =
                  snapshot.roomTypes.find(
                    (type) => type.id === reservation.roomTypeId,
                  )?.name ?? "—";
                return (
                  <tr
                    key={reservation.id}
                    className="border-b last:border-0 align-top"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{reservation.code}</p>
                      <p className="text-xs text-[var(--brand-muted)]">
                        {typeName}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{reservation.guestName}</p>
                      <p className="text-xs text-[var(--brand-muted)]">
                        {reservation.guestEmail} · {reservation.guestPhone}
                      </p>
                      <p className="text-xs font-medium text-[var(--brand-ink)]">
                        Doc: {reservation.guestDocument}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(reservation.checkIn)} →{" "}
                      {formatDate(reservation.checkOut)}
                      <p className="text-xs text-[var(--brand-muted)]">
                        {reservation.nights} noche(s) ·{" "}
                        {formatMoney(reservation.totalAmount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHOD_LABELS[reservation.paymentMethod]}
                      <p className="text-xs capitalize text-[var(--brand-muted)]">
                        {reservation.paymentStatus}
                      </p>
                      {reservation.cipCode && (
                        <p className="text-xs font-medium text-[var(--brand-ink)]">
                          CIP {reservation.cipCode}
                        </p>
                      )}
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

      {tab === "clientes" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--brand-muted)]">
            Cada cliente tiene un documento único vinculado a un solo correo.
          </p>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-[var(--brand-line)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-[var(--brand-mist)] text-[var(--brand-muted)]">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot.guests ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-[var(--brand-muted)]"
                    >
                      Aún no hay clientes registrados.
                    </td>
                  </tr>
                )}
                {(snapshot.guests ?? []).map((guest) => (
                  <tr key={guest.document} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{guest.document}</td>
                    <td className="px-4 py-3">{guest.name}</td>
                    <td className="px-4 py-3">{guest.email}</td>
                    <td className="px-4 py-3">{guest.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "personal" && permissions.manageStaff && (
        <div className="space-y-6">
          <p className="text-sm text-[var(--brand-muted)]">
            Solo tú autorizas correos. Cada persona crea su propia contraseña en
            el primer acceso. La recuperación automática es solo para el jefe;
            si un empleado olvida la clave, debe pedirte autorización aquí.
          </p>
          {(snapshot.ownersFromSecrets ?? []).length > 0 && (
            <div className="rounded-2xl bg-[var(--brand-mist)] px-4 py-3 text-sm">
              Jefes por secreto:{" "}
              {(snapshot.ownersFromSecrets ?? []).join(", ")}
            </div>
          )}
          <form
            onSubmit={addStaff}
            className="grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-[var(--brand-line)] md:grid-cols-4"
          >
            <div className="space-y-2">
              <Label>Correo del empleado</Label>
              <Input
                type="email"
                value={staffEmail}
                onChange={(event) => setStaffEmail(event.target.value)}
                placeholder="empleado@correo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                placeholder="Ana Pérez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <select
                className="h-10 w-full rounded-lg border px-3 text-sm"
                value={staffRole}
                onChange={(event) =>
                  setStaffRole(event.target.value as StaffRole)
                }
              >
                <option value="empleado">Empleado</option>
                <option value="jefe">Jefe</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full rounded-full bg-[var(--brand-deep)]"
              >
                Autorizar correo
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-[var(--brand-line)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-[var(--brand-mist)] text-[var(--brand-muted)]">
                <tr>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Contraseña</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot.staffMembers ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[var(--brand-muted)]"
                    >
                      Aún no hay personal. Agrega correos aquí.
                    </td>
                  </tr>
                )}
                {(snapshot.staffMembers ?? []).map((member) => (
                  <tr key={member.email} className="border-b last:border-0">
                    <td className="px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3">{member.name}</td>
                    <td className="px-4 py-3">
                      {STAFF_ROLE_LABELS[member.role]}
                    </td>
                    <td className="px-4 py-3">
                      {member.resetPending
                        ? "Pide recuperación"
                        : member.resetAuthorized
                          ? "Reset autorizado (24h)"
                          : member.hasPassword
                            ? "Creada"
                            : "Pendiente (primer acceso)"}
                    </td>
                    <td className="px-4 py-3">
                      {member.active ? "Activo" : "Desactivado"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {member.role === "empleado" &&
                          (member.resetPending || member.hasPassword) && (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full"
                              onClick={() =>
                                authorizeStaffReset(member.email).catch(
                                  (err) => setError(err.message),
                                )
                              }
                            >
                              Autorizar reset
                            </Button>
                          )}
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={() =>
                            toggleStaff(member.email, !member.active)
                          }
                        >
                          {member.active ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "correos" && permissions.manageStaff && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--brand-muted)]">
            Códigos de acceso y comprobantes. Visible solo para el jefe.
          </p>
          {(snapshot.mailOutbox ?? []).length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-[var(--brand-muted)] ring-1 ring-[var(--brand-line)]">
              Aún no hay correos registrados.
            </div>
          ) : (
            (snapshot.mailOutbox ?? []).map((mail) => (
              <article
                key={mail.id}
                className="rounded-2xl bg-white p-5 ring-1 ring-[var(--brand-line)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--brand-ink)]">
                      {mail.subject}
                    </p>
                    <p className="text-sm text-[var(--brand-muted)]">
                      Para {mail.to} · {mail.mode}
                      {mail.delivered ? " · enviado" : " · demo"}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--brand-muted)]">
                    {new Date(mail.createdAt).toLocaleString("es-PE", {
                      timeZone: "America/Lima",
                    })}
                  </p>
                </div>
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--brand-mist)] p-3 text-xs text-[var(--brand-ink)]">
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
