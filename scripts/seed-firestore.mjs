/**
 * Carga el inventario inicial de Gran Real Hotel en Firestore.
 *
 * Uso:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY='...' npm run seed:firestore
 */
import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const require = createRequire(import.meta.url);

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Falta ${key}. Agrégalo en .env.local o en el entorno.`);
    process.exit(1);
  }
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(
  /"/g,
  "",
);

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

const hotel = {
  name: "Gran Real Hotel",
  stars: 3,
  tagline: "Otuzco te espera",
  city: "Otuzco",
  region: "La Libertad",
  country: "Perú",
  address: "Calle Tacna Nº 542",
  fullAddress: "Calle Tacna Nº 542 · Otuzco · La Libertad",
  phoneMobile: "978113578",
  phoneLandline: "044 727074",
  logoPath: "/hotel/logo.png",
  updatedAt: new Date().toISOString(),
};

const services = [
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
];

const roomTypes = [
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
];

const rooms = [
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
];

async function main() {
  const batch = db.batch();
  batch.set(db.collection("hotel").doc("gran-real"), hotel);
  for (const service of services) {
    batch.set(db.collection("services").doc(service.id), service);
  }
  for (const type of roomTypes) {
    batch.set(db.collection("roomTypes").doc(type.id), type);
  }
  for (const room of rooms) {
    batch.set(db.collection("rooms").doc(room.id), room);
  }
  await batch.commit();

  console.log("Firestore listo para Gran Real Hotel");
  console.log(`  hotel/gran-real`);
  console.log(`  services: ${services.length}`);
  console.log(`  roomTypes: ${roomTypes.length}`);
  console.log(`  rooms: ${rooms.length}`);
  console.log(`  project: ${process.env.FIREBASE_PROJECT_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
