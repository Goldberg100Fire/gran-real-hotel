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

  const privateKey = process.env
    .FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n")
    .replace(/"/g, "");

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
  services: "services",
  roomTypes: "roomTypes",
  rooms: "rooms",
  reservations: "reservations",
  loginCodes: "loginCodes",
  mailOutbox: "mailOutbox",
  staffMembers: "staffMembers",
  guests: "guests",
  priceOffers: "priceOffers",
} as const;
