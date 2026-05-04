// topuni-counselor-greeting
//
// One-shot, non-streaming endpoint that returns the AI counselor's
// FIRST message — a personalised opening that reads the student's
// profile + brief and proposes 1-2 specific things to dig into. Plus
// 3 follow-up question chips the student can tap.
//
// Why this exists: the counselor's empty state used to be "Hi {name}.
// I have your profile and your strategy brief in front of me. Ask me
// anything." That's flat — a chatbot saying "I exist, ask me stuff."
// A real coach opens with "Sara — I read your brief just now. Three
// things stand out that I'd want to talk through first." This endpoint
// produces THAT.
//
// Flash-tier (cheap, fast). Cost ~$0.0006/greeting. Public (verify_jwt
// false) so anon users with a profile + brief can get one.

import { chatCompletions } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Profile {
  fullName?: string;
  nationality?: string;
  gpa?: string | number | null;
  ielts?: string | number | null;
  sat?: string | number | null;
  gradeLevel?: string;
  targetCountries?: string[];
  major?: string;
  budget?: string;
  scholarshipNeeded?: string;
  timeline?: string;
  topActivity?: string;
  personalStory?: string;
  namedSchools?: string;
}

interface GreetingOutput {
  greeting?: string;
  follow_ups?: string[];
}

function isolateJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

