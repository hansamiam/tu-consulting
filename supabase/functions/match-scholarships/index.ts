// match-scholarships
//
// Public endpoint that powers semantic scholarship matching for both
// Discover and the AI strategy report. Takes a student profile (or a
// raw query string), embeds it via the AI gateway, calls the
// match_scholarships RPC, and returns ranked scholarship_ids with
// similarity scores. Clients hydrate full row data with a separate
// SELECT (RLS already permits public read of scholarships).
//
// Why split the embedding from the RPC: keeps the embedding API key
// server-side, lets us cache embeddings per profile fingerprint
// later, and means the RPC stays a pure-SQL function.
//
// Request body:
//   {
//     query?: string,           // free-text query; preferred when given
//     profile?: {                // alternative: structured profile
//       field?: string,
//       major?: string,
//       targetCountries?: string[],
//       degree?: string,         // 'bachelor' | 'master' | 'phd'
//       interests?: string,
//     },
//     filters?: {
//       nationality?: string,
//       min_gpa?: number,        // student's actual GPA (will be compared >= scholarship.min_gpa)
//       min_ielts?: number,      // student's actual IELTS
//       degree_level?: string,   // 'bachelor' | 'master' | 'phd' | 'non_degree'
//     },
//     limit?: number             // default 30, max 100
//   }
//
// Response:
//   {
//     matches: [
//       { scholarship_id: string, similarity: number, passes_eligibility: boolean }
//     ],
//     query_used: string,        // the canonicalised text we embedded (for debug)
//     duration_ms: number
//   }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embeddings as gatewayEmbeddings, chatCompletions } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";

const EMBEDDING_MODEL = "text-embedding-3-small";

// Discover v1 F1 — match modes:
//   feed: today's behavior (top N similarity-ranked, deduped).
//   hero: top-1 best eligible match with a 1-sentence LLM-generated
//     hero_reason ("why this is your scholarship right now") + a
//     hero_confidence number. Used by the Discover "mechta mode" hero
//     card. Caller can re-call with mode=feed to get the rest.
export type MatchMode = "feed" | "hero";
export type ProfileQuality = "rich" | "partial" | "sparse" | "empty";

interface MatchRequest {
  query?: string;
  profile?: {
    field?: string;
    major?: string;
    targetCountries?: string[];
    degree?: string;
    interests?: string;
  };
  filters?: {
    nationality?: string;
    min_gpa?: number;
    min_ielts?: number;
    min_toefl?: number;
    min_sat?: number;
    degree_level?: string;
  };
  limit?: number;
  mode?: MatchMode;
  // Caller can override the computed profile_quality when it has access
  // to the full 17-field student profile (Discover frontend); otherwise
  // we infer from the slim payload we receive.
  profile_quality_override?: ProfileQuality;
}

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

// Build a canonical query string from a structured profile so the
// embedding is consistent across calls with the same profile.
function profileToQuery(p: NonNullable<MatchRequest["profile"]>): string {
  const parts: string[] = [];
  const field = (p.field || p.major || "").trim();
  if (field) parts.push(`Field of study: ${field}.`);
  if (p.degree) parts.push(`Degree level: ${p.degree}.`);
  if (p.targetCountries && p.targetCountries.length > 0) {
    parts.push(`Target countries: ${p.targetCountries.join(", ")}.`);
  }
  if (p.interests) parts.push(`Interests: ${p.interests.slice(0, 200)}.`);
  return parts.join(" ").trim() || "international scholarship for higher education";
}

async function embedQuery(text: string): Promise<number[]> {
  const [v] = await gatewayEmbeddings({ input: text, modelOverride: EMBEDDING_MODEL });
  if (!Array.isArray(v) || v.length !== 1536) {
    throw new Error(`Unexpected embedding shape (got ${v?.length})`);
  }
  return v;
}

