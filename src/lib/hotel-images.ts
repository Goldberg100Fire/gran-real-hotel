/** Fotos disponibles en /public/hotel para asignar a tipos de habitación. */
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

export function isAllowedRoomImage(path: string | undefined | null): boolean {
  if (!path) return false;
  return HOTEL_ROOM_IMAGE_PATHS.includes(path);
}
