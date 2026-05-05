// essay-openers
//
// Generates 3 candidate opening paragraphs for a scholarship essay so a
// student staring at a blank textarea has somewhere to start. Each
// opener is grounded in the scholarship's positioning and the
// student's profile if available — they pick one, edit it, ship.
//
// Body:
//   {
//     scholarshipName: string,
//     scholarshipContext?: string,    // why_this_fits / how_to_win blob
//     studentProfile?: {              // optional; if absent we generate
//       major?: string,                //  generic openers
//       targetCountries?: string[],
//       gpa?: number,
//       background?: string,
//     },
//     prompt?: string,                 // essay's actual prompt question
//     wordTarget?: number,             // target word count for the essay
//     language?: "en" | "ru",
//   }
//
// Returns: { openers: [{ angle: string, text: string }, ...] } — three
// distinct angles. NOT streaming; the entire payload comes back in one
// shot so the client can render three picker cards.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface OpenerBody {
  scholarshipName?: string;
  scholarshipContext?: string;
  studentProfile?: {
    major?: string;
    targetCountries?: string[];
    gpa?: number;
    background?: string;
  };
  prompt?: string;
  wordTarget?: number;
  language?: "en" | "ru";
}

const SYSTEM_PROMPT_EN = `You are a senior admissions reader who has reviewed thousands of scholarship essays. Generate three DISTINCT opening paragraphs (~80-120 words each) for the student.

Hard rules:
- Three openers, three distinct angles. Use these labels: "Specific moment", "Argued thesis", "Contrarian frame".
- Each opener MUST start in motion — a concrete scene, sentence-level claim, or unexpected observation. NO "Ever since I was a child..." or "Throughout my life..." or any cliché backstory opener.
- Quote at least one specific detail from the scholarship/student context per opener if context is provided. Otherwise stay credibly generic but never hollow.
- Tone: Yale/Cambridge admissions reader. Tight, specific, restrained. NOT motivational poster.
- Never use the words "playbook", "stretch", "long shot", "real shot", "safety", "reach", "target school", "alumni insight", "hone", "hone in".
- No headings, no markdown. Just three paragraphs separated by a JSON structure.

Output format — RETURN ONLY JSON, no commentary:
{
  "openers": [
    { "angle": "Specific moment", "text": "..." },
    { "angle": "Argued thesis", "text": "..." },
    { "angle": "Contrarian frame", "text": "..." }
  ]
}`;

const SYSTEM_PROMPT_RU = `Вы — старший член приёмной комиссии, прочитавший тысячи мотивационных эссе. Сгенерируйте три различных вступительных абзаца (~80–120 слов каждый).

Жёсткие правила:
- Три варианта, три разных угла. Используйте эти ярлыки: "Конкретный момент", "Аргументированный тезис", "Неожиданная рамка".
- Каждое вступление ДОЛЖНО начинаться в действии — сцена, утверждение, неожиданное наблюдение. НЕ "С детства я мечтал..." или другая банальность.
- Если есть контекст программы и студента — цитируйте конкретные детали хотя бы один раз в каждом варианте.
- Тон: Yale / Cambridge. Сжато, конкретно, сдержанно. НЕ мотивирующий плакат.
- Никаких заголовков, никакой разметки. Только три абзаца внутри JSON.

Формат вывода — ТОЛЬКО JSON:
{
  "openers": [
    { "angle": "Конкретный момент", "text": "..." },
    { "angle": "Аргументированный тезис", "text": "..." },
    { "angle": "Неожиданная рамка", "text": "..." }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (SUPABASE_URL && ANON_KEY) {
      const supaRL = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const ip = clientIp(req);
      // Same per-IP cap as essay-critique (~$0.05/call expected at flash tier).
      const ok = await checkRateLimit(supaRL, { key: `essay-openers:${ip}`, perMinute: 5 });
      if (!ok) return json(429, { error: "Rate limit exceeded. Please wait a minute and try again." });
    }

    const body = (await req.json().catch(() => ({}))) as OpenerBody;
    const scholarshipName = (body.scholarshipName || "").trim();
    if (!scholarshipName) return json(400, { error: "scholarshipName is required" });

    const ru = body.language === "ru";

    const profile = body.studentProfile || {};
    const ctx: string[] = [];
    ctx.push(`SCHOLARSHIP: ${scholarshipName}`);
    if (body.scholarshipContext) ctx.push(`POSITIONING: ${body.scholarshipContext.slice(0, 800)}`);
    if (body.prompt) ctx.push(`ESSAY PROMPT: ${body.prompt}`);
    if (body.wordTarget) ctx.push(`TARGET LENGTH: ~${body.wordTarget} words`);
    if (profile.major) ctx.push(`STUDENT MAJOR/FIELD: ${profile.major}`);
    if (profile.targetCountries?.length) ctx.push(`TARGET COUNTRIES: ${profile.targetCountries.join(", ")}`);
    if (profile.gpa) ctx.push(`GPA: ${profile.gpa}`);
    if (profile.background) ctx.push(`BACKGROUND NOTES: ${profile.background.slice(0, 400)}`);

    const userMessage = ctx.join("\n");

    const resp = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: ru ? SYSTEM_PROMPT_RU : SYSTEM_PROMPT_EN },
        { role: "user", content: userMessage },
      ],
      stream: false,
    });
    if (!resp.ok) {
      const t = await resp.text();
      return json(502, { error: `AI gateway ${resp.status}`, detail: t.slice(0, 300) });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    if (!content) return json(502, { error: "AI returned empty response" });

    // Defensive parse — strip markdown fences if the model added them.
    const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: { openers?: Array<{ angle: string; text: string }> } = {};
    try { parsed = JSON.parse(cleaned); } catch {
      // Extract a JSON object from inside narrative if the model wrapped it.
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    const openers = (parsed.openers ?? [])
      .filter((o) => o && typeof o.text === "string" && o.text.length > 30)
      .slice(0, 3);
    if (openers.length === 0) return json(502, { error: "AI returned no usable openers" });

    return json(200, { openers });
  } catch (e) {
    console.error("essay-openers error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown" });
  }
});
