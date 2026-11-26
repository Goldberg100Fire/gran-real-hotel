import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import {
  isResendConfigured,
  isSmtpConfigured,
  sendEmail,
} from "@/lib/mail";
import {
  buildMailFrom,
  createResendDomain,
  getResendDomain,
  listResendDomains,
  normalizeDomainName,
  verifyResendDomain,
} from "@/lib/resend-domains";
import { getMailSettings, saveMailSettings } from "@/lib/store";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Solo el jefe" }, { status: 403 });
  }

  try {
    const smtpUser = process.env.SMTP_USER?.trim() || null;
    const [settings, domains] = await Promise.all([
      getMailSettings(),
      listResendDomains().catch(() => [] as Awaited<ReturnType<typeof listResendDomains>>),
    ]);

    let active = settings
      ? domains.find((item) => item.id === settings.domainId) || null
      : null;

    if (active?.id) {
      try {
        active = await getResendDomain(active.id);
        if (
          settings &&
          active.status !== settings.status &&
          (active.status === "verified" ||
            active.status === "partially_verified" ||
            active.status === "failed" ||
            active.status === "temporary_failure")
        ) {
          await saveMailSettings({
            ...settings,
            status: active.status,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // keep list data
      }
    }

    return NextResponse.json({
      settings,
      domains,
      active,
      envFrom: process.env.MAIL_FROM || null,
      smtp: {
        configured: isSmtpConfigured(),
        user: smtpUser,
        host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
      },
      resend: {
        configured: isResendConfigured(),
      },
      configured: isSmtpConfigured() || isResendConfigured(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo consultar Resend";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Solo el jefe" }, { status: 403 });
  }

  try {
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await request.json();
    const action = String(body.action ?? "create");

    if (action === "test") {
      const to =
        String(body.to ?? "").trim().toLowerCase() || owner.email;
      if (!to.includes("@")) {
        return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
      }
      const result = await sendEmail({
        to,
        subject: `Prueba de correo · Gran Real Hotel`,
        text: `Prueba OK. Si lees esto, SMTP/Gmail ya puede enviar invitaciones a empleados.\nModo: ${isSmtpConfigured() ? "smtp" : "resend"}`,
        html: `<p>Prueba OK. Si lees esto, el hotel ya puede enviar invitaciones.</p><p>Destino: <strong>${to}</strong></p>`,
      });
      return NextResponse.json({
        ok: true,
        mode: result.mode,
        message: `Listo: correo de prueba enviado a ${to} (${result.mode}).`,
      });
    }

    if (action === "create") {
      const domain = await createResendDomain(String(body.domain ?? ""));
      const full = await getResendDomain(domain.id);
      const settings = await saveMailSettings({
        domain: full.name,
        domainId: full.id,
        status: full.status,
        fromAddress: buildMailFrom(full.name),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        domain: full,
        settings,
        message: `Dominio ${full.name} agregado en Resend. Copia los DNS en tu proveedor y luego verifica.`,
      });
    }

    if (action === "verify") {
      const settings = await getMailSettings();
      const id = String(body.domainId ?? settings?.domainId ?? "");
      if (!id) {
        return NextResponse.json(
          { error: "No hay dominio para verificar" },
          { status: 400 },
        );
      }
      const domain = await verifyResendDomain(id);
      const next = await saveMailSettings({
        domain: domain.name,
        domainId: domain.id,
        status: domain.status,
        fromAddress: buildMailFrom(domain.name),
        updatedAt: new Date().toISOString(),
      });
      const ready =
        domain.status === "verified" || domain.status === "partially_verified";
      return NextResponse.json({
        domain,
        settings: next,
        message: ready
          ? `Listo: dominio ${domain.name} verificado. Ya puedes enviar a cualquier correo.`
          : `Verificación iniciada (${domain.status}). Si aún falla, espera unos minutos a que el DNS propague y vuelve a verificar.`,
      });
    }

    if (action === "refresh") {
      const settings = await getMailSettings();
      const id = String(body.domainId ?? settings?.domainId ?? "");
      if (!id) {
        return NextResponse.json(
          { error: "No hay dominio cargado" },
          { status: 400 },
        );
      }
      const domain = await getResendDomain(id);
      const next = await saveMailSettings({
        domain: domain.name,
        domainId: domain.id,
        status: domain.status,
        fromAddress: buildMailFrom(domain.name),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        domain,
        settings: next,
        message: `Estado actual: ${domain.status}`,
      });
    }

    if (action === "use-existing") {
      const domainName = normalizeDomainName(String(body.domain ?? ""));
      const domains = await listResendDomains();
      const found =
        domains.find((item) => item.name === domainName) ||
        domains.find((item) => item.id === String(body.domainId ?? ""));
      if (!found) {
        return NextResponse.json(
          { error: "Dominio no encontrado en Resend" },
          { status: 404 },
        );
      }
      const domain = await getResendDomain(found.id);
      const settings = await saveMailSettings({
        domain: domain.name,
        domainId: domain.id,
        status: domain.status,
        fromAddress: buildMailFrom(domain.name),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        domain,
        settings,
        message: `Usando dominio ${domain.name}`,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo configurar el dominio";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
