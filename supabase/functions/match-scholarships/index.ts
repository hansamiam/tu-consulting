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
import { embeddings as gatewayEmbeddings } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";

const EMBEDDING_MODEL = "text-embedding-3-small";

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

    return json(200, {
      matches: data ?? [],
      query_used: queryText,
      duration_ms: Date.now() - startedAt,
    });
  } catch (e) {
    console.error("match-scholarships error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
