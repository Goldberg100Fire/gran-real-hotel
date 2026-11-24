import { NextResponse } from "next/server";
import { isEmailAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth";
import { isFirestoreConfigured } from "@/lib/firebase";
import { isPagoEfectivoConfigured } from "@/lib/pagoefectivo";
import { isBootstrapAdminPasswordConfigured } from "@/lib/passwords";
import { getStorageMode } from "@/lib/store";

export async function GET() {
  return NextResponse.json({
    googleEnabled: isGoogleAuthConfigured(),
    emailAuthEnabled: isEmailAuthConfigured(),
    firestoreConfigured: isFirestoreConfigured(),
    adminBootstrapEnabled: isBootstrapAdminPasswordConfigured(),
    storage: getStorageMode(),
    pagoefectivoConfigured: isPagoEfectivoConfigured(),
    /** Siempre se puede generar CIP (demo si aún no hay cuenta del dueño). */
    pagoefectivoAvailable: true,
  });
}
