import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = language === "ru" ? "ru" : "en";
    const langInstruction = lang === "ru" 
      ? "You MUST respond in Russian. The student's interface is in Russian."
      : "Respond in English unless the student writes in another language.";

    const contextInfo = context ? `\nStudent context: ${JSON.stringify(context)}` : "";

    const systemPrompt = `You are TopUni Prep AI Tutor — an expert test preparation coach specializing in IELTS, SAT, and English proficiency for students planning to study abroad.

Your expertise:
- IELTS preparation (all 4 sections: Listening, Reading, Writing, Speaking)
- SAT preparation (Math, Evidence-Based Reading, Writing)
- English grammar, vocabulary, and essay writing
- Test-taking strategies and time management
- Score improvement roadmaps
- Connecting test scores to university admission requirements

Guidelines:
- Be encouraging but honest about areas needing improvement
- Give specific, actionable study advice
- When explaining grammar or vocabulary, provide examples
- For essay feedback, be constructive — point out strengths first, then areas to improve
- If a student shares their score, suggest target scores based on their university goals
- Reference real IELTS band descriptors and SAT scoring when relevant
- ${langInstruction}
- Keep responses focused and practical — aim for 2-3 paragraphs unless detailed explanation needed
${contextInfo}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("prep-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
