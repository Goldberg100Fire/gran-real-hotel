import { NextResponse } from "next/server";
import {
  getAppOrigin,
  isGoogleAuthConfigured,
  safeNextPath,
} from "@/lib/auth";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/acceso?error=google_no_configurado", getAppOrigin(request)),
    );
  }

  const { searchParams } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));
  const origin = getAppOrigin(request);
  const redirectUri = `${origin}/api/auth/google/callback`;

  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
