import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;

export function isFirestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim(),
  );
}

/** Normaliza la private key pegada en Vercel/.env (comillas, \\n, espacios). */
export function normalizeFirebasePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  // Por si quedó doble-escapado en el panel de Vercel
  if (key.includes("\\n") && !key.includes("\n-----")) {
    key = key.replace(/\\n/g, "\n");
  }
  return key.replace(/"/g, "").trim();
}

export function getFirebaseApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  if (!isFirestoreConfigured()) {
    throw new Error(
      "Firestore no configurado. Define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.",
    );
  }

  const privateKey = normalizeFirebasePrivateKey(
    process.env.FIREBASE_PRIVATE_KEY!,
  );

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID!,
  });

  return app;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/** Colecciones del hotel Gran Real */
export const COLLECTIONS = {
  hotel: "hotel",
  branches: "branches",
  services: "services",
  roomTypes: "roomTypes",
  rooms: "rooms",
  reservations: "reservations",
  loginCodes: "loginCodes",
  mailOutbox: "mailOutbox",
  staffMembers: "staffMembers",
  guests: "guests",
  priceOffers: "priceOffers",
  galleryImages: "galleryImages",
} as const;
