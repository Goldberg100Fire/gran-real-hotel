import { NextResponse } from "next/server";
import { isEmailAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth";
import { isFirestoreConfigured } from "@/lib/firebase";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  return NextResponse.json({
    googleEnabled: isGoogleAuthConfigured(),
    emailAuthEnabled: isEmailAuthConfigured(),
    firestoreConfigured: isFirestoreConfigured(),
    stripeConfigured: isStripeConfigured(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
  });
}