// Profile-quality inference from the slim payload received here. Caller
// can override via profile_quality_override when it knows the full 17-field
// student profile. Buckets follow plan D8 (Discover hero behavior matrix).
function inferProfileQuality(req: MatchRequest): ProfileQuality {
  const p = req.profile ?? {};
  const f = req.filters ?? {};
  let signals = 0;
  if (p.field?.trim() || p.major?.trim()) signals++;
  if (p.degree) signals++;
  if (Array.isArray(p.targetCountries) && p.targetCountries.length > 0) signals++;
  if (p.interests?.trim()) signals++;
  if (f.nationality) signals++;
  if (typeof f.min_gpa === "number") signals++;
  if (typeof f.min_ielts === "number" || typeof f.min_toefl === "number" || typeof f.min_sat === "number") signals++;
  if (f.degree_level) signals++;
  // Slim payload caps at 8 signals; map to the 17-field rubric proportionally.
  // The plan's thresholds (10/4/1 of 17) → roughly (5/2/1 of 8) of slim signals.
  if (signals === 0) return "empty";
  if (signals <= 1) return "sparse";
  if (signals <= 4) return "partial";
  return "rich";
}

interface HeroReasonResult {
  hero_reason: string;
  hero_confidence: number;
}

// LLM-generated single-sentence "why this scholarship matches this student
// right now." Plan F1 calls for ≤1 sentence, no fluff. Failures return a
// safe generic fallback — hero card UI still renders, just less personalized.
async function generateHeroReason(args: {
  scholarshipName: string;
  providerName: string | null;
  hostCountry: string | null;
  coverageType: string | null;
  awardAmountText: string | null;
  applicationDeadline: string | null;
  profileQuery: string;
}): Promise<HeroReasonResult> {
  const sys = `You write ONE crisp sentence (≤25 words) explaining why a specific scholarship matches a specific student RIGHT NOW. Output STRICT JSON: {"reason": "...", "confidence": 0.0-1.0}. No markdown, no fences. Confidence reflects how concretely the profile maps to the program's eligibility/fit, not LLM uncertainty.`;
  const user = `Scholarship: ${args.scholarshipName}
Provider: ${args.providerName ?? "—"}
Host country: ${args.hostCountry ?? "—"}
Coverage: ${args.coverageType ?? "—"}
Funding: ${args.awardAmountText ?? "—"}
Deadline: ${args.applicationDeadline ?? "—"}

Student profile signal: ${args.profileQuery}

Write the one-sentence "why this scholarship for this student right now". Concrete (mention the student's actual field/country if it maps). No clichés ("amazing opportunity"). No second person ("you").`;

  try {
    const resp = await chatCompletions({
      tier: "flash",
      jsonMode: true,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });
    if (!resp.ok) {
      return {
        hero_reason: `${args.scholarshipName} matches your profile based on field and target country fit.`,
        hero_confidence: 0.4,
      };
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content as string | undefined;
    if (!text) {
      return {
        hero_reason: `${args.scholarshipName} matches your profile based on field and target country fit.`,
        hero_confidence: 0.4,
      };
    }
    const parsed = JSON.parse(text.trim());
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    const conf = typeof parsed.confidence === "number" ? parsed.confidence : 0.6;
    if (!reason) {
      return {
        hero_reason: `${args.scholarshipName} matches your profile based on field and target country fit.`,
        hero_confidence: 0.4,
      };
    }
    return { hero_reason: reason, hero_confidence: Math.max(0, Math.min(1, conf)) };
  } catch (e) {
    console.warn("[match-scholarships][hero_reason] generation failed", (e as Error).message);
    return {
      hero_reason: `${args.scholarshipName} matches your profile based on field and target country fit.`,
      hero_confidence: 0.4,
    };
  }
}

serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const startedAt = Date.now();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !ANON_KEY) return json(500, { error: "Supabase env not configured" });
    // AI gateway env validated lazily in gatewayEmbeddings — see _shared/ai-gateway.ts

    const body = (await req.json().catch(() => ({}))) as MatchRequest;

    const queryText = (body.query?.trim()) || (body.profile ? profileToQuery(body.profile) : "");
    if (!queryText) return json(400, { error: "Provide either `query` or `profile`" });

    const limit = Math.min(Math.max(Number(body.limit) || 30, 1), 100);

    // Rate limit per IP. Each call runs an embedding (~$0.00002) + a vector
    // RPC. Cheap individually but unbounded over time → real cost. Discover
    // fires this once per profile change, so 20/min/IP comfortably absorbs
    // legit use while capping abuse.
    const supaRL = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ip = clientIp(req);
    const rateLimitOk = await checkRateLimit(supaRL, { key: `match:${ip}`, perMinute: 20 });
    if (!rateLimitOk) return json(429, { error: "Rate limit exceeded. Please slow down." });

    const queryEmbedding = await embedQuery(queryText);

    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // p_min_toefl / p_min_sat are added by the
    // 20260505040000_match_eligibility_toefl_sat migration. Until that
    // migration is applied, PostgREST won't find an overload that
    // accepts those keys. Include them ONLY when the caller actually
    // has a value — that way pre-migration callers (and post-migration
    // callers without the test scores) take the original 6-arg
    // overload, while post-migration callers WITH a score use the
    // 8-arg overload that checks the score against min_toefl/min_sat.
    const rpcArgs: Record<string, unknown> = {
      query_embedding: queryEmbedding as unknown as string,
      p_nationality: body.filters?.nationality ?? null,
      p_min_gpa: body.filters?.min_gpa ?? null,
      p_min_ielts: body.filters?.min_ielts ?? null,
      p_degree_level: body.filters?.degree_level ?? null,
      p_max_results: limit,
    };
    if (body.filters?.min_toefl != null) rpcArgs.p_min_toefl = body.filters.min_toefl;
    if (body.filters?.min_sat != null) rpcArgs.p_min_sat = body.filters.min_sat;
    const { data, error } = await supa.rpc("match_scholarships", rpcArgs);
    if (error) throw new Error(`match_scholarships RPC: ${error.message}`);

    const matches = data ?? [];
    const mode: MatchMode = body.mode === "hero" ? "hero" : "feed";
    const profileQuality: ProfileQuality = body.profile_quality_override ?? inferProfileQuality(body);

    // Hero mode: pick the top-eligible match, hydrate it enough to write a
    // grounded hero_reason, then return a single-match response. Caller
    // typically re-calls with mode=feed for the rest of the catalog so the
    // hero card and the feed below it never duplicate.
    if (mode === "hero") {
      const heroMatch = matches.find((m: { passes_eligibility?: boolean }) => m.passes_eligibility !== false)
        ?? matches[0];
      if (!heroMatch) {
        return json(200, {
          matches: [],
          mode,
          profile_quality: profileQuality,
          hero_reason: null,
          hero_confidence: null,
          query_used: queryText,
          duration_ms: Date.now() - startedAt,
        });
      }
      // Hydrate the minimal fields the hero_reason prompt needs. Public
      // RLS allows the anon client this read.
      const { data: heroRow } = await supa
        .from("scholarships")
        .select("scholarship_name, provider_name, host_country, coverage_type, award_amount_text, application_deadline")
        .eq("scholarship_id", heroMatch.scholarship_id)
        .maybeSingle();

      const reasonResult = heroRow
        ? await generateHeroReason({
            scholarshipName: heroRow.scholarship_name,
            providerName: heroRow.provider_name,
            hostCountry: heroRow.host_country,
            coverageType: heroRow.coverage_type,
            awardAmountText: heroRow.award_amount_text,
            applicationDeadline: heroRow.application_deadline,
            profileQuery: queryText,
          })
        : { hero_reason: null, hero_confidence: null };

      return json(200, {
        matches: [heroMatch],
        mode,
        profile_quality: profileQuality,
        hero_reason: reasonResult.hero_reason,
        hero_confidence: reasonResult.hero_confidence,
        query_used: queryText,
        duration_ms: Date.now() - startedAt,
      });
    }

    return json(200, {
      matches,
      mode,
      profile_quality: profileQuality,
      query_used: queryText,
      duration_ms: Date.now() - startedAt,
    });
  } catch (e) {
    console.error("match-scholarships error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
