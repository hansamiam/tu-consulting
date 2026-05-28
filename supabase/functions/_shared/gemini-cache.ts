// Gemini 2.5 Flash with explicit CachedContent. Used by the v2
// strategy generator. Bypasses ai-gateway because the OpenAI-compat
// shim Google offers does NOT support the native cachedContents API.
// We call generativelanguage.googleapis.com/v1beta directly.
//
// Cache state lives in module memory: across warm edge-function
// invocations the cache name persists; cold starts pay a fresh
// create. This is intentional simplicity — no per-cache DB row.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

import type { Language } from "./fit-subcategories.ts";
import type { PromptContext } from "./intake-to-prompt-context.ts";
import {
  buildCachedPrefix,
  buildTail,
  buildRegenPrompt,
  STRATEGY_REPORT_SCHEMA,
} from "./strategy-prompt.ts";
import { findBanned, type BannedHit } from "./banned-phrases.ts";

const MODEL = "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const CACHE_TTL_SECONDS = 3600;
const CACHE_SAFETY_MARGIN_MS = 5 * 60 * 1000;

interface CacheEntry {
  name: string;
  expiresAt: number;
  promptHash: string;
}

const CACHE_STATE = new Map<Language, CacheEntry>();

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("gemini-cache: missing GEMINI_API_KEY");
  return key;
}

async function hashString(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

async function createCachedContent(lang: Language): Promise<CacheEntry> {
  const prefix = buildCachedPrefix(lang);
  const promptHash = await hashString(prefix);
  const url = `${API_BASE}/cachedContents?key=${getApiKey()}`;

  const body = {
    model: `models/${MODEL}`,
    contents: [
      { role: "user", parts: [{ text: prefix }] },
      { role: "model", parts: [{ text: lang === "ru"
        ? "Понял. Жду блок INTAKE для генерации StrategyReportV2 JSON."
        : "Understood. Ready for the INTAKE block to produce StrategyReportV2 JSON." }] },
    ],
    ttl: `${CACHE_TTL_SECONDS}s`,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`gemini-cache create failed (${resp.status}): ${text}`);
  }

  const json = await resp.json();
  // Resource name shape: "cachedContents/abc123..."
  const name: string = json.name;
  if (!name) throw new Error(`gemini-cache create: response missing name field: ${JSON.stringify(json)}`);

  const entry: CacheEntry = {
    name,
    expiresAt: Date.now() + (CACHE_TTL_SECONDS * 1000),
    promptHash,
  };
  CACHE_STATE.set(lang, entry);
  console.log(`[gemini-cache] created cache for lang=${lang} name=${name} hash=${promptHash}`);
  return entry;
}

/* In-process "cache disabled" flag. Set once we observe a 429
 * / FAILED_PRECONDITION / paid-tier-required error from cachedContents
 * — context caching is a paid-tier feature on Gemini, so on a free-tier
 * key it will reliably fail. Setting this short-circuits all subsequent
 * cache attempts for the lifetime of the warm edge function. Cleared
 * on cold start. */
let CACHE_DISABLED = false;

function shouldDisableCacheForever(errText: string): boolean {
  // Heuristics for "this account literally cannot use cachedContents":
  //   - FAILED_PRECONDITION (free tier without billing)
  //   - prepayment credits depleted (paid tier zero balance)
  //   - RESOURCE_EXHAUSTED on a cache CREATE call
  return /FAILED_PRECONDITION|prepayment credits depleted|billing must be enabled|RESOURCE_EXHAUSTED/i.test(errText);
}

async function getOrCreateCache(lang: Language): Promise<CacheEntry | null> {
  if (CACHE_DISABLED) return null;

  const existing = CACHE_STATE.get(lang);
  if (existing && existing.expiresAt - CACHE_SAFETY_MARGIN_MS > Date.now()) {
    const currentHash = await hashString(buildCachedPrefix(lang));
    if (currentHash === existing.promptHash) return existing;
    console.log(`[gemini-cache] prompt hash changed for lang=${lang}, rotating`);
    await deleteCache(lang).catch((e) => console.warn("[gemini-cache] rotation delete failed:", e));
  }
  try {
    return await createCachedContent(lang);
  } catch (e) {
    const msg = (e as Error).message || String(e);
    if (shouldDisableCacheForever(msg)) {
      CACHE_DISABLED = true;
      console.warn(`[gemini-cache] disabled for this process (paid feature unavailable): ${msg.slice(0, 200)}`);
    } else {
      console.warn(`[gemini-cache] create failed for lang=${lang}, falling back to inline prefix:`, msg);
    }
    return null;
  }
}

