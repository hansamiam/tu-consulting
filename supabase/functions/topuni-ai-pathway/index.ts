// /topuni-ai strategy report — v2 generator (2026-05-28 redesign).
//
// Single Gemini 2.5 Flash call (with CachedContent), banned-phrase
// regen guard, deterministic post-processing for readinessScore +
// fitDiagnosis verdict validation. Writes to strategy_reports_v2.
//
// Replaces the v1 multi-section streaming brief pipeline + archetype
// library + biographical prose tuning. See plan:
// ~/.claude/plans/back-to-the-wizard-crispy-storm.md
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import {
  projectIntake,
  profileHashFor,
  type PromptContext,
} from "../_shared/intake-to-prompt-context.ts";
import { generateStrategy } from "../_shared/gemini-cache.ts";
import { findBanned } from "../_shared/banned-phrases.ts";
import {
  subcategoriesFor,
  findVerdictByLabel,
  type FitSubcategory,
  type Language,
  type TargetDegree,
} from "../_shared/fit-subcategories.ts";
import { axesFor } from "../_shared/strategy-prompt.ts";

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

interface AxisOut { name: string; value: number; reason: string; }
interface FitOut { subcategory: string; verdict: string; reason: string; }

export interface StrategyReportV2 {
  /** Internal taxonomy label — NOT rendered as a stamped pill. The
   *  model weaves the identity into the headline prose instead. */
  applicantType: { label: string };
  axes: AxisOut[];
  headline: string;
  honestDiagnosis: string;
  strengths: string[];
  watchouts: string[];
  focusNext: string[];
  fitDiagnosis: FitOut[];
  bestNextMove: string;
  doNotWaste: string;
  readinessScore: number;
  targetDegree: TargetDegree;
  language: Language;
  generatedAt: string;
  profileHash: string;
  /** Code-computed — derived from intake, used for the formal
   *  "Prepared for: {firstName}" line in the dossier masthead. */
  firstName: string;
}

/* ─── Capture anon brief lead (carry-over from v1) ─── */
async function captureAnonBriefLead(
  admin: ReturnType<typeof createServiceClient>,
  // deno-lint-ignore no-explicit-any
  profile: any,
  language: Language,
  req: Request,
): Promise<void> {
  try {
    const email = (profile?.email ?? "").toString().trim();
    if (!email || !email.includes("@")) {
      console.log("[brief-lead] skip", { reason: "no_email" });
      return;
    }
    const lowerEmail = email.toLowerCase();
    const emailHash = `${lowerEmail.split("@")[1] ?? "?"}/${lowerEmail.length}`;
    const targetCountries: string[] | null = Array.isArray(profile?.targetCountries)
      ? profile.targetCountries.filter((c: unknown) => typeof c === "string")
      : null;
    const url = new URL(req.url);
    const sourcePath = req.headers.get("referer") || url.pathname || null;
    const userAgent = req.headers.get("user-agent") || null;

    const { data: existing } = await admin
      .from("brief_leads")
      .select("id")
      .ilike("email", lowerEmail)
      .limit(1)
      .maybeSingle();
    if (existing) {
      console.log("[brief-lead] skip", { reason: "duplicate", email_hash: emailHash });
      return;
    }
    const { error } = await admin.from("brief_leads").insert({
      email,
      full_name: profile?.fullName ?? null,
      nationality: profile?.nationality ?? null,
      grade_level: profile?.gradeLevel ?? null,
      gpa: profile?.gpa != null ? String(profile.gpa) : null,
      major: profile?.major ?? profile?.field ?? null,
      target_countries: targetCountries,
      language,
      source_path: sourcePath,
      user_agent: userAgent,
    } as never);
    if (error) {
      console.error("[brief-lead] insert failed", { reason: "insert_failed", email_hash: emailHash, error: error.message });
      return;
    }
    console.log("[brief-lead] captured", { email_hash: emailHash });
  } catch (e) {
    console.error("[brief-lead] capture threw", { reason: "exception", error: (e as Error).message });
  }
}

/* ─── Queue welcome email (carry-over from v1) ─── */
async function queueStrategyEmail(
  admin: ReturnType<typeof createServiceClient>,
  userId: string | null,
  email: string,
  fullName: string | null,
  language: Language,
) {
  if (!email || !email.includes("@")) return;
  try {
    const idemBase = userId ?? `anon-${email.trim().toLowerCase()}`;
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "brief-generated",
        idempotencyKey: `brief-generated-${idemBase}`,
        templateData: {
          firstName: fullName?.split(" ")[0] || undefined,
          briefUrl: `${SITE}/topuni-ai${language === "ru" ? "/ru" : ""}`,
          language,
        },
      },
    });
  } catch (e) {
    console.warn("[strategy-email] enqueue failed", e);
  }
}

