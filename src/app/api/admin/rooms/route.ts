import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createRoom, updateRoom } from "@/lib/store";
import type { RoomStatus } from "@/lib/types";

const STATUSES: RoomStatus[] = [
  "disponible",
  "ocupada",
  "mantenimiento",
  "limpieza",
];

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const room = await createRoom({
      number: String(body.number ?? ""),
      floor: Number(body.floor) || 1,
      roomTypeId: String(body.roomTypeId ?? ""),
      status: STATUSES.includes(body.status) ? body.status : "disponible",
      notes: body.notes ? String(body.notes) : "",
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la habitación";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

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

    const room = await updateRoom(id, {
      status: STATUSES.includes(body.status) ? body.status : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      roomTypeId:
        typeof body.roomTypeId === "string" ? body.roomTypeId : undefined,
      number: typeof body.number === "string" ? body.number : undefined,
      floor: typeof body.floor === "number" ? body.floor : undefined,
    });

    return NextResponse.json({ room });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
