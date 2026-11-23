import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { COLLECTIONS, getDb, isFirestoreConfigured } from "./firebase";
import { HOTEL } from "./hotel-info";
import { createSeedStore } from "./seed";
import { validateGuestDocument } from "./document";
import { isAllowedRoomImage } from "./hotel-images";
import type {
  GuestProfile,
  HotelStore,
  LoginCode,
  MailMessage,
  PaymentMethod,
  PriceOffer,
  PriceOfferKind,
  Reservation,
  ReservationStatus,
  Room,
  RoomStatus,
  RoomType,
  Service,
  StaffMember,
  StaffRole,
} from "./types";
import { validateOfferDates } from "./pricing";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "hotel.json");

type GlobalStore = {
  hotelStore?: HotelStore;
};

const globalForStore = globalThis as typeof globalThis & GlobalStore;

function ensureCatalog(store: HotelStore): HotelStore {
  const seed = createSeedStore();
  const serviceIds = new Set(store.services.map((item) => item.id));
  for (const service of seed.services) {
    if (!serviceIds.has(service.id)) {
      store.services.push(service);
      serviceIds.add(service.id);
    }
  }

  const typeIds = new Set(store.roomTypes.map((item) => item.id));
  for (const roomType of seed.roomTypes) {
    if (!typeIds.has(roomType.id)) {
      store.roomTypes.push(roomType);
      typeIds.add(roomType.id);
    } else {
      const existing = store.roomTypes.find((item) => item.id === roomType.id);
      if (!existing) continue;
      if (!existing.imagePath && roomType.imagePath) {
        existing.imagePath = roomType.imagePath;
      }
      // Completa servicios del catálogo semilla sin quitar los que el jefe añadió.
      const merged = new Set(existing.serviceIds);
      for (const serviceId of roomType.serviceIds) {
        if (serviceIds.has(serviceId)) merged.add(serviceId);
      }
      existing.serviceIds = [...merged];
    }
  }

  const roomNumbers = new Set(store.rooms.map((item) => item.number));
  for (const room of seed.rooms) {
    if (!roomNumbers.has(room.number) && typeIds.has(room.roomTypeId)) {
      store.rooms.push(room);
      roomNumbers.add(room.number);
    }
  }

  return store;
}

