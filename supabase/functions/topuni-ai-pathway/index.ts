import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, language, reportGrade } = await req.json();
    const grade = reportGrade || "basic";
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
    
    const basicSections = `Generate a pathway analysis with these sections (use markdown headers):

## Strategy Summary
A personalized overview of their competitiveness and recommended approach.

## Recommended Universities
Categorize into Stretch, Target, and Safety tiers. For each university, explain WHY it's a good fit. Include specific programs from the database.

## Scholarship Opportunities
List specific scholarships that match their profile. Include deadlines.

## Test Prep Recommendations
Based on their current scores, recommend target scores and prep strategy.

## Application Timeline
A month-by-month action plan.

## Key Risks & Mitigation
Honest assessment of challenges.

Be specific, use real data from the database, and be honest about competitiveness.`;

    const premiumSections = `Generate an EXHAUSTIVE, DEEPLY PERSONALIZED hyper-intelligence report. This is our PREMIUM tier — go significantly deeper than a standard report. Cover ALL of the following sections in comprehensive detail:

## Executive Summary
Detailed competitive analysis including percentile positioning among international applicants.

## University Matches (15-20 universities)
For EACH university, provide:
- Fit percentage (0-100%) with justification
- Tier classification: Safety / Target / Reach / Dream
- Specific program recommendations with admission requirements
- Historical acceptance rate context
- Unique selling points for THIS student specifically

## Career ROI Analysis
For each recommended university:
- Average starting salary for their target field
- Employment rate within 6 months
- Industry connections and notable employers
- Long-term career trajectory projection

## Scholarship Deep Dive
- Probability assessment for each scholarship (Low/Medium/High)
- Application strategy and timeline for EACH scholarship
- Combined funding scenarios (multiple scholarships)
- Alternative funding sources (government grants, private foundations)

## Visa & Immigration Pathway
- Post-graduation work visa details per country
- Path to permanent residency timeline
- Visa difficulty score and mitigation strategies

## Personalized Essay Angles
- 3-5 unique essay topic suggestions tailored to their background
- How to differentiate from other Central Asian applicants
- University-specific supplemental essay guidance

## Monthly Budget Breakdown
For top 5 recommended cities:
- Rent, food, transport, insurance, entertainment
- Part-time work opportunities and typical earnings

## Risk Matrix
Detailed risk assessment with probability and impact ratings.
Mitigation strategy for each identified risk.

## 90-Day Action Plan
Week-by-week actionable steps starting from TODAY.

Be exceptionally thorough. This report should feel like it was written by a team of 5 expert advisors who spent 3 hours analyzing this student's profile.`;

    const systemPrompt = `You are TopUni AI — the world's most advanced university pathway intelligence system. You create ${grade === "premium" ? "exhaustive, deeply personalized hyper-intelligence reports" : "focused, actionable pathway analyses"} for students from Central Asia.

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

${grade === "premium" ? premiumSections : basicSections}`;

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
