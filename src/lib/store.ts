import { promises as fs } from "fs";
import path from "path";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Pool } from "pg";
import { createSeedStore } from "./seed";
import type {
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
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "hotel.json");

type GlobalStore = {
  hotelStore?: HotelStore;
  hotelPool?: Pool;
  hotelPgReady?: boolean;
};

const globalForStore = globalThis as typeof globalThis & GlobalStore;

function normalizeStore(store: HotelStore): HotelStore {
  return {
    ...store,
    reservations: store.reservations ?? [],
    mailOutbox: store.mailOutbox ?? [],
    loginCodes: store.loginCodes ?? [],
  };
}

function cloneStore(store: HotelStore): HotelStore {
  return structuredClone(normalizeStore(store));
}

async function ensureFileStore(): Promise<HotelStore> {
  if (globalForStore.hotelStore) {
    return globalForStore.hotelStore;
  }

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    globalForStore.hotelStore = JSON.parse(raw) as HotelStore;
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

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalForStore.hotelPool) {
    globalForStore.hotelPool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  }
  return globalForStore.hotelPool;
}

async function ensurePgSchema(pool: Pool): Promise<void> {
  if (globalForStore.hotelPgReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hotel_store (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await pool.query(`SELECT data FROM hotel_store WHERE id = 1`);
  if (existing.rowCount === 0) {
    const seed = createSeedStore();
    await pool.query(
      `INSERT INTO hotel_store (id, data) VALUES (1, $1::jsonb)`,
      [JSON.stringify(seed)],
    );
  }

  globalForStore.hotelPgReady = true;
}

async function readStore(): Promise<HotelStore> {
  const pool = getPool();
  if (!pool) {
    return cloneStore(await ensureFileStore());
  }

  try {
    await ensurePgSchema(pool);
    const result = await pool.query(`SELECT data FROM hotel_store WHERE id = 1`);
    return cloneStore(result.rows[0].data as HotelStore);
  } catch (error) {
    console.error("Postgres no disponible, usando almacén local:", error);
    return cloneStore(await ensureFileStore());
  }
}

async function writeStore(store: HotelStore): Promise<void> {
  const pool = getPool();
  if (!pool) {
    await persistFileStore(store);
    return;
  }

  try {
    await ensurePgSchema(pool);
    await pool.query(
      `INSERT INTO hotel_store (id, data, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [JSON.stringify(store)],
    );
    globalForStore.hotelStore = store;
  } catch (error) {
    console.error("Error al guardar en Postgres, usando archivo local:", error);
    await persistFileStore(store);
  }
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
}): Promise<Reservation> {
  const store = await readStore();
  const roomType = store.roomTypes.find((type) => type.id === input.roomTypeId);
  if (!roomType) {
    throw new Error("Tipo de habitación no encontrado");
  }

  if (input.guests < 1 || input.guests > roomType.maxGuests) {
    throw new Error(`Máximo ${roomType.maxGuests} huéspedes para este tipo`);
  }

  if (input.checkOut <= input.checkIn) {
    throw new Error("La fecha de salida debe ser posterior al ingreso");
  }

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
  const paidOnline = input.paymentMethod !== "pago_en_hotel";

  const reservation: Reservation = {
    id: `res-${crypto.randomUUID()}`,
    code: `BP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    roomTypeId: input.roomTypeId,
    roomId: assignedRoom?.id ?? null,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim().toLowerCase(),
    guestPhone: input.guestPhone.trim(),
    guestDocument: input.guestDocument.trim(),
    specialRequests: input.specialRequests?.trim() ?? "",
    paymentMethod: input.paymentMethod,
    paymentStatus: paidOnline ? "pagado" : "pendiente",
    status: "confirmada",
    nights,
    totalAmount,
    createdAt: new Date().toISOString(),
  };

  if (assignedRoom) {
    assignedRoom.status = "ocupada";
  }

  store.reservations.unshift(reservation);
  await writeStore(store);
  return reservation;
}

export async function listReservations(): Promise<Reservation[]> {
  const store = await readStore();
  return store.reservations;
}

export async function listReservationsByEmail(
  email: string,
): Promise<Reservation[]> {
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
  const roomType = store.roomTypes.find(
    (type) => type.id === reservation.roomTypeId,
  );
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

export async function consumeLoginCode(
  email: string,
  code: string,
): Promise<boolean> {
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
  if (!reservation) {
    throw new Error("Reserva no encontrada");
  }

  reservation.status = status;

  if (status === "cancelada" && reservation.roomId) {
    const room = store.rooms.find((item) => item.id === reservation.roomId);
    if (room) {
      room.status = "limpieza";
    }
  }

  if (status === "completada" && reservation.roomId) {
    const room = store.rooms.find((item) => item.id === reservation.roomId);
    if (room) {
      room.status = "limpieza";
    }
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
  if (!room) {
    throw new Error("Habitación no encontrada");
  }

  if (patch.roomTypeId) {
    const typeExists = store.roomTypes.some((type) => type.id === patch.roomTypeId);
    if (!typeExists) {
      throw new Error("Tipo de habitación inválido");
    }
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
  if (!roomType) {
    throw new Error("Tipo no encontrado");
  }

  if (patch.serviceIds) {
    const valid = patch.serviceIds.every((serviceId) =>
      store.services.some((service) => service.id === serviceId),
    );
    if (!valid) {
      throw new Error("Uno o más servicios no existen");
    }
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
  if (!typeExists) {
    throw new Error("Tipo de habitación inválido");
  }

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
  store.rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  await writeStore(store);
  return room;
}

export async function listServices(): Promise<Service[]> {
  const store = await readStore();
  return store.services;
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
    availability,
    stats: {
      totalRooms: store.rooms.length,
      availableRooms: store.rooms.filter((room) => room.status === "disponible").length,
      occupiedRooms: store.rooms.filter((room) => room.status === "ocupada").length,
      activeReservations: store.reservations.filter(
        (reservation) =>
          reservation.status === "confirmada" || reservation.status === "pendiente",
      ).length,
    },
  };
}
