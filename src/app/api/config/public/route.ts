import { NextResponse } from "next/server";
import { isEmailAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth";
import { isFirestoreConfigured } from "@/lib/firebase";
import { isPagoEfectivoConfigured } from "@/lib/pagoefectivo";

export async function GET() {
  return NextResponse.json({
    googleEnabled: isGoogleAuthConfigured(),
    emailAuthEnabled: isEmailAuthConfigured(),
    firestoreConfigured: isFirestoreConfigured(),
    pagoefectivoConfigured: isPagoEfectivoConfigured(),
    /** Siempre se puede generar CIP (demo si aún no hay cuenta del dueño). */
    pagoefectivoAvailable: true,
  });
}
