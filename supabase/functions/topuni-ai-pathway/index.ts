import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

const EMBEDDING_MODEL = "text-embedding-3-small";
const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

/* Queue the brief-generated welcome email to authed users. Idempotency
   key is per-user — they get exactly one of these regardless of how
   many times they regenerate. Fire-and-forget; never blocks the
   stream. Called from the cache-persist closures so the email lands
   only after the brief is actually saved. */
async function queueBriefGeneratedEmail(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  email: string,
  fullName: string | null,
  language: "en" | "ru",
  briefSlug?: string,
) {
  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "brief-generated",
        idempotencyKey: `brief-generated-${userId}`,
        templateData: {
          firstName: fullName?.split(" ")[0] || undefined,
          briefUrl: briefSlug ? `${SITE}/brief/${briefSlug}` : `${SITE}/topuni-ai${language === "ru" ? "/ru" : ""}`,
          language,
        },
      },
    });
  } catch (e) {
    console.warn("[brief-generated] enqueue failed", e);
  }
}

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

/* v6 magazine cache replay — emits per-section JSON events the new
   BriefMagazine renderer expects. Cache content shape:
     { schema: 2, sections: { whereYouStand: {...}, ... } }
   We replay in PREMIUM_SECTIONS order so the client renders in journey
   order; missing sections are skipped (renderer keeps their skeletons). */
function replayMagazineCachedAsSse(sections: Record<string, unknown>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      try {
        for (const spec of PREMIUM_SECTIONS) {
          const payload = sections[spec.id];
          if (payload === undefined) continue;
          c.enqueue(enc.encode(`data: ${JSON.stringify({ section: spec.id, payload })}\n\n`));
        }
        c.enqueue(enc.encode(`data: [DONE]\n\n`));
      } finally {
        c.close();
      }
    },
  });
}

/* Legacy basic-tier markdown cache replay — unchanged from v5. Kept
   because the basic-tier prompt still streams raw markdown; only the
   premium pipeline moved to JSON-per-section in v6. */
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
   reverse of the legacy markdown-chunked SSE format. Used to capture
   the FULL basic-tier brief for caching after the client stream
   completes. The v6 magazine path persists sections as JSON directly,
   so it doesn't go through here. */
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
  /** Raw JSON string the model emitted (already passed validator). */
  rawJson: string;
  /** Parsed payload object — what the renderer consumes. */
  payload: unknown;
  /** Whether the payload passed validation (after any regen). */
  valid: boolean;
  /** Whether we needed a second attempt to satisfy the validator. */
  regenerated: boolean;
  /** Reason from the FIRST validator if it failed. Telemetry-only. */
  failureReason?: string;
}

/** Best-effort JSON parse — returns null on failure. */
function safeParseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}

/** Strip markdown fences if the model added them despite jsonMode. */
function isolateJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

/* Generate a single section. Calls the model once with response_format
   json_object; if a validator fails, regenerates ONCE with a stricter
   prompt; falls back to the first attempt if both fail. Returns the
   raw JSON string + parsed payload — the SSE emitter forwards the JSON
   verbatim and the renderer parses on the client. */
