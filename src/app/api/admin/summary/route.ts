import { NextResponse } from "next/server";
import {
  canCreateRooms,
  canEditPricing,
  canManageStaff,
  getOwnerEmails,
  requireStaff,
} from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/store";

export async function GET() {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const snapshot = await getAdminSnapshot();
  return NextResponse.json({
    ...snapshot,
    // Empleados no ven lista completa de personal ni correos internos sensibles de OTP
    staffMembers: canManageStaff(user.role) ? snapshot.staffMembers : [],
    mailOutbox: canManageStaff(user.role) ? snapshot.mailOutbox : [],
    guests: canManageStaff(user.role) ? snapshot.guests : snapshot.guests.map((g) => ({
      document: g.document,
      email: g.email,
      name: g.name,
      phone: g.phone,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
    me: {
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: {
        manageStaff: canManageStaff(user.role),
        editPricing: canEditPricing(user.role),
        createRooms: canCreateRooms(user.role),
      },
    },
    ownersFromSecrets: canManageStaff(user.role) ? getOwnerEmails() : [],
  });
}
