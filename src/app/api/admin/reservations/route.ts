import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { updateReservationStatus } from "@/lib/store";
import type { ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = [
  "pendiente",
  "confirmada",
  "cancelada",
  "completada",
];

export async function PATCH(request: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const status = body.status as ReservationStatus;

    if (!id || !STATUSES.includes(status)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const reservation = await updateReservationStatus(id, status);
    return NextResponse.json({ reservation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
