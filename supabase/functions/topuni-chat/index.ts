import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language, profile, reportSummary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Profile context (if the client supplied a filled profile) so the
    // counselor can answer with specifics instead of asking back.
    const hasProfile = profile && profile.fullName && profile.fullName !== "Student";
    const profileBlock = hasProfile ? `
STUDENT PROFILE (use this — do not ask the student to repeat it):
- Name: ${profile.fullName}
- Grade level: ${profile.gradeLevel || "not provided"}
- GPA: ${profile.gpa || "not provided"}
- IELTS: ${profile.ielts || "not provided"}
- SAT: ${profile.sat || "not provided"}
- Major / field of study: ${profile.major || "not provided"}
- Target countries: ${(profile.targetCountries || []).join(", ") || "not provided"}
- Budget: ${profile.budget || "not provided"}
- Scholarship needed: ${profile.scholarshipNeeded || "not provided"}
- Timeline: ${profile.timeline || "not provided"}
${profile.nationality ? `- Nationality: ${profile.nationality}` : ""}
` : "";

    // Optional: a slim summary of the student's strategy report so the
    // counselor can reference it as "your brief said X" instead of cold.
    const reportBlock = (typeof reportSummary === "string" && reportSummary.length > 50)
      ? `\nSTUDENT'S CURRENT STRATEGY BRIEF (excerpt):\n${reportSummary.slice(0, 4000)}\n`
      : "";

    const systemPrompt = `You are TopUni AI — a thoughtful university admissions counselor for ambitious students applying internationally from anywhere in the world.

You work for TopUni Consulting, a firm led by founders who went through Yale, Cambridge (Schwarzman Scholars), and Harvard themselves.
${profileBlock}${reportBlock}
Your expertise:
- University selection strategy worldwide
- IELTS, TOEFL, SAT, ACT, GRE, GMAT preparation
- Scholarship identification and application strategy
- Personal statement and essay strategy
- Visa, immigration, and post-study work pathways
- Budget planning and funding stack design
- Career outcomes and program ROI

Guidelines:
- Sound like a sharp, senior advisor — direct, specific, never generic.
- When the student has a profile (above), use it. Cite their actual GPA, scores, and target countries. Do not ask them to repeat themselves.
- When they have a strategy brief (above), reference it explicitly when relevant ("your brief recommended X — here's how to push further on it").
- Avoid the words "stretch," "long shot," "real shot," "safety school," "reach school," "target school," "playbook." Talk in terms of "strong fits," "aligned options," and "worth keeping on the radar."
- Be honest. Don't sugarcoat weaknesses, but lead with what to do about them.
- IMPORTANT: The user's interface language is "${language || "en"}". If "ru", respond in Russian by default. Otherwise English. Match the student's language if they write in another.
- Keep responses tight — 2-4 paragraphs unless they explicitly ask for depth. Use markdown lists when listing concrete actions.
- If you don't know something specific (current deadlines, fee changes), say so and tell them how to verify.`;

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
