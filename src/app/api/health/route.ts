import { NextResponse } from "next/server";
import { isFirestoreConfigured } from "@/lib/firebase";
import { HOTEL } from "@/lib/hotel-info";
import { getAvailability, getStorageMode } from "@/lib/store";

export async function GET() {
  try {
    const availability = await getAvailability();
    return NextResponse.json({
      ok: true,
      hotel: HOTEL.name,
      storage: getStorageMode(),
      firestoreConfigured: isFirestoreConfigured(),
      roomTypes: availability.map((item) => ({
        id: item.roomType.id,
        name: item.roomType.name,
        price: item.roomType.basePrice,
        available: item.availableCount,
        total: item.totalRooms,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error de salud",
        storage: getStorageMode(),
        firestoreConfigured: isFirestoreConfigured(),
      },
      { status: 500 },
    );
  }
}
