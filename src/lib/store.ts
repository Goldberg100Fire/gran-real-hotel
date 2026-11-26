import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { WriteBatch } from "firebase-admin/firestore";
import { COLLECTIONS, getDb, isFirestoreConfigured } from "./firebase";
import {
  createPrimaryBranch,
  DEFAULT_BRANCH_ID,
  HOTEL,
  slugifyBranchName,
} from "./hotel-info";
import { createSeedStore } from "./seed";
import { validateGuestDocument } from "./document";
import {
  galleryMediaPath,
  inferRoomTypeIdFromPath,
  isAllowedRoomImage,
  isStockRoomImage,
  roomTypeMediaPath,
  seedGalleryImages,
} from "./hotel-images";
import type {
  GalleryImage,
  GalleryImagePublic,
  GuestProfile,
  HotelBranch,
  HotelStore,
  LoginCode,
  MailMessage,
  MailSettings,
  PaymentMethod,
  PriceOffer,
  PriceOfferKind,
  Reservation,
  ReservationStatus,
  Room,
  RoomStatus,
  RoomType,
  RoomTypeImageBlob,
  Service,
  StaffMember,
  StaffMemberPublic,
  StaffRole,
} from "./types";
import { hashPassword, validatePasswordStrength } from "./passwords";
import { getOwnerEmails, isOwnerEmail, normalizeEmail } from "./auth";
import { validateOfferDates } from "./pricing";

/** Evita mandar el base64 de fotos en el resumen del panel. */
function roomTypeWithoutBlob(roomType: RoomType): RoomType {
  if (!roomType.imageBlob) return roomType;
  const { imageBlob: _omit, ...rest } = roomType;
  return {
    ...rest,
    imageUpdatedAt: roomType.imageBlob.updatedAt,
  };
}

function galleryWithoutBlob(image: GalleryImage): GalleryImagePublic {
  const { imageBlob: _omit, ...rest } = image;
  return {
    ...rest,
    imageUpdatedAt: image.imageBlob?.updatedAt ?? image.imageUpdatedAt,
  };
}

/** En Vercel/Lambda solo /tmp es escribible; el cwd (/var/task) es de solo lectura. */
function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTION_NAME,
  );
}

const DATA_DIR = isServerlessRuntime()
  ? path.join("/tmp", "gran-real-hotel", "data")
  : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "hotel.json");

type GlobalStore = {
  hotelStore?: HotelStore;
};

const globalForStore = globalThis as typeof globalThis & GlobalStore;

function ensureBranches(store: HotelStore): HotelBranch[] {
  if (!store.branches || store.branches.length === 0) {
    return [createPrimaryBranch()];
  }
  return store.branches;
}

function primaryBranchId(branches: HotelBranch[]): string {
  return (
    branches.find((branch) => branch.isPrimary)?.id ??
    branches.find((branch) => branch.active)?.id ??
    branches[0]?.id ??
    DEFAULT_BRANCH_ID
  );
}

function ensureCatalog(store: HotelStore): HotelStore {
  store.branches = ensureBranches(store);
  const defaultBranchId = primaryBranchId(store.branches);
  const branchIds = new Set(store.branches.map((branch) => branch.id));

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

  for (const roomType of store.roomTypes) {
    if (!roomType.branchId || !branchIds.has(roomType.branchId)) {
      roomType.branchId = defaultBranchId;
    }
  }

  const roomNumbers = new Set(store.rooms.map((item) => item.number));
  for (const room of seed.rooms) {
    if (!roomNumbers.has(room.number) && typeIds.has(room.roomTypeId)) {
      store.rooms.push(room);
      roomNumbers.add(room.number);
    }
  }

  for (const room of store.rooms) {
    if (!room.branchId || !branchIds.has(room.branchId)) {
      const type = store.roomTypes.find((item) => item.id === room.roomTypeId);
      room.branchId = type?.branchId ?? defaultBranchId;
    }
  }

  if (!store.galleryImages) store.galleryImages = [];
  // Solo siembra el catálogo inicial si está vacío (el jefe puede borrar fotos).
  if (store.galleryImages.length === 0) {
    store.galleryImages = seedGalleryImages();
  } else {
    // Migra fotos antiguas sin tipo hacia el tipo que corresponda por ruta.
    for (const image of store.galleryImages) {
      if (image.roomTypeId) continue;
      const inferred = inferRoomTypeIdFromPath(image.path);
      if (inferred) image.roomTypeId = inferred;
    }
  }

  for (const image of store.galleryImages) {
    if (!image.branchId || !branchIds.has(image.branchId)) {
      const type = image.roomTypeId
        ? store.roomTypes.find((item) => item.id === image.roomTypeId)
        : null;
      image.branchId = type?.branchId ?? defaultBranchId;
    }
  }

  for (const offer of store.priceOffers ?? []) {
    if (!offer.branchId || !branchIds.has(offer.branchId)) {
      offer.branchId = defaultBranchId;
    }
  }

  // Asegura que la foto pública de cada tipo sea una de sus propias fotos.
  for (const roomType of store.roomTypes) {
    const typePhotos = store.galleryImages.filter(
      (image) => image.roomTypeId === roomType.id,
    );
    if (typePhotos.length === 0) continue;
    const valid = typePhotos.some((image) => image.path === roomType.imagePath);
    if (!valid) {
      roomType.imagePath = typePhotos[0]!.path;
      delete roomType.imageBlob;
      delete roomType.imageUpdatedAt;
    }
  }

  return store;
}

