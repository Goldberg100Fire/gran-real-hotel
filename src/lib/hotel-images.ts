/** Fotos de ejemplo en /public/hotel. El jefe también puede subir fotos propias. */
export const HOTEL_ROOM_IMAGES = [
  {
    path: "/hotel/simple.png",
    label: "Simple",
  },
  {
    path: "/hotel/matrimonial-1.png",
    label: "Matrimonial 1",
  },
  {
    path: "/hotel/matrimonial-2.png",
    label: "Matrimonial 2",
  },
  {
    path: "/hotel/doble.png",
    label: "Doble",
  },
] as const;

export const HOTEL_ROOM_IMAGE_PATHS = HOTEL_ROOM_IMAGES.map(
  (item) => item.path,
) as string[];

const MEDIA_ROOM_PATH =
  /^\/api\/media\/room\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,80}$/;

export function roomTypeMediaPath(typeId: string): string {
  return `/api/media/room/${typeId}`;
}

export function isStockRoomImage(path: string | undefined | null): boolean {
  if (!path) return false;
  return HOTEL_ROOM_IMAGE_PATHS.includes(path);
}

export function isUploadedRoomImage(path: string | undefined | null): boolean {
  if (!path) return false;
  return MEDIA_ROOM_PATH.test(path);
}

export function isAllowedRoomImage(path: string | undefined | null): boolean {
  return isStockRoomImage(path) || isUploadedRoomImage(path);
}

/** Límite para caber en documentos Firestore (~1 MiB). */
export const ROOM_IMAGE_MAX_BYTES = 500_000;
export const ROOM_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
