/**
 * Shared AI gateway client — abstracts the provider so a single env
 * var (`AI_PROVIDER`) flips between Lovable / OpenAI / Anthropic without
 * rewriting every edge function.
 *
 * Why this exists: TopUni shipped on Lovable's AI gateway (`LOVABLE_API_KEY`).
 * Migrating off Lovable's hosted Supabase showed the gateway dependency
 * was a soft lock-in too — without that key, none of the AI surfaces
 * fire. This module severs that: every edge function that needs an
 * LLM imports `chatCompletions` / `embeddings` / `vision` from here, and
 * the provider is one env-var away from being swapped.
 *
 * Auth env (set ONE pair on the project's edge-function secrets):
 *   • Lovable     → AI_PROVIDER=lovable   + LOVABLE_API_KEY=<key>     (default if unset)
 *   • OpenAI      → AI_PROVIDER=openai    + OPENAI_API_KEY=<key>
 *   • Anthropic   → AI_PROVIDER=anthropic + ANTHROPIC_API_KEY=<key>
 *
 * Model naming: callers pass an OpenAI-style model id (e.g. "gpt-4o-mini",
 * "gpt-4o", "text-embedding-3-small") and we translate to the active
 * provider's equivalent. Lovable's gateway accepts both OpenAI and
 * Google model ids, so the translation is a no-op for "lovable" except
 * we route legacy "google/..." names through unchanged.
 */

type Provider = "lovable" | "openai" | "anthropic";

export type AITier = "flash" | "pro" | "embed-small";

/* Caller-facing model identifiers. Implementation maps to provider-specific. */
const MODEL_BY_TIER: Record<AITier, Record<Provider, string>> = {
  flash: {
    lovable:   "google/gemini-3-flash-preview",
    openai:    "gpt-4o-mini",
    anthropic: "claude-haiku-4-5-20251001",
  },
  pro: {
    lovable:   "google/gemini-2.5-pro",
    openai:    "gpt-4o",
    anthropic: "claude-sonnet-4-6",
  },
  "embed-small": {
    lovable:   "text-embedding-3-small",
    openai:    "text-embedding-3-small",
    anthropic: "text-embedding-3-small", // Anthropic doesn't ship embeddings; fallback caller should use OpenAI
  },
};

/* Pick the active provider from env. Defaults to lovable for back-compat
   with existing deployments. */
export function getProvider(): Provider {
  const raw = (Deno.env.get("AI_PROVIDER") || "").toLowerCase();
  if (raw === "openai" || raw === "anthropic" || raw === "lovable") return raw;
  return "lovable";
}

function getApiKey(provider: Provider): string {
  const k =
    provider === "openai" ? Deno.env.get("OPENAI_API_KEY") :
    provider === "anthropic" ? Deno.env.get("ANTHROPIC_API_KEY") :
    Deno.env.get("LOVABLE_API_KEY");
  if (!k) throw new Error(`AI gateway: missing ${provider.toUpperCase()}_API_KEY`);
  return k;
}

function chatBaseUrl(provider: Provider): string {
  if (provider === "openai") return "https://api.openai.com/v1/chat/completions";
  if (provider === "anthropic") return "https://api.anthropic.com/v1/messages";
  return "https://ai.gateway.lovable.dev/v1/chat/completions";
}

function embeddingsUrl(provider: Provider): string {
  if (provider === "openai") return "https://api.openai.com/v1/embeddings";
  // Lovable proxies OpenAI embeddings; Anthropic doesn't have native embeddings,
  // so we route through OpenAI directly when provider=anthropic.
  if (provider === "anthropic") return "https://api.openai.com/v1/embeddings";
  return "https://ai.gateway.lovable.dev/v1/embeddings";
}

function embeddingsKey(provider: Provider): string {
  // For Anthropic users, embeddings still need OpenAI; we read OPENAI_API_KEY explicitly
  if (provider === "anthropic") {
    const k = Deno.env.get("OPENAI_API_KEY");
    if (!k) throw new Error("AI gateway: anthropic provider requires OPENAI_API_KEY for embeddings");
    return k;
  }
  return getApiKey(provider);
}

/* Chat completions (streaming or non-streaming) — OpenAI-compat shape.
   For Lovable + OpenAI the request body passes through unchanged.
   Anthropic uses /v1/messages with a different shape; we translate. */
export interface ChatCompletionsOpts {
  tier: AITier;                         // "flash" | "pro"
  messages: Array<{ role: "system" | "user" | "assistant"; content: string | unknown[] }>;
  stream?: boolean;
  reasoning?: { effort: "low" | "medium" | "high" };
  /** Forces OpenAI-compat `response_format: { type: "json_object" }`.
   *  Lovable's gateway supports this on Gemini 2.5; OpenAI gpt-4o
   *  supports it natively. Anthropic ignores (use prompt-side schema
   *  instruction instead). Callers should also instruct the model in
   *  the user prompt to emit JSON — this flag tightens the response
   *  shape but doesn't replace good prompting. */
  jsonMode?: boolean;
  // Provider-specific overrides
  modelOverride?: string;
}

