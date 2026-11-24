/** Fotos iniciales de ejemplo. El jefe puede agregar y eliminar del catálogo. */
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
const MEDIA_GALLERY_PATH =
  /^\/api\/media\/gallery\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,80}$/;

export function roomTypeMediaPath(typeId: string): string {
  return `/api/media/room/${typeId}`;
}

export function galleryMediaPath(imageId: string): string {
  return `/api/media/gallery/${imageId}`;
}

export function isStockRoomImage(path: string | undefined | null): boolean {
  if (!path) return false;
  return HOTEL_ROOM_IMAGE_PATHS.includes(path);
}

export function isUploadedRoomImage(path: string | undefined | null): boolean {
  if (!path) return false;
  return MEDIA_ROOM_PATH.test(path);
}

export function isGalleryMediaPath(path: string | undefined | null): boolean {
  if (!path) return false;
  return MEDIA_GALLERY_PATH.test(path);
}

export function isAllowedRoomImage(
  path: string | undefined | null,
  galleryPaths?: string[],
): boolean {
  if (!path) return false;
  if (isStockRoomImage(path) || isUploadedRoomImage(path) || isGalleryMediaPath(path)) {
    return true;
  }
  if (galleryPaths?.includes(path)) return true;
  return false;
}

export function seedGalleryImages(): {
  id: string;
  label: string;
  path: string;
  createdAt: string;
}[] {
  const createdAt = new Date().toISOString();
  return HOTEL_ROOM_IMAGES.map((image, index) => ({
    id: `gallery-seed-${index + 1}`,
    label: image.label,
    path: image.path,
    createdAt,
  }));
}

/** Límite para caber en documentos Firestore (~1 MiB). */
export const ROOM_IMAGE_MAX_BYTES = 500_000;
export const ROOM_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
