import { promises as fs } from "fs";
import path from "path";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { COLLECTIONS, getDb, isFirestoreConfigured } from "./firebase";
import { HOTEL } from "./hotel-info";
import { createSeedStore } from "./seed";
import { validateGuestDocument } from "./document";
import type {
  GuestProfile,
  HotelStore,
  LoginCode,
  MailMessage,
  PaymentMethod,
  Reservation,
  ReservationStatus,
  Room,
  RoomStatus,
  RoomType,
  Service,
  StaffMember,
  StaffRole,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "hotel.json");

type GlobalStore = {
  hotelStore?: HotelStore;
};

const globalForStore = globalThis as typeof globalThis & GlobalStore;

function normalizeStore(store: HotelStore): HotelStore {
  return {
    ...store,
    reservations: store.reservations ?? [],
    mailOutbox: store.mailOutbox ?? [],
    loginCodes: store.loginCodes ?? [],
    staffMembers: store.staffMembers ?? [],
    guests: store.guests ?? [],
  };
}

function cloneStore(store: HotelStore): HotelStore {
  return structuredClone(normalizeStore(store));
}

async function ensureFileStore(): Promise<HotelStore> {
  if (globalForStore.hotelStore) return globalForStore.hotelStore;

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    globalForStore.hotelStore = normalizeStore(JSON.parse(raw) as HotelStore);
  } catch {
    globalForStore.hotelStore = createSeedStore();
    await persistFileStore(globalForStore.hotelStore);
  }

  return globalForStore.hotelStore;
}

async function persistFileStore(store: HotelStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  globalForStore.hotelStore = store;
}

async function readFirestoreStore(): Promise<HotelStore> {
  const db = getDb();
  const [
    servicesSnap,
    roomTypesSnap,
    roomsSnap,
    reservationsSnap,
    loginCodesSnap,
    mailSnap,
    staffSnap,
    guestsSnap,
  ] = await Promise.all([
    db.collection(COLLECTIONS.services).get(),
    db.collection(COLLECTIONS.roomTypes).get(),
    db.collection(COLLECTIONS.rooms).get(),
    db.collection(COLLECTIONS.reservations).orderBy("createdAt", "desc").get(),
    db.collection(COLLECTIONS.loginCodes).get(),
    db.collection(COLLECTIONS.mailOutbox).orderBy("createdAt", "desc").limit(100).get(),
    db.collection(COLLECTIONS.staffMembers).get(),
    db.collection(COLLECTIONS.guests).get(),
  ]);

  if (servicesSnap.empty || roomTypesSnap.empty || roomsSnap.empty) {
    const seed = createSeedStore();
    await seedFirestore(seed);
    return cloneStore(seed);
  }

  return cloneStore({
    services: servicesSnap.docs.map((doc) => doc.data() as Service),
    roomTypes: roomTypesSnap.docs.map((doc) => doc.data() as RoomType),
    rooms: roomsSnap.docs.map((doc) => doc.data() as Room),
    reservations: reservationsSnap.docs.map((doc) => doc.data() as Reservation),
    loginCodes: loginCodesSnap.docs.map((doc) => doc.data() as LoginCode),
    mailOutbox: mailSnap.docs.map((doc) => doc.data() as MailMessage),
    staffMembers: staffSnap.docs.map((doc) => doc.data() as StaffMember),
    guests: guestsSnap.docs.map((doc) => doc.data() as GuestProfile),
  });
}

export async function seedFirestore(store: HotelStore = createSeedStore()): Promise<void> {
  const db = getDb();
  const batch = db.batch();

  batch.set(db.collection(COLLECTIONS.hotel).doc("gran-real"), {
    ...HOTEL,
    updatedAt: new Date().toISOString(),
  });

  for (const service of store.services) {
    batch.set(db.collection(COLLECTIONS.services).doc(service.id), service);
  }
  for (const roomType of store.roomTypes) {
    batch.set(db.collection(COLLECTIONS.roomTypes).doc(roomType.id), roomType);
  }
  for (const room of store.rooms) {
    batch.set(db.collection(COLLECTIONS.rooms).doc(room.id), room);
  }

  await batch.commit();
}

