import { NextResponse } from "next/server";
import { canEditPricing, requireStaff } from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import {
  ROOM_IMAGE_MAX_BYTES,
  ROOM_IMAGE_MIME,
} from "@/lib/hotel-images";
import {
  addGalleryImage,
  deleteGalleryImage,
  listGalleryImages,
} from "@/lib/store";
import type { RoomTypeImageBlob } from "@/lib/types";

async function requireJefe() {
  const user = await requireStaff();
  if (!user) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  if (!canEditPricing(user.role)) {
    return {
      error: NextResponse.json(
        { error: "Solo el jefe puede gestionar el catálogo de fotos" },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export async function GET() {
  const gate = await requireJefe();
  if (gate.error) return gate.error;
  const images = await listGalleryImages();
  return NextResponse.json({ images });
}

export async function POST(request: Request) {
  const gate = await requireJefe();
  if (gate.error) return gate.error;

  try {
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await request.json();
    const label = String(body.label ?? "Foto habitación");
    const roomTypeId =
      typeof body.roomTypeId === "string" && body.roomTypeId.trim()
        ? body.roomTypeId.trim()
        : null;
    const contentType = String(body.contentType ?? "");
    const data = String(body.data ?? "").replace(/\s+/g, "");

    if (!ROOM_IMAGE_MIME.has(contentType)) {
      return NextResponse.json(
        { error: "Formato no permitido (usa JPG, PNG o WebP)" },
        { status: 400 },
      );
    }
    if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
    }

    let decoded: Buffer;
    try {
      decoded = Buffer.from(data, "base64");
    } catch {
      return NextResponse.json(
        { error: "La foto está dañada y no se guardó" },
        { status: 400 },
      );
    }
    if (decoded.length < 32 || decoded.length > ROOM_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: "La foto es inválida o demasiado grande (máx. ~500 KB)" },
        { status: 400 },
      );
    }

    const blob: RoomTypeImageBlob = {
      contentType: contentType as RoomTypeImageBlob["contentType"],
      data,
      updatedAt: new Date().toISOString(),
    };

    const branchId =
      typeof body.branchId === "string" && body.branchId.trim()
        ? body.branchId.trim()
        : null;
    const image = await addGalleryImage({ label, blob, roomTypeId, branchId });
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo agregar la foto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const gate = await requireJefe();
  if (gate.error) return gate.error;

  try {
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Falta el id de la foto" }, { status: 400 });
    }
    await deleteGalleryImage(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la foto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