/* ─── Coerce + validate the raw LLM JSON into the final report ─── */
function coerceReport(
  raw: unknown,
  ctx: PromptContext,
  profileHash: string,
): StrategyReportV2 {
  const r = (raw ?? {}) as Record<string, unknown>;
  const subs = subcategoriesFor(ctx.targetDegree);

  const ap = (r.applicantType ?? {}) as Record<string, unknown>;
  const applicantType = {
    label: typeof ap.label === "string"
      ? ap.label.trim()
      : (ctx.language === "ru" ? "Развивающийся кандидат" : "Emerging Applicant"),
  };

  const expectedAxes = axesFor(ctx.targetDegree, ctx.language);
  const axesRaw = Array.isArray(r.axes) ? r.axes : [];
  const axes: AxisOut[] = expectedAxes.map((name, i) => {
    const a = axesRaw[i] as Record<string, unknown> | undefined;
    const value = clampAxis(a?.value);
    return {
      name,
      value,
      reason: typeof a?.reason === "string" ? a.reason : "",
    };
  });

  const fitRaw = Array.isArray(r.fitDiagnosis) ? r.fitDiagnosis : [];
  const fitDiagnosis: FitOut[] = subs.map((sub, i) => {
    const f = fitRaw[i] as Record<string, unknown> | undefined;
    const subcategoryLabel = sub.name[ctx.language];
    const rawVerdict = typeof f?.verdict === "string" ? f.verdict.trim() : "";
    const matched = findVerdictByLabel(sub, rawVerdict, ctx.language);
    const verdict = matched ? matched[ctx.language] : pickFallbackVerdict(sub, ctx.language);
    return {
      subcategory: subcategoryLabel,
      verdict,
      reason: typeof f?.reason === "string" ? f.reason : "",
    };
  });

  const arr3 = (k: string): string[] => {
    const v = r[k];
    if (!Array.isArray(v)) return ["", "", ""];
    return [0, 1, 2].map((i) => typeof v[i] === "string" ? (v[i] as string) : "");
  };

  const readinessScore = Math.round(
    (axes.reduce((s, a) => s + a.value, 0) / axes.length) * 2
  ) / 2;

  return {
    applicantType,
    axes,
    headline: typeof r.headline === "string" ? r.headline : "",
    honestDiagnosis: typeof r.honestDiagnosis === "string" ? r.honestDiagnosis : "",
    strengths: arr3("strengths"),
    watchouts: arr3("watchouts"),
    focusNext: arr3("focusNext"),
    fitDiagnosis,
    bestNextMove: typeof r.bestNextMove === "string" ? r.bestNextMove : "",
    doNotWaste: typeof r.doNotWaste === "string" ? r.doNotWaste : "",
    readinessScore,
    targetDegree: ctx.targetDegree,
    language: ctx.language,
    generatedAt: new Date().toISOString(),
    profileHash,
    firstName: ctx.firstName,
  };
}

