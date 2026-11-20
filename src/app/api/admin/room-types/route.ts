import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateRoomType } from "@/lib/store";

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    }

    const roomType = await updateRoomType(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        typeof body.description === "string" ? body.description : undefined,
      basePrice:
        typeof body.basePrice === "number" ? body.basePrice : undefined,
      maxGuests:
        typeof body.maxGuests === "number" ? body.maxGuests : undefined,
      bedType: typeof body.bedType === "string" ? body.bedType : undefined,
      serviceIds: Array.isArray(body.serviceIds)
        ? body.serviceIds.map(String)
        : undefined,
    });

    return NextResponse.json({ roomType });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el tipo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
