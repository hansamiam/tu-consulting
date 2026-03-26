import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch matching universities from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get universities with programs, requirements, scholarships
    const { data: universities } = await supabase
      .from("universities")
      .select(`
        university_id, university_name, country, city, tuition_usd_per_year,
        cost_of_living_index, language_of_instruction, website_url,
        foundation_year_available, gap_year_accepted,
        programs (
          program_id, program_name, degree_level, field_of_study, duration_years,
          admission_requirements ( ielts_score_min, sat_score_min, gpa_min, application_deadline ),
          applications ( acceptance_rate, visa_difficulty_score, portal_url )
        ),
        scholarships ( scholarship_name, coverage_type, stipend_amount, eligibility_requirements, application_deadline )
      `);

    // Filter relevant universities based on student profile
    const targetCountries = profile.targetCountries || [];
    const studentGpa = parseFloat(profile.gpa) || 0;
    const studentIelts = parseFloat(profile.ielts) || 0;
    const needsScholarship = profile.scholarshipNeeded === "yes";

    const relevantUnis = (universities || []).filter((u: any) => {
      if (targetCountries.length > 0 && !targetCountries.includes(u.country)) return false;
      return true;
    }).slice(0, 30); // Cap at 30 for prompt size

    const dbContext = relevantUnis.map((u: any) => {
      const programs = (u.programs || []).map((p: any) => {
        const req = p.admission_requirements?.[0];
        const app = p.applications?.[0];
        return `  - ${p.program_name} (${p.degree_level}, ${p.field_of_study}): IELTS min ${req?.ielts_score_min || 'N/A'}, GPA min ${req?.gpa_min || 'N/A'}, acceptance ${app?.acceptance_rate ? app.acceptance_rate + '%' : 'N/A'}, deadline ${req?.application_deadline || 'N/A'}`;
      }).join("\n");
      const schols = (u.scholarships || []).map((s: any) =>
        `  - ${s.scholarship_name} (${s.coverage_type}): ${s.eligibility_requirements || 'Open'}, deadline ${s.application_deadline || 'N/A'}`
      ).join("\n");
      return `${u.university_name} (${u.city}, ${u.country}) — Tuition: $${u.tuition_usd_per_year || 'N/A'}/yr, Foundation Year: ${u.foundation_year_available ? 'Yes' : 'No'}\nPrograms:\n${programs}\nScholarships:\n${schols}`;
    }).join("\n\n");

    const lang = language === "ru" ? "Russian" : "English";
    const systemPrompt = `You are TopUni AI Pathway Advisor. You create detailed, personalized university application strategies for students from Central Asia.

You MUST respond in ${lang}.

You have access to REAL university data from our database. Use it to make specific, data-backed recommendations.

AVAILABLE UNIVERSITIES AND PROGRAMS:
${dbContext}

STUDENT PROFILE:
- Name: ${profile.fullName}
- GPA: ${profile.gpa || 'Not provided'}
- IELTS: ${profile.ielts || 'Not taken'}
- SAT: ${profile.sat || 'Not taken'}
- Grade Level: ${profile.gradeLevel}
- Target Countries: ${targetCountries.join(', ') || 'Open'}
- Intended Major: ${profile.major || 'Undecided'}
- Budget: ${profile.budget || 'Not specified'}
- Needs Scholarship: ${profile.scholarshipNeeded || 'Not specified'}
- Timeline: ${profile.timeline || 'Flexible'}
- Priorities: Prestige ${profile.prestige}/5, Scholarship ${profile.scholarship}/5, Career ROI ${profile.careerRoi}/5, Visa Access ${profile.visaAccess}/5, Location ${profile.locationPref}/5

Generate a comprehensive pathway analysis with these sections (use markdown headers):

## Strategy Summary
A personalized overview of their competitiveness and recommended approach.

## Recommended Universities
Categorize into Stretch, Target, and Safety tiers. For each university, explain WHY it's a good fit based on their profile. Include specific programs from the database.

## Scholarship Opportunities
List specific scholarships from the database that match their profile. Include deadlines and coverage details.

## Test Prep Recommendations
Based on their current scores, recommend target scores and preparation strategy.

## Application Timeline
A month-by-month action plan based on their exam date/timeline.

## Key Risks & Mitigation
Honest assessment of challenges and how to address them.

Be specific, use real data from the database, and be honest about competitiveness.`;

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
          { role: "user", content: `Generate my personalized university pathway plan.` },
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
    console.error("topuni-ai-pathway error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
