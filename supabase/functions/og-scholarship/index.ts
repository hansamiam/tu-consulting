// og-scholarship
//
// Dynamic Open Graph / Twitter Card image for /scholarships/:id pages.
// Returns a 1200×630 SVG with the scholarship name, provider, country,
// funding amount, deadline urgency, and TopUni branding — so every share
// to Twitter / LinkedIn / WhatsApp / iMessage / Slack / Discord renders
// a real preview instead of a bare URL.
//
// Why SVG: zero render dependencies, fast cold start, accepted by every
// social crawler. The only gotcha is that some platforms (notably older
// Twitter clients) prefer PNG, but they all accept SVG with the right
// content-type. Tested rendering at 100% / 50% / 25% scale.
//
// Cache: public, 1 hour browser, 24h CDN. Scholarship rows are mostly
// stable; if a deadline changes, a redeploy bumps the version anyway.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cleanScholarshipName, cleanProvider } from "../_shared/scholarshipFields.ts";
import { handleCorsOptions } from "../_shared/cors.ts";

// Crawler-only GET endpoint; Allow-Headers: "*" so we don't have to
// guess what unfurl bots send. Kept inline rather than using shared
// CORS_HEADERS_BASIC because of the "*" headers value.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface ScholarshipRow {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  is_featured: boolean | null;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Greedy line-wrap to fit a character budget. SVG has no native wrap. */
function wrapText(text: string, charsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + " " + w).length <= charsPerLine) cur = cur + " " + w;
    else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  // Ellipsize the last line if there's leftover text
  const totalUsed = lines.join(" ").length;
  if (totalUsed < text.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = (last.slice(0, charsPerLine - 1) + "…").trim();
  }
  return lines;
}

/** Format a USD amount as "$35K" / "$1.2M". */
function fmtValue(v: number | null | undefined): string | null {
  if (!v) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
}

/** Compute a deadline label that fits the share preview. */
function deadlineLabel(d: string | null): { text: string; urgent: boolean } {
  if (!d) return { text: "Rolling deadline", urgent: false };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0)  return { text: "Closed", urgent: false };
  if (days <= 7)  return { text: `Closes in ${days}d`, urgent: true };
  if (days <= 30) return { text: `${days} days left`, urgent: true };
  if (days <= 365) {
    const m = Math.round(days / 30);
    return { text: `${m} month${m === 1 ? "" : "s"} left`, urgent: false };
  }
  return { text: `${Math.round(days / 30)}+ months`, urgent: false };
}

/** Stable hash → hue, mirrors the in-app avatar gradient logic. */
function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Provider initials, mirrors ScholarshipCard's avatar logic. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((w) => /^[A-Za-zА-Яа-я]/.test(w));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Field cleanup helpers imported from ../_shared/scholarshipFields.ts