export async function chatCompletions(opts: ChatCompletionsOpts): Promise<Response> {
  const provider = getProvider();
  const apiKey = getApiKey(provider);
  const model = opts.modelOverride || MODEL_BY_TIER[opts.tier][provider];

  if (provider === "anthropic") {
    // Translate to Anthropic's /v1/messages shape
    const sys = opts.messages.find((m) => m.role === "system");
    const rest = opts.messages.filter((m) => m.role !== "system");
    const body = {
      model,
      max_tokens: 4096,
      stream: !!opts.stream,
      ...(sys && typeof sys.content === "string" ? { system: sys.content } : {}),
      messages: rest.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : (m.content as unknown[]),
      })),
    };
    return fetch(chatBaseUrl(provider), {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  // Lovable + OpenAI use the same OpenAI-compatible shape.
  // The `reasoning` field is provider/model-specific:
  //   - Lovable's gateway accepts it for Gemini 2.5 family.
  //   - OpenAI rejects it as "Unrecognized request argument" on every
  //     non-reasoning model (gpt-4o, gpt-4o-mini); only o1/o3-family
  //     models accept it. Forwarding it unconditionally 400'd every
  //     enrich-university call (and every brief-sections call) until
  //     this gate was added.
  const supportsReasoning =
    provider === "lovable"
    || (provider === "openai" && /^o[1-9]/i.test(model));

  return fetch(chatBaseUrl(provider), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      stream: !!opts.stream,
      ...(opts.reasoning && supportsReasoning ? { reasoning: opts.reasoning } : {}),
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
}

/* Embeddings — single-input or batch. Returns number[][]. */
export interface EmbeddingsOpts {
  input: string | string[];
  // We default to text-embedding-3-small (1536 dim). Override only if you
  // know what you're doing (e.g. text-embedding-3-large for higher quality).
  modelOverride?: string;
}

export async function embeddings(opts: EmbeddingsOpts): Promise<number[][]> {
  const provider = getProvider();
  const apiKey = embeddingsKey(provider);
  const model = opts.modelOverride || "text-embedding-3-small";
  const inputs = Array.isArray(opts.input) ? opts.input : [opts.input];

  const resp = await fetch(embeddingsUrl(provider), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: inputs }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Embeddings ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = await resp.json();
  const arr = data?.data;
  if (!Array.isArray(arr) || arr.length !== inputs.length) {
    throw new Error(`Unexpected embeddings shape: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return arr.map((d: { embedding: number[] }) => {
    if (!Array.isArray(d.embedding)) throw new Error("Bad embedding row");
    return d.embedding;
  });
}

/* Vision — pass an image (data URL OR base64+mime) and an instruction.
   Returns the model's text output. Implemented as a single chat-completions
   call with a multimodal user message. */
export interface VisionOpts {
  tier?: AITier;                        // defaults to flash
  systemPrompt?: string;
  instruction: string;
  imageBase64: string;                  // raw base64, NOT a data URL
  mime: string;                         // e.g. "image/png", "application/pdf"
}

export async function vision(opts: VisionOpts): Promise<string> {
  const provider = getProvider();
  const apiKey = getApiKey(provider);
  const tier: AITier = opts.tier || "flash";
  const model = MODEL_BY_TIER[tier][provider];
  const dataUrl = `data:${opts.mime};base64,${opts.imageBase64}`;

  if (provider === "anthropic") {
    // Anthropic vision shape (only image/png|jpeg|webp|gif natively;
    // PDFs we ask via Files API, which is more involved — for v1 we
    // fall back to OpenAI for vision when provider=anthropic.
    const fallbackKey = Deno.env.get("OPENAI_API_KEY");
    if (fallbackKey) {
      return openaiVisionCall(fallbackKey, "gpt-4o-mini", opts);
    }
    throw new Error("AI gateway: anthropic provider needs OPENAI_API_KEY for vision");
  }

  // Lovable + OpenAI multimodal chat
  const body = {
    model,
    messages: [
      ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
      {
        role: "user",
        content: [
          { type: "text", text: opts.instruction },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    stream: false,
  };
  const resp = await fetch(chatBaseUrl(provider), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Vision ${resp.status}: ${t.slice(0, 400)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content as string | undefined;
  if (!text) throw new Error("Vision returned empty content");
  return text.trim();
}

async function openaiVisionCall(apiKey: string, model: string, opts: VisionOpts): Promise<string> {
  const dataUrl = `data:${opts.mime};base64,${opts.imageBase64}`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
        {
          role: "user",
          content: [
            { type: "text", text: opts.instruction },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI vision ${resp.status}: ${(await resp.text()).slice(0, 400)}`);
  const data = await resp.json();
  return (data?.choices?.[0]?.message?.content as string ?? "").trim();
}

/* Helper: which provider is configured? Useful for ops/observability headers. */
export function activeProviderTag(): string {
  return getProvider();
}
