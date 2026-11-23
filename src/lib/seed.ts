import { HOTEL } from "./hotel-info";
import type { HotelStore } from "./types";

export const HOTEL_NAME = HOTEL.name;
export const HOTEL_TAGLINE = HOTEL.tagline;

export function createSeedStore(): HotelStore {
  return {
    services: [
      {
        id: "svc-bano",
        name: "Baño privado",
        description: "Baño completo privativo en cada habitación",
        icon: "bath",
      },
      {
        id: "svc-agua",
        name: "Agua caliente",
        description: "Agua caliente disponible las 24 horas",
        icon: "droplets",
      },
      {
        id: "svc-tv",
        name: "TV cable",
        description: "Televisión con señal de cable",
        icon: "tv",
      },
      {
        id: "svc-wifi",
        name: "Wi‑Fi",
        description: "Internet inalámbrico en habitaciones y áreas comunes",
        icon: "wifi",
      },
    ],
    roomTypes: [
      {
        id: "type-simple",
        name: "Simple",
        description:
          "Habitación individual cómoda, ideal para viajeros. Incluye baño privado, agua caliente, TV cable y Wi‑Fi.",
        basePrice: 80,
        maxGuests: 1,
        bedType: "1 cama individual",
        imageGradient: "from-[#3d3129] via-[#6b5344] to-[#a67b5b]",
        imagePath: "/hotel/simple.png",
        serviceIds: ["svc-bano", "svc-agua", "svc-tv", "svc-wifi"],
      },
      {
        id: "type-matrimonial",
        name: "Matrimonial",
        description:
          "Habitación con cama matrimonial, mobiliario de madera y ambiente cálido para descansar en Otuzco.",
        basePrice: 120,
        maxGuests: 2,
        bedType: "1 cama matrimonial",
        imageGradient: "from-[#2c241e] via-[#5c4638] to-[#c4a484]",
        imagePath: "/hotel/matrimonial-1.png",
        serviceIds: ["svc-bano", "svc-agua", "svc-tv", "svc-wifi"],
      },
      {
        id: "type-doble",
        name: "Doble",
        description:
          "Dos camas individuales, ideal para amigos o familia. Decoración con detalles de Otuzco.",
        basePrice: 140,
        maxGuests: 2,
        bedType: "2 camas individuales",
        imageGradient: "from-[#3d3129] via-[#7a5c45] to-[#d8c3a5]",
        imagePath: "/hotel/doble.png",
        serviceIds: ["svc-bano", "svc-agua", "svc-tv", "svc-wifi"],
      },
    ],
    rooms: [
      { id: "room-101", number: "101", floor: 1, roomTypeId: "type-simple", status: "disponible", notes: "" },
      { id: "room-102", number: "102", floor: 1, roomTypeId: "type-simple", status: "disponible", notes: "" },
      { id: "room-103", number: "103", floor: 1, roomTypeId: "type-simple", status: "disponible", notes: "" },
      { id: "room-104", number: "104", floor: 1, roomTypeId: "type-simple", status: "limpieza", notes: "" },
      { id: "room-201", number: "201", floor: 2, roomTypeId: "type-matrimonial", status: "disponible", notes: "" },
      { id: "room-202", number: "202", floor: 2, roomTypeId: "type-matrimonial", status: "disponible", notes: "" },
      { id: "room-203", number: "203", floor: 2, roomTypeId: "type-matrimonial", status: "disponible", notes: "" },
      { id: "room-204", number: "204", floor: 2, roomTypeId: "type-matrimonial", status: "ocupada", notes: "" },
      { id: "room-301", number: "301", floor: 3, roomTypeId: "type-doble", status: "disponible", notes: "" },
      { id: "room-302", number: "302", floor: 3, roomTypeId: "type-doble", status: "disponible", notes: "" },
      { id: "room-303", number: "303", floor: 3, roomTypeId: "type-doble", status: "disponible", notes: "" },
      { id: "room-304", number: "304", floor: 3, roomTypeId: "type-doble", status: "mantenimiento", notes: "" },
    ],
    reservations: [],
    mailOutbox: [],
    loginCodes: [],
    staffMembers: [],
    guests: [],
    priceOffers: [],
  };
}
