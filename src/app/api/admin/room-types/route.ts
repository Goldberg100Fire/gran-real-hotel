import { NextResponse } from "next/server";
import { canEditPricing, requireStaff } from "@/lib/auth";
import { updateRoomType } from "@/lib/store";

export async function PATCH(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede editar tipos y precios" },
      { status: 403 },
    );
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
