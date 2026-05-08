import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { chatCompletions, embeddings as gatewayEmbeddings } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import {
  PREMIUM_SECTIONS,
  buildRegenPrompt,
  type SectionSpec,
  type BriefContext,
} from "../_shared/brief-sections.ts";
import { EDITORIAL_RULES } from "../_shared/editorial-rules.ts";
import {
  cleanScholarshipName,
  cleanProvider,
  cleanHostCountry,
  cleanAwardText,
} from "../_shared/scholarshipFields.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_MODEL = "text-embedding-3-small";

/* ─── Profile → canonical query string ─────────────────────────────
   Used for embedding. Same shape as match-scholarships' profileToQuery
   so retrievals are stable across surfaces. */
function profileToQuery(profile: any): string {
  const parts: string[] = [];
  const field = (profile.major || profile.field || "").trim();
  if (field) parts.push(`Field of study: ${field}.`);
  if (profile.gradeLevel) parts.push(`Current level: ${profile.gradeLevel}.`);
  const tc = (profile.targetCountries || []).slice(0, 5);
  if (tc.length) parts.push(`Target countries: ${tc.join(", ")}.`);
  if (profile.budget) parts.push(`Budget: ${profile.budget}.`);
  if (profile.scholarshipNeeded === "yes") parts.push(`Needs full scholarship.`);
  if (profile.timeline) parts.push(`Timeline: ${profile.timeline}.`);
  return parts.join(" ").trim() || "international scholarship for higher education";
}

/* Rough degree level inference for the eligibility pre-filter. */
function inferDegreeLevel(profile: any): string | null {
  const g = (profile.gradeLevel || "").toLowerCase();
  if (g.includes("9th") || g.includes("10th") || g.includes("11th") || g.includes("12th") || g.includes("foundation")) return "bachelor";
  if (g.includes("transfer")) return "bachelor";
  if (g.includes("masters") || g.includes("master")) return "master";
  if (g.includes("phd") || g.includes("doctor")) return "phd";
  return null;
}

async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const [v] = await gatewayEmbeddings({ input: text, modelOverride: EMBEDDING_MODEL });
    return Array.isArray(v) && v.length === 1536 ? v : null;
  } catch (e) {
    console.warn("Embedding failed; falling back to country-only retrieval", e);
    return null;
  }
}

/* ─── Brief cache helpers ─────────────────────────────────────────────
   The brief is the most expensive AI surface in the product (~$0.30-
   0.50 per premium generation, ~$0.02 per basic). Cache on
   profile_hash × language × grade; invalidate when any cited
   scholarship has been UPDATEd more recently than the cache row's
   generated_at (drift detection). Anon visitors with effectively-
   identical profiles share the cache. */

async function computeBriefHash(profile: any, grade: string, lang: string): Promise<string> {
  const canonical = JSON.stringify({
    n: (profile.nationality ?? "").toLowerCase().trim(),
    g: profile.gpa ?? "",
    i: profile.ielts ?? "",
    t: profile.toefl ?? "",
    s: profile.sat ?? "",
    m: (profile.major ?? profile.field ?? "").toLowerCase().trim(),
    gl: (profile.gradeLevel ?? "").toLowerCase().trim(),
    tc: (profile.targetCountries ?? []).map((c: string) => c.toLowerCase().trim()).sort(),
    bd: profile.budget ?? "",
    sn: profile.scholarshipNeeded ?? "",
    tl: profile.timeline ?? "",
    pre: profile.prestige ?? 0,
    sch: profile.scholarship ?? 0,
    cr: profile.careerRoi ?? 0,
    va: profile.visaAccess ?? 0,
    lp: profile.locationPref ?? 0,
    ta: (profile.topActivity ?? "").slice(0, 200),
    ps: (profile.personalStory ?? "").slice(0, 200),
    ns: (profile.namedSchools ?? "").slice(0, 200),
    grade,
    lang,
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/* Wrap a string of accumulated brief markdown back into the SSE format
   the client parser expects. Emits a single content chunk + DONE. */
function replayCachedAsSse(content: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      const chunk = JSON.stringify({ choices: [{ delta: { content } }] });
      c.enqueue(enc.encode(`data: ${chunk}\n\n`));
      c.enqueue(enc.encode(`data: [DONE]\n\n`));
      c.close();
    },
  });
}

/* Parse an accumulated raw SSE buffer back into the markdown string —
   reverse of buildOrderedSectionStream / OpenAI-stream format. Used to
   capture the FULL brief for caching after the client stream has
   completed. */
function extractContentFromSse(raw: string): string {
  let out = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const json = line.slice(6).trim();
    if (!json || json === "[DONE]") continue;
    try {
      const parsed = JSON.parse(json);
      const piece =
        parsed?.choices?.[0]?.delta?.content
        ?? parsed?.choices?.[0]?.message?.content
        ?? "";
      if (typeof piece === "string") out += piece;
    } catch { /* skip malformed lines */ }
  }
  return out;
}

/* Tee a stream + accumulate the second half into a string for caching.
   Returns the client-facing stream and a promise that resolves with
   the full SSE text once the source completes. */
