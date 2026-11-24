import { NextResponse } from "next/server";
import { canEditPricing, requireStaff } from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import {
  ROOM_IMAGE_MAX_BYTES,
  ROOM_IMAGE_MIME,
} from "@/lib/hotel-images";
import { setRoomTypeUploadedImage } from "@/lib/store";
import type { RoomTypeImageBlob } from "@/lib/types";

export async function POST(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede cambiar fotos" },
      { status: 403 },
    );
  }

  try {
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await request.json();
    const roomTypeId = String(body.roomTypeId ?? "");
    const contentType = String(body.contentType ?? "");
    const data = String(body.data ?? "").replace(/\s+/g, "");

    if (!roomTypeId) {
      return NextResponse.json({ error: "Falta el tipo" }, { status: 400 });
    }
    if (!ROOM_IMAGE_MIME.has(contentType)) {
      return NextResponse.json(
        { error: "Formato no permitido (usa JPG, PNG o WebP)" },
        { status: 400 },
      );
    }
    if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
    }

    const approxBytes = Math.floor((data.length * 3) / 4);
    if (approxBytes > ROOM_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: "La foto es demasiado grande (máx. ~500 KB)" },
        { status: 400 },
      );
    }

    const blob: RoomTypeImageBlob = {
      contentType: contentType as RoomTypeImageBlob["contentType"],
      data,
      updatedAt: new Date().toISOString(),
    };

    const roomType = await setRoomTypeUploadedImage(roomTypeId, blob);
    return NextResponse.json({ roomType });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar la foto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
