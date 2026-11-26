import { NextResponse } from "next/server";
import {
  canCreateRooms,
  canEditPricing,
  canManageStaff,
  getOwnerEmails,
  requireStaff,
} from "@/lib/auth";
import { ensureCsrfCookie } from "@/lib/csrf";
import { redactReservationForStaff } from "@/lib/privacy";
import { getAdminSnapshot } from "@/lib/store";

export async function GET() {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const fullAccess = canManageStaff(user.role);
  const snapshot = await getAdminSnapshot();
  let csrfToken: string | null = null;
  try {
    csrfToken = await ensureCsrfCookie();
  } catch {
    csrfToken = null;
  }

  return NextResponse.json({
    ...snapshot,
    staffMembers: fullAccess ? snapshot.staffMembers : [],
    mailOutbox: fullAccess ? snapshot.mailOutbox : [],
    mailSettings: fullAccess ? snapshot.mailSettings ?? null : null,
    guests: fullAccess ? snapshot.guests : [],
    reservations: snapshot.reservations.map((reservation) =>
      redactReservationForStaff(reservation, fullAccess),
    ),
    csrfToken,
    me: {
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: {
        manageStaff: canManageStaff(user.role),
        editPricing: canEditPricing(user.role),
        createRooms: canCreateRooms(user.role),
        viewGuestPii: fullAccess,
      },
    },
    ownersFromSecrets: fullAccess ? getOwnerEmails() : [],
  });
}