function normalizeStore(store: HotelStore): HotelStore {
  return ensureCatalog({
    ...store,
    reservations: store.reservations ?? [],
    mailOutbox: store.mailOutbox ?? [],
    loginCodes: store.loginCodes ?? [],
    staffMembers: store.staffMembers ?? [],
    guests: store.guests ?? [],
    priceOffers: store.priceOffers ?? [],
  });
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
    offersSnap,
  ] = await Promise.all([
    db.collection(COLLECTIONS.services).get(),
    db.collection(COLLECTIONS.roomTypes).get(),
    db.collection(COLLECTIONS.rooms).get(),
    db.collection(COLLECTIONS.reservations).orderBy("createdAt", "desc").get(),
    db.collection(COLLECTIONS.loginCodes).get(),
    db.collection(COLLECTIONS.mailOutbox).orderBy("createdAt", "desc").limit(100).get(),
    db.collection(COLLECTIONS.staffMembers).get(),
    db.collection(COLLECTIONS.guests).get(),
    db.collection(COLLECTIONS.priceOffers).get(),
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
    priceOffers: offersSnap.docs.map((doc) => doc.data() as PriceOffer),
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
  for (const offer of store.priceOffers) {
    batch.set(db.collection(COLLECTIONS.priceOffers).doc(offer.id), offer);
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
  for (const offer of store.priceOffers) {
    batch.set(db.collection(COLLECTIONS.priceOffers).doc(offer.id), offer);
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
    priceOffers: store.priceOffers,
  };
}

export async function listPriceOffers(): Promise<PriceOffer[]> {
  const store = await readStore();
  return [...store.priceOffers].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );
}

function sanitizeOfferPrices(
  prices: Record<string, number>,
  roomTypeIds: Set<string>,
): Record<string, number> {
  const clean: Record<string, number> = {};
  for (const [roomTypeId, value] of Object.entries(prices)) {
    if (!roomTypeIds.has(roomTypeId)) continue;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    clean[roomTypeId] = Math.round(amount);
  }
  return clean;
}

export async function createPriceOffer(input: {
  title: string;
  description: string;
  kind: PriceOfferKind;
  startDate: string;
  endDate: string;
  active?: boolean;
  priority?: number;
  prices: Record<string, number>;
}): Promise<PriceOffer> {
  const title = input.title.trim();
  if (!title) throw new Error("El título es obligatorio");

  const dateError = validateOfferDates(input.startDate, input.endDate);
  if (dateError) throw new Error(dateError);

  const store = await readStore();
  const roomTypeIds = new Set(store.roomTypes.map((type) => type.id));
  const prices = sanitizeOfferPrices(input.prices, roomTypeIds);
  if (Object.keys(prices).length === 0) {
    throw new Error("Define al menos un precio por tipo de habitación");
  }

  const now = new Date().toISOString();
  const offer: PriceOffer = {
    id: `offer-${crypto.randomUUID()}`,
    title,
    description: input.description.trim(),
    kind: input.kind,
    startDate: input.startDate,
    endDate: input.endDate,
    active: input.active ?? true,
    priority: Number.isFinite(input.priority) ? Number(input.priority) : 0,
    prices,
    createdAt: now,
    updatedAt: now,
  };

  store.priceOffers.push(offer);
  await writeStore(store);
  return offer;
}

export async function updatePriceOffer(
  id: string,
  patch: Partial<
    Pick<
      PriceOffer,
      | "title"
      | "description"
      | "kind"
      | "startDate"
      | "endDate"
      | "active"
      | "priority"
      | "prices"
    >
  >,
): Promise<PriceOffer> {
  const store = await readStore();
  const offer = store.priceOffers.find((item) => item.id === id);
  if (!offer) throw new Error("Oferta no encontrada");

  const nextStart = patch.startDate ?? offer.startDate;
  const nextEnd = patch.endDate ?? offer.endDate;
  const dateError = validateOfferDates(nextStart, nextEnd);
  if (dateError) throw new Error(dateError);

  if (typeof patch.title === "string") {
    const title = patch.title.trim();
    if (!title) throw new Error("El título es obligatorio");
    offer.title = title;
  }
  if (typeof patch.description === "string") {
    offer.description = patch.description.trim();
  }
  if (patch.kind) offer.kind = patch.kind;
  if (patch.startDate) offer.startDate = patch.startDate;
  if (patch.endDate) offer.endDate = patch.endDate;
  if (typeof patch.active === "boolean") offer.active = patch.active;
  if (typeof patch.priority === "number" && Number.isFinite(patch.priority)) {
    offer.priority = patch.priority;
  }
  if (patch.prices) {
    const roomTypeIds = new Set(store.roomTypes.map((type) => type.id));
    const prices = sanitizeOfferPrices(patch.prices, roomTypeIds);
    if (Object.keys(prices).length === 0) {
      throw new Error("Define al menos un precio por tipo de habitación");
    }
    offer.prices = prices;
  }

  offer.updatedAt = new Date().toISOString();
  await writeStore(store);
  return offer;
}

export async function deletePriceOffer(id: string): Promise<void> {
  const store = await readStore();
  const index = store.priceOffers.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Oferta no encontrada");
  store.priceOffers.splice(index, 1);
  await writeStore(store);
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
  cipCode?: string;
  cipUrl?: string | null;
  cipExpiresAt?: string | null;
  cipMode?: "live" | "demo";
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

  // Evitar saturar disponibilidad con muchas reservas pendientes del mismo correo
  const openPending = store.reservations.filter(
    (reservation) =>
      reservation.guestEmail === guestEmail &&
      reservation.status === "pendiente" &&
      reservation.paymentStatus === "pendiente",
  ).length;
  if (openPending >= 3) {
    throw new Error(
      "Ya tienes 3 reservas pendientes de pago. Completa o cancela una antes de crear otra.",
    );
  }

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
    code: `GR-${randomBytes(5).toString("hex").toUpperCase().slice(0, 8)}`,
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
    cipCode: input.cipCode,
    cipUrl: input.cipUrl ?? null,
    cipExpiresAt: input.cipExpiresAt ?? null,
    cipMode: input.cipMode,
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

export async function confirmReservationByCip(
  cipCode: string,
): Promise<Reservation | null> {
  const store = await readStore();
  const reservation = store.reservations.find(
    (item) => item.cipCode === cipCode,
  );
  if (!reservation) return null;
  if (reservation.paymentStatus === "pagado") return reservation;

  reservation.paymentStatus = "pagado";
  reservation.status = "confirmada";
  if (reservation.roomId) {
    const room = store.rooms.find((item) => item.id === reservation.roomId);
    if (room) room.status = "ocupada";
  }
  await writeStore(store);
  return reservation;
}

export async function getReservationByCip(
  cipCode: string,
): Promise<{ reservation: Reservation; roomType: RoomType } | null> {
  const store = await readStore();
  const reservation = store.reservations.find(
    (item) => item.cipCode === cipCode,
  );
  if (!reservation) return null;
  const roomType = store.roomTypes.find(
    (type) => type.id === reservation.roomTypeId,
  );
  if (!roomType) return null;
  return { reservation, roomType };
}

export async function updateReservationCip(
  id: string,
  cip: {
    cipCode: string;
    cipUrl?: string | null;
    cipExpiresAt?: string | null;
    cipMode?: "live" | "demo";
  },
): Promise<Reservation> {
  const store = await readStore();
  const reservation = store.reservations.find((item) => item.id === id);
  if (!reservation) throw new Error("Reserva no encontrada");
  reservation.cipCode = cip.cipCode;
  reservation.cipUrl = cip.cipUrl ?? null;
  reservation.cipExpiresAt = cip.cipExpiresAt ?? null;
  reservation.cipMode = cip.cipMode;
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
  options?: { allowUnpaidConfirm?: boolean },
): Promise<Reservation> {
  const store = await readStore();
  const reservation = store.reservations.find((item) => item.id === id);
  if (!reservation) throw new Error("Reserva no encontrada");

  if (status === "confirmada") {
    const paid = reservation.paymentStatus === "pagado";
    const cashAtHotel = reservation.paymentMethod === "pago_en_hotel";
    if (!paid && !cashAtHotel && !options?.allowUnpaidConfirm) {
      throw new Error(
        "No se puede confirmar una reserva PagoEfectivo sin pago registrado",
      );
    }
  }

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
      | "imagePath"
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
  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) throw new Error("El nombre es obligatorio");
    roomType.name = name;
  }
  if (typeof patch.description === "string") {
    roomType.description = patch.description.trim();
  }
  if (typeof patch.basePrice === "number") {
    if (!Number.isFinite(patch.basePrice) || patch.basePrice <= 0) {
      throw new Error("Precio inválido");
    }
    roomType.basePrice = Math.round(patch.basePrice);
  }
  if (typeof patch.maxGuests === "number") {
    if (!Number.isFinite(patch.maxGuests) || patch.maxGuests < 1) {
      throw new Error("Capacidad inválida");
    }
    roomType.maxGuests = Math.round(patch.maxGuests);
  }
  if (typeof patch.bedType === "string") roomType.bedType = patch.bedType.trim();
  if (typeof patch.imagePath === "string") {
    if (!isAllowedRoomImage(patch.imagePath)) {
      throw new Error("Foto no permitida");
    }
    roomType.imagePath = patch.imagePath;
  }

  await writeStore(store);
  return roomType;
}