function normalizeStore(store: HotelStore): HotelStore {
  return ensureCatalog({
    ...store,
    branches: store.branches ?? [],
    reservations: store.reservations ?? [],
    mailOutbox: store.mailOutbox ?? [],
    loginCodes: store.loginCodes ?? [],
    staffMembers: store.staffMembers ?? [],
    guests: store.guests ?? [],
    priceOffers: store.priceOffers ?? [],
    galleryImages: store.galleryImages ?? [],
    mailSettings: store.mailSettings ?? null,
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
    try {
      await persistFileStore(globalForStore.hotelStore);
    } catch (error) {
      // En entornos de solo lectura, mantiene el seed en memoria.
      console.error("No se pudo escribir almacén local:", error);
    }
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
    hotelSnap,
    branchesSnap,
    servicesSnap,
    roomTypesSnap,
    roomsSnap,
    reservationsSnap,
    loginCodesSnap,
    mailSnap,
    staffSnap,
    guestsSnap,
    offersSnap,
    gallerySnap,
  ] = await Promise.all([
    db.collection(COLLECTIONS.hotel).doc("gran-real").get(),
    db.collection(COLLECTIONS.branches).get(),
    db.collection(COLLECTIONS.services).get(),
    db.collection(COLLECTIONS.roomTypes).get(),
    db.collection(COLLECTIONS.rooms).get(),
    db.collection(COLLECTIONS.reservations).orderBy("createdAt", "desc").get(),
    db.collection(COLLECTIONS.loginCodes).get(),
    db.collection(COLLECTIONS.mailOutbox).orderBy("createdAt", "desc").limit(100).get(),
    db.collection(COLLECTIONS.staffMembers).get(),
    db.collection(COLLECTIONS.guests).get(),
    db.collection(COLLECTIONS.priceOffers).get(),
    db.collection(COLLECTIONS.galleryImages).get(),
  ]);

  if (servicesSnap.empty || roomTypesSnap.empty || roomsSnap.empty) {
    const seed = createSeedStore();
    await seedFirestore(seed);
    return cloneStore(seed);
  }

  const hotelData = hotelSnap.exists ? hotelSnap.data() : null;
  const mailSettings =
    hotelData &&
    typeof hotelData === "object" &&
    "mailSettings" in hotelData
      ? ((hotelData as { mailSettings?: MailSettings | null }).mailSettings ??
        null)
      : null;

  return cloneStore({
    branches: branchesSnap.docs.map((doc) => doc.data() as HotelBranch),
    services: servicesSnap.docs.map((doc) => doc.data() as Service),
    roomTypes: roomTypesSnap.docs.map((doc) => doc.data() as RoomType),
    rooms: roomsSnap.docs.map((doc) => doc.data() as Room),
    reservations: reservationsSnap.docs.map((doc) => doc.data() as Reservation),
    loginCodes: loginCodesSnap.docs.map((doc) => doc.data() as LoginCode),
    mailOutbox: mailSnap.docs.map((doc) => doc.data() as MailMessage),
    staffMembers: staffSnap.docs.map((doc) => doc.data() as StaffMember),
    guests: guestsSnap.docs.map((doc) => doc.data() as GuestProfile),
    priceOffers: offersSnap.docs.map((doc) => doc.data() as PriceOffer),
    galleryImages: gallerySnap.docs.map((doc) => doc.data() as GalleryImage),
    mailSettings,
  });
}

export async function seedFirestore(store: HotelStore = createSeedStore()): Promise<void> {
  const db = getDb();
  const batch = db.batch();

  batch.set(db.collection(COLLECTIONS.hotel).doc("gran-real"), {
    ...HOTEL,
    mailSettings: store.mailSettings ?? null,
    updatedAt: new Date().toISOString(),
  });

  for (const branch of store.branches) {
    batch.set(db.collection(COLLECTIONS.branches).doc(branch.id), branch);
  }
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
  for (const image of store.galleryImages) {
    batch.set(db.collection(COLLECTIONS.galleryImages).doc(image.id), image);
  }

  await batch.commit();
}

async function commitInChunks(
  ops: Array<(batch: WriteBatch) => void>,
): Promise<void> {
  const db = getDb();
  const CHUNK = 400;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + CHUNK)) op(batch);
    await batch.commit();
  }
}

async function writeFirestoreStore(store: HotelStore): Promise<void> {
  const db = getDb();
  const ops: Array<(batch: WriteBatch) => void> = [];

  ops.push((batch) =>
    batch.set(db.collection(COLLECTIONS.hotel).doc("gran-real"), {
      ...HOTEL,
      mailSettings: store.mailSettings ?? null,
      updatedAt: new Date().toISOString(),
    }),
  );

  for (const branch of store.branches) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.branches).doc(branch.id), branch),
    );
  }
  for (const service of store.services) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.services).doc(service.id), service),
    );
  }
  for (const roomType of store.roomTypes) {
    ops.push((batch) =>
      batch.set(
        db.collection(COLLECTIONS.roomTypes).doc(roomType.id),
        roomType,
      ),
    );
  }
  for (const room of store.rooms) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.rooms).doc(room.id), room),
    );
  }
  for (const reservation of store.reservations) {
    ops.push((batch) =>
      batch.set(
        db.collection(COLLECTIONS.reservations).doc(reservation.id),
        reservation,
      ),
    );
  }
  for (const code of store.loginCodes) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.loginCodes).doc(code.email), code),
    );
  }
  for (const mail of store.mailOutbox.slice(0, 100)) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.mailOutbox).doc(mail.id), mail),
    );
  }
  for (const member of store.staffMembers) {
    ops.push((batch) =>
      batch.set(
        db.collection(COLLECTIONS.staffMembers).doc(member.email),
        member,
      ),
    );
  }
  for (const guest of store.guests) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.guests).doc(guest.document), guest),
    );
  }
  for (const offer of store.priceOffers) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.priceOffers).doc(offer.id), offer),
    );
  }
  for (const image of store.galleryImages ?? []) {
    ops.push((batch) =>
      batch.set(db.collection(COLLECTIONS.galleryImages).doc(image.id), image),
    );
  }

  await commitInChunks(ops);
  globalForStore.hotelStore = store;
}

async function readStore(): Promise<HotelStore> {
  if (isFirestoreConfigured()) {
    try {
      return await readFirestoreStore();
    } catch (error) {
      console.error("Firestore no disponible, usando respaldo local:", error);
      return cloneStore(await ensureFileStore());
    }
  }
  return cloneStore(await ensureFileStore());
}

