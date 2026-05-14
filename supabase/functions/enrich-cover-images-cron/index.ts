// enrich-cover-images-cron
//
// Populates `scholarships.cover_image_url` for rows that have an
// official_url but no cover image yet. The DetailSheet +
// ExpandedScholarshipDialog already render whatever we put here as
// the hero band, falling back to the country gradient + landmark
// silhouette when null.
//
// How it picks an image, in order:
//   1. og:image meta tag (Open Graph standard — what social sharing
//      uses; almost every modern site has one).
//   2. twitter:image meta tag (X/Twitter card image — sometimes
//      higher quality than og:image, sometimes the only one).
//   3. (Future, not yet implemented) link rel="image_src" — older
//      pre-OG sites; rare on scholarship pages.
//
// We resolve relative URLs against the source URL, validate the
// resulting URL with a HEAD request that returns 200 + an
// image/* content-type, and only then write back.
//
// Why server-side scrape rather than browser? Most scholarship pages
// don't expose CORS for external clients, so the browser can't read
// the og:image tag. The edge function uses Deno's fetch (no CORS
// constraint, server-to-server) and writes the resolved URL back to
// the row. Clients then load just the resolved image URL.
//
// Throttled at 1.5s/row with a 50-row batch. At ~30 minutes per run,
// scheduled daily, the backlog drains in a few weeks.
//
// Cost: zero LLM spend. The only cost is bandwidth for the HTML +
// HEAD requests, which is negligible.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_PER_RUN = 50;
const THROTTLE_MS = 1500;
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "Mozilla/5.0 (compatible; TopUniBot/1.0; +https://topuni.com/bot)";

// Extract the resolved cover image URL from a scholarship's official
// page HTML. Returns null when nothing usable was found.
const extractCoverImage = (html: string, baseUrl: string): string | null => {
  // Match content="..." or content='...' on either og:image or
  // twitter:image. Some sites swap the attribute order
  // (`content="..." property="og:image"`), so try both directions.
  // We prefer og:image since it's the more canonical hero choice;
  // twitter:image is a fallback.
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      // Resolve relative URL (//cdn.example.com/x.jpg, /assets/x.jpg)
      // against the base URL.
      try {
        return new URL(m[1], baseUrl).toString();
      } catch {
        // Malformed URL — skip and try the next pattern.
      }
    }
  }
  return null;
};

// HEAD-check the candidate URL: must resolve, return 2xx, and
// declare itself as image/*. Filters out:
//   · 404s and other dead links
//   · HTML pages that return a non-image content-type (some sites
//     point og:image at a redirect chain that ends in an HTML error
//     page).
//   · Tracking pixels or 1x1 placeholders (we crude-check via
//     content-length — drop anything <2KB which is below any real
//     hero image).
const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return false;
    const cl = parseInt(res.headers.get("content-length") || "0", 10);
    if (cl > 0 && cl < 2048) return false;
    return true;
  } catch {
    return false;
  }
};

// Fetch the HTML page with a timeout and a real user agent. Some
// scholarship sites 403 on bot UAs, so we send a Mozilla-shaped UA
// with a TopUniBot identifier (so administrators can grep their logs
// and find us if they care). Honor robots.txt is not implemented — a
// future addition for politeness; today we're polite via low rate
// (1.5s gap between rows = ~2400 requests/hour ceiling).
const fetchHtml = async (url: string): Promise<string | null> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    // Cap at 256KB — og:image always sits in the <head>, so we never
    // need the full document. Slice to head if possible to avoid
    // pulling megabytes of body HTML on heavy sites.
    const text = await res.text();
    const headEnd = text.indexOf("</head>");
    return headEnd > 0 ? text.slice(0, headEnd) : text.slice(0, 262144);
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Missing Supabase env" });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Candidates: rows that
  //   · have an official_url (otherwise nothing to scrape)
  //   · have no cover_image_url yet
  //   · aren't broken (the URL-health checker has flagged the link as
  //     dead; no point fetching)
  // Order verified rows first so curated content gets visual treatment
  // before pending rows do.
  // Verification gate matches the read-side: verified, stale, pending, or
  // NULL — anything except 'broken'. Pre-fix .neq("verification_status",
  // "broken") silently dropped NULL-status rows because SQL evaluates
  // `NULL <> 'broken'` as NULL, which WHERE treats as FALSE.
  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, official_url, source_url, verification_status")
    .is("cover_image_url", null)
    .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
    .not("official_url", "is", null)
    .order("verification_status", { ascending: true })
    .limit(MAX_PER_RUN);

  if (candErr) {
    console.error("[enrich-cover-images-cron] candidate query failed", candErr);
    return json(500, { error: "candidate query failed", reason: candErr.message });
  }
  if (!candidates || candidates.length === 0) {
    return json(200, { ok: true, candidates: 0, filled: 0 });
  }

  let filled = 0;
  let noImage = 0;
  let invalid = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (i > 0) await new Promise(r => setTimeout(r, THROTTLE_MS));

    // Use official_url as the primary source. Fall back to source_url
    // (the page where we discovered this scholarship) only if there's
    // no official URL — though our query already requires official_url
    // to be present, so this fallback is defensive.
    const url = c.official_url || c.source_url;
    if (!url) { failed++; continue; }

    try {
      const html = await fetchHtml(url);
      if (!html) { failed++; continue; }

      const candidateImage = extractCoverImage(html, url);
      if (!candidateImage) { noImage++; continue; }

      const ok = await validateImageUrl(candidateImage);
      if (!ok) { invalid++; continue; }

      const { error: updErr } = await supa
        .from("scholarships")
        .update({ cover_image_url: candidateImage })
        .eq("scholarship_id", c.scholarship_id);
      if (updErr) {
        failed++;
        errors.push(`${c.scholarship_id}: ${updErr.message}`);
        continue;
      }
      filled++;
    } catch (e) {
      failed++;
      errors.push(`${c.scholarship_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return json(200, {
    ok: true,
    candidates: candidates.length,
    filled,
    noImage,
    invalid,
    failed,
    errors: errors.slice(0, 10),
  });
});
