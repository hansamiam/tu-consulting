// Stripe.js singleton loader. Calling loadStripe twice with the same
// publishable key returns the same Promise, but we centralise it here
// so the embedded-checkout modal + any future Stripe-using surface
// share the same Stripe instance.
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { ENV } from "@/lib/env";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> | null {
  if (!ENV.STRIPE_PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(ENV.STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

export const hasStripePublishableKey = (): boolean => !!ENV.STRIPE_PUBLISHABLE_KEY;