async function writeStore(store: HotelStore): Promise<void> {
  // Siempre actualiza memoria del proceso (sirve en serverless entre requests calientes).
  globalForStore.hotelStore = store;

  if (isFirestoreConfigured()) {
    try {
      await writeFirestoreStore(store);
      return;
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      if (!isServerlessRuntime()) {
        await persistFileStore(store);
      }
      throw new Error(
        "No se pudo guardar en Firestore. Revisa FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.",
      );
    }
  }

  try {
    await persistFileStore(store);
  } catch (error) {
    console.error("No se pudo persistir almacén local:", error);
    if (isServerlessRuntime()) {
      // En Vercel sin Firestore los datos viven solo en memoria de la instancia.
      return;
    }
    throw error;
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

export function getStorageMode(): "firestore" | "local" | "memory" {
  if (isFirestoreConfigured()) return "firestore";
  if (isServerlessRuntime()) return "memory";
  return "local";
}

export async function listBranches(activeOnly = false): Promise<HotelBranch[]> {
  const store = await readStore();
  const branches = [...store.branches].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.city.localeCompare(b.city, "es");
  });
  return activeOnly ? branches.filter((branch) => branch.active) : branches;
}

export async function getBranchBySlug(
  slug: string,
): Promise<HotelBranch | null> {
  const store = await readStore();
  const normalized = slug.trim().toLowerCase();
  return (
    store.branches.find(
      (branch) => branch.slug === normalized && branch.active,
    ) ?? null
  );
}

export async function getBranchById(
  id: string,
): Promise<HotelBranch | null> {
  const store = await readStore();
  return store.branches.find((branch) => branch.id === id) ?? null;
}

function filterByBranch<T extends { branchId: string }>(
  items: T[],
  branchId?: string | null,
): T[] {
  if (!branchId) return items;
  return items.filter((item) => item.branchId === branchId);
}

