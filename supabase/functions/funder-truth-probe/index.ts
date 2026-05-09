// funder-truth-probe
//
// Daily cron that fetches each registered funder's canonical URL and
// scans for ground-truth signals — discontinuation, between-cycles,
// next-cycle-opens dates. Updates public.provider_authoritative_facts
// with the current state, which the detect_scholarship_anomalies()
// cross-reference rule then enforces against catalog rows.
//
// This is the moat against the class of error that bit us with
// Mastercard/Vanier/Chevening: catalog rows said one thing, the
// funder's own site said another, and we had no programmatic way
// to detect the gap. Now: every funder in the registry gets re-checked
// against its own canonical site, and any catalog row that disagrees
// gets flagged on the next anomaly cron tick.
//
// Patterns we look for in the page text:
//   * "no longer accepting", "program discontinued", "final cycle",
//     "applications closed", "no longer offered", "successor program",
//     "applications are now closed for [year]"
//     → lifecycle_state = 'discontinued' (or 'between_cycles' if a
//       reopens-date is also present)
//   * "applications are now open" / "applications open [date]" /
//     "next deadline [date]" → lifecycle_state = 'active' (refresh
//       check timestamp only)
//
// The probe is fail-soft per funder — one site being down doesn't
// abort the cron run. Each result is logged so admin can review.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlScrape } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface FacticityRow {
  provider_slug: string;
  canonical_url: string;
  lifecycle_state: "active" | "discontinued" | "between_cycles" | "unknown";
}

interface ProbeResult {
  provider_slug: string;
  canonical_url: string;
  prior_state: string;
  detected_state: "active" | "discontinued" | "between_cycles" | "unknown";
  signals: string[];
  http_status?: number;
  error?: string;
}

// Phrases that strongly imply the program is no longer offered.
const DISCONTINUED_PATTERNS: RegExp[] = [
  /\bno longer (accept|offer|fund|run)/i,
  /\b(?:program(?:me)?|fellowship|scholarship)\s+(?:is|has been)\s+(?:discontinued|retired|ended)\b/i,
  /\bfinal (?:cycle|round|cohort|intake)\b/i,
  /\bsuccessor program\b/i,
  /\b(?:program|scholarship) closed\b/i,
  /\bdiscontinued in (\d{4})\b/i,
  /\b(?:program|scholarship) (?:has )?ended\b/i,
];

// Phrases that imply the application window is currently closed but
// the program is still active (between cycles).
const BETWEEN_CYCLES_PATTERNS: RegExp[] = [
  /\bapplications? (?:are )?(?:now )?closed\b/i,
  /\bapplication(?:s)? (?:will|next) open\b/i,
  /\bnext (?:application|cycle|round) (?:opens?|begins?|starts?)\b/i,
  /\bcheck back\b.*\b(?:next year|in \w+)/i,
  /\b(?:202[6-9]|203\d) (?:application|round|cycle) (?:will|to) open\b/i,
];

// Active-application signals.
const ACTIVE_PATTERNS: RegExp[] = [
  /\bapplications? (?:are )?(?:now )?open\b/i,
  /\bapply (?:now|here|today)\b/i,
  /\bapplication deadline:?\s*\d/i,
  /\bdeadline:?\s+\w+\s+\d{1,2},?\s+202\d\b/i,
];

function classifyText(text: string): { state: ProbeResult["detected_state"]; signals: string[] } {
  const signals: string[] = [];
  let hasDiscontinued = false;
  let hasBetween = false;
  let hasActive = false;

  for (const re of DISCONTINUED_PATTERNS) {
    const m = text.match(re);
    if (m) { hasDiscontinued = true; signals.push("discontinued: " + m[0].slice(0, 80)); }
  }
  for (const re of BETWEEN_CYCLES_PATTERNS) {
    const m = text.match(re);
    if (m) { hasBetween = true; signals.push("between_cycles: " + m[0].slice(0, 80)); }
  }
  for (const re of ACTIVE_PATTERNS) {
    const m = text.match(re);
    if (m) { hasActive = true; signals.push("active: " + m[0].slice(0, 80)); }
  }

  // Discontinued wins absolutely — even if "next cycle" copy is also
  // present (could be a successor program announcement).
  if (hasDiscontinued) return { state: "discontinued", signals };
  // Between-cycles wins over active when both fire — "applications are
  // now closed" is a stronger signal than a leftover "deadline" anchor
  // somewhere on the page.
  if (hasBetween) return { state: "between_cycles", signals };
  if (hasActive)  return { state: "active", signals };
  return { state: "unknown", signals };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { error: "Supabase env not configured" });
  }
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Optional body: { only?: string[] } restricts to specific provider slugs.
  let only: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.only)) only = body.only as string[];
  } catch {
    // No body / non-JSON body → probe all
  }

  // Limit per cron tick — Firecrawl free tier is 500 credits/mo. With
  // ~25 funders × ~4 daily probes/yr we'd exceed it. Cap at 8 funders
  // per run; rotate through the registry by least-recently-checked.
  let q = supa
    .from("provider_authoritative_facts")
    .select("provider_slug, canonical_url, lifecycle_state")
    .order("last_authoritative_check_at", { ascending: true, nullsFirst: true })
    .limit(8);
  if (only && only.length > 0) {
    q = q.in("provider_slug", only).limit(only.length);
  }
  const { data: facts, error } = await q;
  if (error) return json(500, { error: error.message });
  if (!facts || facts.length === 0) return json(200, { ok: true, probed: 0, results: [] });

  const results: ProbeResult[] = [];

  for (const f of facts as FacticityRow[]) {
    const result: ProbeResult = {
      provider_slug:  f.provider_slug,
      canonical_url:  f.canonical_url,
      prior_state:    f.lifecycle_state,
      detected_state: "unknown",
      signals:        [],
    };

    try {
      const scrape = await firecrawlScrape({
        url: f.canonical_url,
        onlyMainContent: true,
        timeout: 30_000,
      });
      result.http_status = scrape.metadata?.statusCode;

      if (!scrape.markdown || scrape.markdown.length < 200) {
        result.error = "thin or empty page content";
        results.push(result);
        continue;
      }

      const cls = classifyText(scrape.markdown);
      result.detected_state = cls.state;
      result.signals = cls.signals.slice(0, 8);

      // Apply the detected state. Conservative: never auto-flip
      // 'discontinued' → 'active' from this probe (a discontinued
      // program might leave its old page up with new deadline copy
      // for a successor — false positive). Only flip TO 'discontinued'
      // here; admin reviews to flip OUT of it.
      const newState =
        cls.state === "discontinued" ? "discontinued" :
        f.lifecycle_state === "discontinued" ? "discontinued" :  // sticky
        cls.state === "between_cycles" ? "between_cycles" :
        cls.state === "active"          ? "active" :
        f.lifecycle_state;

      await supa
        .from("provider_authoritative_facts")
        .update({
          lifecycle_state: newState,
          last_authoritative_check_at: new Date().toISOString(),
        })
        .eq("provider_slug", f.provider_slug);
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e);
    }

    results.push(result);
  }

  return json(200, {
    ok: true,
    probed: results.length,
    results,
  });
});
