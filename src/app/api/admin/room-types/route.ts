import { NextResponse } from "next/server";
import { canEditPricing, requireStaff } from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import { createRoomType, deleteRoomType, updateRoomType } from "@/lib/store";

export async function POST(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede crear tipos de habitación" },
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
    const roomType = await createRoomType({
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      basePrice: Number(body.basePrice),
      maxGuests: Number(body.maxGuests) || 1,
      bedType: String(body.bedType ?? ""),
      imagePath: String(body.imagePath ?? ""),
      branchId: body.branchId ? String(body.branchId) : undefined,
      serviceIds: Array.isArray(body.serviceIds)
        ? body.serviceIds.map(String)
        : [],
    });
    return NextResponse.json({ roomType }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear el tipo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

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
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
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
      imagePath:
        typeof body.imagePath === "string" ? body.imagePath : undefined,
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

export async function DELETE(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede eliminar tipos de habitación" },
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
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    }
    await deleteRoomType(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar el tipo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