export async function createRoomType(input: {
  name: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  bedType: string;
  imagePath: string;
  serviceIds: string[];
}): Promise<RoomType> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre es obligatorio");
  if (!Number.isFinite(input.basePrice) || input.basePrice <= 0) {
    throw new Error("Precio inválido");
  }
  if (!Number.isFinite(input.maxGuests) || input.maxGuests < 1) {
    throw new Error("Capacidad inválida");
  }
  if (!isAllowedRoomImage(input.imagePath)) {
    throw new Error("Selecciona una foto válida");
  }

  const store = await readStore();
  const serviceIds = [...new Set(input.serviceIds.map(String))];
  const valid = serviceIds.every((serviceId) =>
    store.services.some((service) => service.id === serviceId),
  );
  if (!valid) throw new Error("Uno o más servicios no existen");
  if (serviceIds.length === 0) {
    throw new Error("Elige al menos un servicio");
  }

  const roomType: RoomType = {
    id: `type-${crypto.randomUUID()}`,
    name,
    description: input.description.trim(),
    basePrice: Math.round(input.basePrice),
    maxGuests: Math.round(input.maxGuests),
    bedType: input.bedType.trim() || "1 cama",
    imageGradient: "from-[#3d3129] via-[#6b5344] to-[#a67b5b]",
    imagePath: input.imagePath,
    serviceIds,
  };

  store.roomTypes.push(roomType);
  await writeStore(store);
  return roomType;
}

export async function createService(input: {
  name: string;
  description: string;
  icon?: string;
}): Promise<Service> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre del servicio es obligatorio");

  const store = await readStore();
  const service: Service = {
    id: `svc-${crypto.randomUUID()}`,
    name,
    description: input.description.trim(),
    icon: (input.icon || "check").trim() || "check",
  };
  store.services.push(service);
  await writeStore(store);
  return service;
}

export async function updateService(
  id: string,
  patch: Partial<Pick<Service, "name" | "description" | "icon">>,
): Promise<Service> {
  const store = await readStore();
  const service = store.services.find((item) => item.id === id);
  if (!service) throw new Error("Servicio no encontrado");

  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) throw new Error("El nombre del servicio es obligatorio");
    service.name = name;
  }
  if (typeof patch.description === "string") {
    service.description = patch.description.trim();
  }
  if (typeof patch.icon === "string") {
    service.icon = patch.icon.trim() || service.icon;
  }

  await writeStore(store);
  return service;
}

export async function deleteService(id: string): Promise<void> {
  const store = await readStore();
  const index = store.services.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Servicio no encontrado");

  const inUse = store.roomTypes.some((type) => type.serviceIds.includes(id));
  if (inUse) {
    throw new Error(
      "Ese servicio está asignado a una habitación. Quítalo primero de los tipos.",
    );
  }

  store.services.splice(index, 1);
  await writeStore(store);
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
    priceOffers: store.priceOffers,
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
      activeOffers: store.priceOffers.filter((offer) => offer.active).length,
    },
  };
}