async function deleteCache(lang: Language): Promise<void> {
  const entry = CACHE_STATE.get(lang);
  if (!entry) return;
  CACHE_STATE.delete(lang);
  const url = `${API_BASE}/${entry.name}?key=${getApiKey()}`;
  await fetch(url, { method: "DELETE" }).catch(() => { /* best-effort */ });
}

interface GeminiCallOpts {
  ctx: PromptContext;
  /** Override tail content (used for regen with banned-phrase echo). */
  overrideTail?: string;
}

async function callGemini(opts: GeminiCallOpts): Promise<unknown> {
  const { ctx } = opts;
  const tail = opts.overrideTail ?? buildTail(ctx);
  const cache = await getOrCreateCache(ctx.language);

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: tail }] }],
    generationConfig: {
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 6144,
      responseMimeType: "application/json",
      responseSchema: STRATEGY_REPORT_SCHEMA,
    },
  };

  if (cache) {
    body.cachedContent = cache.name;
  } else {
    body.systemInstruction = { parts: [{ text: buildCachedPrefix(ctx.language) }] };
  }

  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${getApiKey()}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    // 400 with "cachedContents" reference → cache likely expired between read and use
    if (cache && resp.status >= 400 && text.includes("cachedContents")) {
      console.warn(`[gemini-cache] generate hit cache error (${resp.status}), rotating + retry`);
      await deleteCache(ctx.language);
      // Retry without cache (inline prefix). Avoid infinite loop.
      return await callGeminiInline(opts);
    }
    throw new Error(`gemini generate failed (${resp.status}): ${text}`);
  }

  const json = await resp.json();
  const part = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof part !== "string") {
    throw new Error(`gemini generate: missing text in response: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return JSON.parse(part);
}

async function callGeminiInline(opts: GeminiCallOpts): Promise<unknown> {
  const { ctx } = opts;
  const tail = opts.overrideTail ?? buildTail(ctx);
  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${getApiKey()}`;
  const body = {
    systemInstruction: { parts: [{ text: buildCachedPrefix(ctx.language) }] },
    contents: [{ role: "user", parts: [{ text: tail }] }],
    generationConfig: {
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 6144,
      responseMimeType: "application/json",
      responseSchema: STRATEGY_REPORT_SCHEMA,
    },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`gemini inline generate failed (${resp.status}): ${await resp.text()}`);
  }
  const json = await resp.json();
  const part = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof part !== "string") {
    throw new Error("gemini inline generate: missing text in response");
  }
  return JSON.parse(part);
}

export interface GeminiResult {
  /** The parsed strategy report from Gemini (caller validates against schema). */
  report: unknown;
  /** Whether the cached prefix was used (vs inline fallback). */
  usedCache: boolean;
  /** Whether a regen was triggered by the banned-phrase guard. */
  regenerated: boolean;
  /** Banned hit that triggered the regen, if any. */
  bannedHit?: BannedHit;
  /** Whether final output still has a banned hit (caller should use fallback). */
  finalHitRemaining?: BannedHit;
}

/**
 * Generate a strategy report. Includes cache-aware single LLM call plus
 * one regen attempt on banned-phrase hit. Caller is responsible for
 * deterministic fallback if `finalHitRemaining` is set.
 */
export async function generateStrategy(ctx: PromptContext): Promise<GeminiResult> {
  const t0 = Date.now();
  const cache = CACHE_STATE.get(ctx.language);
  const first = await callGemini({ ctx });
  const usedCache = CACHE_STATE.has(ctx.language);

  const firstHit = findBanned(first);
  if (!firstHit) {
    console.log(`[gemini] OK lang=${ctx.language} t=${Date.now() - t0}ms cache=${usedCache}`);
    return { report: first, usedCache, regenerated: false };
  }

  console.warn(`[gemini] banned hit on first attempt: ${firstHit.field}="${firstHit.match}" — regenerating`);
  const regenTail = buildRegenPrompt(ctx, firstHit.match, firstHit.field);
  const second = await callGemini({ ctx, overrideTail: regenTail });
  const secondHit = findBanned(second);
  const t = Date.now() - t0;
  console.log(`[gemini] regen lang=${ctx.language} t=${t}ms cache=${usedCache} cleared=${!secondHit}`);

  return {
    report: secondHit ? first : second,
    usedCache,
    regenerated: true,
    bannedHit: firstHit,
    finalHitRemaining: secondHit ?? undefined,
  };
}