function teeStreamForCache(source: ReadableStream<Uint8Array>): {
  client: ReadableStream<Uint8Array>;
  accumulated: Promise<string>;
} {
  const [forClient, forCache] = source.tee();
  const accumulated = (async () => {
    const reader = forCache.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) buf += dec.decode(value, { stream: true });
    }
    return buf;
  })();
  return { client: forClient, accumulated };
}

/* ─── Multi-pass premium pipeline ─────────────────────────────────────
   Each section is a focused LLM call. We launch them in parallel, then
   stream them to the client in PREMIUM_SECTIONS order. Validators run on
   each completion; failures get ONE retry with a stricter prompt. */

interface SectionResult {
  spec: SectionSpec;
  markdown: string;
  /** Whether the markdown passed validation (after any regen). */
  valid: boolean;
  /** Whether we needed a second attempt to satisfy the validator. */
  regenerated: boolean;
  /** Reason from the FIRST validator if it failed. Telemetry-only. */
  failureReason?: string;
}

/* Generate a single section. Calls the model once; if a validator fails,
   regenerates ONCE with a stricter prompt; falls back to the first attempt
   if both fail (better degraded section than blocking the whole brief). */
async function generateSection(spec: SectionSpec, ctx: BriefContext): Promise<SectionResult> {
  const sysContent = `You are TopUni AI, an expert admissions strategist. You output ONLY the requested markdown section, beginning with the H2 heading exactly as instructed. No preamble, no commentary, no fences.`;

  let firstAttempt = "";
  let firstReason: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = attempt === 1
      ? spec.buildPrompt(ctx)
      : buildRegenPrompt(spec, ctx, firstReason ?? "validation failed");
    try {
      const resp = await chatCompletions({
        tier: "pro",
        messages: [
          { role: "system", content: sysContent },
          { role: "user",   content: prompt },
        ],
        stream: false,
        ...(spec.reasoning ? { reasoning: spec.reasoning } : {}),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.warn(`[brief-sections] ${spec.id} attempt ${attempt} HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
        if (attempt === 1) { firstReason = `gateway HTTP ${resp.status}`; continue; }
        // Attempt 2 also failed — keep first attempt if we have it.
        return {
          spec,
          markdown: firstAttempt || `${spec.heading}\n\n*(This section couldn't be generated. We'll try again next time.)*`,
          valid: false,
          regenerated: true,
          failureReason: firstReason,
        };
      }
      const data = await resp.json();
      const text = (
        data?.choices?.[0]?.message?.content
        ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
        ?? ""
      ) as string;
      const trimmed = text.trim();

      const validation = spec.validate?.(trimmed, ctx) ?? { ok: true };
      if (validation.ok) {
        return {
          spec,
          markdown: trimmed,
          valid: true,
          regenerated: attempt > 1,
          failureReason: firstReason,
        };
      }
      // First-attempt failure: stash it and retry with stricter prompt.
      if (attempt === 1) {
        firstAttempt = trimmed;
        firstReason = validation.reason ?? "unspecified";
        continue;
      }
      // Second attempt also failed — keep the better of the two by length.
      const second = trimmed;
      const better = second.length > firstAttempt.length ? second : firstAttempt;
      return { spec, markdown: better, valid: false, regenerated: true, failureReason: firstReason };
    } catch (e) {
      console.warn(`[brief-sections] ${spec.id} attempt ${attempt} threw:`, (e as Error).message);
      if (attempt === 2) {
        return {
          spec,
          markdown: firstAttempt || `${spec.heading}\n\n*(This section couldn't be generated. We'll try again next time.)*`,
          valid: false,
          regenerated: true,
          failureReason: (e as Error).message,
        };
      }
    }
  }
  // Unreachable — both attempts above always return.
  return {
    spec,
    markdown: `${spec.heading}\n\n*(Generation failed.)*`,
    valid: false,
    regenerated: true,
  };
}

/* Stream a list of section promises to the client in defined order using
   the OpenAI-compat SSE format (`data: {"choices":[{"delta":{"content":...}}]}`)
   so the existing frontend parser works unchanged. */
function buildOrderedSectionStream(promises: Array<Promise<SectionResult>>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (text: string) => {
        const chunk = JSON.stringify({ choices: [{ delta: { content: text } }] });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      };
      try {
        for (let i = 0; i < promises.length; i++) {
          const result = await promises[i];
          // Insert paragraph spacing between sections so the markdown
          // renders with clean separation.
          const prefix = i === 0 ? "" : "\n\n";
          emit(prefix + result.markdown);
          if (!result.valid) {
            console.warn(`[brief-sections] section ${result.spec.id} delivered invalid (reason: ${result.failureReason ?? "?"})`);
          }
          if (result.regenerated) {
            console.log(`[brief-sections] section ${result.spec.id} regenerated`);
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (e) {
        console.error("[brief-sections] stream error:", e);
        emit(`\n\n*(An unexpected error interrupted brief generation. Please regenerate.)*\n`);
      } finally {
        controller.close();
      }
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit: 5 brief generations per minute per IP. A real visitor will
    // never hit this; abuse scripts will. Each blocked request saves ~$0.02
    // of GPT-4o-mini spend.
    const ip = clientIp(req);
    const ok = await checkRateLimit(supabase, { key: `ai-pathway:${ip}`, perMinute: 5 });
    if (!ok) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — please wait a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { profile, language, reportGrade, regenSection, focusScholarshipId } = await req.json();
    const grade = reportGrade || "basic";
    const cacheLang = language || "en";

    // ─── Cache hit check ────────────────────────────────────────────────
    // Skip for regenSection (the user is explicitly asking us to redo
    // a single section) and for missing profile (we'd hash zeros).
    const briefProfileHash = await computeBriefHash(profile || {}, grade, cacheLang);
    if (!regenSection && profile) {
      const { data: cached } = await supabase
        .from("brief_cache")
        .select("content, scholarship_ids, generated_at")
        .eq("profile_hash", briefProfileHash)
        .eq("language", cacheLang)
        .eq("grade", grade)
        .maybeSingle();
      if (cached?.content) {
        const cachedAt = new Date(cached.generated_at).getTime();
        // Drift check: any cited scholarship updated since the cache?
        let drifted = false;
        if (Array.isArray(cached.scholarship_ids) && cached.scholarship_ids.length > 0) {
          const { data: drift } = await supabase
            .from("scholarships")
            .select("scholarship_id")
            .in("scholarship_id", cached.scholarship_ids)
            .gt("updated_at", cached.generated_at)
            .limit(1);
          drifted = !!drift && drift.length > 0;
        }
        if (!drifted) {
          // Cache hit + fresh — replay as SSE. Snappy load, $0 spend.
          return new Response(replayCachedAsSse(cached.content), {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream",
              "X-Cache": "HIT",
              "X-Cache-Age-Sec": String(Math.round((Date.now() - cachedAt) / 1000)),
            },
          });
        }
      }
    }
    /* When regenSection is set, the caller is asking us to regenerate
       JUST that one section of an already-generated premium brief
       instead of building from scratch. We support this only for the
       premium tier — the basic monolithic call doesn't have section-
       level granularity. The response stream emits ONLY that section's
       markdown (no prefix newline) so the client can splice it back
       into the existing pathwayContent in place. */
    // AI gateway env validated lazily inside chatCompletions / gatewayEmbeddings —
    // see _shared/ai-gateway.ts. Provider chosen via AI_PROVIDER env var.

    /* ─── Brief-generation timestamp (retention loop signal) ──────────────
       Stamp last_brief_generated_at on student_profiles for authed users.
       The pro-upgrade-nudge cron uses this column to find users whose
       brief is N days old and queue the conversion email. Fire-and-forget
       so it never blocks the streaming response.
       Service-role client doesn't carry user identity, so we resolve the
       userId via a separate anon client + the inbound JWT. */
    (async () => {
      try {
        const auth = req.headers.get("Authorization");
        if (!auth?.startsWith("Bearer ")) return;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (!anonKey) return;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: auth } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user?.id) return;
        await supabase
          .from("student_profiles")
          .update({ last_brief_generated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      } catch (e) {
        console.warn("brief-generation timestamp update failed:", e);
      }
    })();

    const targetCountries = profile.targetCountries || [];
    const studentGpa = parseFloat(profile.gpa) || null;
    const studentIelts = parseFloat(profile.ielts) || null;

    // Quality predicate for AI retrieval. Same 2-of-4 substantive-fields
    // bar the Discover client uses for its grid filter — except here it
    // gates what reaches the LLM's prompt context. Half-baked rows
    // (no country / no provider / no award / no deadline) ground the
    // brief on nothing and produce generic advice. Drop them.
    const isQualityRow = (r: Record<string, unknown>): boolean => {
      const hasCountry  = !!(r.host_country && String(r.host_country).trim());
      const hasProvider = !!(r.provider_name && String(r.provider_name).trim()
        && !/^(various|multiple|several|n\/a|none|unknown|tbd)/i.test(String(r.provider_name).trim()));
      const hasAward    = !!(r.award_amount_text && String(r.award_amount_text).trim())
        || (typeof r.estimated_total_value_usd === "number" && r.estimated_total_value_usd > 0);
      const hasDeadline = !!r.application_deadline;
      const score = (hasCountry?1:0) + (hasProvider?1:0) + (hasAward?1:0) + (hasDeadline?1:0);
      return score >= 2;
    };
    const studentToefl = parseFloat(profile.toefl) || null;
    const studentSat = parseFloat(profile.sat) || null;

    /* ─── Scholarship retrieval via pgvector RAG ───────────────────
       Replaces the old "fetch all unis + nested scholarships, dump
       30 of them into the prompt" approach. We:
         1. Build a canonical query string from the profile.
         2. Embed it.
         3. Call match_scholarships() with eligibility filters.
         4. Hydrate top 25 full rows in retrieval order.
       Falls back gracefully to a country-filtered SELECT if any
       step fails (cold-start: no embeddings yet, gateway down). */
    const profileQuery = profileToQuery(profile);
    const queryEmbedding = await embedQuery(profileQuery);
    const degreeLevel = inferDegreeLevel(profile);

    let scholarshipRows: any[] = [];
    let retrievalMethod = "fallback_country_filter";

    if (queryEmbedding) {
      // See match-scholarships/index.ts for why we conditionally
      // include p_min_toefl / p_min_sat (PostgREST overload selection
      // pre/post the 20260505040000 migration).
      const matchRpcArgs: Record<string, unknown> = {
        query_embedding: queryEmbedding as unknown as string,
        p_nationality: profile.nationality || null,
        p_min_gpa: studentGpa,
        p_min_ielts: studentIelts,
        p_degree_level: degreeLevel,
        p_max_results: 25,
      };
      if (studentToefl != null) matchRpcArgs.p_min_toefl = studentToefl;
      if (studentSat != null) matchRpcArgs.p_min_sat = studentSat;
      const { data: matches, error: matchErr } = await supabase.rpc("match_scholarships", matchRpcArgs as never);
      if (!matchErr && Array.isArray(matches) && matches.length > 0) {
        const ids = matches.map((m: any) => m.scholarship_id);
        const { data: hydrated } = await supabase
          .from("scholarships")
          .select(
            "scholarship_id, scholarship_name, provider_name, host_country, " +
            "coverage_type, award_amount_text, estimated_total_value_usd, " +
            "target_degree_level, target_fields, target_demographics, " +
            "partner_universities, " +
            "eligible_countries, application_deadline, deadline_type, " +
            "min_gpa, gpa_scale, min_ielts, min_toefl, " +
            "selectivity_level, ideal_candidate_profile, " +
            "eligibility_requirements, citizenship_requirements, official_url, " +
            "source_url, last_verified_at, verification_status, " +
            "confidence, data_completeness_score, " +
            "why_this_fits, strategy_notes"
          )
          .in("scholarship_id", ids)
          // Drop rows the LLM should never see in its prompt context. Per
          // DATA_PIPELINE_AUDIT.md: only verified + stale rows reach the
          // brief; broken (URL fails) and pending (un-vetted scrapes) are
          // hidden until they're promoted to verified.
          .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
          .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null");
        // Re-order to match retrieval order; tag each with similarity & eligibility flag.
        const order = new Map(matches.map((m: any, i: number) => [m.scholarship_id, i]));
        const elig = new Map(matches.map((m: any) => [m.scholarship_id, m.passes_eligibility]));
        const sims = new Map(matches.map((m: any) => [m.scholarship_id, m.similarity]));
        scholarshipRows = (hydrated || [])
          .filter(isQualityRow)
          .map((r) => ({ ...r, _similarity: sims.get(r.scholarship_id), _eligible: elig.get(r.scholarship_id) }))
          .sort((a, b) => (order.get(a.scholarship_id)! - order.get(b.scholarship_id)!));
        retrievalMethod = "pgvector_rag";
      }
    }

    if (scholarshipRows.length === 0) {
      // Fallback: country-filtered top 25 sorted by deadline urgency.
      // Same verification-status filter as the RAG path — the LLM never
      // sees broken or pending rows.
      let q = supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "target_degree_level, target_fields, application_deadline, " +
          "eligibility_requirements, citizenship_requirements, official_url, " +
          "source_url, last_verified_at, verification_status, " +
          "why_this_fits, strategy_notes"
        )
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
          .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null");
      if (targetCountries.length > 0) {
        q = q.in("host_country", [...targetCountries, "Global", "Multiple", "European Union"]);
      }
      const { data } = await q
        .order("application_deadline", { ascending: true, nullsFirst: false })
        .limit(40);   // over-fetch so the quality filter doesn't shrink below 25
      scholarshipRows = (data || []).filter(isQualityRow).slice(0, 25);
    }

    /* Focus scholarship — when the student arrived from a /scholarships/:id
       detail page and asked us to build the strategy around that specific
       scholarship, hydrate it and pin it at index 0 of scholarshipRows.
       De-dups against any matching row already in the retrieval set so we
       don't end up with two copies. Soft-fails: a missing or non-verified
       row just falls through (the page shouldn't have been linked from
       in the first place if the row is broken). */
    let focusScholarshipName: string | null = null;
    if (typeof focusScholarshipId === "string" && focusScholarshipId) {
      const { data: focusRow } = await supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "target_degree_level, target_fields, application_deadline, " +
          "eligibility_requirements, citizenship_requirements, official_url, " +
          "source_url, last_verified_at, verification_status, " +
          "why_this_fits, strategy_notes, how_to_win, ideal_candidate_profile"
        )
        .eq("scholarship_id", focusScholarshipId)
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
          .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
        .maybeSingle();
      if (focusRow) {
        focusScholarshipName = focusRow.scholarship_name;
        scholarshipRows = [
          { ...focusRow, _focus: true },
          ...scholarshipRows.filter((r: any) => r.scholarship_id !== focusScholarshipId),
        ].slice(0, 25);
      }
    }

    /* Universities — kept lighter. Country-filter SELECT with the
       fields the prompt actually uses. The university table is much
       smaller than scholarships, so RAG is overkill here. */
    const { data: universities } = await supabase
      .from("universities")
      .select(`
        university_name, country, city, tuition_usd_per_year,
        language_of_instruction, foundation_year_available, gap_year_accepted,
        programs (
          program_name, degree_level, field_of_study, duration_years,
          admission_requirements ( ielts_score_min, gpa_min, application_deadline ),
          applications ( acceptance_rate, visa_difficulty_score )
        )
      `)
      .in("country", targetCountries.length > 0 ? targetCountries : []);

    const relevantUnis = (universities || []).slice(0, 15);

    /* ─── Prompt context ───────────────────────────────────────────
       Compact, retrieval-driven. Scholarships first (the AI report's
       primary deliverable) then a slimmer universities block. */
    const scholarshipContext = scholarshipRows.map((s: any, i: number) => {
      // Apply hygiene cleaners on the way INTO the prompt context so the
      // LLM doesn't see ("Schwarzman | Apply Now" / "$80M endowment") and
      // pass that through to the user-facing brief. Same cleaners
      // applied at scrape ingest, so most rows already arrive clean —
      // this is defense in depth for legacy or edge-case rows.
      const cleanedName = cleanScholarshipName(s.scholarship_name) || s.scholarship_name;
      const cleanedProv = cleanProvider(s.provider_name) ?? s.provider_name ?? "—";
      const cleanedCountry = cleanHostCountry(s.host_country) ?? "—";
      const cleanedAward = cleanAwardText(s.award_amount_text);
      const fields = (s.target_fields || []).filter(Boolean).join(", ");
      const levels = (s.target_degree_level || []).filter(Boolean).join(", ");
      const demographics = (s.target_demographics || []).filter(Boolean).join(", ");
      const eligibleCountries = (s.eligible_countries || []).filter(Boolean).slice(0, 8).join(", ");
      const elig = String(s.eligibility_requirements || "").slice(0, 240);
      const ideal = String(s.ideal_candidate_profile || "").slice(0, 200);
      const sim = typeof s._similarity === "number" ? ` (relevance ${(s._similarity * 100).toFixed(0)}%)` : "";
      const eligTag = s._eligible === false ? " [eligibility unclear — review]" : "";
      const focusTag = s._focus ? " [STUDENT'S FOCUS — they arrived from this scholarship's detail page]" : "";

      // Trust signal — when a row was extracted with low confidence or
      // low completeness, its thresholds (min_gpa etc.) should not be
      // quoted as gospel by the LLM. Tag the row so the brief caveats
      // appropriately rather than telling a 3.6-GPA student they don't
      // qualify because of a min_gpa we extracted at 25% confidence.
      const conf = typeof s.confidence === "number" ? s.confidence : null;
      const comp = typeof s.data_completeness_score === "number" ? s.data_completeness_score : null;
      const thinRow = (conf !== null && conf < 0.75) || (comp !== null && comp < 6);
      const trustTag = thinRow
        ? "\n   Source row: thin — verify thresholds against the official site rather than asserting them as hard rules."
        : "";

      // Numeric thresholds — only render the line when at least one is
      // present, so the LLM doesn't get a blizzard of "—". When the
      // source row is thin, suffix a soft-caveat marker so the brief
      // copy doesn't over-claim.
      const thresholdParts: string[] = [];
      if (s.min_gpa) thresholdParts.push(`GPA ≥ ${s.min_gpa}/${s.gpa_scale ?? 4.0}`);
      if (s.min_ielts) thresholdParts.push(`IELTS ≥ ${s.min_ielts}`);
      if (s.min_toefl) thresholdParts.push(`TOEFL ≥ ${s.min_toefl}`);
      const thresholds = thresholdParts.length > 0
        ? `\n   Thresholds: ${thresholdParts.join("; ")}${thinRow ? " (per our extraction)" : ""}`
        : "";

      // Partner universities — when a scholarship covers study at one of
      // a fixed list of institutions (DAAD partner unis, Erasmus Mundus
      // consortia), surface 6 so the LLM can name real institutions in
      // the strategy paragraph instead of saying "various universities".
      const partners = Array.isArray(s.partner_universities)
        ? s.partner_universities.filter(Boolean).slice(0, 6)
        : [];
      const partnersLine = partners.length > 0
        ? `\n   Partner universities: ${partners.join(" · ")}${(s.partner_universities?.length ?? 0) > partners.length ? ` (+${s.partner_universities.length - partners.length} more)` : ""}`
        : "";

      // Total value — surface the dollar figure so the LLM can compare
      // ROI across scholarships. The award_amount_text is human-readable
      // but unstructured; estimated_total_value_usd is the canonical
      // sortable number students actually use to triage.
      const totalValue = s.estimated_total_value_usd
        ? `\n   Total value: ~$${Math.round(s.estimated_total_value_usd).toLocaleString()}`
        : "";

      // Selectivity tier — drives the "should you spend 20 hours on this
      // application" call. Without it, the LLM can't honestly tell a
      // candidate that Schwarzman is a 1-in-2,000 long-bet.
      const selectivity = s.selectivity_level
        ? `\n   Selectivity: ${s.selectivity_level}`
        : "";

      // Demographic targeting — when a scholarship is specifically for
      // women / refugees / first-gen / etc., the LLM needs to surface
      // alignment (or honest mismatch) for the student.
      const audience = demographics
        ? `\n   Audience: ${demographics}`
        : "";

      // Eligible-country list — geographic restriction. Only render the
      // first 8 to keep the context compact.
      const geo = eligibleCountries
        ? `\n   Eligible countries: ${eligibleCountries}`
        : "";

      // Editorial fit line — the catalog's own "who fits this" sentence.
      // Helpful prior for the LLM when the student's profile is borderline.
      const idealLine = ideal
        ? `\n   Ideal candidate: ${ideal}`
        : "";

      const deadlineLine = `${s.application_deadline || "varies"}${s.deadline_type ? ` (${s.deadline_type})` : ""}`;

      return `${i + 1}. ${cleanedName}${sim}${eligTag}${focusTag}
   Provider: ${cleanedProv}; host: ${cleanedCountry}
   Coverage: ${s.coverage_type}${cleanedAward ? ` — ${cleanedAward}` : ""}${totalValue}
   Levels: ${levels || "any"}; fields: ${fields || "any"}${selectivity}${thresholds}${audience}${geo}${idealLine}${partnersLine}
   Deadline: ${deadlineLine}; URL: ${s.official_url || "—"}
   Eligibility: ${elig || "—"}${trustTag}`;
    }).join("\n\n");

    const universityContext = relevantUnis.map((u: any) => {
      const programs = (u.programs || []).slice(0, 4).map((p: any) => {
        const req = p.admission_requirements?.[0];
        const app = p.applications?.[0];
        return `   - ${p.program_name} (${p.degree_level}, ${p.field_of_study}): IELTS ${req?.ielts_score_min ?? "—"}, GPA ${req?.gpa_min ?? "—"}, accept ${app?.acceptance_rate != null ? app.acceptance_rate + "%" : "—"}, deadline ${req?.application_deadline ?? "—"}`;
      }).join("\n");
      return `- ${u.university_name} (${u.city}, ${u.country}) · tuition $${u.tuition_usd_per_year ?? "—"}/yr · foundation ${u.foundation_year_available ? "yes" : "no"}\n${programs}`;
    }).join("\n");

    const focusBlock = focusScholarshipName
      ? `\n\n=== STUDENT'S FOCUS SCHOLARSHIP ===
The student navigated here from the "${focusScholarshipName}" detail page and explicitly asked us to build the strategy around it. In the funding pathway section:
1. List "${focusScholarshipName}" FIRST, with a fuller paragraph than the others.
2. Cite the student's specific stats vs this scholarship's requirements (GPA, IELTS, eligibility) and assess fit honestly.
3. Give one concrete positioning angle they should lead with — anchored in their profile, not generic.
4. If the student's profile doesn't fit this scholarship at all (clear ineligibility), say so directly and recommend the strongest 1-2 alternatives from the database below.
Throughout the brief, reference this focus scholarship by name where relevant (e.g. essay angles that play to it, action-plan items that prepare for its requirements).`
      : "";

    const dbContext = `=== TOP-${scholarshipRows.length} RETRIEVED SCHOLARSHIPS (method: ${retrievalMethod}) ===
${scholarshipContext || "(none retrieved)"}${focusBlock}

=== TARGET UNIVERSITIES (${relevantUnis.length}) ===
${universityContext || "(none in database for the student's target countries)"}`;

    const lang = language === "ru" ? "Russian" : "English";
    
    const basicSections = `Generate the student's pathway report. The output is rendered both on screen AND as a printable PDF the student can email to parents and bring to advising sessions. Use clean markdown — ## for major sections, ### for sub-sections, bullet lists for items.

Required sections, in this exact order:

## Strategic positioning
One paragraph (4-6 sentences). Where this student stands among international applicants this cycle, what their strongest signals are, what their biggest gap is. Be specific and quantitative — cite GPA in context, IELTS band relative to thresholds at the targets they listed, country competitiveness if relevant.

After the paragraph, on its own line, output exactly:

**Your 30-day call:** [one specific, single-sentence strategic action this student should take in the next 30 days]

## Your university shortlist
Pull 6-9 real universities from the database section above. Organize into three buckets, in this exact order, using exactly these labels:

### Strong fits — apply with confidence
3-4 universities where the student's profile aligns well. For each:
- **University name** — one-line "why it fits you specifically"
- Specific program from the database
- Acceptance rate or selectivity context

### Aligned options — competitive but achievable
2-3 universities where it's selective but realistic with a focused application. Same format.

### Worth keeping on the radar
1-2 universities to track for next cycle or with stronger prep. Same format.

Do NOT invent universities. Pull only from the database section above.

## Your funding pathway
3-5 specific scholarships from the database that match this profile. For each:
- **Scholarship name** — award amount and coverage type
- Why this student is a real candidate
- Application timing and deadline if known
Be honest about probability. Mark each as a primary target, a secondary option, or an aspirational pick worth exploring with strategy.

## Three essay angles
Three distinct narrative angles this student could lead with. For each, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences on what specifically about this student's profile makes this angle credible — cite real details]
**Anchor it with:** [a specific story, detail, or experience from the student's profile they could build the essay around]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

## Honest gaps to close
1-3 specific weaknesses in the profile. No softening — the parent reading this should see exactly what to work on. For each gap, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [1-2 sentences citing the specific threshold or context]
**Action this month:** [one specific, single-sentence action they can start now]

### Gap 2: [short headline]
**Priority:** ...
**Why it matters:** ...
**Action this month:** ...

## Final word
One short paragraph (3-4 sentences) of specific encouragement based on this student's strongest signal — what they should believe about their candidacy as they go execute. Do not give generic motivation. Do not say "good luck." Cite something concrete from their profile and tell them why it matters.

${EDITORIAL_RULES}`;

    const premiumSections = `Generate an EXHAUSTIVE, DEEPLY PERSONALIZED report. This is the premium tier — go significantly deeper than a basic report. The output is rendered both on screen AND as a printable PDF the student keeps as a reference document. Use clean markdown.

Required sections, in this exact order:

## Strategic positioning
2-3 paragraphs. Quantitative competitive analysis: GPA percentile context, IELTS band relative to thresholds at target countries, where this profile is strongest, where it is weakest.

After the paragraphs, on its own line, output exactly:

**Your 30-day call:** [one specific, single-sentence strategic action this student should take in the next 30 days]

## Your university shortlist (15-20 universities)
Pull 15-20 real universities from the database. Organize into three buckets:

### Strong fits — apply with confidence
6-8 universities. For each:
- **University name** — fit score (0-100%) with one-line justification
- Specific program(s) with admission requirements (IELTS, GPA cutoff)
- Historical acceptance rate context
- One unique selling point specific to this student

### Aligned options — competitive but achievable
5-7 universities. Same format.

### Worth keeping on the radar
3-5 universities. Same format.

Do NOT invent universities. Pull from the database section only.

## Career ROI breakdown
For each top-3 recommended university (the strongest 3 fits):
- Typical starting salary range in this student's target field
- Employment rate within 6 months of graduation
- Notable employers from each program
- Long-term trajectory (where alumni are 5-10 years later)

## Funding deep-dive
For each shortlist of 4-6 scholarships:
- **Scholarship name** with award amount
- Probability assessment: primary target, secondary, or aspirational pick worth exploring with strategy
- Specific application strategy and timeline
- Key documents this student needs to start gathering now

Then add a sub-section:

### Combined funding scenarios
2-3 plausible combinations of scholarships, partial aid, and country-specific need-based programs that could fully fund this student. Estimate total funding for each scenario.

## Visa and post-graduation pathway
For each of the student's top 3 target countries:
- Student visa difficulty (specific to this student's nationality)
- Post-study work visa details and duration
- Path to permanent residency timeline
- Realistic challenges this student should plan for

## Three personalized essay angles
For each, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences citing specific details from this student's profile]
**Anchor it with:** [a specific story, detail, or experience]
**Plays best to:** [which 2-3 target universities this angle plays best to and why]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

## Monthly budget breakdown
For the top 3 recommended cities:
- Rent, food, transport, insurance, books, leisure (realistic ranges)
- Part-time work options and typical earnings if visa allows
- Total monthly cost and how scholarship coverage maps onto it

## Honest gaps to close
2-3 specific weaknesses in the profile. For each, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [2-3 sentences citing specific thresholds or context]
**Action this month:** [one specific action they can start now]

## Final word
One short paragraph (3-4 sentences) of specific encouragement based on this student's strongest signal — what they should believe about their candidacy as they go execute. Do not give generic motivation. Do not say "good luck." Cite something concrete from their profile and tell them why it matters.

Throughout:
- Be exceptionally specific. This is the premium tier — every paragraph should feel hand-written for this student.
- Use real data from the database — name universities, programs, scholarships, deadlines.

${EDITORIAL_RULES}`;

    const studentNationality = (profile.nationality || "").trim();
    const audienceLine = studentNationality
      ? `for ambitious students applying internationally (this student is from ${studentNationality})`
      : `for ambitious students applying internationally from anywhere in the world`;

    /* ─── Premium tier: multi-pass pipeline ─────────────────────────────
       Each section is its own focused LLM call, validated, regenerated
       on failure once, then streamed in order. Higher cost (~10 calls
       vs 1) but dramatically more reliable structure + deeper per-
       section content because each prompt is laser-focused. */
    if (grade === "premium") {
      const briefCtx: BriefContext = {
        dbContext,
        profile,
        lang,
        audienceLine,
      };

      // Per-section regen path — caller passed a section id; we run just
      // that one and stream its markdown back. No section-prefix newline
      // since the client is splicing this in place.
      if (typeof regenSection === "string" && regenSection) {
        const target = PREMIUM_SECTIONS.find(s => s.id === regenSection);
        if (!target) {
          return new Response(JSON.stringify({ error: `Unknown section id: ${regenSection}` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const stream = buildOrderedSectionStream([generateSection(target, briefCtx)]);
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // Full premium build — all sections in parallel, streamed in order.
      const sectionPromises = PREMIUM_SECTIONS.map(spec => generateSection(spec, briefCtx));
      const stream = buildOrderedSectionStream(sectionPromises);
      // Tee for cache persistence — client gets the same stream, the
      // accumulator buffers the full SSE text in the background and
      // saves to brief_cache once complete. Fire-and-forget; cache
      // failure never blocks the response.
      const { client, accumulated } = teeStreamForCache(stream);
      const scholarshipIdList = scholarshipRows.map((r: any) => r.scholarship_id).filter(Boolean);
      (async () => {
        try {
          const raw = await accumulated;
          const content = extractContentFromSse(raw);
          if (content && content.length > 200) {
            await supabase.from("brief_cache").upsert({
              profile_hash: briefProfileHash,
              language: cacheLang,
              grade,
              content,
              scholarship_ids: scholarshipIdList,
              retrieval_method: retrievalMethod,
              generated_at: new Date().toISOString(),
            }, { onConflict: "profile_hash,language,grade" });
          }
        } catch (e) {
          console.warn("[brief-cache] persist failed", (e as Error).message);
        }
      })();
      return new Response(client, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "MISS" },
      });
    }

    const systemPrompt = `You are TopUni AI — a thoughtful university admissions strategist that produces ${grade === "premium" ? "exhaustive, deeply personalized strategy reports" : "focused, actionable pathway analyses"} ${audienceLine}.

You MUST respond in ${lang}.

You have access to REAL data from our database — both scholarships (retrieved by relevance to this specific student via vector search) and universities. Use only this data when naming options. Cite scholarship names and universities verbatim from the lists below. Do not invent options not present in the data.

${dbContext}

STUDENT PROFILE:
- Name: ${profile.fullName}
- Nationality: ${profile.nationality || 'Not specified'}
- GPA: ${profile.gpa || 'Not provided'}
- IELTS: ${profile.ielts || 'Not taken'}
- TOEFL: ${profile.toefl || 'Not taken'}
- SAT: ${profile.sat || 'Not taken'}
- Grade Level: ${profile.gradeLevel}
- Target Countries: ${targetCountries.join(', ') || 'Open'}
- Intended Major: ${profile.major || 'Undecided'}
- Budget: ${profile.budget || 'Not specified'}
- Needs Scholarship: ${profile.scholarshipNeeded || 'Not specified'}
- Timeline: ${profile.timeline || 'Flexible'}
- Priorities: Prestige ${profile.prestige}/5, Scholarship ${profile.scholarship}/5, Career ROI ${profile.careerRoi}/5, Visa Access ${profile.visaAccess}/5, Location ${profile.locationPref}/5${profile.topActivity ? `
- Top activity / achievement: ${profile.topActivity}` : ''}${profile.personalStory ? `
- Personal story (the student's own words): ${profile.personalStory}` : ''}${profile.namedSchools ? `
- Specific schools on their list: ${profile.namedSchools}` : ''}

${(profile.topActivity || profile.personalStory || profile.namedSchools) ? `
CRITICAL: The student supplied personal context above. You MUST use it specifically:
${profile.topActivity ? "- Reference the top activity by name in the essay angles. The 'Anchor it with' field for at least one angle should pull from this activity directly.\n" : ""}${profile.personalStory ? "- The strategic positioning paragraph and at least one essay angle should weave in the personal story. Use their actual phrasing where natural — not generic motivational language.\n" : ""}${profile.namedSchools ? "- Mention the specific schools they named in the shortlist. If a named school isn't in the database, place it in the appropriate bucket with a note that we don't have detailed data on it yet.\n" : ""}` : ''}

${grade === "premium" ? premiumSections : basicSections}`;

    // Premium reports get the stronger model (gateway translates per provider)
    const response = await chatCompletions({
      tier: grade === "premium" ? "pro" : "flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate my personalized university pathway plan.` },
      ],
      stream: true,
      ...(grade === "premium" ? { reasoning: { effort: "high" as const } } : {}),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee + cache for the basic monolithic stream too.
    if (!response.body) {
      return new Response(JSON.stringify({ error: "No response body" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { client: basicClient, accumulated: basicAccum } = teeStreamForCache(response.body);
    const basicScholarshipIds = scholarshipRows.map((r: any) => r.scholarship_id).filter(Boolean);
    (async () => {
      try {
        const raw = await basicAccum;
        const content = extractContentFromSse(raw);
        if (content && content.length > 200) {
          await supabase.from("brief_cache").upsert({
            profile_hash: briefProfileHash,
            language: cacheLang,
            grade,
            content,
            scholarship_ids: basicScholarshipIds,
            retrieval_method: retrievalMethod,
            generated_at: new Date().toISOString(),
          }, { onConflict: "profile_hash,language,grade" });
        }
      } catch (e) {
        console.warn("[brief-cache] basic persist failed", (e as Error).message);
      }
    })();
    return new Response(basicClient, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("topuni-ai-pathway error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
