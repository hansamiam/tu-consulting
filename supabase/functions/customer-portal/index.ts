// customer-portal — returns a Stripe Billing Portal URL for the authed user.
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createUserClient } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respondError(401, "Not authenticated", corsHeaders);
    }
    const userClient = createUserClient(authHeader);
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user?.email) {
      return respondError(401, "Not authenticated", corsHeaders);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return respondError(404, "No billing account found", corsHeaders);
    }

    // Origin allowlist — same fix as create-checkout. Stripe billing
    // portal return_url ends up in the user's browser, so a spoofed
    // Origin would let an attacker pin the portal "Done" button to
    // their own URL.
    const PUBLIC_SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";
    const ALLOWED_ORIGINS = new Set([
      PUBLIC_SITE,
      "https://topuni.org",
      "https://www.topuni.org",
      "https://topuniconsulting.com",
      "https://www.topuniconsulting.com",
    ]);
    const requestedOrigin = req.headers.get("origin") ?? "";
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestedOrigin);
    const origin = (ALLOWED_ORIGINS.has(requestedOrigin) || isLocalhost)
      ? requestedOrigin
      : PUBLIC_SITE;
    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/account`,
    });

    return respondJson(200, { url: portal.url }, corsHeaders);
  } catch (e) {
    console.error("customer-portal error:", e);
    return respondError(500, e instanceof Error ? e.message : "Unknown", corsHeaders);
  }
});
