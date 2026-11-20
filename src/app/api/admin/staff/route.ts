import { NextResponse } from "next/server";
import {
  assertStaffRole,
  getOwnerEmails,
  normalizeEmail,
  requireOwner,
} from "@/lib/auth";
import {
  listStaffMembers,
  setStaffActive,
  upsertStaffMember,
} from "@/lib/store";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { error: "Solo el jefe puede ver el personal" },
      { status: 403 },
    );
  }

  const staff = await listStaffMembers();
  return NextResponse.json({
    staff,
    ownersFromSecrets: getOwnerEmails(),
  });
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { error: "Solo el jefe puede agregar personal" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const name = String(body.name ?? "").trim();
    const role = String(body.role ?? "empleado");
    assertStaffRole(role);

    if (!email) {
      return NextResponse.json({ error: "Correo obligatorio" }, { status: 400 });
    }

    // Los dueños del secreto no se duplican como empleados editables
    if (getOwnerEmails().includes(email) && role === "empleado") {
      return NextResponse.json(
        {
          error:
            "Ese correo es dueño del hotel (secreto ADMIN_ALLOWED_EMAILS). Queda como jefe automáticamente.",
        },
        { status: 400 },
      );
    }

    const member = await upsertStaffMember({
      email,
      name,
      role,
      active: true,
      createdBy: owner.email,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { error: "Solo el jefe puede modificar personal" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email) {
      return NextResponse.json({ error: "Correo obligatorio" }, { status: 400 });
    }

    if (typeof body.active === "boolean") {
      if (email === owner.email) {
        return NextResponse.json(
          { error: "No puedes desactivarte a ti mismo" },
          { status: 400 },
        );
      }
      const member = await setStaffActive(email, body.active);
      return NextResponse.json({ member });
    }

    if (body.role || body.name) {
      const role = body.role ? String(body.role) : "empleado";
      assertStaffRole(role);
      const member = await upsertStaffMember({
        email,
        name: String(body.name ?? email.split("@")[0]),
        role,
        createdBy: owner.email,
      });
      return NextResponse.json({ member });
    }

    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
