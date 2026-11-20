import { NextResponse } from "next/server";
import {
  AuthConfigError,
  buildSessionUser,
  getAppOrigin,
  isGoogleAuthConfigured,
  isStaffRole,
  normalizeEmail,
  safeNextPath,
  setSessionCookie,
} from "@/lib/auth";
import { getGuestByEmail } from "@/lib/store";

export async function GET(request: Request) {
  const origin = getAppOrigin(request);
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(`${origin}/acceso?error=google_no_configurado`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  let next = "/";
  try {
    if (stateRaw) {
      const parsed = JSON.parse(
        Buffer.from(stateRaw, "base64url").toString("utf8"),
      ) as { next?: string };
      next = safeNextPath(parsed.next);
    }
  } catch {
    next = "/";
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/acceso?error=google_cancelado`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${origin}/acceso?error=google_token`);
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/acceso?error=google_token`);
  }

  const profileResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    },
  );

  if (!profileResponse.ok) {
    return NextResponse.redirect(`${origin}/acceso?error=google_perfil`);
  }

  const profile = (await profileResponse.json()) as {
    email?: string;
    name?: string;
  };

  if (!profile.email) {
    return NextResponse.redirect(`${origin}/acceso?error=google_sin_correo`);
  }

  try {
    const email = normalizeEmail(profile.email);
    const user = await buildSessionUser({
      email,
      name: profile.name || email.split("@")[0],
    });

    if (!isStaffRole(user.role)) {
      const guest = await getGuestByEmail(email);
      if (guest) {
        user.document = guest.document;
        user.name = guest.name || user.name;
      } else {
        // Cliente nuevo por Google: debe completar documento antes de reservar
        await setSessionCookie(user);
        return NextResponse.redirect(
          `${origin}/acceso?next=${encodeURIComponent(next)}&completar=documento`,
        );
      }
    }

    await setSessionCookie(user);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.redirect(`${origin}/acceso?error=sesion_no_configurada`);
    }
    throw error;
  }

  return NextResponse.redirect(`${origin}${next}`);
}