function profileBlock(p: Profile): string {
  const lines = [
    `- Name: ${p.fullName || "—"}`,
    `- Grade level: ${p.gradeLevel ?? "—"}`,
    `- GPA: ${p.gpa ?? "—"}`,
    `- IELTS: ${p.ielts ?? "Not taken"}`,
    `- SAT: ${p.sat ?? "Not taken"}`,
    `- Target countries: ${(p.targetCountries ?? []).join(", ") || "Open"}`,
    `- Intended major: ${p.major ?? "Undecided"}`,
    `- Budget: ${p.budget ?? "—"}`,
    `- Needs scholarship: ${p.scholarshipNeeded ?? "—"}`,
    `- Timeline: ${p.timeline ?? "Flexible"}`,
  ];
  if (p.topActivity)   lines.push(`- Top activity / achievement: ${p.topActivity}`);
  if (p.personalStory) lines.push(`- Personal story (their words): ${p.personalStory}`);
  if (p.namedSchools)  lines.push(`- Specific schools they named: ${p.namedSchools}`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  let body: { profile?: Profile; briefContent?: string; language?: string };
  try { body = await req.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  const profile = body.profile ?? {};
  const brief = (body.briefContent ?? "").trim();
  const lang = body.language === "ru" ? "Russian" : "English";

  // Need at least a name + something else to write a real greeting.
  if (!profile.fullName) {
    return json(400, { error: "Profile name required" });
  }

  const firstName = profile.fullName.split(/\s+/)[0];

  // Cap the brief context — we only need the synthesis-bearing top of the
  // brief (positioning + first match section) to ground the greeting.
  // 4000 chars ≈ first 2-3 sections.
  const briefContext = brief.length > 4000 ? brief.slice(0, 4000) + "\n\n[...brief continues]" : brief;

  const prompt = `You are TopUni Counselor — a Yale/Cambridge/Harvard-alum admissions strategist greeting this student at the START of an advising session. The student just opened the chat for the first time. Write the FIRST thing they see.

Output ONLY a JSON object matching the schema. No markdown fences, no preamble.

SCHEMA:
{
  "greeting": "string — opening message in markdown. 3-5 sentences. Address the student by first name. Lead with ONE concrete observation from their profile or brief — a real number, a real scholarship name, a real story they shared, a real threshold they're hitting or missing. End with one specific invitation that names what you'd dig into next.",
  "follow_ups": "array of EXACTLY 3 short follow-up prompts the student could click. Each is ≤55 chars, action-verb start, names something CONCRETE from this student's file — a scholarship by name, a school by name, the 30-day call, a deadline, a specific score threshold, a specific essay anchor. BANNED generic prompts: 'Plan IELTS prep strategy', 'Review scholarship options', 'Discuss applications', 'Explore opportunities', 'Help with applications'. GOOD examples: 'Walk me through the Schwarzman timeline', 'Open my IELTS retake plan', 'Find a hook for my robotics story', 'Compare Cambridge and ETH for me'. Each prompt should reference SOMETHING the student or their brief actually mentioned."
}

TONE RULES — read carefully, the model usually breaks these:
- BANNED openers: "Hi {name}, it's great to connect", "I'm here to help", "I'm excited to work with you", "Welcome", "Thanks for sharing", "Looking at your profile", "I see that you", "Great to meet you".
- BANNED closers: "How can I help?", "What strategies have you considered?", "Let me know if you have questions", "Looking forward to it", "Let's explore", "Let's dive in", "Let's refine", "Let's see how we can", "Maximize your potential", "Looking forward to working with you".
- BANNED filler verbs in the closing: "explore", "refine", "maximize", "leverage", "navigate" (when used generically — "navigate the visa process" is OK, "navigate this together" is not).
- BANNED words: "stretch", "long shot", "real shot", "safety school", "playbook", "journey", "potential" (as in "your potential").
- Open with a fact + a stance, not pleasantries. Example feel: "Sara — your 3.8 + IELTS 7.0 puts you right on the Cambridge edge, which is the most interesting thing in your file. The 30-day call from your brief is a re-test in October, and that's the right call."
- The CLOSING sentence must name a SPECIFIC thing to discuss next — a named scholarship, a deadline, a section of the brief, a gap, an essay angle. Example closers: "Want to start with the Schwarzman timeline, or unpack the IELTS retake plan?" / "The personal essay anchor in your brief is undersold — that's where I'd start." / "Where do you want to push first — Cambridge fit or the funding stack?"
- Confident, direct, with a point of view. Warm but never sappy. Coach voice, not chatbot. The student should feel like the counselor knows their file and has opinions.
- ${brief ? "You have READ the brief. Reference it explicitly — a named scholarship, the 30-day call, a noted gap, or a specific paragraph point. Skip brief reference and the greeting reads generic." : "No brief yet. Don't fake it. Invite them to generate one OR start with a specific question that doesn't need brief context."}
- One short markdown paragraph. NO bullet lists in the greeting itself (the follow-ups serve that role).
- Output language: ${lang}.

STUDENT PROFILE:
${profileBlock(profile)}

${brief ? `STRATEGY BRIEF (for grounding — reference it):\n${briefContext}\n` : "(No brief generated yet.)"}

Output the JSON now. The greeting addresses ${firstName} by first name and opens with a concrete observation.`;

  let parsed: GreetingOutput;
  try {
    // Pro tier — flash consistently broke the "no chatbot closer" rule
    // ("Let's dig in", "Maximize your potential" etc). Greeting fires
    // once per session so the cost (~$0.005) is acceptable for the
    // jump in tone fidelity. The output is short (≤200 tokens) so the
    // pro-tier latency stays under ~3s.
    const resp = await chatCompletions({
      tier: "pro",
      messages: [
        { role: "system", content: "You are a Yale/Cambridge/Harvard-trained admissions strategist. Output only valid JSON matching the requested schema. The greeting reads like a real human coach with a point of view — confident, direct, never sappy. NEVER use chatbot patterns ('Let's dig in', 'How can I help', 'Looking forward to'). The student must feel like the counselor knows their specific file." },
        { role: "user", content: prompt },
      ],
      stream: false,
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[topuni-counselor-greeting] gateway error", resp.status, t.slice(0, 300));
      return json(502, { error: "Generation failed" });
    }
    const data = await resp.json();
    const raw = (
      data?.choices?.[0]?.message?.content
      ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
      ?? ""
    ) as string;
    if (!raw) return json(502, { error: "Empty completion" });
    parsed = JSON.parse(isolateJson(raw)) as GreetingOutput;
  } catch (e) {
    console.warn("[topuni-counselor-greeting] parse failed", (e as Error).message);
    return json(502, { error: "Parse failed" });
  }

  // Validate + sanitize.
  const greetingOut = typeof parsed.greeting === "string" ? parsed.greeting.trim() : "";
  if (greetingOut.length < 50 || greetingOut.length > 1500) {
    return json(502, { error: "Invalid greeting length" });
  }

  const followUpsOut = Array.isArray(parsed.follow_ups)
    ? parsed.follow_ups
        .filter((f: unknown): f is string => typeof f === "string" && f.length >= 8 && f.length <= 80)
        .slice(0, 4)
    : [];

  return json(200, {
    ok: true,
    greeting: greetingOut,
    follow_ups: followUpsOut,
  });
});
