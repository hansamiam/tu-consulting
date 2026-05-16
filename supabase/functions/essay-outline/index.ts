// essay-outline
//
// Generates a structured outline for a scholarship essay so the
// student isn't staring at a blank page wondering how to organize
// 500 words. Different from essay-openers (which gives three first
// paragraphs); this gives a section-by-section scaffold the student
// fills in.
//
// Why it matters: most strong applicants stall not on writing
// sentences but on STRUCTURE. The personal statement that wins
// Schwarzman doesn't have a great opening sentence — it has a
// great architecture (hook → stake → narrative → reflection →
// stake reframed). This endpoint gives them that architecture
// tailored to the prompt + their profile.
//
// Body:
//   {
//     scholarshipName: string,
//     scholarshipContext?: string,
//     essayPrompt?: string,         // the actual prompt question
//     essayTitle?: string,          // "Leadership essay" / "Diversity"
//     wordTarget?: number,          // 500 / 650 / 1000
//     studentProfile?: {
//       major?: string,
//       targetCountries?: string[],
//       gpa?: number,
//       background?: string,
//     },
//     language?: "en" | "ru",
//   }
//
// Returns:
//   {
//     overview: string,             // 1-2 sentences on the essay's job
//     sections: [
//       {
//         title: string,            // "Hook" / "Stake" / "Reflection"
//         hint: string,              // 1-3 sentences guiding what to write
//         suggested_words: number,   // ~ rough word target for this section
//       }, ...
//     ]
//   }
//
// Non-streaming. Cached/cheap (flash-tier model).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { EDITORIAL_RULES_TIGHT } from "../_shared/editorial-rules.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

interface OutlineBody {
  scholarshipName?: string;
  scholarshipContext?: string;
  essayPrompt?: string;
  essayTitle?: string;
  wordTarget?: number;
  studentProfile?: {
    major?: string;
    targetCountries?: string[];
    gpa?: number;
    background?: string;
  };
  language?: "en" | "ru";
}

const SYSTEM_PROMPT_EN = `You are a senior admissions reader who has worked with thousands of scholarship essays. The student is about to draft an essay; give them an architecture, not a template.

Hard rules:
- Build 4-6 sections that move the reader through a complete arc: anchor → stake → narrative → reflection → forward (the exact section names are yours to pick — they should fit THIS essay).
- Each section's "hint" is 1-3 SHORT sentences telling the writer what to put there. Be specific, not vague — quote a detail from the prompt or scholarship if provided.
- "suggested_words" should sum to roughly the target wordTarget. If wordTarget is 500, sections might be 60/100/180/100/60. If 1000, scale up.
- The "overview" line summarises the essay's job in one sentence ("This essay needs to convince a reader that [specific claim] without saying it directly").
- NO clichés — no "ever since I was a child", no "leaders are made not born", no "throughout my journey", no "I have always been passionate". The hint must STEER AWAY from clichés actively when the prompt invites them.

${EDITORIAL_RULES_TIGHT}

Output format — RETURN ONLY JSON, no commentary:
{
  "overview": "...",
  "sections": [
    { "title": "...", "hint": "...", "suggested_words": 60 },
    { "title": "...", "hint": "...", "suggested_words": 120 },
    ...
  ]
}`;

const SYSTEM_PROMPT_RU = `Вы — старший член приёмной комиссии, прочитавший тысячи мотивационных эссе. Студент готовится писать эссе; дайте ему архитектуру, а не шаблон.

Жёсткие правила:
- Постройте 4-6 разделов, ведущих читателя через полную дугу: якорь → ставка → история → рефлексия → взгляд вперёд (точные названия разделов выберите сами, чтобы подходили ИМЕННО этому эссе).
- В каждом "hint" 1-3 КОРОТКИХ предложения, говорящих автору что сюда положить. Конкретно, не общо — цитируйте деталь из промпта или стипендии, если она дана.
- "suggested_words" должны примерно сложиться в wordTarget. Если 500 — например 60/100/180/100/60.
- "overview" — одно предложение: "Это эссе должно убедить читателя в [конкретное утверждение], не говоря этого напрямую".
- НИКАКИХ банальностей — никакого "с детства я мечтал", "лидерами не рождаются", "на протяжении моего пути", "я всегда был увлечён". Подсказки должны АКТИВНО уводить от банальностей.

Формат вывода — ТОЛЬКО JSON:
{
  "overview": "...",
  "sections": [
    { "title": "...", "hint": "...", "suggested_words": 60 },
    ...
  ]
}`;

serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "POST only" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (SUPABASE_URL && ANON_KEY) {
      const supaRL = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const ip = clientIp(req);
      const ok = await checkRateLimit(supaRL, { key: `essay-outline:${ip}`, perMinute: 5 });
      if (!ok) return json(429, { error: "Rate limit exceeded. Please wait a minute and try again." });
    }

    const body = (await req.json().catch(() => ({}))) as OutlineBody;
    const scholarshipName = (body.scholarshipName || "").trim();
    if (!scholarshipName) return json(400, { error: "scholarshipName is required" });

    const ru = body.language === "ru";
    const target = Math.max(150, Math.min(2000, body.wordTarget ?? 500));

    const profile = body.studentProfile || {};
    const ctx: string[] = [];
    ctx.push(`SCHOLARSHIP: ${scholarshipName}`);
    if (body.essayTitle) ctx.push(`ESSAY TITLE: ${body.essayTitle}`);
    if (body.essayPrompt) ctx.push(`ESSAY PROMPT: ${body.essayPrompt}`);
    ctx.push(`TARGET LENGTH: ${target} words`);
    if (body.scholarshipContext) ctx.push(`POSITIONING: ${body.scholarshipContext.slice(0, 800)}`);
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

    const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: { overview?: string; sections?: Array<{ title: string; hint: string; suggested_words?: number }> } = {};
    try { parsed = JSON.parse(cleaned); } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    const overview = (parsed.overview ?? "").trim();
    const sections = (parsed.sections ?? [])
      .filter((s) => s && typeof s.title === "string" && typeof s.hint === "string" && s.title.length > 0 && s.hint.length > 10)
      .slice(0, 7)
      .map((s) => ({
        title: s.title.trim(),
        hint: s.hint.trim(),
        // Clamp to a sensible range; if the model returns garbage,
        // fall back to evenly distributing the target.
        suggested_words: Math.max(20, Math.min(800, Math.round(s.suggested_words ?? target / 5))),
      }));
    if (sections.length === 0) return json(502, { error: "AI returned no usable sections" });

    return json(200, { overview, sections });
  } catch (e) {
    console.error("[essay-outline] error", e);
    return json(500, { error: (e as Error).message ?? "Unknown error" });
  }
});
