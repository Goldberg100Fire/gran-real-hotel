import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn") ?? undefined;
  const checkOut = searchParams.get("checkOut") ?? undefined;
  const branchId = searchParams.get("branchId") ?? undefined;

  const availability = await getAvailability(checkIn, checkOut, branchId);
  return NextResponse.json({ availability });
}
