import { NextResponse } from "next/server";
import { canEditPricing, requireStaff } from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import { createService, deleteService, updateService } from "@/lib/store";

export async function POST(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede crear servicios" },
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
    const service = await createService({
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      icon: typeof body.icon === "string" ? body.icon : undefined,
    });
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear el servicio";
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
      { error: "Solo el jefe puede editar servicios" },
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

    const service = await updateService(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        typeof body.description === "string" ? body.description : undefined,
      icon: typeof body.icon === "string" ? body.icon : undefined,
    });
    return NextResponse.json({ service });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar";
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
      { error: "Solo el jefe puede eliminar servicios" },
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
    await deleteService(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
