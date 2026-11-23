import { NextResponse } from "next/server";
import { canManageStaff, requireStaff } from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import { updateReservationStatus } from "@/lib/store";
import type { ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = [
  "pendiente",
  "confirmada",
  "cancelada",
  "completada",
];

export async function PATCH(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
    const status = body.status as ReservationStatus;

    if (!id || !STATUSES.includes(status)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const reservation = await updateReservationStatus(id, status, {
      allowUnpaidConfirm: canManageStaff(user.role),
    });
    return NextResponse.json({ reservation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