async function writeFirestoreStore(store: HotelStore): Promise<void> {
  const db = getDb();
  const batch = db.batch();

  batch.set(db.collection(COLLECTIONS.hotel).doc("gran-real"), {
    ...HOTEL,
    updatedAt: new Date().toISOString(),
  });

  for (const service of store.services) {
    batch.set(db.collection(COLLECTIONS.services).doc(service.id), service);
  }
  for (const roomType of store.roomTypes) {
    batch.set(db.collection(COLLECTIONS.roomTypes).doc(roomType.id), roomType);
  }
  for (const room of store.rooms) {
    batch.set(db.collection(COLLECTIONS.rooms).doc(room.id), room);
  }
  for (const reservation of store.reservations) {
    batch.set(
      db.collection(COLLECTIONS.reservations).doc(reservation.id),
      reservation,
    );
  }
  for (const code of store.loginCodes) {
    batch.set(db.collection(COLLECTIONS.loginCodes).doc(code.email), code);
  }
  for (const mail of store.mailOutbox.slice(0, 100)) {
    batch.set(db.collection(COLLECTIONS.mailOutbox).doc(mail.id), mail);
  }
  for (const member of store.staffMembers) {
    batch.set(
      db.collection(COLLECTIONS.staffMembers).doc(member.email),
      member,
    );
  }
  for (const guest of store.guests) {
    batch.set(db.collection(COLLECTIONS.guests).doc(guest.document), guest);
  }

  await batch.commit();
  globalForStore.hotelStore = store;
}

async function readStore(): Promise<HotelStore> {
  if (isFirestoreConfigured()) {
    try {
      return await readFirestoreStore();
    } catch (error) {
      console.error("Firestore no disponible, usando almacén local:", error);
      return cloneStore(await ensureFileStore());
    }
  }
  return cloneStore(await ensureFileStore());
}

async function writeStore(store: HotelStore): Promise<void> {
  if (isFirestoreConfigured()) {
    try {
      await writeFirestoreStore(store);
      return;
    } catch (error) {
      console.error("Error al guardar en Firestore, usando archivo local:", error);
    }
  }
  await persistFileStore(store);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  return Math.max(nights, 1);
}

function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isRoomBookable(status: RoomStatus): boolean {
  return status === "disponible" || status === "limpieza";
}

export function getStorageMode(): "firestore" | "local" {
  return isFirestoreConfigured() ? "firestore" : "local";
}

export async function getCatalog() {
  const store = await readStore();
  return {
    services: store.services,
    roomTypes: store.roomTypes,
    rooms: store.rooms,
  };
}

export async function getAvailability(checkIn?: string, checkOut?: string) {
  const store = await readStore();

  return store.roomTypes.map((type) => {
    const typeRooms = store.rooms.filter((room) => room.roomTypeId === type.id);
    const physicalAvailable = typeRooms.filter((room) =>
      isRoomBookable(room.status),
    );

    let availableCount = physicalAvailable.length;

    if (checkIn && checkOut) {
      const reservedRoomIds = new Set(
        store.reservations
          .filter(
            (reservation) =>
              reservation.roomTypeId === type.id &&
              reservation.status !== "cancelada" &&
              datesOverlap(
                reservation.checkIn,
                reservation.checkOut,
                checkIn,
                checkOut,
              ),
          )
          .map((reservation) => reservation.roomId)
          .filter(Boolean),
      );

      const blockedByDate = store.reservations.filter(
        (reservation) =>
          reservation.roomTypeId === type.id &&
          reservation.status !== "cancelada" &&
          !reservation.roomId &&
          datesOverlap(
            reservation.checkIn,
            reservation.checkOut,
            checkIn,
            checkOut,
          ),
      ).length;

      availableCount = Math.max(
        0,
        physicalAvailable.filter((room) => !reservedRoomIds.has(room.id)).length -
          blockedByDate,
      );
    }

    return {
      roomType: type,
      totalRooms: typeRooms.length,
      availableCount,
      services: store.services.filter((service) =>
        type.serviceIds.includes(service.id),
      ),
    };
  });
}

