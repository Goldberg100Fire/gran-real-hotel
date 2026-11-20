import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY,
  );
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Falta STRIPE_SECRET_KEY para procesar pagos.");
  }
  return new Stripe(key, {
    apiVersion: "2026-11-18.endive",
  });
}

export function getStripePublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("Falta STRIPE_PUBLISHABLE_KEY.");
  }
  return key;
}
