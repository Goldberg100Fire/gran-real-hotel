import type { HotelStore } from "./types";

export const HOTEL_NAME = "Hotel Brisa Pacífico";
export const HOTEL_TAGLINE = "Descanso frente al mar, reservas en minutos";

export function createSeedStore(): HotelStore {
  return {
    services: [
      {
        id: "svc-wifi",
        name: "Wi‑Fi de alta velocidad",
        description: "Internet gratuito en habitación y áreas comunes",
        icon: "wifi",
      },
      {
        id: "svc-desayuno",
        name: "Desayuno buffet",
        description: "Desayuno continental incluido cada mañana",
        icon: "coffee",
      },
      {
        id: "svc-vista",
        name: "Vista al mar",
        description: "Habitación con vista directa al océano Pacífico",
        icon: "waves",
      },
      {
        id: "svc-ac",
        name: "Aire acondicionado",
        description: "Climatización individual con control remoto",
        icon: "wind",
      },
      {
        id: "svc-minibar",
        name: "Minibar",
        description: "Bebidas y snacks refrigerados en la habitación",
        icon: "glass-water",
      },
      {
        id: "svc-tv",
        name: "Smart TV",
        description: "Pantalla 55\" con streaming",
        icon: "tv",
      },
      {
        id: "svc-jacuzzi",
        name: "Jacuzzi",
        description: "Tina de hidromasaje privada",
        icon: "bath",
      },
      {
        id: "svc-caja",
        name: "Caja fuerte",
        description: "Seguridad para documentos y valores",
        icon: "lock",
      },
    ],
    roomTypes: [
      {
        id: "type-standard",
        name: "Estándar",
        description:
          "Habitación cómoda con todo lo esencial para una estadía relajada.",
        basePrice: 180,
        maxGuests: 2,
        bedType: "1 cama queen",
        imageGradient: "from-teal-800 via-cyan-700 to-sky-600",
        serviceIds: ["svc-wifi", "svc-ac", "svc-tv", "svc-caja"],
      },
      {
        id: "type-deluxe",
        name: "Deluxe Vista Mar",
        description:
          "Amplia habitación con balcón y vista panorámica al océano.",
        basePrice: 280,
        maxGuests: 2,
        bedType: "1 cama king",
        imageGradient: "from-slate-800 via-teal-700 to-cyan-500",
        serviceIds: [
          "svc-wifi",
          "svc-desayuno",
          "svc-vista",
          "svc-ac",
          "svc-minibar",
          "svc-tv",
          "svc-caja",
        ],
      },
      {
        id: "type-suite",
        name: "Suite Brisa",
        description:
          "Suite con sala de estar, jacuzzi y amenidades premium.",
        basePrice: 420,
        maxGuests: 3,
        bedType: "1 cama king + sofá cama",
        imageGradient: "from-emerald-900 via-teal-800 to-amber-600",
        serviceIds: [
          "svc-wifi",
          "svc-desayuno",
          "svc-vista",
          "svc-ac",
          "svc-minibar",
          "svc-tv",
          "svc-jacuzzi",
          "svc-caja",
        ],
      },
      {
        id: "type-familiar",
        name: "Familiar",
        description:
          "Ideal para familias: dos ambientes conectados y espacio extra.",
        basePrice: 350,
        maxGuests: 5,
        bedType: "2 camas queen",
        imageGradient: "from-cyan-900 via-sky-700 to-teal-500",
        serviceIds: [
          "svc-wifi",
          "svc-desayuno",
          "svc-ac",
          "svc-tv",
          "svc-caja",
        ],
      },
    ],
    rooms: [
      { id: "room-101", number: "101", floor: 1, roomTypeId: "type-standard", status: "disponible", notes: "" },
      { id: "room-102", number: "102", floor: 1, roomTypeId: "type-standard", status: "disponible", notes: "" },
      { id: "room-103", number: "103", floor: 1, roomTypeId: "type-standard", status: "limpieza", notes: "Salida reciente" },
      { id: "room-201", number: "201", floor: 2, roomTypeId: "type-deluxe", status: "disponible", notes: "" },
      { id: "room-202", number: "202", floor: 2, roomTypeId: "type-deluxe", status: "ocupada", notes: "Huésped hasta el viernes" },
      { id: "room-203", number: "203", floor: 2, roomTypeId: "type-deluxe", status: "disponible", notes: "" },
      { id: "room-301", number: "301", floor: 3, roomTypeId: "type-suite", status: "disponible", notes: "" },
      { id: "room-302", number: "302", floor: 3, roomTypeId: "type-suite", status: "mantenimiento", notes: "Reparación de jacuzzi" },
      { id: "room-401", number: "401", floor: 4, roomTypeId: "type-familiar", status: "disponible", notes: "" },
      { id: "room-402", number: "402", floor: 4, roomTypeId: "type-familiar", status: "disponible", notes: "" },
    ],
    reservations: [],
  };
}
