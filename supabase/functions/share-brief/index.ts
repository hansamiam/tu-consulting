// share-brief
//
// Public POST endpoint that mints a shareable URL for an AI strategy
// brief. Anyone can call (anon or authed). For authed users the brief
// is permanent and tied to their account; anon users get a 30-day
// expiry, after which the brief soft-deletes.
//
// Body:
//   {
//     content: string,                 // markdown of the brief
//     language?: "en" | "ru",
//     reportGrade?: "basic" | "premium",
//     profileSnapshot?: {
//       firstName?, gradeLevel?, major?, targetCountries?
//     }
//   }
//
// Response:
//   { slug: string, url: string, expiresAt: string | null, isOwner: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SLUG_LENGTH = 8;
const ANON_EXPIRY_DAYS = 30;
const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

function makeSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < SLUG_LENGTH; i++) s += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return s;
}

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

interface ShareBody {
  content?: string;
  language?: string;
  reportGrade?: string;
  profileSnapshot?: {
    firstName?: string;
    gradeLevel?: string;
    major?: string;
    targetCountries?: string[];
  };
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    // Rate limit per IP. Each call writes a 200–100,000-char row to
    // shared_briefs (and the URL is publicly addressable). Without a
    // cap an attacker could spray thousands of polluted briefs into
    // the table — DB bloat plus garbage-content URLs that index if
    // someone ever links them. 4/min is generous for legitimate use
    // (a user typically shares once per session).
    {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
      if (!SUPABASE_URL || !ANON_KEY) return json(500, { error: "Supabase env not configured" });
      const supaRL = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const ip = clientIp(req);
      const ok = await checkRateLimit(supaRL, { key: `share-brief:${ip}`, perMinute: 4 });
      if (!ok) return json(429, { error: "Rate limit exceeded — try again in a minute." });
    }

    const body = (await req.json().catch(() => ({}))) as ShareBody;
    const content = (body.content ?? "").trim();
    if (content.length < 200) return json(400, { error: "Brief content too short to share" });
    if (content.length > 100_000) return json(400, { error: "Brief too long" });

    // v6 magazine briefs are stored as JSON (`{schema:2, sections}`).
    // Detect by leading "{" + presence of "sections" key. Legacy
    // markdown briefs continue to set schema_version = 1.
    let schemaVersion = 1;
    if (content.startsWith("{")) {
      try {
        const parsed = JSON.parse(content) as { schema?: number; sections?: unknown };
        if (parsed?.schema === 2 && parsed.sections) schemaVersion = 2;
      } catch { /* not JSON — treat as legacy markdown */ }
    }

    // Resolve caller user_id from JWT if present (anon callers leave authHeader as anon JWT or unset)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const userClient = createUserClient(authHeader);
        const { data: u } = await userClient.auth.getUser();
        userId = u.user?.id ?? null;
      } catch { /* anon — fine */ }
    }

    // Service-role client for the insert (bypasses RLS for the WITH CHECK
    // on created_by_user_id; we still write the actual user_id).
    const admin = createServiceClient();

    const language = body.language === "ru" ? "ru" : "en";
    const reportGrade = body.reportGrade === "premium" ? "premium" : "basic";
    const profile = body.profileSnapshot ?? {};
    const expiresAt = userId
      ? null
      : new Date(Date.now() + ANON_EXPIRY_DAYS * 86400_000).toISOString();

    // Generate a slug with bounded retries on collision (extremely rare with
    // 8 chars × 56 alphabet = 96 bits of entropy, but cheap to handle).
    let slug = "";
    let inserted: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      slug = makeSlug();
      const { data, error } = await admin
        .from("shared_briefs")
        .insert({
          slug,
          content,
          language,
          report_grade: reportGrade,
          brief_schema_version: schemaVersion,
          profile_first_name: profile.firstName?.slice(0, 64) || null,
          profile_grade_level: profile.gradeLevel?.slice(0, 64) || null,
          profile_major: profile.major?.slice(0, 200) || null,
          profile_target_countries: profile.targetCountries?.slice(0, 10) || null,
          created_by_user_id: userId,
          expires_at: expiresAt,
          is_public: true,
        } as never)
        .select("brief_id, slug")
        .single();
      if (!error) { inserted = data; break; }
      if (!String(error.message).toLowerCase().includes("duplicate")) {
        return json(500, { error: error.message });
      }
    }
    if (!inserted) return json(500, { error: "Could not generate unique slug" });

    return json(200, {
      slug: inserted.slug,
      url: `${SITE}/brief/${inserted.slug}`,
      expiresAt,
      isOwner: !!userId,
    });
  } catch (e) {
    console.error("share-brief error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
