"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney } from "@/lib/format";
import { compressImageFile } from "@/lib/image-compress";
import { useRouter } from "next/navigation";
import { DEFAULT_BRANCH_ID } from "@/lib/hotel-info";
import {
  PAYMENT_METHOD_LABELS,
  PRICE_OFFER_KIND_LABELS,
  RESERVATION_STATUS_LABELS,
  ROOM_STATUS_LABELS,
  STAFF_ROLE_LABELS,
  type GalleryImagePublic,
  type GuestProfile,
  type HotelBranch,
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
  branches: HotelBranch[];
  rooms: Room[];
  roomTypes: RoomType[];
  galleryImages: GalleryImagePublic[];
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
    branches?: number;
  };
}

const OFFER_KINDS: PriceOfferKind[] = ["oferta", "fiesta"];

const ROOM_STATUSES = Object.keys(ROOM_STATUS_LABELS) as RoomStatus[];
const RES_STATUSES = Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[];

const selectClass =
  "h-9 w-full rounded-lg border border-[var(--brand-line)] bg-white px-2.5 text-sm text-[var(--brand-ink)] outline-none transition focus:border-[var(--brand-deep)] focus:ring-2 focus:ring-[var(--brand-deep)]/10";

function roomStatusSelectClass(status: RoomStatus): string {
  const tone: Record<RoomStatus, string> = {
    disponible: "border-emerald-200/90 bg-emerald-50 text-emerald-950",
    ocupada: "border-amber-200/90 bg-amber-50 text-amber-950",
    mantenimiento: "border-rose-200/90 bg-rose-50 text-rose-950",
    limpieza: "border-sky-200/90 bg-sky-50 text-sky-950",
  };
  return `${selectClass} font-medium ${tone[status]}`;
}

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
  const [info, setInfo] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<
    | "habitaciones"
    | "tipos"
    | "servicios"
    | "ofertas"
    | "sucursales"
    | "reservas"
    | "correos"
    | "personal"
    | "clientes"
  >("habitaciones");
  const [activeBranchId, setActiveBranchId] = useState(DEFAULT_BRANCH_ID);
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchRegion, setBranchRegion] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhoneMobile, setBranchPhoneMobile] = useState("");
  const [branchPhoneLandline, setBranchPhoneLandline] = useState("");
  const [branchTagline, setBranchTagline] = useState("");
  const [branchHeroFile, setBranchHeroFile] = useState<File | null>(null);
  const [branchBusy, setBranchBusy] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBranch, setEditBranch] = useState({
    name: "",
    city: "",
    region: "",
    address: "",
    phoneMobile: "",
    phoneLandline: "",
    tagline: "",
  });
  const [editBranchHeroFile, setEditBranchHeroFile] = useState<File | null>(
    null,
  );
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomTypeId, setNewRoomTypeId] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("empleado");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerKind, setOfferKind] = useState<PriceOfferKind>("oferta");
  const [offerStart, setOfferStart] = useState("");
  const [offerEnd, setOfferEnd] = useState("");
  const [offerPriority, setOfferPriority] = useState(1);
  const [offerPrices, setOfferPrices] = useState<Record<string, string>>({});
  const [offerMinNights, setOfferMinNights] = useState("3");
  const [offerDiscountPercent, setOfferDiscountPercent] = useState("10");
  const [offerPackageNights, setOfferPackageNights] = useState("2");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("150");
  const [newTypeGuests, setNewTypeGuests] = useState("2");
  const [newTypeBeds, setNewTypeBeds] = useState("1 cama matrimonial");
  const [newTypeImage, setNewTypeImage] = useState<string>("");
  const [newTypePhotoFile, setNewTypePhotoFile] = useState<File | null>(null);
  const [newTypeServices, setNewTypeServices] = useState<string[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [galleryLabel, setGalleryLabel] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState<"all" | RoomStatus>(
    "all",
  );
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  /** Pisos expandídos; vacío = solo el primer piso del filtro. */
  const [openFloors, setOpenFloors] = useState<number[] | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoom, setEditRoom] = useState<{
    number: string;
    floor: number;
    roomTypeId: string;
    status: RoomStatus;
    notes: string;
  } | null>(null);
  const [pendingDeleteRoomId, setPendingDeleteRoomId] = useState<string | null>(
    null,
  );
  const [roomBusy, setRoomBusy] = useState(false);

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
    const branches = data.branches ?? [];
    setActiveBranchId((current) => {
      if (branches.some((branch) => branch.id === current)) return current;
      return (
        branches.find((branch) => branch.isPrimary)?.id ||
        branches[0]?.id ||
        DEFAULT_BRANCH_ID
      );
    });
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
    setNewTypeImage((current) => {
      if (current) return current;
      return data.galleryImages?.[0]?.path || "";
    });
  }, [router]);

  useEffect(() => {
    if (!snapshot) return;
    const types = snapshot.roomTypes.filter(
      (type) => type.branchId === activeBranchId,
    );
    setNewRoomTypeId((current) =>
      types.some((type) => type.id === current)
        ? current
        : types[0]?.id || "",
    );
  }, [snapshot, activeBranchId]);

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

  async function patchRoom(id: string, patch: Record<string, unknown>) {
    const response = await adminFetch("/api/admin/rooms", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");
    await loadSummary();
  }

  function startEditRoom(room: Room) {
    setError(null);
    setInfo(null);
    setPendingDeleteRoomId(null);
    setEditingRoomId(room.id);
    setEditRoom({
      number: room.number,
      floor: room.floor,
      roomTypeId: room.roomTypeId,
      status: room.status,
      notes: room.notes || "",
    });
  }

  function cancelEditRoom() {
    setEditingRoomId(null);
    setEditRoom(null);
  }

  async function saveEditRoom() {
    if (!editingRoomId || !editRoom) return;
    setRoomBusy(true);
    setError(null);
    setInfo(null);
    try {
      await patchRoom(editingRoomId, {
        number: editRoom.number.trim(),
        floor: Number(editRoom.floor),
        roomTypeId: editRoom.roomTypeId,
        status: editRoom.status,
        notes: editRoom.notes,
      });
      setInfo(`Habitación ${editRoom.number.trim()} actualizada`);
      cancelEditRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setRoomBusy(false);
    }
  }

  async function removeRoom(id: string) {
    setRoomBusy(true);
    setError(null);
    setInfo(null);
    try {
      const response = await adminFetch("/api/admin/rooms", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar");
      setInfo("Habitación eliminada");
      setPendingDeleteRoomId(null);
      if (editingRoomId === id) cancelEditRoom();
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setRoomBusy(false);
    }
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
    const previous = snapshot?.roomTypes.find((item) => item.id === typeId);
    const hadUploaded = previous?.imagePath?.startsWith("/api/media/");
    try {
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo subir la foto";
      // Si ya había (o quedó) una foto subida tras el error, la eliminamos.
      if (hadUploaded) {
        try {
          await adminFetch("/api/admin/room-images", {
            method: "DELETE",
            body: JSON.stringify({ roomTypeId: typeId }),
          });
          await loadSummary();
          setError(
            `${message}. Se eliminó la foto subida para que puedas intentar de nuevo.`,
          );
          return;
        } catch {
          // ignore cleanup errors
        }
      }
      setError(
        `${message}. Puedes usar “Eliminar foto subida” si necesitas limpiarla.`,
      );
    }
  }

  async function deleteRoomPhoto(typeId: string) {
    setError(null);
    const response = await adminFetch("/api/admin/room-images", {
      method: "DELETE",
      body: JSON.stringify({ roomTypeId: typeId }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudo eliminar la foto");
    }
    await loadSummary();
  }

  async function addGalleryPhoto(
    file: File,
    roomTypeId?: string,
    labelOverride?: string,
  ) {
    setError(null);
    const compressed = await compressImageFile(file);
    const response = await adminFetch("/api/admin/gallery", {
      method: "POST",
      body: JSON.stringify({
        label:
          labelOverride?.trim() ||
          galleryLabel.trim() ||
          file.name.replace(/\.[^.]+$/, ""),
        roomTypeId: roomTypeId || null,
        contentType: compressed.contentType,
        data: compressed.dataBase64,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudo agregar la foto");
    }
    setGalleryLabel("");
    await loadSummary();
  }

  function photosForType(typeId: string): GalleryImagePublic[] {
    return (snapshot?.galleryImages ?? []).filter(
      (image) => image.roomTypeId === typeId,
    );
  }

  async function removeGalleryPhoto(imageId: string) {
    setError(null);
    const response = await adminFetch("/api/admin/gallery", {
      method: "DELETE",
      body: JSON.stringify({ id: imageId }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudo eliminar la foto");
    }
    await loadSummary();
  }

  function mediaSrc(path: string, updatedAt?: string): string {
    if (!path) return "";
    if (path.startsWith("/api/media/") && updatedAt) {
      return `${path}?v=${encodeURIComponent(updatedAt)}`;
    }
    return path;
  }

  function roomImageSrc(type: RoomType): string {
    return mediaSrc(type.imagePath || "", type.imageUpdatedAt);
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
    setInfo(null);
    setRoomBusy(true);
    try {
      const response = await adminFetch("/api/admin/rooms", {
        method: "POST",
        body: JSON.stringify({
          number: newRoomNumber.trim(),
          floor: newRoomFloor,
          roomTypeId: newRoomTypeId,
          branchId: activeBranchId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo crear");
        return;
      }
      setInfo(`Habitación ${newRoomNumber.trim()} agregada`);
      setNewRoomNumber("");
      await loadSummary();
    } finally {
      setRoomBusy(false);
    }
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
    setInfo(null);
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
        branchId: activeBranchId,
        priority: offerPriority,
        prices: offerKind === "oferta" || offerKind === "fiesta" ? {} : prices,
        minNights:
          offerKind === "oferta" ? Number(offerMinNights) : undefined,
        discountPercent:
          offerKind === "oferta" ? Number(offerDiscountPercent) : undefined,
        packageNights:
          offerKind === "fiesta" ? Number(offerPackageNights) : undefined,
        packagePrices: offerKind === "fiesta" ? prices : undefined,
        active: true,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo crear la oferta");
      return;
    }
    setInfo("Oferta publicada: el público ya puede verla");
    setOfferTitle("");
    setOfferDescription("");
    setOfferKind("oferta");
    setOfferStart("");
    setOfferEnd("");
    setOfferPriority(1);
    setOfferMinNights("3");
    setOfferDiscountPercent("10");
    setOfferPackageNights("2");
    setOfferPrices({});
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

  async function addBranch(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!branchHeroFile) {
      setError("Sube la foto de la nueva sede (fachada o edificio)");
      return;
    }
    setBranchBusy(true);
    try {
      const compressed = await compressImageFile(branchHeroFile);
      const response = await adminFetch("/api/admin/branches", {
        method: "POST",
        body: JSON.stringify({
          name: branchName,
          city: branchCity,
          region: branchRegion,
          address: branchAddress,
          phoneMobile: branchPhoneMobile,
          phoneLandline: branchPhoneLandline,
          tagline: branchTagline,
          heroPhoto: {
            contentType: compressed.contentType,
            data: compressed.dataBase64,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo crear la sucursal");
        return;
      }
      setInfo(
        `Sucursal “${data.branch?.city || branchCity}” creada con su foto. Ahora agrega habitaciones de esa sede.`,
      );
      setBranchName("");
      setBranchCity("");
      setBranchRegion("");
      setBranchAddress("");
      setBranchPhoneMobile("");
      setBranchPhoneLandline("");
      setBranchTagline("");
      setBranchHeroFile(null);
      if (data.branch?.id) setActiveBranchId(data.branch.id);
      await loadSummary();
    } finally {
      setBranchBusy(false);
    }
  }

  async function patchBranch(id: string, patch: Record<string, unknown>) {
    const response = await adminFetch("/api/admin/branches", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar sede");
    await loadSummary();
  }

  function startEditBranch(branch: HotelBranch) {
    setEditingBranchId(branch.id);
    setEditBranch({
      name: branch.name,
      city: branch.city,
      region: branch.region,
      address: branch.address,
      phoneMobile: branch.phoneMobile,
      phoneLandline: branch.phoneLandline,
      tagline: branch.tagline,
    });
    setEditBranchHeroFile(null);
    setError(null);
    setInfo(null);
  }

  async function saveEditBranch(event: React.FormEvent) {
    event.preventDefault();
    if (!editingBranchId) return;
    setError(null);
    setInfo(null);
    setBranchBusy(true);
    try {
      const payload: Record<string, unknown> = {
        id: editingBranchId,
        name: editBranch.name,
        city: editBranch.city,
        region: editBranch.region,
        address: editBranch.address,
        phoneMobile: editBranch.phoneMobile,
        phoneLandline: editBranch.phoneLandline,
        tagline: editBranch.tagline,
      };
      if (editBranchHeroFile) {
        const compressed = await compressImageFile(editBranchHeroFile);
        payload.heroPhoto = {
          contentType: compressed.contentType,
          data: compressed.dataBase64,
        };
      }
      const response = await adminFetch("/api/admin/branches", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo guardar la sede");
        return;
      }
      setInfo("Sucursal actualizada");
      setEditingBranchId(null);
      setEditBranchHeroFile(null);
      await loadSummary();
    } finally {
      setBranchBusy(false);
    }
  }

  async function removeBranch(id: string, city: string) {
    const ok = window.confirm(
      `¿Eliminar la sucursal “${city}”? Se borrarán también sus habitaciones, tipos, fotos y ofertas.`,
    );
    if (!ok) return;
    setError(null);
    setInfo(null);
    setBranchBusy(true);
    try {
      const response = await adminFetch("/api/admin/branches", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo eliminar la sede");
        return;
      }
      setInfo(`Sucursal “${city}” eliminada`);
      if (editingBranchId === id) setEditingBranchId(null);
      if (activeBranchId === id) {
        const fallback =
          snapshot?.branches.find((branch) => branch.isPrimary)?.id ||
          snapshot?.branches.find((branch) => branch.id !== id)?.id ||
          DEFAULT_BRANCH_ID;
        setActiveBranchId(fallback);
      }
      await loadSummary();
    } finally {
      setBranchBusy(false);
    }
  }

  async function removeRoomType(id: string, name: string) {
    const ok = window.confirm(
      `¿Eliminar el tipo “${name}”? Debe estar sin habitaciones asignadas.`,
    );
    if (!ok) return;
    setError(null);
    const response = await adminFetch("/api/admin/room-types", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo eliminar el tipo");
      return;
    }
    setInfo(`Tipo “${name}” eliminado`);
    await loadSummary();
  }

  async function addRoomType(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!newTypePhotoFile) {
      setError("Sube una foto propia para este tipo de habitación");
      return;
    }
    setRoomBusy(true);
    try {
      const response = await adminFetch("/api/admin/room-types", {
        method: "POST",
        body: JSON.stringify({
          name: newTypeName,
          description: newTypeDescription,
          basePrice: Number(newTypePrice),
          maxGuests: Number(newTypeGuests),
          bedType: newTypeBeds,
          imagePath: "",
          branchId: activeBranchId,
          serviceIds: newTypeServices,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo crear el tipo");
        return;
      }
      const createdId = data.roomType?.id as string | undefined;
      if (createdId && newTypePhotoFile) {
        await uploadRoomPhoto(createdId, newTypePhotoFile);
      }
      setInfo(`Tipo “${newTypeName}” creado con su foto`);
      setNewTypeName("");
      setNewTypeDescription("");
      setNewTypePrice("150");
      setNewTypeGuests("2");
      setNewTypeBeds("1 cama matrimonial");
      setNewTypeImage("");
      setNewTypePhotoFile(null);
      await loadSummary();
    } finally {
      setRoomBusy(false);
    }
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
      <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-[var(--brand-line)]">
        <p className="text-sm font-medium text-[var(--brand-muted)]">
          Cargando panel…
        </p>
      </div>
    );
  }

  const permissions = snapshot.me?.permissions ?? {
    manageStaff: role === "jefe",
    editPricing: role === "jefe",
    createRooms: role === "jefe",
  };

  const branches = snapshot.branches ?? [];
  const activeBranch =
    branches.find((branch) => branch.id === activeBranchId) ?? branches[0];
  const branchRooms = snapshot.rooms.filter(
    (room) => room.branchId === activeBranchId,
  );
  const branchTypes = snapshot.roomTypes.filter(
    (type) => type.branchId === activeBranchId,
  );
  const branchOffers = (snapshot.priceOffers ?? []).filter(
    (offer) => offer.branchId === activeBranchId,
  );
  const branchGallery = (snapshot.galleryImages ?? []).filter(
    (image) => image.branchId === activeBranchId,
  );

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
      ...(permissions.manageStaff
        ? ([["sucursales", "Sucursales"] as const] as const)
        : []),
      ["reservas", "Reservas"],
      ...(permissions.manageStaff ? [["clientes", "Clientes"] as const] : []),
      ...(permissions.manageStaff ? [["personal", "Personal"] as const] : []),
      ...(permissions.manageStaff ? [["correos", "Comprobantes"] as const] : []),
    ] as const
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--brand-ink)]">
            Administración
          </h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Habitaciones, catálogo, personal y reservas
          </p>
        </div>
        <p className="text-sm text-[var(--brand-muted)] sm:text-right">
          <span className="font-medium text-[var(--brand-ink)]">{adminName}</span>
          <span className="mx-1.5 text-[var(--brand-line)]">·</span>
          {adminEmail}
        </p>
      </div>

      {branches.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--brand-line)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
              Sede en edición
            </p>
            <p className="text-sm text-[var(--brand-muted)]">
              Habitaciones, fotos y ofertas se guardan solo en esta sucursal.
            </p>
          </div>
          <select
            className={`${selectClass} sm:max-w-xs`}
            value={activeBranchId}
            onChange={(event) => {
              setActiveBranchId(event.target.value);
              setOpenFloors(null);
              setEditingRoomId(null);
            }}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.city}
                {branch.isPrimary ? " (principal)" : ""}
                {!branch.active ? " · pausada" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Habitaciones",
            value: branchRooms.length,
            hint: activeBranch?.city || "Esta sede",
          },
          {
            label: "Disponibles",
            value: branchRooms.filter((room) => room.status === "disponible")
              .length,
            hint: "Listas para vender",
          },
          {
            label: "Ocupadas",
            value: branchRooms.filter((room) => room.status === "ocupada")
              .length,
            hint: "En uso ahora",
          },
          {
            label: "Ofertas",
            value: branchOffers.filter((offer) => offer.active).length,
            hint: "Activas en sede",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[var(--brand-line)] bg-white px-4 py-3.5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
              {item.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
              {item.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{item.hint}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
          {info}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-[var(--brand-line)] bg-white shadow-[0_18px_40px_-34px_rgba(44,36,30,0.55)]">
        <div className="overflow-x-auto border-b border-[var(--brand-line)]">
          <nav className="flex min-w-max px-2" aria-label="Secciones del panel">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`relative px-4 py-3.5 text-sm font-semibold transition ${
                  tab === key
                    ? "text-[var(--brand-ink)]"
                    : "text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
                }`}
              >
                {label}
                {tab === key ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--brand-deep)]" />
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5 sm:p-6">
      {tab === "habitaciones" && (
        <div className="space-y-5">
          {permissions.createRooms ? (
            <form
              onSubmit={addRoom}
              className="rounded-xl border border-dashed border-[var(--brand-line)] bg-[var(--brand-mist)]/50 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-ink)]">
                    Nueva habitación
                  </h3>
                  <p className="text-xs text-[var(--brand-muted)]">
                    Número, piso y tipo del inventario
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto]">
                <div className="space-y-1.5">
                  <Label className="text-xs">Número</Label>
                  <Input
                    value={newRoomNumber}
                    onChange={(event) => setNewRoomNumber(event.target.value)}
                    placeholder="205"
                    required
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Piso</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newRoomFloor}
                    onChange={(event) =>
                      setNewRoomFloor(Number(event.target.value))
                    }
                    required
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <select
                    className={selectClass}
                    value={newRoomTypeId}
                    onChange={(event) => setNewRoomTypeId(event.target.value)}
                  >
                    {branchTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={roomBusy}
                    className="h-9 w-full rounded-lg bg-[var(--brand-deep)] px-5 md:w-auto"
                  >
                    {roomBusy ? "Guardando…" : "Agregar"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <p className="rounded-xl bg-[var(--brand-mist)] px-4 py-3 text-sm text-[var(--brand-muted)]">
              Como empleado puedes cambiar estado y notas. Solo el jefe agrega
              habitaciones o cambia tipos.
            </p>
          )}

          {(() => {
            const query = roomSearch.trim().toLowerCase();
            const filtered = branchRooms.filter((room) => {
              if (roomStatusFilter !== "all" && room.status !== roomStatusFilter) {
                return false;
              }
              if (roomTypeFilter !== "all" && room.roomTypeId !== roomTypeFilter) {
                return false;
              }
              if (!query) return true;
              const typeName =
                branchTypes.find((type) => type.id === room.roomTypeId)
                  ?.name ?? "";
              return (
                room.number.toLowerCase().includes(query) ||
                String(room.floor).includes(query) ||
                typeName.toLowerCase().includes(query) ||
                (room.notes || "").toLowerCase().includes(query)
              );
            });

            const floors = [...new Set(filtered.map((room) => room.floor))].sort(
              (a, b) => a - b,
            );
            const defaultOpen = floors[0];
            const isFloorOpen = (floor: number) => {
              if (openFloors === null) return floor === defaultOpen;
              return openFloors.includes(floor);
            };
            const toggleFloor = (floor: number) => {
              setOpenFloors((current) => {
                const base =
                  current === null
                    ? defaultOpen != null
                      ? [defaultOpen]
                      : []
                    : current;
                return base.includes(floor)
                  ? base.filter((item) => item !== floor)
                  : [...base, floor];
              });
            };

            return (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--brand-line)] bg-[#f8f4ef] p-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label className="text-xs">Buscar</Label>
                    <Input
                      value={roomSearch}
                      onChange={(event) => setRoomSearch(event.target.value)}
                      placeholder="Nº, piso, tipo o nota"
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5 sm:w-40">
                    <Label className="text-xs">Estado</Label>
                    <select
                      className={selectClass}
                      value={roomStatusFilter}
                      onChange={(event) =>
                        setRoomStatusFilter(
                          event.target.value as "all" | RoomStatus,
                        )
                      }
                    >
                      <option value="all">Todos</option>
                      {ROOM_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {ROOM_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:w-44">
                    <Label className="text-xs">Tipo</Label>
                    <select
                      className={selectClass}
                      value={roomTypeFilter}
                      onChange={(event) => setRoomTypeFilter(event.target.value)}
                    >
                      <option value="all">Todos</option>
                      {branchTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="h-9 rounded-lg px-3 text-sm font-semibold text-[var(--brand-muted)] transition hover:bg-white hover:text-[var(--brand-ink)]"
                    onClick={() => {
                      setRoomSearch("");
                      setRoomStatusFilter("all");
                      setRoomTypeFilter("all");
                      setOpenFloors(null);
                    }}
                  >
                    Limpiar
                  </button>
                </div>

                <p className="text-xs text-[var(--brand-muted)]">
                  Mostrando {filtered.length} de {branchRooms.length} · por
                  piso (toca para expandir)
                </p>

                {floors.length === 0 ? (
                  <div className="rounded-xl border border-[var(--brand-line)] bg-white px-4 py-10 text-center text-sm text-[var(--brand-muted)]">
                    No hay habitaciones con ese filtro.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {floors.map((floor) => {
                      const roomsOnFloor = filtered
                        .filter((room) => room.floor === floor)
                        .sort((a, b) =>
                          a.number.localeCompare(b.number, undefined, {
                            numeric: true,
                          }),
                        );
                      const open = isFloorOpen(floor);
                      return (
                        <div
                          key={floor}
                          className="overflow-hidden rounded-xl border border-[var(--brand-line)] bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFloor(floor)}
                            className="flex w-full items-center justify-between gap-3 bg-[#f3eee8] px-4 py-3 text-left transition hover:bg-[#efe8df]"
                          >
                            <span className="text-sm font-semibold text-[var(--brand-ink)]">
                              Piso {floor}
                            </span>
                            <span className="text-xs font-medium text-[var(--brand-muted)]">
                              {roomsOnFloor.length} hab. · {open ? "Ocultar" : "Ver"}
                            </span>
                          </button>
                          {open ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-left text-sm">
                                <thead className="border-b border-[var(--brand-line)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                                  <tr>
                                    <th className="px-4 py-2.5">Nº</th>
                                    <th className="px-4 py-2.5">Piso</th>
                                    <th className="px-4 py-2.5">Tipo</th>
                                    <th className="px-4 py-2.5">Estado</th>
                                    <th className="px-4 py-2.5">Notas</th>
                                    <th className="px-4 py-2.5 text-right">
                                      Acciones
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--brand-line)]/80">
                                  {roomsOnFloor.map((room) => {
                                    const typeName =
                                      branchTypes.find(
                                        (type) => type.id === room.roomTypeId,
                                      )?.name ?? "—";
                                    const isEditing = editingRoomId === room.id;
                                    const isDeleting =
                                      pendingDeleteRoomId === room.id;

                                    if (isEditing && editRoom) {
                                      return (
                                        <tr
                                          key={room.id}
                                          className="bg-[var(--brand-mist)]/50"
                                        >
                                          <td className="px-3 py-2.5">
                                            <Input
                                              value={editRoom.number}
                                              onChange={(event) =>
                                                setEditRoom({
                                                  ...editRoom,
                                                  number: event.target.value,
                                                })
                                              }
                                              className="h-9 bg-white"
                                              disabled={!permissions.createRooms}
                                            />
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <Input
                                              type="number"
                                              min={1}
                                              value={editRoom.floor}
                                              onChange={(event) =>
                                                setEditRoom({
                                                  ...editRoom,
                                                  floor: Number(
                                                    event.target.value,
                                                  ),
                                                })
                                              }
                                              className="h-9 w-20 bg-white"
                                              disabled={!permissions.createRooms}
                                            />
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <select
                                              className={selectClass}
                                              value={editRoom.roomTypeId}
                                              disabled={!permissions.createRooms}
                                              onChange={(event) =>
                                                setEditRoom({
                                                  ...editRoom,
                                                  roomTypeId: event.target.value,
                                                })
                                              }
                                            >
                                              {branchTypes.map((type) => (
                                                <option
                                                  key={type.id}
                                                  value={type.id}
                                                >
                                                  {type.name}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <select
                                              className={roomStatusSelectClass(
                                                editRoom.status,
                                              )}
                                              value={editRoom.status}
                                              onChange={(event) =>
                                                setEditRoom({
                                                  ...editRoom,
                                                  status: event.target
                                                    .value as RoomStatus,
                                                })
                                              }
                                            >
                                              {ROOM_STATUSES.map((status) => (
                                                <option
                                                  key={status}
                                                  value={status}
                                                >
                                                  {ROOM_STATUS_LABELS[status]}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <Input
                                              value={editRoom.notes}
                                              onChange={(event) =>
                                                setEditRoom({
                                                  ...editRoom,
                                                  notes: event.target.value,
                                                })
                                              }
                                              placeholder="Sin notas"
                                              className="h-9 bg-white"
                                            />
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="flex justify-end gap-2">
                                              <Button
                                                type="button"
                                                disabled={roomBusy}
                                                onClick={() =>
                                                  void saveEditRoom()
                                                }
                                                className="h-8 rounded-lg bg-[var(--brand-deep)] px-3 text-xs"
                                              >
                                                Guardar
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                disabled={roomBusy}
                                                onClick={cancelEditRoom}
                                                className="h-8 rounded-lg px-3 text-xs"
                                              >
                                                Cancelar
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }

                                    return (
                                      <tr
                                        key={room.id}
                                        className="bg-white transition hover:bg-[var(--brand-mist)]/40"
                                      >
                                        <td className="px-4 py-2.5 font-semibold tabular-nums text-[var(--brand-ink)]">
                                          {room.number}
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums text-[var(--brand-muted)]">
                                          {room.floor}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          {typeName}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <span
                                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                                              room.status === "disponible"
                                                ? "bg-emerald-50 text-emerald-800"
                                                : room.status === "ocupada"
                                                  ? "bg-amber-50 text-amber-900"
                                                  : room.status === "limpieza"
                                                    ? "bg-sky-50 text-sky-900"
                                                    : "bg-rose-50 text-rose-900"
                                            }`}
                                          >
                                            {ROOM_STATUS_LABELS[room.status]}
                                          </span>
                                        </td>
                                        <td className="max-w-[180px] truncate px-4 py-2.5 text-[var(--brand-muted)]">
                                          {room.notes || "—"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          {isDeleting ? (
                                            <div className="flex flex-col items-end gap-1.5">
                                              <p className="text-xs text-rose-700">
                                                ¿Eliminar {room.number}?
                                              </p>
                                              <div className="flex gap-2">
                                                <Button
                                                  type="button"
                                                  disabled={roomBusy}
                                                  onClick={() =>
                                                    void removeRoom(room.id)
                                                  }
                                                  className="h-8 rounded-lg bg-rose-700 px-3 text-xs hover:bg-rose-800"
                                                >
                                                  Sí, eliminar
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  disabled={roomBusy}
                                                  onClick={() =>
                                                    setPendingDeleteRoomId(null)
                                                  }
                                                  className="h-8 rounded-lg px-3 text-xs"
                                                >
                                                  No
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex justify-end gap-2">
                                              <button
                                                type="button"
                                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-ink)] transition hover:bg-[var(--brand-mist)]"
                                                onClick={() =>
                                                  startEditRoom(room)
                                                }
                                              >
                                                Editar
                                              </button>
                                              {permissions.createRooms ? (
                                                <button
                                                  type="button"
                                                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                                                  onClick={() => {
                                                    setEditingRoomId(null);
                                                    setEditRoom(null);
                                                    setPendingDeleteRoomId(
                                                      room.id,
                                                    );
                                                  }}
                                                >
                                                  Eliminar
                                                </button>
                                              ) : null}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
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
              <Label>Foto propia (obligatoria)</Label>
              <p className="text-xs text-[var(--brand-muted)]">
                Cada tipo nuevo lleva su propia foto. Luego podrás agregar más
                en la galería de ese tipo.
              </p>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="h-10 cursor-pointer bg-white file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-deep)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setNewTypePhotoFile(file);
                }}
                required
              />
              {newTypePhotoFile ? (
                <p className="text-xs text-[var(--brand-ink)]">
                  Seleccionada: {newTypePhotoFile.name}
                </p>
              ) : null}
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
            {branchTypes.map((type) => (
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Label>Fotos de {type.name}</Label>
                      <p className="mt-1 text-xs text-[var(--brand-muted)]">
                        Solo fotos de esta habitación. Agrega las correctas y
                        elimina las que no correspondan. La marcada en dorado es
                        la pública.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--brand-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-ink)]">
                      Agregar foto
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          addGalleryPhoto(file, type.id, type.name).catch(
                            (err) => setError(err.message),
                          );
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {photosForType(type.id).map((image) => (
                      <div
                        key={`${type.id}-${image.id}`}
                        className={`overflow-hidden rounded-lg ring-2 ${
                          type.imagePath === image.path
                            ? "ring-[var(--brand-gold)]"
                            : "ring-[var(--brand-line)]"
                        }`}
                      >
                        <button
                          type="button"
                          className="relative block aspect-[4/3] w-full"
                          onClick={() =>
                            patchRoomType(type.id, {
                              imagePath: image.path,
                            }).catch((err) => setError(err.message))
                          }
                        >
                          <Image
                            src={mediaSrc(image.path, image.imageUpdatedAt)}
                            alt={image.label}
                            fill
                            unoptimized={image.path.startsWith("/api/media/")}
                            className="object-cover"
                            sizes="140px"
                          />
                        </button>
                        <div className="flex items-center justify-between gap-2 bg-[var(--brand-mist)] px-2 py-1.5">
                          <p className="truncate text-[11px] font-medium">
                            {type.imagePath === image.path
                              ? "Pública"
                              : "Usar"}
                          </p>
                          <button
                            type="button"
                            className="shrink-0 text-[11px] font-semibold text-red-700 underline-offset-2 hover:underline"
                            onClick={() =>
                              removeGalleryPhoto(image.id).catch((err) =>
                                setError(err.message),
                              )
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {photosForType(type.id).length === 0 && (
                    <p className="text-sm text-[var(--brand-muted)]">
                      Esta habitación aún no tiene fotos. Agrega al menos una.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg text-rose-700"
                    onClick={() =>
                      removeRoomType(type.id, type.name).catch((err) =>
                        setError(err.message),
                      )
                    }
                  >
                    Eliminar tipo
                  </Button>
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
            className="space-y-4 rounded-2xl border border-[var(--brand-line)] bg-white p-6"
          >
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--brand-ink)]">
                Nueva oferta o fiesta
              </h3>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                <strong>Oferta:</strong> descuento por cantidad de noches.{" "}
                <strong>Fiesta:</strong> días del paquete y costo total por tipo.
                Todo se publica en la web.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título (público)</Label>
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
                  className={selectClass}
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
                <Label>Vigente desde</Label>
                <Input
                  type="date"
                  value={offerStart}
                  onChange={(event) => setOfferStart(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Vigente hasta</Label>
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
                  placeholder="Detalle para huéspedes: condiciones, anticipación, etc."
                  rows={2}
                />
              </div>
            </div>

            {offerKind === "oferta" ? (
              <div className="grid gap-4 rounded-xl bg-[var(--brand-mist)]/60 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Desde cuántas noches</Label>
                  <Input
                    type="number"
                    min={1}
                    value={offerMinNights}
                    onChange={(event) => setOfferMinNights(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descuento (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={offerDiscountPercent}
                    onChange={(event) =>
                      setOfferDiscountPercent(event.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-[var(--brand-muted)]">
                    Sobre la tarifa habitual de cada habitación.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl bg-[var(--brand-mist)]/60 p-4">
                <div className="max-w-xs space-y-2">
                  <Label>Noches del paquete</Label>
                  <Input
                    type="number"
                    min={1}
                    value={offerPackageNights}
                    onChange={(event) =>
                      setOfferPackageNights(event.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-[var(--brand-muted)]">
                    Días de hospedaje incluidos en la fiesta.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {branchTypes.map((type) => (
                    <div key={type.id} className="space-y-2">
                      <Label>{type.name} — costo total (S/)</Label>
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
                        Habitual {formatMoney(type.basePrice)}/noche
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Prioridad (si se solapan fechas)</Label>
              <Input
                type="number"
                className="max-w-[140px]"
                value={offerPriority}
                onChange={(event) =>
                  setOfferPriority(Number(event.target.value))
                }
              />
            </div>
            <Button type="submit" className="rounded-lg bg-[var(--brand-deep)]">
              Publicar en la web
            </Button>
          </form>

          <div className="space-y-4">
            {(branchOffers ?? []).length === 0 && (
              <p className="rounded-2xl border border-[var(--brand-line)] bg-white px-5 py-8 text-center text-sm text-[var(--brand-muted)]">
                Aún no hay ofertas. Crea una oferta por noches o un paquete de
                fiesta.
              </p>
            )}
            {(branchOffers ?? [])
              .slice()
              .sort((a, b) => b.startDate.localeCompare(a.startDate))
              .map((offer) => (
                <div
                  key={offer.id}
                  className="space-y-4 rounded-2xl border border-[var(--brand-line)] bg-white p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                        {PRICE_OFFER_KIND_LABELS[offer.kind]}
                        {!offer.active ? " · pausada" : " · pública"}
                      </p>
                      <h4 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
                        {offer.title}
                      </h4>
                      <p className="mt-1 text-sm text-[var(--brand-muted)]">
                        {formatDate(offer.startDate)} → {formatDate(offer.endDate)}
                      </p>
                      {offer.kind === "oferta" && (
                        <p className="mt-2 text-sm font-medium text-[var(--brand-ink)]">
                          Desde {offer.minNights} noches · {offer.discountPercent}%
                          dto.
                        </p>
                      )}
                      {offer.kind === "fiesta" && (
                        <p className="mt-2 text-sm font-medium text-[var(--brand-ink)]">
                          Paquete de {offer.packageNights} noches
                        </p>
                      )}
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
                        className="rounded-lg"
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
                        className="rounded-lg text-rose-700"
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
                  {offer.kind === "fiesta" ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {branchTypes.map((type) => (
                        <div
                          key={`${offer.id}-${type.id}`}
                          className="rounded-xl bg-[var(--brand-mist)] px-3 py-2 text-sm"
                        >
                          <p className="font-medium text-[var(--brand-ink)]">
                            {type.name}
                          </p>
                          <p className="text-[var(--brand-muted)]">
                            {offer.packagePrices?.[type.id]
                              ? `${formatMoney(offer.packagePrices[type.id]!)} total`
                              : "Sin precio"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : offer.kind === "oferta" ? (
                    <p className="text-sm text-[var(--brand-muted)]">
                      El público ve el % de descuento aplicado a cada tipo.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {branchTypes.map((type) => (
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
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "sucursales" && permissions.manageStaff && (
        <div className="space-y-8">
          <form
            onSubmit={addBranch}
            className="space-y-4 rounded-2xl border border-[var(--brand-line)] bg-white p-6"
          >
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--brand-ink)]">
                Nueva sucursal
              </h3>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Tendrá su propia dirección, teléfonos y foto del hotel. Luego
                agregas habitaciones y ofertas solo para esa sede.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre público</Label>
                <Input
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  placeholder="Gran Real Hotel Trujillo"
                />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={branchCity}
                  onChange={(event) => setBranchCity(event.target.value)}
                  placeholder="Trujillo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Región</Label>
                <Input
                  value={branchRegion}
                  onChange={(event) => setBranchRegion(event.target.value)}
                  placeholder="La Libertad"
                />
              </div>
              <div className="space-y-2">
                <Label>Frase / tagline</Label>
                <Input
                  value={branchTagline}
                  onChange={(event) => setBranchTagline(event.target.value)}
                  placeholder="Trujillo te espera"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dirección</Label>
                <Input
                  value={branchAddress}
                  onChange={(event) => setBranchAddress(event.target.value)}
                  placeholder="Av. Ejemplo 123"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Celular de la sede</Label>
                <Input
                  value={branchPhoneMobile}
                  onChange={(event) => setBranchPhoneMobile(event.target.value)}
                  placeholder="9xxxxxxxx"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono fijo (opcional)</Label>
                <Input
                  value={branchPhoneLandline}
                  onChange={(event) =>
                    setBranchPhoneLandline(event.target.value)
                  }
                  placeholder="044 ......"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Foto propia del hotel (obligatoria)</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="h-10 cursor-pointer bg-white file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-deep)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  onChange={(event) =>
                    setBranchHeroFile(event.target.files?.[0] ?? null)
                  }
                  required
                />
                {branchHeroFile ? (
                  <p className="text-xs text-[var(--brand-ink)]">
                    Seleccionada: {branchHeroFile.name}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--brand-muted)]">
                    Fachada o ambiente del nuevo hotel; no uses fotos de Otuzco.
                  </p>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={branchBusy}
              className="rounded-lg bg-[var(--brand-deep)]"
            >
              {branchBusy ? "Creando…" : "Crear sucursal"}
            </Button>
          </form>

          <div className="space-y-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="space-y-4 rounded-2xl border border-[var(--brand-line)] bg-white p-5"
              >
                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--brand-mist)]">
                    <Image
                      src={branch.heroImagePath}
                      alt={branch.name}
                      fill
                      unoptimized={branch.heroImagePath.startsWith(
                        "/api/media/",
                      )}
                      className="object-cover"
                      sizes="160px"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
                      {branch.isPrimary ? "Principal" : "Sucursal"}
                      {!branch.active ? " · pausada" : ""}
                    </p>
                    <h4 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--brand-ink)]">
                      {branch.name}
                    </h4>
                    <p className="text-sm text-[var(--brand-muted)]">
                      {branch.fullAddress}
                    </p>
                    <p className="text-sm text-[var(--brand-ink)]">
                      Cel. {branch.phoneMobile}
                      {branch.phoneLandline
                        ? ` · Telf. ${branch.phoneLandline}`
                        : ""}
                    </p>
                    <p className="text-xs text-[var(--brand-muted)]">
                      Página pública: /sede/{branch.slug}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => startEditBranch(branch)}
                      >
                        {editingBranchId === branch.id
                          ? "Editando…"
                          : "Modificar datos"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => {
                          setActiveBranchId(branch.id);
                          setTab("habitaciones");
                        }}
                      >
                        Habitaciones de sede
                      </Button>
                      {!branch.isPrimary && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() =>
                            patchBranch(branch.id, {
                              active: !branch.active,
                            }).catch((err) => setError(err.message))
                          }
                        >
                          {branch.active ? "Pausar sede" : "Activar sede"}
                        </Button>
                      )}
                      {!branch.isPrimary && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-lg text-rose-700"
                          disabled={branchBusy}
                          onClick={() =>
                            removeBranch(branch.id, branch.city).catch((err) =>
                              setError(err.message),
                            )
                          }
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {editingBranchId === branch.id && (
                  <form
                    onSubmit={saveEditBranch}
                    className="space-y-4 rounded-xl border border-[var(--brand-line)] bg-[var(--brand-mist)]/40 p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--brand-ink)]">
                      Editar {branch.city}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nombre</Label>
                        <Input
                          value={editBranch.name}
                          onChange={(event) =>
                            setEditBranch((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          required
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Ciudad</Label>
                        <Input
                          value={editBranch.city}
                          onChange={(event) =>
                            setEditBranch((prev) => ({
                              ...prev,
                              city: event.target.value,
                            }))
                          }
                          required
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Región</Label>
                        <Input
                          value={editBranch.region}
                          onChange={(event) =>
                            setEditBranch((prev) => ({
                              ...prev,
                              region: event.target.value,
                            }))
                          }
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tagline</Label>
                        <Input
                          value={editBranch.tagline}
                          onChange={(event) =>
                            setEditBranch((prev) => ({
                              ...prev,
                              tagline: event.target.value,
                            }))
                          }
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">Dirección</Label>
                        <Input
                          value={editBranch.address}
                          onChange={(event) =>
                            setEditBranch((prev) => ({
                              ...prev,
                              address: event.target.value,
                            }))
                          }
                          required
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Celular</Label>
                        <Input
                          value={editBranch.phoneMobile}
                          onChange={(event) =>
                            setEditBranch((prev) => ({
                              ...prev,
                              phoneMobile: event.target.value,
                            }))
                          }
                          required
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Teléfono fijo</Label>
                        <Input
                          value={editBranch.phoneLandline}
                          onChange={(event) =>
                            setEditBranch((prev) => ({
                              ...prev,
                              phoneLandline: event.target.value,
                            }))
                          }
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">
                          Nueva foto del hotel (opcional)
                        </Label>
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="h-10 cursor-pointer bg-white file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-deep)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                          onChange={(event) =>
                            setEditBranchHeroFile(
                              event.target.files?.[0] ?? null,
                            )
                          }
                        />
                        {editBranchHeroFile ? (
                          <p className="text-xs text-[var(--brand-ink)]">
                            Se reemplazará la foto: {editBranchHeroFile.name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        disabled={branchBusy}
                        className="rounded-lg bg-[var(--brand-deep)]"
                      >
                        {branchBusy ? "Guardando…" : "Guardar cambios"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => {
                          setEditingBranchId(null);
                          setEditBranchHeroFile(null);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
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
                  branchTypes.find(
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
      </section>
    </div>
  );
}