function clampAxis(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function pickFallbackVerdict(sub: FitSubcategory, lang: Language): string {
  // When the LLM gave us a verdict outside the closed set, pick the
  // most cautious/honest option — the one toward the lower end of the
  // table for that subcategory.
  return sub.verdicts[sub.verdicts.length - 1][lang];
}

/* ─── Cache lookup / insert ─── */
// Type assertion: strategy_reports_v2 will be in generated types after
// the migration is applied + npm run gen:types runs. Until then we
// bypass the generated type union via `as never`.
// deno-lint-ignore no-explicit-any
const reportsTable = (admin: ReturnType<typeof createServiceClient>): any =>
  (admin as unknown as { from: (t: string) => unknown }).from("strategy_reports_v2");

async function readCached(
  admin: ReturnType<typeof createServiceClient>,
  profileHash: string,
  language: Language,
): Promise<StrategyReportV2 | null> {
  const { data, error } = await reportsTable(admin)
    .select("payload")
    .eq("profile_hash", profileHash)
    .eq("language", language)
    .maybeSingle();
  if (error) {
    console.warn("[cache] read failed:", error.message);
    return null;
  }
  return (data?.payload as StrategyReportV2) ?? null;
}

async function writeCache(
  admin: ReturnType<typeof createServiceClient>,
  report: StrategyReportV2,
  userId: string | null,
  email: string | null,
): Promise<void> {
  const { error } = await reportsTable(admin)
    .upsert(
      {
        user_id: userId,
        email,
        profile_hash: report.profileHash,
        target_degree: report.targetDegree,
        language: report.language,
        applicant_type_label: report.applicantType.label,
        readiness_score: report.readinessScore,
        payload: report,
      },
      { onConflict: "profile_hash,language" },
    );
  if (error) console.warn("[cache] write failed:", error.message);
}

/* ─── Handler ─── */

serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  if (req.method !== "POST") {
    return respondError(405, "POST only", corsHeaders);
  }

  try {
    const admin = createServiceClient();

    const ip = clientIp(req);
    const ok = await checkRateLimit(admin, { key: `ai-pathway:${ip}`, perMinute: 5 });
    if (!ok) return respondError(429, "Rate limit exceeded — please wait a minute.", corsHeaders);

    const body = await req.json().catch(() => null) as null | {
      profile?: Record<string, unknown>;
      language?: string;
    };
    if (!body?.profile) return respondError(400, "missing profile", corsHeaders);

    const language: Language = body.language === "ru" ? "ru" : "en";
    const ctx = projectIntake(body.profile, language);
    const profileHash = await profileHashFor(ctx);

    // ─── Cache hit short-circuit ────────────────────────────────────
    const cached = await readCached(admin, profileHash, language);
    if (cached) {
      console.log(`[strategy] cache hit hash=${profileHash} lang=${language}`);
      return respondJson(200, { report: cached, cached: true }, corsHeaders);
    }

    // ─── Generate ───────────────────────────────────────────────────
    const t0 = Date.now();
    const result = await generateStrategy(ctx);
    const tGen = Date.now() - t0;

    const report = coerceReport(result.report, ctx, profileHash);

    // Post-LLM final guard: if banned phrase STILL present, log + ship
    // anyway (deterministic fallback ideal lives in a follow-up; the
    // closed-set fitDiagnosis + tight schema means surface drift is
    // already small).
    const finalHit = findBanned(report);
    if (finalHit) {
      console.warn("[strategy] FINAL banned hit after regen", finalHit);
    }

    // ─── Auth resolution + persistence ──────────────────────────────
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/, ""));
      userId = data.user?.id ?? null;
    }
    const email = typeof body.profile.email === "string" ? body.profile.email.trim() : null;
    const fullName = typeof body.profile.fullName === "string" ? body.profile.fullName : null;

    await writeCache(admin, report, userId, email);

    // Fire-and-forget lead capture + welcome email.
    if (!userId && email) {
      captureAnonBriefLead(admin, body.profile, language, req).catch(() => { /* ignore */ });
    }
    if (email) {
      queueStrategyEmail(admin, userId, email, fullName, language).catch(() => { /* ignore */ });
    }

    console.log(`[strategy] generated hash=${profileHash} lang=${language} t=${tGen}ms cache=${result.usedCache} regen=${result.regenerated}`);
    return respondJson(200, {
      report,
      cached: false,
      meta: { tGen, usedCache: result.usedCache, regenerated: result.regenerated },
    }, corsHeaders);
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("[strategy] error", msg);

    // Pretty-print the most common Gemini billing failure modes so the
    // StrategyView UI can render something a human can act on. (The
    // full Gemini error stays in the logs.)
    if (/prepayment credits (?:are\s+)?depleted|prepay.*depleted/i.test(msg)) {
      return respondError(
        502,
        "AI provider billing not active. Please add prepayment credits at https://ai.studio/projects or switch to a free-tier API key.",
        corsHeaders,
        { code: "ai_billing_required" },
      );
    }
    if (/FAILED_PRECONDITION|billing must be enabled/i.test(msg)) {
      return respondError(
        502,
        "AI provider requires billing to be enabled on the project for context caching. Enable billing or use a non-cache fallback.",
        corsHeaders,
        { code: "ai_billing_precondition" },
      );
    }
    if (/RESOURCE_EXHAUSTED/i.test(msg)) {
      return respondError(
        429,
        "AI provider rate limit hit. Wait a moment and retry.",
        corsHeaders,
        { code: "ai_rate_limited" },
      );
    }

    return respondError(500, msg, corsHeaders);
  }
});
