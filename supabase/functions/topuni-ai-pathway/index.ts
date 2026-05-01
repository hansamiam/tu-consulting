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
    
    const basicSections = `Generate the student's pathway report. The output is rendered both on screen AND as a printable PDF the student can email to parents and bring to advising sessions. Use clean markdown — ## for major sections, ### for sub-sections, bullet lists for items.

Required sections, in this exact order:

## Strategic positioning
One paragraph (4-6 sentences). Where this student stands among international applicants this cycle, what their strongest signals are, what their biggest gap is. Be specific and quantitative — cite GPA in context, IELTS band relative to thresholds at the targets they listed, country competitiveness if relevant.

After the paragraph, on its own line, output exactly:

**Your 30-day call:** [one specific, single-sentence strategic action this student should take in the next 30 days]

## Your university shortlist
Pull 6-9 real universities from the database section above. Organize into three buckets, in this exact order, using exactly these labels:

### Strong fits — apply with confidence
3-4 universities where the student's profile aligns well. For each:
- **University name** — one-line "why it fits you specifically"
- Specific program from the database
- Acceptance rate or selectivity context

### Aligned options — competitive but achievable
2-3 universities where it's selective but realistic with a focused application. Same format.

### Worth keeping on the radar
1-2 universities to track for next cycle or with stronger prep. Same format.

Do NOT invent universities. Pull only from the database section above.

## Your funding pathway
3-5 specific scholarships from the database that match this profile. For each:
- **Scholarship name** — award amount and coverage type
- Why this student is a real candidate
- Application timing and deadline if known
Be honest about probability. Mark each as a primary target, secondary option, or stretch.

## Your 90-day action plan
A week-by-week sequence starting from today. Group as:

### Weeks 1–2 — Foundation
2-3 concrete actions

### Weeks 3–6 — Drafting
2-3 concrete actions

### Weeks 7–12 — Submission
2-3 concrete actions

Reference the student's specific scores and target countries. Concrete actions only — no "research more" filler.

## Three essay angles
Three distinct narrative angles this student could lead with. For each, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences on what specifically about this student's profile makes this angle credible — cite real details]
**Anchor it with:** [a specific story, detail, or experience from the student's profile they could build the essay around]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

## Honest gaps to close
1-3 specific weaknesses in the profile. No softening — the parent reading this should see exactly what to work on. For each gap, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [1-2 sentences citing the specific threshold or context]
**Action this month:** [one specific, single-sentence action they can start now]

### Gap 2: [short headline]
**Priority:** ...
**Why it matters:** ...
**Action this month:** ...

## Next steps
Two short paragraphs:
- **In Discover** (TopUni's scholarship database): your full ranked match list with strategy notes is waiting there. Mention 2-3 specific scholarships the student should review first based on their profile.
- **In Academy**: live monthly workshops with our founders go deeper on essay strategy, country deep-dives, and admissions interview prep — useful as the student moves into drafting.

Then close with one sentence of specific encouragement based on this student's strongest signal.

Throughout the report:
- Be specific, use real data from the database, name names, cite numbers
- Avoid the words "stretch," "long shot," "real shot," "safety school"
- Avoid generic advice — every sentence should be specific to this student
- Write in a confident, direct voice the student would respect`;

    const premiumSections = `Generate an EXHAUSTIVE, DEEPLY PERSONALIZED report. This is the premium tier — go significantly deeper than a basic report. The output is rendered both on screen AND as a printable PDF the student keeps as a reference document. Use clean markdown.

Required sections, in this exact order:

## Strategic positioning
2-3 paragraphs. Quantitative competitive analysis: GPA percentile context, IELTS band relative to thresholds at target countries, where this profile is strongest, where it is weakest.

After the paragraphs, on its own line, output exactly:

**Your 30-day call:** [one specific, single-sentence strategic action this student should take in the next 30 days]

## Your university shortlist (15-20 universities)
Pull 15-20 real universities from the database. Organize into three buckets:

### Strong fits — apply with confidence
6-8 universities. For each:
- **University name** — fit score (0-100%) with one-line justification
- Specific program(s) with admission requirements (IELTS, GPA cutoff)
- Historical acceptance rate context
- One unique selling point specific to this student

### Aligned options — competitive but achievable
5-7 universities. Same format.

### Worth keeping on the radar
3-5 universities. Same format.

Do NOT invent universities. Pull from the database section only.

## Career ROI breakdown
For each top-3 recommended university (the strongest 3 fits):
- Typical starting salary range in this student's target field
- Employment rate within 6 months of graduation
- Notable employers from each program
- Long-term trajectory (where alumni are 5-10 years later)

## Funding deep-dive
For each shortlist of 4-6 scholarships:
- **Scholarship name** with award amount
- Probability assessment: primary target / secondary / stretch
- Specific application strategy and timeline
- Key documents this student needs to start gathering now

Then add a sub-section:

### Combined funding scenarios
2-3 plausible combinations of scholarships, partial aid, and country-specific need-based programs that could fully fund this student. Estimate total funding for each scenario.

## Visa and post-graduation pathway
For each of the student's top 3 target countries:
- Student visa difficulty (specific to this student's nationality)
- Post-study work visa details and duration
- Path to permanent residency timeline
- Realistic challenges this student should plan for

## Three personalized essay angles
For each, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences citing specific details from this student's profile]
**Anchor it with:** [a specific story, detail, or experience]
**Plays best to:** [which 2-3 target universities this angle plays best to and why]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

## Monthly budget breakdown
For the top 3 recommended cities:
- Rent, food, transport, insurance, books, leisure (realistic ranges)
- Part-time work options and typical earnings if visa allows
- Total monthly cost and how scholarship coverage maps onto it

## Honest gaps to close
2-3 specific weaknesses in the profile. For each, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [2-3 sentences citing specific thresholds or context]
**Action this month:** [one specific action they can start now]
**30-60 day plan:** [the next-step plan after that]

## 90-day action plan
Week-by-week from today, grouped as Weeks 1-2 / 3-6 / 7-12. 3-4 concrete actions per group, with specific deliverables.

## Next steps
Two short paragraphs:
- **In Discover** (the scholarship database): name 3-5 specific scholarships the student should open first.
- **In Academy**: live monthly workshops with our founders. Mention which workshop topic this student would benefit from most.

Close with one sentence of specific encouragement based on the student's strongest signal.

Throughout:
- Be exceptionally specific. This is the premium tier — every paragraph should feel hand-written for this student.
- Use real data from the database — name universities, programs, scholarships, deadlines.
- Avoid the words "stretch," "long shot," "real shot," "safety school."
- Confident, direct voice. The student should feel respected.`;

    const studentNationality = (profile.nationality || "").trim();
    const audienceLine = studentNationality
      ? `for ambitious students applying internationally (this student is from ${studentNationality})`
      : `for ambitious students applying internationally from anywhere in the world`;

    const systemPrompt = `You are TopUni AI — a thoughtful university admissions strategist that produces ${grade === "premium" ? "exhaustive, deeply personalized strategy reports" : "focused, actionable pathway analyses"} ${audienceLine}.

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

    // Use stronger model for premium reports
    const model = grade === "premium" ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate my personalized university pathway plan.` },
        ],
        stream: true,
        ...(grade === "premium" ? { reasoning: { effort: "high" } } : {}),
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
