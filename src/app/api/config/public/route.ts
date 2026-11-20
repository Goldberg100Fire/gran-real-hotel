import { NextResponse } from "next/server";
import { isEmailAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth";
import { isFirestoreConfigured } from "@/lib/firebase";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

export async function GET() {
  return NextResponse.json({
    googleEnabled: isGoogleAuthConfigured(),
    emailAuthEnabled: isEmailAuthConfigured(),
    firestoreConfigured: isFirestoreConfigured(),
    mercadopagoConfigured: isMercadoPagoConfigured(),
    publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || null,
  });
}
