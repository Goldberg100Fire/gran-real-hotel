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
import {
  humanizeMailError,
  recordUndeliveredInvite,
  sendStaffInviteEmail,
} from "@/lib/mail";
import {
  authorizeStaffPasswordReset,
  deleteStaffMember,
  getAuthorizedStaff,
  listStaffMembers,
  saveLoginCode,
  setStaffActive,
  upsertStaffMember,
} from "@/lib/store";

type InviteResult = {
  code: string;
  loginUrl: string;
  delivered: boolean;
  error: string | null;
};

function resolveLoginUrl(request: Request): string {
  let origin: string;
  try {
    origin = getAppOrigin(request);
  } catch {
    origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://gran-real-hotel.vercel.app";
  }
  return `${origin.replace(/\/$/, "")}/personal`;
}

async function sendInviteForStaff(input: {
  request: Request;
  email: string;
  name: string;
}): Promise<InviteResult> {
  const member = await getAuthorizedStaff(input.email);
  if (!member || !member.active) {
    throw new Error("Personal no autorizado o inactivo");
  }

  const code = createLoginCode();
  await saveLoginCode(input.email, code);
  const loginUrl = resolveLoginUrl(input.request);
  const name = input.name || member.name;

  if (!isEmailAuthConfigured()) {
    const error =
      "El correo no está configurado (RESEND_API_KEY / MAIL_FROM). Comparte el código manualmente.";
    await recordUndeliveredInvite({
      to: input.email,
      name,
      code,
      loginUrl,
      reason: error,
    });
    return { code, loginUrl, delivered: false, error };
  }

  try {
    await sendStaffInviteEmail({
      to: input.email,
      name,
      code,
      loginUrl,
    });
    return { code, loginUrl, delivered: true, error: null };
  } catch (err) {
    const error = humanizeMailError(err);
    await recordUndeliveredInvite({
      to: input.email,
      name,
      code,
      loginUrl,
      reason: error,
    });
    return { code, loginUrl, delivered: false, error };
  }
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

    const invite = await sendInviteForStaff({
      request,
      email,
      name: member.name,
    });

    return NextResponse.json(
      {
        member,
        inviteSent: invite.delivered,
        inviteCode: invite.code,
        loginUrl: invite.loginUrl,
        inviteError: invite.error,
        message: invite.delivered
          ? `Listo: se autorizó a ${email} y se envió el correo con el código.`
          : `Listo: se autorizó a ${email}. El correo no salió (${invite.error}). Comparte este código: ${invite.code}`,
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
      const invite = await sendInviteForStaff({
        request,
        email,
        name: member.name,
      });
      return NextResponse.json({
        ok: true,
        inviteSent: invite.delivered,
        inviteCode: invite.code,
        loginUrl: invite.loginUrl,
        inviteError: invite.error,
        message: invite.delivered
          ? `Listo: correo reenviado a ${email}.`
          : `El correo no salió. Comparte este código con ${email}: ${invite.code}`,
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
      return NextResponse.json({
        member,
        message: body.active
          ? `Listo: ${email} quedó activo.`
          : `Listo: ${email} quedó desactivado.`,
      });
    }

    if (body.authorizeReset === true) {
      const member = await authorizeStaffPasswordReset(email);
      return NextResponse.json({
        member,
        message: `Listo: reset autorizado 24h para ${email}.`,
      });
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
      return NextResponse.json({
        member,
        message: `Listo: datos de ${email} actualizados.`,
      });
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
    return NextResponse.json({
      ok: true,
      message: `Listo: se eliminó a ${email}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
