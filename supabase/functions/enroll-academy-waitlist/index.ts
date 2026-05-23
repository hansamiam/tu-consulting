// enroll-academy-waitlist
//
// Discover v1 F12. Public POST endpoint for the Academy waitlist signup
// surfaces (brief-end form, detail-sheet CTA, expired-scholarship banner,
// save-action auth prompt). Inserts to academy_waitlist + fires a single
// confirmation email via the existing send-transactional-email pipeline.
//
// Request body:
//   {
//     email: string,                          // required, lowercased + validated
//     source: 'brief_end' | 'discover_save'   // required, where they signed up
//            | 'detail_sheet' | 'hero_cta'
//            | 'expired_banner' | 'manual',
//     full_name?: string,                     // optional, used in email greeting
//     profile_snapshot?: Record<string,any>,  // optional, JSON blob of slim profile
//     referring_scholarship_id?: string,      // optional, UUID
//     match_run_id?: string,                  // optional, UUID
//     language?: 'en' | 'ru'
//   }
//
// Response:
//   { ok: true, waitlist_id, already_subscribed: boolean }
//
// Auth: anon. Rate-limited per IP. Suppression-list check happens inside
// send-transactional-email so we don't email someone who unsubscribed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const json = (status: number, body: unknown) => respondJson(status, body, corsHeaders);

const VALID_SOURCES = new Set([
  "brief_end",
  "discover_save",
  "detail_sheet",
  "hero_cta",
  "expired_banner",
  "manual",
]);

interface EnrollBody {
  email?: string;
  source?: string;
  full_name?: string;
  profile_snapshot?: Record<string, unknown>;
  referring_scholarship_id?: string;
  match_run_id?: string;
  language?: "en" | "ru";
}

// Minimal email validation. Defense in depth — Resend would reject obvious
// junk anyway, but this saves the round-trip + the row insert + log line.
function isPlausibleEmail(email: string): boolean {
  if (!email || email.length < 5 || email.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return true;
}

async function sha256Hex(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: EnrollBody;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON body" }); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body.source === "string" ? body.source.trim() : "";
  if (!isPlausibleEmail(email)) return json(400, { error: "Invalid email" });
  if (!VALID_SOURCES.has(source)) return json(400, { error: `source must be one of: ${[...VALID_SOURCES].join(", ")}` });

  const supa = createServiceClient();

  // Rate limit by IP. Waitlist is a public endpoint, so without throttling
  // a single bot could spray junk emails into the table + burn Resend sends.
  // 3/min is generous for a real user but caps drive-by abuse.
  const ip = clientIp(req);
  const rateLimitOk = await checkRateLimit(supa, { key: `waitlist-enroll:${ip}`, perMinute: 3 });
  if (!rateLimitOk) return json(429, { error: "Rate limit exceeded. Please slow down." });

  // Hash IP + UA for abuse forensics without storing PII. Hashes (not raw)
  // because the table will be queryable by admin for waitlist analytics.
  const userAgent = req.headers.get("User-Agent") ?? "";
  const ipHash = ip ? await sha256Hex(ip) : null;
  const userAgentHash = userAgent ? await sha256Hex(userAgent) : null;

  // Resolve user_id if the caller is authenticated. Public endpoint —
  // most callers will be anon — but we capture user_id when present so
  // post-launch follow-ups know which student profile to load.
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader) {
    try {
      const { data: u } = await supa.auth.getUser(authHeader.replace(/^Bearer\s+/i, "").trim());
      userId = u?.user?.id ?? null;
    } catch { /* anon — fall through */ }
  }

  // Check for an existing pending waitlist row at (email, source). If
  // already signed up from this surface, bail without re-sending — avoids
  // double-emails when the form is double-clicked or the user re-submits.
  const { data: existing } = await supa
    .from("academy_waitlist")
    .select("waitlist_id, confirmation_sent_at")
    .eq("email", email)
    .eq("source", source)
    .maybeSingle();

  if (existing) {
    return json(200, {
      ok: true,
      waitlist_id: (existing as { waitlist_id: string }).waitlist_id,
      already_subscribed: true,
    });
  }

  // Insert the new row. Plan F12 captures source + optional profile
  // snapshot + referring scholarship for funnel analytics.
  const insertPayload = {
    email,
    full_name: typeof body.full_name === "string" ? body.full_name.trim().slice(0, 200) : null,
    source,
    profile_snapshot: body.profile_snapshot ?? null,
    referring_scholarship_id: body.referring_scholarship_id ?? null,
    match_run_id: body.match_run_id ?? null,
    user_id: userId,
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
  };
  const { data: inserted, error: insertErr } = await supa
    .from("academy_waitlist")
    .insert(insertPayload as never)
    .select("waitlist_id")
    .maybeSingle();
  if (insertErr || !inserted) {
    console.error("[enroll-academy-waitlist] insert failed", insertErr?.message);
    return json(500, { error: `Insert failed: ${insertErr?.message ?? "unknown"}` });
  }
  const waitlistId = (inserted as { waitlist_id: string }).waitlist_id;

  // Fire the confirmation email via the shared dispatcher. Failure here
  // is NOT fatal — the row is already saved, and the suppression / log
  // pipeline lives inside send-transactional-email. We just stamp
  // confirmation_sent_at on success so the admin dashboard knows which
  // signups got the welcome email.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SR_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY") ?? "";
  if (SUPABASE_URL && SR_KEY) {
    try {
      const lang = body.language === "ru" ? "ru" : "en";
      const firstName = (body.full_name ?? "").trim().split(/\s+/)[0] || undefined;
      const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SR_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName: "academy-waitlist-confirmation",
          recipientEmail: email,
          templateData: { firstName, source, language: lang },
          idempotencyKey: `academy-waitlist-${waitlistId}`,
        }),
      });
      if (sendResp.ok) {
        await supa.from("academy_waitlist")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("waitlist_id", waitlistId);
      } else {
        const text = await sendResp.text();
        console.warn("[enroll-academy-waitlist] send-transactional-email non-OK", sendResp.status, text.slice(0, 200));
      }
    } catch (e) {
      console.warn("[enroll-academy-waitlist] confirmation email dispatch failed", (e as Error).message);
    }
  }

  return json(200, {
    ok: true,
    waitlist_id: waitlistId,
    already_subscribed: false,
  });
});
