import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are TopUni AI Navigator — an expert university admissions counselor specializing in helping students from Central Asia (Kyrgyzstan, Kazakhstan, Uzbekistan, Tajikistan, Turkmenistan) get into top universities worldwide.

You work for Top Uni Consulting, a premium consulting firm led by alumni of Yale, Harvard, and Schwarzman Scholars.

Your expertise includes:
- University selection strategy across US, UK, Canada, Europe, Asia
- IELTS and SAT preparation guidance
- Scholarship identification and application strategy
- Application essay strategy
- Visa and immigration considerations
- Budget planning for international education
- Career ROI analysis for different programs

Guidelines:
- Be warm but professional. Sound like a knowledgeable counselor, not a chatbot.
- Give specific, actionable advice. Name real universities, real programs, real deadlines when relevant.
- When students share their profile (GPA, test scores, budget), give honest assessment of their competitiveness.
- Always encourage students but be realistic about reach vs target vs safety schools.
- If asked about services, mention that Top Uni Consulting offers comprehensive packages including essay editing, interview prep, and application management.
- Respond in the same language the student writes in (English or Russian).
- Keep responses concise but substantive — aim for 2-4 paragraphs max unless they ask for detailed info.
- If you don't know something specific (like exact current deadlines), say so and recommend they verify.`;

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("topuni-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