export async function createReservation(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestDocument: string;
  specialRequests?: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: Reservation["paymentStatus"];
  status?: ReservationStatus;
}): Promise<Reservation> {
  const store = await readStore();
  const roomType = store.roomTypes.find((type) => type.id === input.roomTypeId);
  if (!roomType) throw new Error("Tipo de habitación no encontrado");

  if (input.guests < 1 || input.guests > roomType.maxGuests) {
    throw new Error(`Máximo ${roomType.maxGuests} huéspedes para este tipo`);
  }
  if (input.checkOut <= input.checkIn) {
    throw new Error("La fecha de salida debe ser posterior al ingreso");
  }

  const guestEmail = input.guestEmail.trim().toLowerCase();
  const guest = await bindGuestIdentity({
    email: guestEmail,
    name: input.guestName,
    phone: input.guestPhone,
    document: input.guestDocument,
    store,
  });

  const availability = await getAvailability(input.checkIn, input.checkOut);
  const slot = availability.find((item) => item.roomType.id === input.roomTypeId);
  if (!slot || slot.availableCount < 1) {
    throw new Error("No hay habitaciones disponibles para esas fechas");
  }

  const reservedIds = new Set(
    store.reservations
      .filter(
        (reservation) =>
          reservation.status !== "cancelada" &&
          datesOverlap(
            reservation.checkIn,
            reservation.checkOut,
            input.checkIn,
            input.checkOut,
          ) &&
          reservation.roomId,
      )
      .map((reservation) => reservation.roomId as string),
  );

  const assignedRoom =
    store.rooms.find(
      (room) =>
        room.roomTypeId === input.roomTypeId &&
        isRoomBookable(room.status) &&
        !reservedIds.has(room.id),
    ) ?? null;

  const nights = nightsBetween(input.checkIn, input.checkOut);
  const totalAmount = nights * roomType.basePrice;
  const status = input.status ?? "pendiente";
  const paymentStatus = input.paymentStatus ?? "pendiente";

  const reservation: Reservation = {
    id: `res-${crypto.randomUUID()}`,
    code: `GR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    roomTypeId: input.roomTypeId,
    roomId: assignedRoom?.id ?? null,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    guestName: guest.name,
    guestEmail: guest.email,
    guestPhone: guest.phone,
    guestDocument: guest.document,
    specialRequests: input.specialRequests?.trim() ?? "",
    paymentMethod: input.paymentMethod,
    paymentStatus,
    status,
    nights,
    totalAmount,
    createdAt: new Date().toISOString(),
  };

  if (assignedRoom && status === "confirmada") {
    assignedRoom.status = "ocupada";
  }

  store.reservations.unshift(reservation);
  await writeStore(store);
  return reservation;
}

export async function confirmReservationPayment(
  reservationId: string,
): Promise<Reservation> {
  const store = await readStore();
  const reservation = store.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new Error("Reserva no encontrada");

  reservation.paymentStatus = "pagado";
  reservation.status = "confirmada";

  if (reservation.roomId) {
    const room = store.rooms.find((item) => item.id === reservation.roomId);
    if (room) room.status = "ocupada";
  }

  await writeStore(store);
  return reservation;
}

export async function getReservationById(
  id: string,
): Promise<{ reservation: Reservation; roomType: RoomType } | null> {
  const store = await readStore();
  const reservation = store.reservations.find((item) => item.id === id);
  if (!reservation) return null;
  const roomType = store.roomTypes.find((type) => type.id === reservation.roomTypeId);
  if (!roomType) return null;
  return { reservation, roomType };
}

export async function listReservations(): Promise<Reservation[]> {
  const store = await readStore();
  return store.reservations;
}

export async function listReservationsByEmail(email: string): Promise<Reservation[]> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  return store.reservations.filter(
    (reservation) => reservation.guestEmail === normalized,
  );
}

export async function getReservationByCode(
  code: string,
): Promise<{ reservation: Reservation; roomType: RoomType } | null> {
  const store = await readStore();
  const reservation = store.reservations.find(
    (item) => item.code.toUpperCase() === code.toUpperCase(),
  );
  if (!reservation) return null;
  const roomType = store.roomTypes.find((type) => type.id === reservation.roomTypeId);
  if (!roomType) return null;
  return { reservation, roomType };
}

export async function saveLoginCode(email: string, code: string): Promise<LoginCode> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  store.loginCodes = store.loginCodes.filter((item) => item.email !== normalized);
  const entry: LoginCode = {
    email: normalized,
    code,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
  store.loginCodes.push(entry);
  await writeStore(store);
  return entry;
}

export async function consumeLoginCode(email: string, code: string): Promise<boolean> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  const entry = store.loginCodes.find((item) => item.email === normalized);
  if (!entry) return false;
  if (entry.expiresAt < new Date().toISOString()) {
    store.loginCodes = store.loginCodes.filter((item) => item.email !== normalized);
    await writeStore(store);
    return false;
  }
  if (entry.code !== code.trim()) return false;
  store.loginCodes = store.loginCodes.filter((item) => item.email !== normalized);
  await writeStore(store);
  return true;
}

export async function appendMailOutbox(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  mode: "resend" | "demo";
  delivered: boolean;
}): Promise<MailMessage> {
  const store = await readStore();
  const message: MailMessage = {
    id: `mail-${crypto.randomUUID()}`,
    to: input.to.trim().toLowerCase(),
    subject: input.subject,
    html: input.html,
    text: input.text,
    mode: input.mode,
    delivered: input.delivered,
    createdAt: new Date().toISOString(),
  };
  store.mailOutbox.unshift(message);
  store.mailOutbox = store.mailOutbox.slice(0, 100);
  await writeStore(store);
  return message;
}

export async function listMailOutbox(): Promise<MailMessage[]> {
  const store = await readStore();
  return store.mailOutbox;
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<Reservation> {
  const store = await readStore();
  const reservation = store.reservations.find((item) => item.id === id);
  if (!reservation) throw new Error("Reserva no encontrada");

  reservation.status = status;
  if ((status === "cancelada" || status === "completada") && reservation.roomId) {
    const room = store.rooms.find((item) => item.id === reservation.roomId);
    if (room) room.status = "limpieza";
  }

  await writeStore(store);
  return reservation;
}

export async function updateRoom(
  id: string,
  patch: Partial<Pick<Room, "status" | "notes" | "roomTypeId" | "number" | "floor">>,
): Promise<Room> {
  const store = await readStore();
  const room = store.rooms.find((item) => item.id === id);
  if (!room) throw new Error("Habitación no encontrada");

  if (patch.roomTypeId) {
    const typeExists = store.roomTypes.some((type) => type.id === patch.roomTypeId);
    if (!typeExists) throw new Error("Tipo de habitación inválido");
    room.roomTypeId = patch.roomTypeId;
  }
  if (patch.status) room.status = patch.status;
  if (typeof patch.notes === "string") room.notes = patch.notes;
  if (typeof patch.number === "string") room.number = patch.number;
  if (typeof patch.floor === "number") room.floor = patch.floor;

  await writeStore(store);
  return room;
}

export async function updateRoomType(
  id: string,
  patch: Partial<
    Pick<
      RoomType,
      | "name"
      | "description"
      | "basePrice"
      | "maxGuests"
      | "bedType"
      | "serviceIds"
    >
  >,
): Promise<RoomType> {
  const store = await readStore();
  const roomType = store.roomTypes.find((item) => item.id === id);
  if (!roomType) throw new Error("Tipo no encontrado");

  if (patch.serviceIds) {
    const valid = patch.serviceIds.every((serviceId) =>
      store.services.some((service) => service.id === serviceId),
    );
    if (!valid) throw new Error("Uno o más servicios no existen");
    roomType.serviceIds = patch.serviceIds;
  }
  if (typeof patch.name === "string") roomType.name = patch.name;
  if (typeof patch.description === "string") roomType.description = patch.description;
  if (typeof patch.basePrice === "number") roomType.basePrice = patch.basePrice;
  if (typeof patch.maxGuests === "number") roomType.maxGuests = patch.maxGuests;
  if (typeof patch.bedType === "string") roomType.bedType = patch.bedType;

  await writeStore(store);
  return roomType;
}

export async function createRoom(input: {
  number: string;
  floor: number;
  roomTypeId: string;
  status?: RoomStatus;
  notes?: string;
}): Promise<Room> {
  const store = await readStore();
  const typeExists = store.roomTypes.some((type) => type.id === input.roomTypeId);
  if (!typeExists) throw new Error("Tipo de habitación inválido");
  if (store.rooms.some((room) => room.number === input.number)) {
    throw new Error("Ya existe una habitación con ese número");
  }

  const room: Room = {
    id: `room-${crypto.randomUUID()}`,
    number: input.number,
    floor: input.floor,
    roomTypeId: input.roomTypeId,
    status: input.status ?? "disponible",
    notes: input.notes ?? "",
  };

  store.rooms.push(room);
  store.rooms.sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  await writeStore(store);
  return room;
}

export async function listServices(): Promise<Service[]> {
  const store = await readStore();
  return store.services;
}

/**
 * Vincula correo ↔ documento de forma única.
 * Un documento solo puede usarse con un correo; un correo solo con un documento.
 */
export async function bindGuestIdentity(input: {
  email: string;
  name: string;
  phone: string;
  document: string;
  store?: HotelStore;
}): Promise<GuestProfile> {
  const validated = validateGuestDocument(input.document);
  if (!validated.ok) throw new Error(validated.error);

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phone = input.phone.trim();
  const document = validated.document;
  const now = new Date().toISOString();

  const ownsStore = !input.store;
  const store = input.store ?? (await readStore());

  const byDocument = store.guests.find((guest) => guest.document === document);
  const byEmail = store.guests.find((guest) => guest.email === email);

  if (byDocument && byDocument.email !== email) {
    throw new Error(
      "Este documento ya está registrado con otro correo. Usa el correo original o contacta al hotel.",
    );
  }
  if (byEmail && byEmail.document !== document) {
    throw new Error(
      "Este correo ya está vinculado a otro documento de identidad. No se permiten varias cuentas.",
    );
  }

  // También revisar reservas históricas (migración / datos previos)
  const conflictDoc = store.reservations.find(
    (reservation) =>
      reservation.guestDocument.replace(/[\s.\-_/]/g, "").toUpperCase() ===
        document && reservation.guestEmail !== email,
  );
  if (conflictDoc) {
    throw new Error(
      "Este documento ya aparece en reservas con otro correo. Contacta al hotel.",
    );
  }
  const conflictEmail = store.reservations.find(
    (reservation) =>
      reservation.guestEmail === email &&
      reservation.guestDocument.replace(/[\s.\-_/]/g, "").toUpperCase() !==
        document &&
      reservation.guestDocument.trim() !== "",
  );
  if (conflictEmail && !byEmail) {
    throw new Error(
      "Este correo ya reservó con otro documento. Usa el mismo DNI/pasaporte.",
    );
  }

  let guest: GuestProfile;
  if (byDocument || byEmail) {
    guest = byDocument || byEmail!;
    guest.name = name || guest.name;
    guest.phone = phone || guest.phone;
    guest.updatedAt = now;
  } else {
    guest = {
      document,
      email,
      name,
      phone,
      createdAt: now,
      updatedAt: now,
    };
    store.guests.push(guest);
  }

  if (ownsStore) {
    await writeStore(store);
  }
  return guest;
}

export async function getGuestByEmail(
  email: string,
): Promise<GuestProfile | null> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  return store.guests.find((guest) => guest.email === normalized) ?? null;
}

export async function getStaffByEmail(
  email: string,
): Promise<StaffMember | null> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  return (
    store.staffMembers.find((member) => member.email === normalized) ?? null
  );
}

export async function listStaffMembers(): Promise<StaffMember[]> {
  const store = await readStore();
  return [...store.staffMembers].sort((a, b) => a.email.localeCompare(b.email));
}

export async function upsertStaffMember(input: {
  email: string;
  name: string;
  role: StaffRole;
  active?: boolean;
  createdBy: string;
}): Promise<StaffMember> {
  const store = await readStore();
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Correo de personal inválido");

  const existing = store.staffMembers.find((member) => member.email === email);
  if (existing) {
    existing.name = input.name.trim() || existing.name;
    existing.role = input.role;
    if (typeof input.active === "boolean") existing.active = input.active;
    await writeStore(store);
    return existing;
  }

  const member: StaffMember = {
    email,
    name: input.name.trim() || email.split("@")[0],
    role: input.role,
    active: input.active ?? true,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy.trim().toLowerCase(),
  };
  store.staffMembers.push(member);
  await writeStore(store);
  return member;
}

export async function setStaffActive(
  email: string,
  active: boolean,
): Promise<StaffMember> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  const member = store.staffMembers.find((item) => item.email === normalized);
  if (!member) throw new Error("Personal no encontrado");
  member.active = active;
  await writeStore(store);
  return member;
}

export async function getAdminSnapshot() {
  const store = await readStore();
  const availability = await getAvailability();

  return {
    rooms: store.rooms,
    roomTypes: store.roomTypes,
    services: store.services,
    reservations: store.reservations,
    mailOutbox: store.mailOutbox,
    staffMembers: store.staffMembers,
    guests: store.guests,
    availability,
    storage: getStorageMode(),
    hotel: HOTEL,
    stats: {
      totalRooms: store.rooms.length,
      availableRooms: store.rooms.filter((room) => room.status === "disponible")
        .length,
      occupiedRooms: store.rooms.filter((room) => room.status === "ocupada").length,
      activeReservations: store.reservations.filter(
        (reservation) =>
          reservation.status === "confirmada" || reservation.status === "pendiente",
      ).length,
      guestsRegistered: store.guests.length,
      staffActive: store.staffMembers.filter((member) => member.active).length,
    },
  };
}
