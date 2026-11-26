import { NextResponse } from "next/server";
import {
  assertStaffRole,
  createLoginCode,
  getAppOrigin,
  getOwnerEmails,
  isEmailAuthConfigured,
  normalizeEmail,
  requireOwner,
} from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import { sendStaffInviteEmail } from "@/lib/mail";
import {
  authorizeStaffPasswordReset,
  deleteStaffMember,
  getAuthorizedStaff,
  listStaffMembers,
  saveLoginCode,
  setStaffActive,
  upsertStaffMember,
} from "@/lib/store";

async function sendInviteForStaff(input: {
  request: Request;
  email: string;
  name: string;
}) {
  if (!isEmailAuthConfigured()) {
    throw new Error(
      "El correo no está configurado (RESEND_API_KEY / MAIL_FROM). No se pudo enviar la invitación.",
    );
  }
  const member = await getAuthorizedStaff(input.email);
  if (!member || !member.active) {
    throw new Error("Personal no autorizado o inactivo");
  }
  const code = createLoginCode();
  await saveLoginCode(input.email, code);
  let origin: string;
  try {
    origin = getAppOrigin(input.request);
  } catch {
    origin =
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://gran-real-hotel.vercel.app";
  }
  await sendStaffInviteEmail({
    to: input.email,
    name: input.name || member.name,
    code,
    loginUrl: `${origin.replace(/\/$/, "")}/personal`,
  });
}

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
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
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

    let inviteSent = false;
    let inviteError: string | null = null;
    try {
      await sendInviteForStaff({
        request,
        email,
        name: member.name,
      });
      inviteSent = true;
    } catch (error) {
      inviteError =
        error instanceof Error
          ? error.message
          : "No se pudo enviar el correo de invitación";
    }

    return NextResponse.json(
      {
        member,
        inviteSent,
        inviteError,
        message: inviteSent
          ? `Personal autorizado. Se envió el correo a ${email} con el código para crear su contraseña.`
          : `Personal autorizado, pero el correo no se envió: ${inviteError}`,
      },
      { status: 201 },
    );
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
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email) {
      return NextResponse.json({ error: "Correo obligatorio" }, { status: 400 });
    }

    if (body.resendInvite === true) {
      const member = await getAuthorizedStaff(email);
      if (!member) {
        return NextResponse.json(
          { error: "Personal no encontrado" },
          { status: 404 },
        );
      }
      if (member.passwordHash) {
        return NextResponse.json(
          {
            error:
              "Esta persona ya tiene contraseña. Usa “Autorizar reset” si olvidó la clave.",
          },
          { status: 400 },
        );
      }
      await sendInviteForStaff({
        request,
        email,
        name: member.name,
      });
      return NextResponse.json({
        ok: true,
        message: `Correo reenviado a ${email}`,
      });
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

    if (body.authorizeReset === true) {
      const member = await authorizeStaffPasswordReset(email);
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

export async function DELETE(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { error: "Solo el jefe puede eliminar personal" },
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
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email) {
      return NextResponse.json({ error: "Correo obligatorio" }, { status: 400 });
    }
    if (email === owner.email) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 400 },
      );
    }
    await deleteStaffMember(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