async function generateSection(spec: SectionSpec, ctx: BriefContext): Promise<SectionResult> {
  const sysContent = `You are TopUni AI, an expert admissions strategist. You output ONLY a valid JSON object matching the schema in the user message. No markdown fences. No preamble.`;

  let firstRaw = "";
  let firstReason: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = attempt === 1
      ? spec.buildPrompt(ctx)
      : buildRegenPrompt(spec, ctx, firstReason ?? "validation failed");
    try {
      // 2026-05-17: token-spend minimisation pass — downgraded magazine
      // sections from "pro" + reasoning:high to "flash" + no reasoning.
      // gpt-4o-mini is sufficient for the structured JSON shape we now
      // demand, and the cost-per-brief drops ~10x. Per-section spec
      // reasoning hints are intentionally ignored at the call site.
      const resp = await chatCompletions({
        tier: "flash",
        messages: [
          { role: "system", content: sysContent },
          { role: "user",   content: prompt },
        ],
        stream: false,
        jsonMode: true,
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.warn(`[brief-sections-v6] ${spec.id} attempt ${attempt} HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
        if (attempt === 1) { firstReason = `gateway HTTP ${resp.status}`; continue; }
        // Degraded: return a stub payload so the renderer shows a placeholder card.
        const stub = JSON.stringify({ kicker: spec.id, headline: spec.heading, lead: "This section couldn't be generated.", error: firstReason });
        return { spec, rawJson: firstRaw || stub, payload: safeParseJson(firstRaw || stub), valid: false, regenerated: true, failureReason: firstReason };
      }
      const data = await resp.json();
      const text = (
        data?.choices?.[0]?.message?.content
        ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
        ?? ""
      ) as string;
      const isolated = isolateJson(text);
      const parsed = safeParseJson(isolated);

      const validation = spec.validate?.(isolated, ctx) ?? (parsed ? { ok: true } : { ok: false, reason: "not valid JSON" });
      if (validation.ok) {
        return { spec, rawJson: isolated, payload: parsed, valid: true, regenerated: attempt > 1, failureReason: firstReason };
      }
      if (attempt === 1) {
        firstRaw = isolated;
        firstReason = validation.reason ?? "unspecified";
        continue;
      }
      // Second attempt also failed — keep the longer / more-complete of the two
      const better = isolated.length > firstRaw.length ? isolated : firstRaw;
      return { spec, rawJson: better, payload: safeParseJson(better), valid: false, regenerated: true, failureReason: firstReason };
    } catch (e) {
      console.warn(`[brief-sections-v6] ${spec.id} attempt ${attempt} threw:`, (e as Error).message);
      if (attempt === 2) {
        const stub = JSON.stringify({ kicker: spec.id, headline: spec.heading, lead: "This section couldn't be generated.", error: (e as Error).message });
        return { spec, rawJson: firstRaw || stub, payload: safeParseJson(firstRaw || stub), valid: false, regenerated: true, failureReason: (e as Error).message };
      }
    }
  }
  // Unreachable — both attempts always return.
  const stub = JSON.stringify({ kicker: spec.id, headline: spec.heading, lead: "Generation failed.", error: "unreachable" });
  return { spec, rawJson: stub, payload: safeParseJson(stub), valid: false, regenerated: true };
}

/* v6 magazine stream — emits one SSE event per completed section as
   `data: {"section":"<id>","payload":{...}}`. Sections are awaited in
   PREMIUM_SECTIONS order so the client renders in journey order. The
   payload is the parsed JSON the renderer consumes directly. */
function buildOrderedSectionStream(promises: Array<Promise<SectionResult>>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (section: string, payload: unknown) => {
        const chunk = JSON.stringify({ section, payload });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      };
      try {
        for (let i = 0; i < promises.length; i++) {
          const result = await promises[i];
          emit(result.spec.id, result.payload ?? { error: "no payload" });
          if (!result.valid) {
            console.warn(`[brief-sections-v6] section ${result.spec.id} delivered invalid (reason: ${result.failureReason ?? "?"})`);
          }
          if (result.regenerated) {
            console.log(`[brief-sections-v6] section ${result.spec.id} regenerated`);
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (e) {
        console.error("[brief-sections-v6] stream error:", e);
        emit("_error", { message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });
}

/* Tee a magazine stream + accumulate parsed payloads keyed by section
   id so the cache write can persist `{ sections: {...} }` directly. */
function teeMagazineStreamForCache(source: ReadableStream<Uint8Array>): {
  client: ReadableStream<Uint8Array>;
  accumulated: Promise<Record<string, unknown>>;
} {
  const [forClient, forCache] = source.tee();
  const accumulated = (async () => {
    const reader = forCache.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const out: Record<string, unknown> = {};
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) buf += dec.decode(value, { stream: true });
      // Process complete SSE events as they arrive
      while (true) {
        const sep = buf.indexOf("\n\n");
        if (sep === -1) break;
        const event = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        if (!event.startsWith("data: ")) continue;
        const json = event.slice(6).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const parsed = JSON.parse(json) as { section?: string; payload?: unknown };
          if (parsed.section && parsed.payload !== undefined) {
            out[parsed.section] = parsed.payload;
          }
        } catch { /* ignore */ }
      }
    }
    return out;
  })();
  return { client: forClient, accumulated };
}

serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();

    // Rate limit: 5 brief generations per minute per IP. A real visitor will
    // never hit this; abuse scripts will. Each blocked request saves ~$0.02
    // of GPT-4o-mini spend.
    const ip = clientIp(req);
    const ok = await checkRateLimit(supabase, { key: `ai-pathway:${ip}`, perMinute: 5 });
    if (!ok) {
      return respondError(429, "Rate limit exceeded — please wait a minute.", corsHeaders);
    }

    const { profile, language, reportGrade, regenSection, focusScholarshipId } = await req.json();
    const grade = reportGrade || "basic";
    const cacheLang = language || "en";

    // Bumped whenever the brief prompt structure changes (sections
    // cut/added, validators changed, output contract bumped). Edge
    // function writes this on every cache insert; lookup requires a
    // match. Old cached briefs against a different version simply miss
    // and get re-generated against the current prompt.
    // 2026-05-10: v2 — cut Career ROI / Visa / Monthly Budget / Final
    // Word sections, tightened shortlist + funding section prompts.
    // 2026-05-10: v3 — peer-mentor voice overhaul. Second-person
    // throughout, banned clinical phrasing ("the student", "the
    // candidate"), opening framing line per section so the brief reads
    // like a trusted older peer speaking directly to them.
    // 2026-05-10 v5 — bumped to invalidate stale 9-section cached
    // briefs from the pre-consolidation era. User flagged the dashboard
    // TOC was showing the old Career ROI / Visa / Monthly Budget /
    // Final Word sections that were retired in 2026-05. Bumping the
    // version forces regeneration with the consolidated 5-section
    // PREMIUM_SECTIONS list (or the basicSections 5-section prompt for
    // non-premium tier).
    // 2026-05-17 v6-magazine — full editorial-magazine redesign of the
    // premium brief. Sections restructured into a 6-step journey
    // (whereYouStand → whereYouCanLand → howYoullPay → whatToWrite →
    // whatsBlockingYou → whatToDoThisMonth) and each section now emits
    // STRUCTURED JSON instead of markdown. SSE protocol changes shape
    // (`data: {section, payload}`) so old cached briefs would mis-render
    // under the new client. v5 cache rows are skipped by the
    // prompt_version mismatch and the row gets re-generated on first
    // hit. Basic tier still streams legacy markdown — only premium
    // moved to the magazine flow in v6.
    const PROMPT_VERSION = "v8-minimal-no-funding-2026-05-20";

    // ─── Cache hit check ────────────────────────────────────────────────
    // Skip for regenSection (the user is explicitly asking us to redo
    // a single section) and for missing profile (we'd hash zeros).
    const briefProfileHash = await computeBriefHash(profile || {}, grade, cacheLang);
    if (!regenSection && profile) {
      const { data: cached } = await supabase
        .from("brief_cache")
        .select("content, scholarship_ids, generated_at, prompt_version")
        .eq("profile_hash", briefProfileHash)
        .eq("language", cacheLang)
        .eq("grade", grade)
        .eq("prompt_version", PROMPT_VERSION)
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
          // Cache hit + fresh — branch on schema:
          //   v6 magazine: content is a JSON object { sections: {...} }
          //   legacy basic: content is a markdown string
          let magazineSections: Record<string, unknown> | null = null;
          if (grade === "premium") {
            try {
              const obj = typeof cached.content === "string"
                ? JSON.parse(cached.content)
                : (cached.content as { sections?: Record<string, unknown> });
              if (obj && typeof obj === "object" && obj.sections) {
                magazineSections = obj.sections as Record<string, unknown>;
              }
            } catch { /* fall through to legacy replay */ }
          }
          const stream = magazineSections
            ? replayMagazineCachedAsSse(magazineSections)
            : replayCachedAsSse(typeof cached.content === "string" ? cached.content : "");
          return new Response(stream, {
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
        const userClient = createUserClient(auth);
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
          // Single-literal select — supabase-js can only infer the row
          // type when .select() receives a string literal; `+`-concat
          // collapses to `string` and the row type fell back to
          // GenericStringError, breaking .filter()/spread downstream.
          .select(
            `scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, target_degree_level, target_fields, target_demographics, partner_universities, eligible_countries, application_deadline, deadline_type, min_gpa, gpa_scale, min_ielts, min_toefl, selectivity_level, ideal_candidate_profile, eligibility_requirements, citizenship_requirements, official_url, source_url, last_verified_at, verification_status, confidence, data_completeness_score, why_this_fits, strategy_notes`,
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
          `scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, target_degree_level, target_fields, application_deadline, eligibility_requirements, citizenship_requirements, official_url, source_url, last_verified_at, verification_status, why_this_fits, strategy_notes`,
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
          `scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, target_degree_level, target_fields, application_deadline, eligibility_requirements, citizenship_requirements, official_url, source_url, last_verified_at, verification_status, why_this_fits, strategy_notes, how_to_win, ideal_candidate_profile`,
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
    
    // Basic-tier prompt consolidated 2026-05-10. Was 6 sections (ending
    // with a "Final word" encouragement paragraph that risked platitudes).
    // Now 5 focused sections — each one earns its place. Quality over
    // coverage. Mirror of the premium consolidation in brief-sections.ts.
    const basicSections = `Write a personal admissions brief addressed directly to the reader. You are a trusted older peer who's been through this and made it — a successful older student or recent grad from their region. You're sitting across the table from them. Address them as "you" the whole way through. Use their first name once if it lands naturally. Speak with warmth and specifics, never jargon, never "the student" or "the candidate" — that breaks the voice instantly.

The brief is rendered on screen AND as a printable PDF the reader keeps. Use clean markdown — ## for major sections, ### for sub-sections, bullet lists for items. Quality > coverage. No filler sections, no encouragement-only paragraphs, no generic by-country info that's a Google search.

Required sections, in this exact order:

## Strategic positioning
OPEN with a single thesis sentence (≤30 words) that names YOUR strongest signal AND your biggest competitive reality in one breath — this is the brief's pull-quote. Use a phrasing like "Here's what I see in you:" or "Here's how I'd pitch you:" so it reads as a person speaking, not a database printout. Then 1-2 paragraphs of honest, specific positioning addressed to "you": your GPA in percentile context, your IELTS band relative to thresholds at the targets you listed, your country competitiveness if relevant. Cite numbers.

After the paragraphs, on its own line, output exactly:

**Your 30-day call:** [one specific, single-sentence action — direct, addressed to "you"]

## Schools where these scholarships land you
TopUni is scholarship-first, not school-first. This section is NOT a traditional university shortlist — it's a 3-school illustrative slice showing where the scholarships in your funding pathway actually land you. Three is the cap.

Open with one short framing sentence in second person — "Here's where these scholarships actually take you:" — then list 3 universities in a flat list (no buckets, no "Strong fits / Aligned / Worth keeping" labels). For each:
- **University name** — one tight sentence on why YOU fit THIS program AND which scholarship from your funding pathway covers it (cite the scholarship by name + a real signal from your profile — your GPA, field, country alignment, named activity). Address them as "you", not "the student".
- Specific program + admission threshold (IELTS, GPA cutoff) when known
- One concrete career anchor: typical starting salary band in your field, ONE notable employer, OR one alumni outcome — pick the strongest single fact, not all of them

End with one short coda sentence framing this as illustrative — "These three are where the funding pathway lands you cleanly. Other schools fit too — your scholarships are the engine, the school is the vehicle."

Do NOT invent universities. Pull only from the database section above. Do NOT include 6+ schools — three is the cap.

## Funding pathway
Open with one short sentence in second person — "Here's how I'd stack your funding:" — then pick 3-4 specific scholarships from the database that YOU should actually apply to first. For each:
- **Scholarship name** — award amount + coverage type
- One sentence on how YOUR profile maps to this program's stated audience (cite a real signal — addressed to "you"). Do NOT predict odds in percentages or label as 'reach' / 'safety' / 'long shot' / 'within reach'.
- Application timing — deadline + when you'd start drafting if you were them
- The first concrete document or task to start now

End with a single one-line "Stack:" callout naming a plausible combination of 2 scholarships from the list above that together would fully fund them.

## Three essay angles
Open with a short framing sentence — something like "If I were writing your application essay, here's three ways I'd open it:" — then three distinct narrative angles. For each, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences in second person — cite real details from your profile]
**Anchor it with:** [a specific story, detail, or experience from their inputs]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

If the profile includes a "Top activity" or "Personal story", at LEAST one angle's "Anchor it with" line MUST pull from that directly.

## Honest gaps to close
Open with one short sentence in second person — something like "Here's what I'd worry about if I were you, and what I'd actually do about it:" — then 1-3 specific weaknesses. No softening. For each gap, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [1-2 sentences in second person — talk to them, cite specific thresholds]
**Action this month:** [one specific, single-sentence action you'd tell them to start now]

### Gap 2: [short headline]
**Priority:** ...
**Why it matters:** ...
**Action this month:** ...

${EDITORIAL_RULES}`;

    // Legacy 9-section premiumSections prompt retired 2026-05-10.
    // Premium tier now runs through the multi-pass pipeline at
    // PREMIUM_SECTIONS (brief-sections.ts) with 5 consolidated
    // sections. Non-premium tier uses basicSections above (also 5).
    // This empty fallback is unreachable in practice (the line-880
    // branch returns first when grade==="premium") but kept as a
    // safety net so the code below doesn't reference an undefined.
    const premiumSections = basicSections;

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
          return respondError(400, `Unknown section id: ${regenSection}`, corsHeaders);
        }
        const stream = buildOrderedSectionStream([generateSection(target, briefCtx)]);
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // Full premium build — all sections in parallel, magazine SSE.
      const sectionPromises = PREMIUM_SECTIONS.map(spec => generateSection(spec, briefCtx));
      const stream = buildOrderedSectionStream(sectionPromises);
      // Tee for cache persistence — accumulator collects JSON payloads
      // keyed by section id; persisted as { schema: 2, sections: {...} }.
      const { client, accumulated } = teeMagazineStreamForCache(stream);
      const scholarshipIdList = scholarshipRows.map((r: any) => r.scholarship_id).filter(Boolean);
      (async () => {
        try {
          const sections = await accumulated;
          if (sections && Object.keys(sections).length > 0) {
            await supabase.from("brief_cache").upsert({
              profile_hash: briefProfileHash,
              language: cacheLang,
              grade,
              content: JSON.stringify({ schema: 2, sections }),
              brief_schema_version: 2,
              scholarship_ids: scholarshipIdList,
              retrieval_method: retrievalMethod,
              prompt_version: PROMPT_VERSION,
              generated_at: new Date().toISOString(),
            } as never, { onConflict: "profile_hash,language,grade" });

            // Fire the brief-generated email to the authed user (if any).
            // Anon users are handled by the brief_leads → lifecycle-emails-
            // cron path. Resolved here (not at the top of the function)
            // so cache-hit branches don't re-send.
            try {
              const auth = req.headers.get("Authorization");
              if (auth?.startsWith("Bearer ")) {
                const { data: { user } } = await createUserClient(auth).auth.getUser();
                if (user?.id && user.email) {
                  const { data: prof } = await supabase
                    .from("student_profiles")
                    .select("full_name")
                    .eq("user_id", user.id)
                    .maybeSingle();
                  await queueBriefGeneratedEmail(
                    supabase, user.id, user.email,
                    prof?.full_name ?? null,
                    cacheLang === "ru" ? "ru" : "en",
                  );
                }
              }
            } catch (e) {
              console.warn("[brief-generated] post-magazine notify failed", e);
            }
          }
        } catch (e) {
          console.warn("[brief-cache] persist failed", (e as Error).message);
        }
      })();
      return new Response(client, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "MISS", "X-Brief-Schema": "2" },
      });
    }

    const systemPrompt = `You are TopUni AI — a thoughtful university admissions strategist that produces ${grade === "premium" ? "exhaustive, deeply personalized strategy reports" : "focused, actionable pathway analyses"} ${audienceLine}.

You MUST respond in ${lang}.

You have access to REAL data from our database — both scholarships (retrieved by relevance to this specific student via vector search) and universities. Use only this data when naming options. Cite scholarship names and universities verbatim from the lists below. Do not invent options not present in the data.

DATA TRUST: when a scholarship row in the database below carries a "Source row: thin" marker or a "(per our extraction)" suffix on its thresholds, that row was extracted from a sparse provider page with low confidence. Do NOT quote its min_gpa / min_ielts / etc. as a hard rule the student must clear. Frame those thresholds as "the listing notes a minimum of X — verify on the official site". A thin row's name + provider + country + coverage are still trustworthy; its numeric thresholds may not be.

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

    // 2026-05-17: tier:flash for both premium + basic monolithic. The
    // premium tier is now served by the JSON-section path above; this
    // branch is the legacy basic-tier fallback. Cheap.
    const response = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate my personalized university pathway plan.` },
      ],
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return respondError(429, "Rate limit exceeded. Please try again in a moment.", corsHeaders);
      }
      if (response.status === 402) {
        return respondError(402, "Service temporarily unavailable.", corsHeaders);
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return respondError(500, "AI service error", corsHeaders);
    }

    // Tee + cache for the basic monolithic stream too.
    if (!response.body) {
      return respondError(500, "No response body", corsHeaders);
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
            prompt_version: PROMPT_VERSION,
            generated_at: new Date().toISOString(),
          }, { onConflict: "profile_hash,language,grade" });

          // Mirror of the magazine path — fire brief-generated to authed
          // users only. Anon path covered by brief_leads → lifecycle.
          try {
            const auth = req.headers.get("Authorization");
            if (auth?.startsWith("Bearer ")) {
              const { data: { user } } = await createUserClient(auth).auth.getUser();
              if (user?.id && user.email) {
                const { data: prof } = await supabase
                  .from("student_profiles")
                  .select("full_name")
                  .eq("user_id", user.id)
                  .maybeSingle();
                await queueBriefGeneratedEmail(
                  supabase, user.id, user.email,
                  prof?.full_name ?? null,
                  cacheLang === "ru" ? "ru" : "en",
                );
              }
            }
          } catch (e) {
            console.warn("[brief-generated] post-basic notify failed", e);
          }
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
    return respondError(500, e instanceof Error ? e.message : "Unknown error", corsHeaders);
  }
});
