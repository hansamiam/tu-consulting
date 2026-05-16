// og-brief
//
// Dynamic Open Graph / Twitter Card image for /brief/:slug pages.
// Returns a 1200×630 SVG with the student's first name, target countries,
// major, and TopUni branding — everything social crawlers (Twitter,
// LinkedIn, WhatsApp, iMessage, Slack) need to render a real preview
// card instead of a bare URL.
//
// Why SVG: zero dependencies, fast cold start, looks crisp at any
// social platform's render scale. All major social platforms accept
// SVG OG images, and we serve a Content-Type that signals it.
//
// Cache: public, 1 hour. Brief content is mostly stable; if the user
// re-shares we accept slight staleness. Crawler revisits naturally
// invalidate via deploy version.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsOptions } from "../_shared/cors.ts";

// og-brief is hit by social-platform crawlers (Twitter, LinkedIn,
// WhatsApp, Slack, iMessage) on GET only — same headers as other
// functions but with Allow-Headers: "*" because we don't know which
// the crawler sends. Custom override of the shared CORS to keep
// "*" exactly as the original.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface BriefRow {
  slug: string;
  profile_first_name: string | null;
  profile_grade_level: string | null;
  profile_major: string | null;
  profile_target_countries: string[] | null;
  language: string | null;
  created_at: string;
  is_public: boolean;
  expires_at: string | null;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Truncate text to fit within an estimated character budget. SVG has
   no built-in text wrapping; we manually compute line breaks based on
   a per-character width estimate and the available pixel width. */
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
  // If there's leftover text, ellipsize the last line
  const totalUsed = lines.join(" ").length;
  if (totalUsed < text.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = (last.slice(0, charsPerLine - 1) + "…").trim();
  }
  return lines;
}

function buildSvg(brief: BriefRow): string {
  const W = 1200, H = 630;
  const firstName = (brief.profile_first_name || "A student").trim();
  const countries = (brief.profile_target_countries || []).slice(0, 4);
  const major = (brief.profile_major || "").trim();
  const isRu = brief.language === "ru";

  // Headline — compute and wrap
  const headline = `${firstName}'s admissions strategy`;
  const headlineLines = wrapText(headline, 28, 2);
  const subheadline = countries.length > 0
    ? `for ${countries.slice(0, 2).join(" & ")}${countries.length > 2 ? ` +${countries.length - 2}` : ""}`
    : (isRu ? "стратегический брифинг" : "strategic brief");

  // Chips: countries + major
  const chips: string[] = [];
  for (const c of countries.slice(0, 3)) chips.push(c);
  if (major) chips.push(major.length > 22 ? major.slice(0, 22) + "…" : major);

  // Brand strip + colors (must match site palette: navy + gold)
  const NAVY = "#0a2540";
  const GOLD = "#c8a44d";
  const GOLD_LIGHT = "#e3c476";
  const CREAM = "#fbf7ed";

  // Position calculations
  const padX = 80;
  const headlineY = 230;
  const lineHeight = 92;
  const chipY = headlineY + headlineLines.length * lineHeight + 40;

  // Render chips with padding
  const chipParts: string[] = [];
  let x = padX;
  for (const chip of chips) {
    const escaped = escapeXml(chip);
    const w = 14 * Math.min(chip.length, 26) + 36; // rough width estimate
    chipParts.push(`
      <g>
        <rect x="${x}" y="${chipY - 24}" width="${w}" height="38"
              fill="rgba(255,255,255,0.06)" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="1.5"
              rx="19" ry="19" />
        <text x="${x + 18}" y="${chipY + 1}" fill="${CREAM}" font-family="-apple-system, system-ui, sans-serif" font-size="20" font-weight="600" letter-spacing="0.05em">${escaped}</text>
      </g>
    `);
    x += w + 14;
    if (x > W - padX - 100) break; // wrapping not needed for our short chip list
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="TopUni admissions strategy preview">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY}" />
      <stop offset="100%" stop-color="#06182f" />
    </linearGradient>
    <radialGradient id="halo" cx="0.85" cy="0.18" r="0.55">
      <stop offset="0%" stop-color="${GOLD_LIGHT}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${GOLD_LIGHT}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <rect width="${W}" height="${H}" fill="url(#halo)" />

  <!-- Top brand bar -->
  <g transform="translate(${padX}, 70)">
    <rect width="44" height="2" fill="${GOLD}" />
    <text x="60" y="6" fill="${GOLD_LIGHT}" font-family="-apple-system, system-ui, sans-serif"
          font-size="18" font-weight="700" letter-spacing="0.32em" text-transform="uppercase">${isRu ? "TOPUNI · СТРАТЕГИЧЕСКИЙ БРИФИНГ" : "TOPUNI · STRATEGIC BRIEF"}</text>
  </g>

  <!-- Headline -->
  ${headlineLines.map((line, i) => `
    <text x="${padX}" y="${headlineY + i * lineHeight}"
          fill="#ffffff" font-family="Charter, Palatino, Georgia, serif"
          font-size="78" font-weight="700" letter-spacing="-0.015em">${escapeXml(line)}</text>
  `).join("")}

  <!-- Subheadline -->
  <text x="${padX}" y="${headlineY + headlineLines.length * lineHeight}" fill="${GOLD_LIGHT}"
        font-family="Charter, Palatino, Georgia, serif" font-size="42" font-weight="500" font-style="italic">
    ${escapeXml(subheadline)}
  </text>

  <!-- Chips -->
  ${chipParts.join("")}

  <!-- Footer -->
  <g transform="translate(${padX}, ${H - 70})">
    <text fill="rgba(255,255,255,0.55)" font-family="-apple-system, system-ui, sans-serif" font-size="22" font-weight="600">topuni.org</text>
    <text x="${W - 2 * padX}" text-anchor="end" fill="rgba(255,255,255,0.55)" font-family="-apple-system, system-ui, sans-serif" font-size="18" font-weight="500">
      ${isRu ? "Сделано с TopUni AI" : "Made with TopUni AI"}
    </text>
  </g>

  <!-- Decorative ribbon -->
  <rect x="0" y="${H - 12}" width="${W}" height="12" fill="${GOLD}" opacity="0.7" />
</svg>`;
}

const placeholderSvg = (): string => buildSvg({
  slug: "fallback",
  profile_first_name: null,
  profile_grade_level: null,
  profile_major: null,
  profile_target_countries: null,
  language: "en",
  created_at: new Date().toISOString(),
  is_public: true,
  expires_at: null,
});

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;
  // Crawlers send GET; sometimes HEAD for CDN priming
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("GET only", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() || "";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !ANON_KEY) {
    return new Response(placeholderSvg(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (!slug || slug.length < 4 || slug.length > 32) {
    // Render the brand fallback so unfurls degrade gracefully
    return new Response(placeholderSvg(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Anon read (RLS only exposes public, non-expired briefs)
  const supa = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supa
    .from("shared_briefs")
    .select("slug, profile_first_name, profile_grade_level, profile_major, profile_target_countries, language, created_at, is_public, expires_at")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle<BriefRow>();

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

  const svg = buildSvg(data);
  return new Response(svg, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      // 1 hour browser cache, 24 hours CDN — briefs are mostly stable
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-TopUni-OG-Slug": slug,
    },
  });
});