export async function getCatalog(branchId?: string | null) {
  const store = await readStore();
  const resolvedBranchId =
    branchId ||
    primaryBranchId(store.branches);
  return {
    branch:
      store.branches.find((branch) => branch.id === resolvedBranchId) ??
      store.branches[0] ??
      null,
    branches: store.branches.filter((branch) => branch.active),
    services: store.services,
    roomTypes: filterByBranch(store.roomTypes, resolvedBranchId).map(
      roomTypeWithoutBlob,
    ),
    rooms: filterByBranch(store.rooms, resolvedBranchId),
    priceOffers: filterByBranch(store.priceOffers, resolvedBranchId),
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
  branchId?: string;
  active?: boolean;
  priority?: number;
  prices?: Record<string, number>;
  minNights?: number;
  discountPercent?: number;
  packageNights?: number;
  packagePrices?: Record<string, number>;
}): Promise<PriceOffer> {
  const title = input.title.trim();
  if (!title) throw new Error("El título es obligatorio");

  const dateError = validateOfferDates(input.startDate, input.endDate);
  if (dateError) throw new Error(dateError);

  const store = await readStore();
  const branchId =
    input.branchId?.trim() || primaryBranchId(store.branches);
  if (!store.branches.some((branch) => branch.id === branchId)) {
    throw new Error("Sucursal no encontrada");
  }
  const roomTypeIds = new Set(
    store.roomTypes
      .filter((type) => type.branchId === branchId)
      .map((type) => type.id),
  );
  const prices = sanitizeOfferPrices(input.prices ?? {}, roomTypeIds);
  const packagePrices = sanitizeOfferPrices(
    input.packagePrices ?? {},
    roomTypeIds,
  );

  let minNights: number | undefined;
  let discountPercent: number | undefined;
  let packageNights: number | undefined;

  if (input.kind === "oferta") {
    minNights = Math.round(Number(input.minNights) || 0);
    discountPercent = Math.round(Number(input.discountPercent) || 0);
    if (minNights < 1) {
      throw new Error("Indica desde cuántas noches aplica el descuento");
    }
    if (discountPercent < 1 || discountPercent > 90) {
      throw new Error("El descuento debe estar entre 1% y 90%");
    }
  } else if (input.kind === "fiesta") {
    packageNights = Math.round(Number(input.packageNights) || 0);
    if (packageNights < 1) {
      throw new Error("Indica cuántas noches incluye el paquete de fiesta");
    }
    if (Object.keys(packagePrices).length === 0) {
      throw new Error("Define el costo total del paquete por tipo de habitación");
    }
  } else if (Object.keys(prices).length === 0) {
    throw new Error("Define al menos un precio por tipo de habitación");
  }

  const now = new Date().toISOString();
  const offer: PriceOffer = {
    id: `offer-${crypto.randomUUID()}`,
    branchId,
    title,
    description: input.description.trim(),
    kind: input.kind,
    startDate: input.startDate,
    endDate: input.endDate,
    active: input.active ?? true,
    priority: Number.isFinite(input.priority) ? Number(input.priority) : 0,
    prices,
    ...(minNights != null ? { minNights } : {}),
    ...(discountPercent != null ? { discountPercent } : {}),
    ...(packageNights != null ? { packageNights } : {}),
    ...(Object.keys(packagePrices).length > 0 ? { packagePrices } : {}),
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
      | "minNights"
      | "discountPercent"
      | "packageNights"
      | "packagePrices"
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
    offer.prices = sanitizeOfferPrices(patch.prices, roomTypeIds);
  }
  if (typeof patch.minNights === "number") {
    offer.minNights = Math.round(patch.minNights);
  }
  if (typeof patch.discountPercent === "number") {
    offer.discountPercent = Math.round(patch.discountPercent);
  }
  if (typeof patch.packageNights === "number") {
    offer.packageNights = Math.round(patch.packageNights);
  }
  if (patch.packagePrices) {
    const roomTypeIds = new Set(store.roomTypes.map((type) => type.id));
    offer.packagePrices = sanitizeOfferPrices(patch.packagePrices, roomTypeIds);
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
  if (isFirestoreConfigured()) {
    try {
      await getDb().collection(COLLECTIONS.priceOffers).doc(id).delete();
    } catch (error) {
      console.error("No se pudo borrar la oferta en Firestore:", error);
    }
  }
}

export async function getAvailability(
  checkIn?: string,
  checkOut?: string,
  branchId?: string | null,
) {
  const store = await readStore();
  const resolvedBranchId = branchId || primaryBranchId(store.branches);
  const roomTypes = filterByBranch(store.roomTypes, resolvedBranchId);

  return roomTypes.map((type) => {
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
      roomType: roomTypeWithoutBlob(type),
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
  store.loginCodes = store.loginCodes.filter(
    (item) => !(item.email === normalized && (item.kind ?? "otp") === "otp"),
  );
  const entry: LoginCode = {
    email: normalized,
    code,
    kind: "otp",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
  store.loginCodes.push(entry);
  await writeStore(store);
  return entry;
}

/** Enlace de alta: válido 48 horas. */
export async function saveStaffInviteToken(
  email: string,
  token: string,
): Promise<LoginCode> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  store.loginCodes = store.loginCodes.filter(
    (item) => !(item.email === normalized && item.kind === "invite"),
  );
  const entry: LoginCode = {
    email: normalized,
    code: token,
    kind: "invite",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  };
  store.loginCodes.push(entry);
  await writeStore(store);
  return entry;
}

export async function consumeLoginCode(email: string, code: string): Promise<boolean> {
  const store = await readStore();
  const normalized = email.trim().toLowerCase();
  const entry = store.loginCodes.find(
    (item) =>
      item.email === normalized &&
      (item.kind ?? "otp") === "otp" &&
      item.code === code.trim(),
  );
  if (!entry) return false;
  if (entry.expiresAt < new Date().toISOString()) {
    store.loginCodes = store.loginCodes.filter((item) => item !== entry);
    await writeStore(store);
    return false;
  }
  store.loginCodes = store.loginCodes.filter((item) => item !== entry);
  await writeStore(store);
  return true;
}

/** Consume el token del enlace de invitación. Devuelve el correo o null. */
export async function consumeStaffInviteToken(
  token: string,
): Promise<string | null> {
  const store = await readStore();
  const value = token.trim();
  if (!value || value.length < 20) return null;
  const entry = store.loginCodes.find(
    (item) => item.kind === "invite" && item.code === value,
  );
  if (!entry) return null;
  if (entry.expiresAt < new Date().toISOString()) {
    store.loginCodes = store.loginCodes.filter((item) => item !== entry);
    await writeStore(store);
    return null;
  }
  store.loginCodes = store.loginCodes.filter((item) => item !== entry);
  await writeStore(store);
  return entry.email;
}

export async function peekStaffInviteToken(
  token: string,
): Promise<{ email: string; expiresAt: string } | null> {
  const store = await readStore();
  const value = token.trim();
  if (!value) return null;
  const entry = store.loginCodes.find(
    (item) => item.kind === "invite" && item.code === value,
  );
  if (!entry) return null;
  if (entry.expiresAt < new Date().toISOString()) return null;
  return { email: entry.email, expiresAt: entry.expiresAt };
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
  if (typeof patch.notes === "string") room.notes = patch.notes.trim();
  if (typeof patch.number === "string") {
    const number = patch.number.trim();
    if (!number) throw new Error("El número de habitación es obligatorio");
    if (
      store.rooms.some(
        (item) => item.id !== id && item.number.toLowerCase() === number.toLowerCase(),
      )
    ) {
      throw new Error("Ya existe una habitación con ese número");
    }
    room.number = number;
  }
  if (typeof patch.floor === "number") {
    if (!Number.isFinite(patch.floor) || patch.floor < 1) {
      throw new Error("El piso debe ser 1 o mayor");
    }
    room.floor = Math.round(patch.floor);
  }

  store.rooms.sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  await writeStore(store);
  return room;
}

/** Elimina una habitación del inventario (no si tiene reservas activas). */
export async function deleteRoom(id: string): Promise<void> {
  const store = await readStore();
  const index = store.rooms.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Habitación no encontrada");

  const active = store.reservations.some(
    (reservation) =>
      reservation.roomId === id &&
      (reservation.status === "pendiente" ||
        reservation.status === "confirmada"),
  );
  if (active) {
    throw new Error(
      "No se puede eliminar: la habitación tiene reservas pendientes o confirmadas",
    );
  }

  store.rooms.splice(index, 1);
  await writeStore(store);

  if (isFirestoreConfigured()) {
    try {
      await getDb().collection(COLLECTIONS.rooms).doc(id).delete();
    } catch (error) {
      console.error("No se pudo borrar la habitación en Firestore:", error);
    }
  }
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
    const galleryPaths = store.galleryImages.map((image) => image.path);
    if (!isAllowedRoomImage(patch.imagePath, galleryPaths)) {
      throw new Error("Foto no permitida");
    }
    roomType.imagePath = patch.imagePath;
    // Al elegir una foto del catálogo, se quita la subida directa del tipo.
    if (
      isStockRoomImage(patch.imagePath) ||
      galleryPaths.includes(patch.imagePath)
    ) {
      delete roomType.imageBlob;
      delete roomType.imageUpdatedAt;
    }
  }

  await writeStore(store);
  return roomTypeWithoutBlob(roomType);
}

export async function getRoomTypeImageBlob(
  typeId: string,
): Promise<RoomTypeImageBlob | null> {
  const store = await readStore();
  const roomType = store.roomTypes.find((item) => item.id === typeId);
  return roomType?.imageBlob ?? null;
}

export async function setRoomTypeUploadedImage(
  typeId: string,
  blob: RoomTypeImageBlob,
): Promise<RoomType> {
  const store = await readStore();
  const roomType = store.roomTypes.find((item) => item.id === typeId);
  if (!roomType) throw new Error("Tipo no encontrado");

  // Validar que el base64 decodifica antes de persistir.
  try {
    const bytes = Buffer.from(blob.data, "base64");
    if (bytes.length < 32) throw new Error("Imagen vacía");
  } catch {
    throw new Error("La foto está dañada y no se guardó");
  }

  roomType.imageBlob = blob;
  roomType.imagePath = roomTypeMediaPath(typeId);
  roomType.imageUpdatedAt = blob.updatedAt;
  await writeStore(store);
  return roomTypeWithoutBlob(roomType);
}

/** Quita una foto subida y vuelve a una de ejemplo. */
export async function clearRoomTypeUploadedImage(
  typeId: string,
  fallbackPath = "/hotel/simple.png",
): Promise<RoomType> {
  const store = await readStore();
  const roomType = store.roomTypes.find((item) => item.id === typeId);
  if (!roomType) throw new Error("Tipo no encontrado");

  delete roomType.imageBlob;
  delete roomType.imageUpdatedAt;
  const galleryFallback = store.galleryImages[0]?.path;
  roomType.imagePath =
    galleryFallback ||
    (isStockRoomImage(fallbackPath) ? fallbackPath : "/hotel/simple.png");
  await writeStore(store);
  return roomTypeWithoutBlob(roomType);
}

export async function listGalleryImages(): Promise<GalleryImagePublic[]> {
  const store = await readStore();
  return store.galleryImages.map(galleryWithoutBlob);
}

export async function getGalleryImageBlob(
  imageId: string,
): Promise<RoomTypeImageBlob | null> {
  const store = await readStore();
  const image = store.galleryImages.find((item) => item.id === imageId);
  return image?.imageBlob ?? null;
}

export async function addGalleryImage(input: {
  label: string;
  blob: RoomTypeImageBlob;
  roomTypeId?: string | null;
  branchId?: string | null;
}): Promise<GalleryImagePublic> {
  const label = input.label.trim() || "Foto habitación";
  try {
    const bytes = Buffer.from(input.blob.data, "base64");
    if (bytes.length < 32) throw new Error("Imagen vacía");
  } catch {
    throw new Error("La foto está dañada y no se guardó");
  }

  const store = await readStore();
  const roomTypeId = input.roomTypeId ? String(input.roomTypeId) : null;
  const roomType = roomTypeId
    ? store.roomTypes.find((type) => type.id === roomTypeId)
    : null;
  if (roomTypeId && !roomType) {
    throw new Error("Tipo de habitación no encontrado");
  }
  const branchId =
    input.branchId?.trim() ||
    roomType?.branchId ||
    primaryBranchId(store.branches);
  if (!store.branches.some((branch) => branch.id === branchId)) {
    throw new Error("Sucursal no encontrada");
  }

  const id = `gallery-${crypto.randomUUID()}`;
  const image: GalleryImage = {
    id,
    label,
    branchId,
    path: galleryMediaPath(id),
    roomTypeId,
    imageBlob: input.blob,
    imageUpdatedAt: input.blob.updatedAt,
    createdAt: new Date().toISOString(),
  };
  store.galleryImages.push(image);

  // Si el tipo aún no tiene foto (o solo stock vacío), usa esta como principal.
  if (roomTypeId) {
    const roomType = store.roomTypes.find((type) => type.id === roomTypeId);
    if (roomType && !roomType.imagePath) {
      roomType.imagePath = image.path;
    }
  }

  await writeStore(store);
  return galleryWithoutBlob(image);
}

export async function deleteGalleryImage(imageId: string): Promise<void> {
  const store = await readStore();
  const index = store.galleryImages.findIndex((item) => item.id === imageId);
  if (index < 0) throw new Error("Foto no encontrada en el catálogo");

  const removed = store.galleryImages[index]!;
  const sameType = store.galleryImages.filter(
    (item) =>
      item.id !== imageId &&
      (removed.roomTypeId
        ? item.roomTypeId === removed.roomTypeId
        : true),
  );
  if (removed.roomTypeId && sameType.length === 0) {
    // Puede quedar sin fotos de ese tipo; se permite y se limpia imagePath.
  } else if (!removed.roomTypeId && store.galleryImages.length <= 1) {
    throw new Error("Debe quedar al menos una foto en el catálogo");
  }

  store.galleryImages.splice(index, 1);

  const fallback =
    sameType[0] ||
    store.galleryImages.find((item) => item.roomTypeId === removed.roomTypeId) ||
    store.galleryImages[0];

  for (const roomType of store.roomTypes) {
    if (roomType.imagePath !== removed.path) continue;
    if (fallback) {
      roomType.imagePath = fallback.path;
    } else {
      delete roomType.imagePath;
    }
    delete roomType.imageBlob;
    delete roomType.imageUpdatedAt;
  }
  await writeStore(store);

  if (isFirestoreConfigured()) {
    try {
      const db = getDb();
      await db.collection(COLLECTIONS.galleryImages).doc(imageId).delete();
    } catch {
      // El store ya no la tiene; el doc huérfano se puede ignorar.
    }
  }
}

export async function createRoomType(input: {
  name: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  bedType: string;
  imagePath: string;
  serviceIds: string[];
  branchId?: string;
}): Promise<RoomType> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre es obligatorio");
  if (!Number.isFinite(input.basePrice) || input.basePrice <= 0) {
    throw new Error("Precio inválido");
  }
  if (!Number.isFinite(input.maxGuests) || input.maxGuests < 1) {
    throw new Error("Capacidad inválida");
  }
  const store = await readStore();
  const branchId =
    input.branchId?.trim() || primaryBranchId(store.branches);
  if (!store.branches.some((branch) => branch.id === branchId)) {
    throw new Error("Sucursal no encontrada");
  }
  const galleryPaths = store.galleryImages.map((image) => image.path);
  const imagePath = input.imagePath.trim();
  // Permite crear el tipo y luego subir su foto propia; si hay path, debe ser válido.
  if (imagePath && !isAllowedRoomImage(imagePath, galleryPaths)) {
    throw new Error("Selecciona una foto válida");
  }

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
    branchId,
    name,
    description: input.description.trim(),
    basePrice: Math.round(input.basePrice),
    maxGuests: Math.round(input.maxGuests),
    bedType: input.bedType.trim() || "1 cama",
    imageGradient: "from-[#3d3129] via-[#6b5344] to-[#a67b5b]",
    ...(imagePath ? { imagePath } : {}),
    serviceIds,
  };

  store.roomTypes.push(roomType);
  await writeStore(store);
  return roomTypeWithoutBlob(roomType);
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
  branchId?: string;
}): Promise<Room> {
  const store = await readStore();
  const number = input.number.trim();
  if (!number) throw new Error("El número de habitación es obligatorio");
  const floor = Math.round(Number(input.floor) || 0);
  if (!Number.isFinite(floor) || floor < 1) {
    throw new Error("El piso debe ser 1 o mayor");
  }
  const roomType = store.roomTypes.find((type) => type.id === input.roomTypeId);
  if (!roomType) throw new Error("Tipo de habitación inválido");
  const branchId =
    input.branchId?.trim() || roomType.branchId || primaryBranchId(store.branches);
  if (roomType.branchId !== branchId) {
    throw new Error("El tipo no pertenece a esa sucursal");
  }
  if (
    store.rooms.some(
      (room) =>
        room.branchId === branchId &&
        room.number.toLowerCase() === number.toLowerCase(),
    )
  ) {
    throw new Error("Ya existe una habitación con ese número en esta sede");
  }

  const room: Room = {
    id: `room-${crypto.randomUUID()}`,
    branchId,
    number,
    floor,
    roomTypeId: input.roomTypeId,
    status: input.status ?? "disponible",
    notes: (input.notes ?? "").trim(),
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

export function toStaffPublic(member: StaffMember): StaffMemberPublic {
  const { passwordHash: _omit, ...rest } = member;
  const now = Date.now();
  const authorizedUntil = member.resetAuthorizedUntil
    ? Date.parse(member.resetAuthorizedUntil)
    : 0;
  return {
    ...rest,
    hasPassword: Boolean(passwordHashSafe(member)),
    resetPending: Boolean(member.resetRequestedAt),
    resetAuthorized: Number.isFinite(authorizedUntil) && authorizedUntil > now,
  };
}

function passwordHashSafe(member: StaffMember): string | undefined {
  return member.passwordHash || undefined;
}

/** Asegura registros de jefes definidos en secretos. */
export async function ensureOwnerStaffRecords(): Promise<void> {
  const owners = getOwnerEmails();
  if (owners.length === 0) return;
  const store = await readStore();
  let changed = false;
  for (const email of owners) {
    const existing = store.staffMembers.find((item) => item.email === email);
    if (!existing) {
      store.staffMembers.push({
        email,
        name: email.split("@")[0] || "Jefe",
        role: "jefe",
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: "system",
      });
      changed = true;
    } else if (existing.role !== "jefe" || !existing.active) {
      existing.role = "jefe";
      existing.active = true;
      changed = true;
    }
  }
  if (changed) {
    try {
      await writeStore(store);
    } catch (error) {
      // Memoria ya tiene a los jefes; no bloquear el login si falla la persistencia.
      console.error("No se pudo persistir registros de jefe:", error);
      globalForStore.hotelStore = store;
    }
  }
}

export async function getStaffByEmail(
  email: string,
): Promise<StaffMember | null> {
  await ensureOwnerStaffRecords();
  const store = await readStore();
  const normalized = normalizeEmail(email);
  return (
    store.staffMembers.find((member) => member.email === normalized) ?? null
  );
}

/**
 * Personal autorizado y activo (dueños o agregados por el jefe).
 * No expone el hash.
 */
export async function getAuthorizedStaff(
  email: string,
): Promise<StaffMember | null> {
  const member = await getStaffByEmail(email);
  if (!member || !member.active) return null;
  if (isOwnerEmail(member.email)) {
    return { ...member, role: "jefe" };
  }
  return member;
}

export async function listStaffMembers(): Promise<StaffMemberPublic[]> {
  await ensureOwnerStaffRecords();
  const store = await readStore();
  return [...store.staffMembers]
    .sort((a, b) => a.email.localeCompare(b.email))
    .map(toStaffPublic);
}

export async function upsertStaffMember(input: {
  email: string;
  name: string;
  role: StaffRole;
  active?: boolean;
  createdBy: string;
}): Promise<StaffMemberPublic> {
  const store = await readStore();
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) throw new Error("Correo de personal inválido");

  const existing = store.staffMembers.find((member) => member.email === email);
  if (existing) {
    existing.name = input.name.trim() || existing.name;
    existing.role = input.role;
    if (typeof input.active === "boolean") existing.active = input.active;
    await writeStore(store);
    return toStaffPublic(existing);
  }

  const member: StaffMember = {
    email,
    name: input.name.trim() || email.split("@")[0],
    role: input.role,
    active: input.active ?? true,
    createdAt: new Date().toISOString(),
    createdBy: normalizeEmail(input.createdBy),
  };
  store.staffMembers.push(member);
  await writeStore(store);
  return toStaffPublic(member);
}

export async function setStaffActive(
  email: string,
  active: boolean,
): Promise<StaffMemberPublic> {
  const store = await readStore();
  const normalized = normalizeEmail(email);
  const member = store.staffMembers.find((item) => item.email === normalized);
  if (!member) throw new Error("Personal no encontrado");
  if (isOwnerEmail(normalized) && !active) {
    throw new Error("No se puede desactivar un jefe del secreto ADMIN_ALLOWED_EMAILS");
  }
  member.active = active;
  await writeStore(store);
  return toStaffPublic(member);
}

export async function deleteStaffMember(email: string): Promise<void> {
  const store = await readStore();
  const normalized = normalizeEmail(email);
  if (isOwnerEmail(normalized)) {
    throw new Error(
      "No se puede eliminar un jefe definido en ADMIN_ALLOWED_EMAILS",
    );
  }
  const index = store.staffMembers.findIndex(
    (item) => item.email === normalized,
  );
  if (index < 0) throw new Error("Personal no encontrado");
  store.staffMembers.splice(index, 1);
  await writeStore(store);

  if (isFirestoreConfigured()) {
    try {
      await getDb()
        .collection(COLLECTIONS.staffMembers)
        .doc(normalized)
        .delete();
    } catch (error) {
      console.error("No se pudo borrar personal en Firestore:", error);
    }
  }
}

export async function setStaffPassword(
  email: string,
  password: string,
): Promise<StaffMemberPublic> {
  const strength = validatePasswordStrength(password);
  if (strength) throw new Error(strength);

  const store = await readStore();
  const normalized = normalizeEmail(email);
  let member = store.staffMembers.find((item) => item.email === normalized);

  if (!member && isOwnerEmail(normalized)) {
    member = {
      email: normalized,
      name: normalized.split("@")[0] || "Jefe",
      role: "jefe",
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: "system",
    };
    store.staffMembers.push(member);
  }

  if (!member || !member.active) {
    throw new Error("Personal no autorizado");
  }

  member.passwordHash = hashPassword(password);
  member.passwordSetAt = new Date().toISOString();
  member.resetRequestedAt = null;
  member.resetAuthorizedUntil = null;
  await writeStore(store);
  return toStaffPublic(member);
}

/** Empleado solicita recuperación (requiere OK del jefe). */
export async function requestStaffPasswordReset(
  email: string,
): Promise<StaffMemberPublic> {
  const store = await readStore();
  const normalized = normalizeEmail(email);
  const member = store.staffMembers.find((item) => item.email === normalized);
  if (!member || !member.active) {
    throw new Error("Personal no autorizado");
  }
  if (member.role === "jefe" || isOwnerEmail(normalized)) {
    throw new Error(
      "El jefe recupera su contraseña desde el enlace de recuperación del login",
    );
  }
  if (!member.passwordHash) {
    throw new Error("Aún no tienes contraseña. Créala en el primer acceso.");
  }
  member.resetRequestedAt = new Date().toISOString();
  await writeStore(store);
  return toStaffPublic(member);
}

/** Jefe autoriza que el empleado cree una nueva contraseña. */
export async function authorizeStaffPasswordReset(
  email: string,
  hours = 24,
): Promise<StaffMemberPublic> {
  const store = await readStore();
  const normalized = normalizeEmail(email);
  const member = store.staffMembers.find((item) => item.email === normalized);
  if (!member) throw new Error("Personal no encontrado");
  if (member.role === "jefe" || isOwnerEmail(normalized)) {
    throw new Error("Usa la recuperación directa del jefe");
  }
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  member.resetAuthorizedUntil = until;
  member.resetRequestedAt = null;
  await writeStore(store);
  return toStaffPublic(member);
}

export function isStaffResetAuthorized(member: StaffMember): boolean {
  if (!member.resetAuthorizedUntil) return false;
  const until = Date.parse(member.resetAuthorizedUntil);
  return Number.isFinite(until) && until > Date.now();
}

export async function createBranch(input: {
  name: string;
  city: string;
  region?: string;
  country?: string;
  address: string;
  phoneMobile: string;
  phoneLandline?: string;
  tagline?: string;
  heroImagePath?: string;
  coverImagePath?: string;
  slug?: string;
}): Promise<HotelBranch> {
  const city = input.city.trim();
  const address = input.address.trim();
  const phoneMobile = input.phoneMobile.trim();
  if (!city) throw new Error("La ciudad es obligatoria");
  if (!address) throw new Error("La dirección es obligatoria");
  if (!phoneMobile) throw new Error("El celular de la sede es obligatorio");

  const store = await readStore();
  let slug = slugifyBranchName(input.slug?.trim() || city);
  const baseSlug = slug;
  let n = 2;
  while (store.branches.some((branch) => branch.slug === slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  const now = new Date().toISOString();
  const name =
    input.name.trim() || `${HOTEL.name} ${city}`;
  const fullAddress = `${address} · ${city}${
    input.region?.trim() ? ` · ${input.region.trim()}` : ""
  }`;

  const branch: HotelBranch = {
    id: `branch-${crypto.randomUUID()}`,
    slug,
    name,
    tagline: input.tagline?.trim() || `${city} te espera`,
    city,
    region: input.region?.trim() || "",
    country: input.country?.trim() || HOTEL.country,
    address,
    fullAddress,
    phoneMobile,
    phoneLandline: input.phoneLandline?.trim() || "",
    heroImagePath: input.heroImagePath?.trim() || "/hotel/matrimonial-1.png",
    coverImagePath: input.coverImagePath?.trim() || undefined,
    active: true,
    isPrimary: false,
    createdAt: now,
    updatedAt: now,
  };

  store.branches.push(branch);
  await writeStore(store);
  return branch;
}

export async function updateBranch(
  id: string,
  patch: Partial<
    Pick<
      HotelBranch,
      | "name"
      | "tagline"
      | "city"
      | "region"
      | "country"
      | "address"
      | "phoneMobile"
      | "phoneLandline"
      | "heroImagePath"
      | "coverImagePath"
      | "active"
      | "slug"
    >
  >,
): Promise<HotelBranch> {
  const store = await readStore();
  const branch = store.branches.find((item) => item.id === id);
  if (!branch) throw new Error("Sucursal no encontrada");

  if (typeof patch.name === "string" && patch.name.trim()) {
    branch.name = patch.name.trim();
  }
  if (typeof patch.tagline === "string") {
    branch.tagline = patch.tagline.trim();
  }
  if (typeof patch.city === "string" && patch.city.trim()) {
    branch.city = patch.city.trim();
  }
  if (typeof patch.region === "string") {
    branch.region = patch.region.trim();
  }
  if (typeof patch.country === "string") {
    branch.country = patch.country.trim();
  }
  if (typeof patch.address === "string" && patch.address.trim()) {
    branch.address = patch.address.trim();
  }
  if (typeof patch.phoneMobile === "string" && patch.phoneMobile.trim()) {
    branch.phoneMobile = patch.phoneMobile.trim();
  }
  if (typeof patch.phoneLandline === "string") {
    branch.phoneLandline = patch.phoneLandline.trim();
  }
  if (typeof patch.heroImagePath === "string" && patch.heroImagePath.trim()) {
    branch.heroImagePath = patch.heroImagePath.trim();
  }
  if (typeof patch.coverImagePath === "string") {
    branch.coverImagePath = patch.coverImagePath.trim() || undefined;
  }
  if (typeof patch.active === "boolean") {
    if (branch.isPrimary && !patch.active) {
      throw new Error("No se puede desactivar la sede principal");
    }
    branch.active = patch.active;
  }
  if (typeof patch.slug === "string" && patch.slug.trim()) {
    const slug = slugifyBranchName(patch.slug);
    if (
      store.branches.some(
        (item) => item.id !== id && item.slug === slug,
      )
    ) {
      throw new Error("Ese enlace de sede ya está en uso");
    }
    branch.slug = slug;
  }

  branch.fullAddress = `${branch.address} · ${branch.city}${
    branch.region ? ` · ${branch.region}` : ""
  }`;
  branch.updatedAt = new Date().toISOString();
  await writeStore(store);
  return branch;
}

export async function setBranchHeroFromUpload(
  branchId: string,
  blob: RoomTypeImageBlob,
  label = "Fachada de la sede",
): Promise<HotelBranch> {
  const image = await addGalleryImage({
    label,
    blob,
    branchId,
    roomTypeId: null,
  });
  return updateBranch(branchId, { heroImagePath: image.path });
}

/**
 * Elimina una sucursal y su catálogo (tipos, habitaciones, ofertas, fotos).
 * La sede principal no se puede borrar.
 */
export async function deleteBranch(id: string): Promise<void> {
  const store = await readStore();
  const index = store.branches.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Sucursal no encontrada");
  const branch = store.branches[index]!;
  if (branch.isPrimary) {
    throw new Error("No se puede eliminar la sede principal");
  }

  const typeIds = new Set(
    store.roomTypes
      .filter((type) => type.branchId === id)
      .map((type) => type.id),
  );
  const roomIds = store.rooms
    .filter((room) => room.branchId === id || typeIds.has(room.roomTypeId))
    .map((room) => room.id);
  const offerIds = store.priceOffers
    .filter((offer) => offer.branchId === id)
    .map((offer) => offer.id);
  const galleryIds = store.galleryImages
    .filter(
      (image) =>
        image.branchId === id ||
        (image.roomTypeId ? typeIds.has(image.roomTypeId) : false),
    )
    .map((image) => image.id);

  const activeReservation = store.reservations.some(
    (reservation) =>
      (reservation.roomId && roomIds.includes(reservation.roomId)) &&
      (reservation.status === "pendiente" ||
        reservation.status === "confirmada"),
  );
  if (activeReservation) {
    throw new Error(
      "No se puede eliminar: hay reservas activas en habitaciones de esta sede",
    );
  }

  store.branches.splice(index, 1);
  store.roomTypes = store.roomTypes.filter((type) => type.branchId !== id);
  store.rooms = store.rooms.filter((room) => room.branchId !== id);
  store.priceOffers = store.priceOffers.filter((offer) => offer.branchId !== id);
  store.galleryImages = store.galleryImages.filter(
    (image) => image.branchId !== id,
  );
  await writeStore(store);

  if (isFirestoreConfigured()) {
    try {
      const db = getDb();
      const ops: Array<(batch: WriteBatch) => void> = [
        (batch) => batch.delete(db.collection(COLLECTIONS.branches).doc(id)),
      ];
      for (const typeId of typeIds) {
        ops.push((batch) =>
          batch.delete(db.collection(COLLECTIONS.roomTypes).doc(typeId)),
        );
      }
      for (const roomId of roomIds) {
        ops.push((batch) =>
          batch.delete(db.collection(COLLECTIONS.rooms).doc(roomId)),
        );
      }
      for (const offerId of offerIds) {
        ops.push((batch) =>
          batch.delete(db.collection(COLLECTIONS.priceOffers).doc(offerId)),
        );
      }
      for (const galleryId of galleryIds) {
        ops.push((batch) =>
          batch.delete(db.collection(COLLECTIONS.galleryImages).doc(galleryId)),
        );
      }
      await commitInChunks(ops);
    } catch (error) {
      console.error("No se pudo limpiar la sucursal en Firestore:", error);
    }
  }
}

export async function deleteRoomType(id: string): Promise<void> {
  const store = await readStore();
  const index = store.roomTypes.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Tipo de habitación no encontrado");

  const roomsUsing = store.rooms.filter((room) => room.roomTypeId === id);
  if (roomsUsing.length > 0) {
    throw new Error(
      `Hay ${roomsUsing.length} habitación(es) con este tipo. Elimínalas o cámbiales el tipo primero.`,
    );
  }
  const activeOffer = store.priceOffers.some(
    (offer) =>
      offer.active &&
      (offer.prices[id] != null || offer.packagePrices?.[id] != null),
  );
  if (activeOffer) {
    throw new Error(
      "Este tipo está en una oferta activa. Quítalo de la oferta o pausa la oferta primero.",
    );
  }

  const galleryIds = store.galleryImages
    .filter((image) => image.roomTypeId === id)
    .map((image) => image.id);

  store.roomTypes.splice(index, 1);
  store.galleryImages = store.galleryImages.filter(
    (image) => image.roomTypeId !== id,
  );
  for (const offer of store.priceOffers) {
    if (offer.prices[id] != null) delete offer.prices[id];
    if (offer.packagePrices?.[id] != null) delete offer.packagePrices[id];
  }
  await writeStore(store);

  if (isFirestoreConfigured()) {
    try {
      const db = getDb();
      const ops: Array<(batch: WriteBatch) => void> = [
        (batch) => batch.delete(db.collection(COLLECTIONS.roomTypes).doc(id)),
      ];
      for (const galleryId of galleryIds) {
        ops.push((batch) =>
          batch.delete(db.collection(COLLECTIONS.galleryImages).doc(galleryId)),
        );
      }
      await commitInChunks(ops);
    } catch (error) {
      console.error("No se pudo borrar el tipo en Firestore:", error);
    }
  }
}

export async function getMailSettings(): Promise<MailSettings | null> {
  const store = await readStore();
  return store.mailSettings ?? null;
}

export async function saveMailSettings(
  settings: MailSettings | null,
): Promise<MailSettings | null> {
  const store = await readStore();
  store.mailSettings = settings;
  await writeStore(store);
  return store.mailSettings ?? null;
}

/** Remitente efectivo: dominio verificado en panel, o MAIL_FROM del secreto. */
export async function getResolvedMailFrom(): Promise<string | null> {
  const settings = await getMailSettings();
  if (
    settings?.fromAddress &&
    (settings.status === "verified" || settings.status === "partially_verified")
  ) {
    return settings.fromAddress;
  }
  return process.env.MAIL_FROM?.trim() || null;
}

export async function getAdminSnapshot() {
  await ensureOwnerStaffRecords();
  const store = await readStore();
  const availability = await getAvailability();

  return {
    branches: store.branches,
    rooms: store.rooms,
    roomTypes: store.roomTypes.map(roomTypeWithoutBlob),
    galleryImages: store.galleryImages.map(galleryWithoutBlob),
    services: store.services,
    reservations: store.reservations,
    mailOutbox: store.mailOutbox,
    mailSettings: store.mailSettings ?? null,
    staffMembers: store.staffMembers.map(toStaffPublic),
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
      branches: store.branches.filter((branch) => branch.active).length,
    },
  };
}
