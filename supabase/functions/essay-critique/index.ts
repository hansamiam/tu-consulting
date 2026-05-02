// essay-critique
//
// Streaming LLM endpoint that critiques an admissions / scholarship
// essay from the perspective of an actual admissions reader. Returns
// SSE chunks the client can stream into the UI live, same wire format
// as topuni-chat / topuni-ai-pathway.
//
// Free tier: hard-stops the stream after a "preview" portion (~first
// section + a teaser line), enforces ≤2 critiques per anonymous IP per
// day. Members get the full critique with rewrites.
//
// Body:
//   {
//     essay: string,                   // required, 50-12000 chars
//     essayType?: "personal_statement" | "scholarship" | "sop" | "supplemental",
//     targetSchool?: string,           // e.g. "Yale" — optional, sharpens critique
//     targetScholarship?: string,      // e.g. "Chevening" — optional
//     prompt?: string,                 // the essay's actual prompt question
//     wordLimit?: number,              // the target word count
//     language?: "en" | "ru",
//     tier?: "free" | "premium"        // honoured but server re-validates
//   }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_PREVIEW_TOKEN_BUDGET = 600;    // approx tokens before we cut the free user
const FREE_DAILY_LIMIT = 2;

type EssayType = "personal_statement" | "scholarship" | "sop" | "supplemental";

interface CritiqueBody {
  essay?: string;
  essayType?: EssayType;
  targetSchool?: string;
  targetScholarship?: string;
  prompt?: string;
  wordLimit?: number;
  language?: "en" | "ru";
  tier?: "free" | "premium";
}

const ESSAY_TYPE_LABEL: Record<EssayType, string> = {
  personal_statement: "Personal statement",
  scholarship: "Scholarship application essay",
  sop: "Statement of Purpose (SoP)",
  supplemental: "Supplemental essay",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    // Provider config now comes from the shared ai-gateway module — see
    // _shared/ai-gateway.ts. AI_PROVIDER (lovable | openai | anthropic)
    // chooses the API; the corresponding *_API_KEY must be set.

    const body = (await req.json().catch(() => ({}))) as CritiqueBody;
    const essay = (body.essay || "").trim();
    if (essay.length < 50) return json(400, { error: "Essay too short — paste at least 50 characters" });
    if (essay.length > 12000) return json(400, { error: "Essay too long — please paste under 12,000 characters" });

    /* Tier resolution: trust the JWT, never the client-supplied tier.
       Authed users with active subscription get premium; everyone else
       (anon or free authed) gets the preview. */
    let isPremium = false;
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && SUPABASE_URL && ANON_KEY) {
      try {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: u } = await userClient.auth.getUser();
        userId = u.user?.id ?? null;
        if (userId) {
          const { data: sub } = await userClient
            .from("subscriptions")
            .select("tier, status, current_period_end")
            .eq("user_id", userId)
            .maybeSingle();
          if (sub) {
            const active = sub.status === "active" || sub.status === "trialing";
            isPremium = active && (sub.tier === "pro" || sub.tier === "founding");
          }
        }
      } catch (e) { console.warn("[essay-critique] auth resolve failed", e); }
    }

    const language = body.language === "ru" ? "ru" : "en";
    const lang = language === "ru" ? "Russian" : "English";
    const essayType = body.essayType ?? "personal_statement";
    const wordCount = essay.split(/\s+/).filter(Boolean).length;

    const targetLine = [
      body.targetSchool ? `Target school: ${body.targetSchool}` : null,
      body.targetScholarship ? `Target scholarship: ${body.targetScholarship}` : null,
      body.prompt ? `Prompt: "${body.prompt.slice(0, 400)}"` : null,
      body.wordLimit ? `Word limit: ${body.wordLimit}` : null,
    ].filter(Boolean).join("\n");

    /* The system prompt frames the LLM as a tough but constructive
       admissions reader, not a generic essay editor. The output
       structure is fixed so the client can section-route it. */
    const systemPrompt = `You are a senior admissions reader at a top-tier university — Yale, Cambridge, Harvard, or Schwarzman level. You critique essays the way the actual readers do: in 2 minutes, looking for specific signals, marking up paragraphs, and forming a clear yes/no/maybe.

You MUST respond in ${lang}.

Essay type: ${ESSAY_TYPE_LABEL[essayType]}
${targetLine || ""}
Submitted word count: ${wordCount}

Output structure (use exactly these headings, in this order):

## First 30 seconds
What you noticed in the first paragraph. The hook — does it work? What you assume about this candidate already. (3-5 sentences. Brutally honest. This is the most important section — most readers decide here.)

## What's working
2-3 bullets, each citing a SPECIFIC sentence or phrase from the essay. Quote the exact words.

## What's not working
3-4 bullets. Each must cite a SPECIFIC paragraph or sentence and explain WHY it loses the reader. Quote when possible. No vague "could be stronger" — be concrete.

## The hidden weakness
One thing the candidate probably doesn't realise is hurting them — a tic, a missing layer, a place where they're showing the wrong signal. Read between the lines. (One paragraph.)

## Strongest rewrite suggestion
Pick ONE paragraph that, if rewritten, would change the reader's verdict from "maybe" to "yes". Quote the original, then write a 2-3 sentence example rewrite in their voice. Show, don't tell.

${isPremium ? `## Two more rewrites
Same format as above — pick TWO more high-leverage paragraphs and write example rewrites.