function buildSvg(row: ScholarshipRow): string {
  const W = 1200, H = 630;
  const NAVY = "#0a2540";
  const NAVY_DEEP = "#06182f";
  const GOLD = "#c8a44d";
  const GOLD_LIGHT = "#e3c476";
  const CREAM = "#fbf7ed";

  const cleanName = cleanScholarshipName(row.scholarship_name);
  const cleanProv = cleanProvider(row.provider_name);
  const provider = cleanProv ?? cleanName;
  const hue = hueFromName(provider);
  const inits = initials(provider);
  const headlineLines = wrapText(cleanName, 30, 2);

  const fundingHeadline =
    fmtValue(row.estimated_total_value_usd)
    ?? (row.award_amount_text && row.award_amount_text.length <= 28 ? row.award_amount_text : null)
    ?? coverageHeadline(row.coverage_type);

  const dl = deadlineLabel(row.application_deadline);
  const featured = !!row.is_featured;

  const padX = 80;
  const headlineY = 220;
  const lineHeight = 84;
  const fundingY = headlineY + headlineLines.length * lineHeight + 70;
  const metaY = fundingY + 64;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(cleanName)} — TopUni share preview">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY}" />
      <stop offset="100%" stop-color="${NAVY_DEEP}" />
    </linearGradient>
    <radialGradient id="halo" cx="0.85" cy="0.18" r="0.65">
      <stop offset="0%" stop-color="${GOLD_LIGHT}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${GOLD_LIGHT}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="avatar" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="hsl(${hue}, 65%, 55%)" />
      <stop offset="100%" stop-color="hsl(${(hue + 35) % 360}, 60%, 42%)" />
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <rect width="${W}" height="${H}" fill="url(#halo)" />

  <!-- Top brand strip + (optional) FEATURED tag -->
  <g transform="translate(${padX}, 70)">
    <rect width="44" height="2" fill="${GOLD}" />
    <text x="60" y="6" fill="${GOLD_LIGHT}" font-family="-apple-system, system-ui, sans-serif"
          font-size="18" font-weight="700" letter-spacing="0.32em" text-transform="uppercase">TOPUNI · SCHOLARSHIP</text>
  </g>
  ${featured ? `
  <g transform="translate(${W - padX - 220}, 56)">
    <rect width="220" height="40" rx="20" ry="20" fill="${GOLD}" />
    <text x="110" y="26" fill="${NAVY}" font-family="-apple-system, system-ui, sans-serif"
          font-size="15" font-weight="800" letter-spacing="0.22em" text-anchor="middle">★ FEATURED</text>
  </g>` : ""}

  <!-- Provider avatar + provider name -->
  <g transform="translate(${padX}, 130)">
    <rect width="64" height="64" rx="16" ry="16" fill="url(#avatar)" />
    <text x="32" y="44" fill="#ffffff" font-family="-apple-system, system-ui, sans-serif"
          font-size="26" font-weight="800" letter-spacing="-0.02em" text-anchor="middle">${escapeXml(inits)}</text>
  </g>
  ${cleanProv ? `
  <text x="${padX + 86}" y="155" fill="${CREAM}" font-family="-apple-system, system-ui, sans-serif"
        font-size="22" font-weight="600" letter-spacing="-0.005em">${escapeXml(cleanProv.slice(0, 60))}</text>` : ""}
  ${row.host_country ? `
  <text x="${padX + 86}" y="186" fill="${GOLD_LIGHT}" font-family="-apple-system, system-ui, sans-serif"
        font-size="18" font-weight="500" letter-spacing="0.04em">${escapeXml(row.host_country)}</text>` : ""}

  <!-- Scholarship name (headline) -->
  ${headlineLines.map((line, i) => `
    <text x="${padX}" y="${headlineY + i * lineHeight}"
          fill="#ffffff" font-family="Charter, Palatino, Georgia, serif"
          font-size="74" font-weight="700" letter-spacing="-0.022em">${escapeXml(line)}</text>
  `).join("")}

  <!-- Funding amount (giant, gold) + coverage subtitle -->
  <text x="${padX}" y="${fundingY}" fill="${GOLD_LIGHT}"
        font-family="Charter, Palatino, Georgia, serif" font-size="56" font-weight="700" letter-spacing="-0.015em">
    ${escapeXml(fundingHeadline)}
  </text>
  <text x="${padX}" y="${fundingY + 28}" fill="rgba(255,255,255,0.55)"
        font-family="-apple-system, system-ui, sans-serif" font-size="18" font-weight="500" letter-spacing="0.06em" text-transform="uppercase">
    ${escapeXml(coverageBadge(row.coverage_type))}
  </text>

  <!-- Deadline tag, right side -->
  <g transform="translate(${W - padX - 280}, ${fundingY - 38})">
    <rect width="280" height="50" rx="25" ry="25"
          fill="${dl.urgent ? "#dc2626" : "rgba(255,255,255,0.08)"}"
          stroke="${dl.urgent ? "#fca5a5" : GOLD}" stroke-opacity="${dl.urgent ? 1 : 0.4}" stroke-width="1.5" />
    <text x="140" y="32" text-anchor="middle"
          fill="${dl.urgent ? "#fff" : CREAM}" font-family="-apple-system, system-ui, sans-serif"
          font-size="20" font-weight="700" letter-spacing="0.05em">${escapeXml(dl.text)}</text>
  </g>

  <!-- Footer -->
  <g transform="translate(${padX}, ${H - 70})">
    <text fill="rgba(255,255,255,0.55)" font-family="-apple-system, system-ui, sans-serif" font-size="22" font-weight="600">topuni.org/scholarships/${row.scholarship_id.slice(0, 8)}</text>
    <text x="${W - 2 * padX}" text-anchor="end" fill="rgba(255,255,255,0.55)" font-family="-apple-system, system-ui, sans-serif" font-size="18" font-weight="500">
      Built by Yale · Cambridge · Harvard alumni
    </text>
  </g>

  <!-- Decorative gold ribbon -->
  <rect x="0" y="${H - 12}" width="${W}" height="12" fill="${GOLD}" opacity="0.85" />
</svg>`;
}

function coverageHeadline(t: string): string {
  if (t === "full_ride") return "Full ride";
  if (t === "tuition_only") return "Tuition covered";
  if (t === "stipend") return "Stipend";
  if (t === "partial") return "Partial funding";
  return "Funded";
}
function coverageBadge(t: string): string {
  if (t === "full_ride") return "Tuition + living + travel";
  if (t === "tuition_only") return "Tuition only";
  if (t === "stipend") return "Monthly stipend";
  if (t === "partial") return "Partial coverage";
  return "Funding amount varies";
}

function placeholderSvg(): string {
  return buildSvg({
    scholarship_id: "00000000",
    scholarship_name: "International scholarships, matched to your profile",
    provider_name: "TopUni — verified scholarship database",
    host_country: "Global",
    coverage_type: "full_ride",
    award_amount_text: null,
    estimated_total_value_usd: null,
    application_deadline: null,
    is_featured: false,
  });
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("GET only", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim() || "";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !ANON_KEY || !id || id.length < 8 || id.length > 40) {
    return new Response(placeholderSvg(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const supa = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Anon SELECT — RLS on scholarships allows public read (it's a directory).
  const { data, error } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, is_featured")
    .eq("scholarship_id", id)
    .maybeSingle<ScholarshipRow>();

  if (error || !data) {
    return new Response(placeholderSvg(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return new Response(buildSvg(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      // 1h browser, 24h CDN, stale-while-revalidate for a week. Scholarship
      // rows are mostly stable; deadline-day shifts can wait a hour.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-TopUni-OG-Scholarship": id,
    },
  });
});