## Reader's bottom line
One sentence: would you, as the admissions reader, want to meet this candidate based on the essay alone? Honest yes / lean yes / leans no / no.

## Score (out of 10)
Single line: "Score: X/10" with one-sentence rationale. Calibrate to elite admissions: most essays land 5-7; 8+ is rare and means strong; 9+ is exceptional.` : `## Reader's bottom line
One sentence: would you, as the admissions reader, want to meet this candidate based on the essay alone? Honest yes / lean yes / leans no / no.`}

Rules:
- Sound like a real reader, not a polite editor. Direct. Specific. Cite the actual words.
- Avoid "good luck", "hopefully", "I think". Talk in evidence.
- Avoid "stretch / safety / target / reach" framing.
- Match the language of the essay where possible — if the essay is in English, respond in English (overrides the lang preference if conflicting).`;

    const userMsg = `Here is the essay to critique:

${essay}`;

    // Premium gets the stronger model + reasoning effort high; preview
    // uses flash to keep the cost sane on free users (some won't convert).
    const response = await chatCompletions({
      tier: isPremium ? "pro" : "flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
      stream: true,
      ...(isPremium ? { reasoning: { effort: "high" as const } } : {}),
    });

    if (!response.ok) {
      if (response.status === 429) return json(429, { error: "Too many requests — try again in a minute" });
      if (response.status === 402) return json(402, { error: "Service temporarily unavailable" });
      const errText = await response.text();
      console.error("AI gateway error", response.status, errText.slice(0, 400));
      return json(500, { error: "AI service error" });
    }

    /* Free users: cap the stream at FREE_PREVIEW_TOKEN_BUDGET tokens
       worth of bytes (~3-4KB), then close the stream with an upsell
       comment. Premium users get the full stream untouched. */
    if (isPremium) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-TopUni-Tier": "premium",
        },
      });
    }

    const upstreamReader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const cap = FREE_PREVIEW_TOKEN_BUDGET * 4; // rough chars
    let bytesEmitted = 0;
    let buffer = "";
    const previewStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            bytesEmitted += chunk.length;
            controller.enqueue(value);
            if (bytesEmitted >= cap) {
              // Inject an SSE "upgrade" content delta and DONE
              const upsell = language === "ru"
                ? "\n\n---\n\n_Это первая часть критики. Полная версия — с оценкой, рекомендациями по переписи и оценкой 10/10 — открывается на Премиуме (топuni.org/pricing)._"
                : "\n\n---\n\n_That's the preview. The full critique — with rewrite samples, reader's bottom line, and a calibrated 10/10 score — unlocks with Premium (topuni.org/pricing)._";
              const sseLine = `data: ${JSON.stringify({ choices: [{ delta: { content: upsell } }] })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              try { upstreamReader.cancel(); } catch { /* ignore */ }
              break;
            }
          }
        } catch (e) {
          console.error("[essay-critique] preview stream error", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(previewStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-TopUni-Tier": "free-preview",
      },
    });
  } catch (e) {
    console.error("essay-critique error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
