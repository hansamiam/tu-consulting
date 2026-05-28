// Recommendation Letter Asks — TopUni Field Guide N°2, $19 paid
// product. Structured around the 5 relationship archetypes that
// produce ~95% of grad-school recommendation letters. Each archetype
// gets a full ask email + follow-up + thank-you + red-flag list.
//
// Why this exists: the rec letter is the single most outsourced
// piece of an application — but the QUALITY of the letter depends
// almost entirely on how you ask. Generic ChatGPT advice ("be
// professional, give them 4 weeks") gets you a generic letter.
// Tailoring the ask to the relationship is what unlocks letters
// that actually move the needle.
//
// If updating: keep email templates SPECIFIC, not generic. The whole
// product's value is that the buyer can paste-and-edit, not
// brainstorm from scratch. Don't sand the specifics off.

export interface AskTemplate {
  /** Subject line for the email. */
  subject: string;
  /** The full body — paste-and-adapt. */
  body: string;
}

export interface RelationshipArchetype {
  /** Display name + the relationship dynamic in one line. */
  label: string;
  /** Profile of who this person is and what they need from you. */
  profile: string;
  /** What kind of letter they'll write best vs. worst. */
  bestAt: string;
  /** Red flags from THEIR side that mean "find someone else." */
  redFlags: string[];

  /** Initial ask. */
  ask: AskTemplate;
  /** Follow-up if they haven't replied within 5 business days. */
  followup: AskTemplate;
  /** Thank-you after they've submitted the letter. */
  thanks: AskTemplate;
}

export const ARCHETYPES: RelationshipArchetype[] = [
  {
    label: "The close professor — knows your work intimately",
    profile:
      "The professor whose seminar you took twice, whose office hours you actually attended, who has read your writing and given specific feedback on it. Wrote you a thesis grade or an A+ on a hard paper. Knows your name without checking the roster.",
    bestAt:
      "Best at: depth + specificity. They can write a letter that says 'Anya argued in her March 12 paper that…' instead of 'Anya is hardworking.' This is the gold-standard letter.",
    redFlags: [
      "They take more than a week to reply to any of your emails — they're overcommitted and your letter will be generic.",
      "They ask you to draft the letter yourself for them to 'edit' — flattering on the surface but admissions committees can spot self-drafted letters in two paragraphs.",
      "They sound surprised you're applying anywhere — they don't see your trajectory, so the letter won't either.",
    ],
    ask: {
      subject: "Recommendation letter request — [Your Name], [Program] applications",
      body:
`Dear Professor [Lastname],

I hope you're well — I've been thinking about [a specific recent thing they did: paper, talk, course they taught, something visible].

I'm applying to grad programs in [field] this cycle: [list 3–5 schools, no more]. The deadlines run from [earliest date] through [latest date]. I'd be honoured if you would write a letter of recommendation for me.

I'm asking you specifically because [one or two SPECIFIC reasons: the seminar where you saw my work, the paper you supervised, the thing about your feedback that shaped my direction]. I'd want a letter that speaks to [what you'd most want this letter to show: research ability / writing / persistence / specific intellectual interests].

I'll send you a packet this week with my CV, my draft personal statement, the deadlines and submission portals, and a one-page "brag sheet" with the specific projects + dates + your courses where you saw me work. If it's easier to talk through it, I can stop by office hours or schedule a call.

Would you be willing? No pressure if the timing is bad — I'd rather you say so now than write a hurried letter.

With gratitude,
[Your Name]
[Phone or alternate email]`,
    },
    followup: {
      subject: "Re: Recommendation letter — checking in",
      body:
`Dear Professor [Lastname],

Just a quick check-in on the recommendation letter request from [date]. The first deadline is [date in 3+ weeks] — happy to give you whatever framing or details would help, or to find another time to talk if this isn't the right ask.

Best,
[Your Name]`,
    },
    thanks: {
      subject: "Thank you — letters submitted",
      body:
`Dear Professor [Lastname],

I just confirmed your letter landed at [program]. Thank you — sincerely. I know letters take real time, and yours specifically draws on years of work you've watched me do. I'll write again with the outcomes when they come in.

In the meantime, [one specific small follow-up: an article you read that they'd like, a question from a recent class, an update on a project they supervised].

With gratitude,
[Your Name]`,
    },
  },
  {
    label: "The distant professor — taught you well, doesn't know you deeply",
    profile:
      "The lecturer in a 200-person class where you got an A, who you spoke to maybe 3 times outside of class but who remembers you because you asked sharp questions or wrote a memorable final. They like you in principle but don't have rich material to write about you specifically.",
    bestAt:
      "Best at: institutional credibility + your performance against a known bar. They can write 'one of the top 5 students in a class of 200' — which is a high-leverage sentence if the class is at a known program. They're WORST at depth.",
    redFlags: [
      "They can't remember which class you took with them — politely thank them and find someone else; the letter will say nothing.",
      "They ask 'remind me what your thesis was about' if you didn't write a thesis with them — they're going to fill the letter with generic praise. Skip.",
      "They've left academia or moved institutions and don't have access to past materials — they have no concrete recall to draw on.",
    ],
    ask: {
      subject: "Recommendation letter request — [Your Name], [Course Code] [Term]",
      body:
`Dear Professor [Lastname],

I was a student in your [Course Code] in [Term Year] — I [one specific memorable interaction: the question I asked about X, the paper I wrote on Y, the office-hours conversation about Z].

I'm applying to grad programs in [field] this cycle: [list 3 schools]. Deadlines start [date]. I'd be very grateful if you would write a recommendation letter focused on the work you saw in your course.

I know we didn't have a long advising relationship, so I'd like to make the writing as easy as possible. I'll send a packet this week with:

- The final paper / exam / project I did in your course (PDF)
- A one-page "brag sheet" noting my final grade, class rank if available, and any specific feedback you gave
- My CV + draft personal statement
- All submission deadlines and portal links

Would you be willing? If the workload doesn't allow for it, I completely understand — better to say so now than write a hurried letter.

With thanks,
[Your Name]
[Phone or alternate email]`,
    },
    followup: {
      subject: "Re: Recommendation letter — [Course Code]",
      body:
`Dear Professor [Lastname],

Just following up on the letter request from [date]. The first deadline is [date]. If the workload doesn't allow this cycle, no problem — please just let me know so I can ask someone else with enough lead time.

Best,
[Your Name]`,
    },
    thanks: {
      subject: "Thank you — letter received",
      body:
`Dear Professor [Lastname],

Your letter just landed at [program]. Thank you for making time for this — I know you write a lot of these and the specifics you included must have taken real effort to recall. I'll write back with results when they come in.

[One sincere line: what your interaction in the class meant + how it's shaped what you're applying to study now.]

With gratitude,
[Your Name]`,
    },
  },
  {
    label: "The current / former employer — saw you do the work",
    profile:
      "A manager, founder, or senior colleague who watched you produce real outputs against real deadlines. They have the BEST material on your work ethic and judgement, but they're often the WORST at the academic-letter genre conventions.",
    bestAt:
      "Best at: real impact + accountability + specific examples. They can write 'in Q3 2025, [Name] led a 4-person team that…' — admissions committees love this because it's verifiable. They're worst at framing it for academic readers.",
    redFlags: [
      "They've never written a grad-school rec before AND they don't have time for you to coach them — the letter will be too business-y for an academic committee.",
      "They're worried it'll signal you're leaving (current employer) — letter may be lukewarm by self-protection. Make them comfortable first.",
      "They want to write a glowing reference but only know your work on ONE narrow project — the letter will be thin.",
    ],
    ask: {
      subject: "Reference letter request — graduate school applications",
      body:
`Hi [Firstname],

I'm applying to grad school in [field] this cycle — [program type] at [list 3 schools]. The first application is due [date]. I'd love to ask if you'd be willing to write a reference letter for me.

You'd be the only non-academic recommender in my packet, and I think that's a feature: you've seen me do real work against real deadlines, which the academic recommenders haven't. I'd want your letter to focus on [2–3 SPECIFIC projects or competencies: the X launch, how I handled the Y crisis, my judgement on Z]. If you can write a letter that says "in [month year] [Name] did [specific thing] with [specific outcome]" — that's gold.

I know you haven't written one of these before, so I'll make it easy: I'll send you a one-page "brag sheet" with the projects + dates + outcomes you can reference, a short note on what grad-school letters typically look like, and the submission portals (most are 10-minute upload forms — not Word docs to email back).

If now is a hard time at work or you'd rather not, I completely understand and won't take it personally. Better to ask candidly now than have you scramble in 3 weeks.

Thanks for considering it,
[Your Name]
[Phone]`,
    },
    followup: {
      subject: "Re: Reference letter — checking in",
      body:
`Hi [Firstname],

Quick check-in on the reference letter ask from [date]. First deadline is [date] — happy to grab coffee or jump on a 15-min call if it helps you frame the letter. Or if it's not the right time, just let me know and I'll find an alternate. No hard feelings either way.

[Your Name]`,
    },
    thanks: {
      subject: "Thank you — reference submitted",
      body:
`Hi [Firstname],

Your reference letter just landed at [program]. Thank you — really. I know reference letters aren't part of your normal week and writing one well takes time you didn't have to give.

[One specific thing they did for you at work that mattered + how it's connected to what you're applying to do now.] I'll let you know when results come in.

Thanks again,
[Your Name]`,
    },
  },
  {
    label: "The mentor / advisor — sustained relationship, not academic-credential-formal",
    profile:
      "A research mentor at a lab, an advisor at an internship, a fellowship director who watched you over 6+ months. Knows your trajectory across multiple projects. Can speak to growth in a way a single-course professor can't.",
    bestAt:
      "Best at: trajectory + growth + maturity. They can write 'when I first met [Name], she… by the end of the program she…' — and that arc is rare in recommender writing. High-leverage for admissions committees.",
    redFlags: [
      "They've moved roles and don't have institutional letterhead anymore — letter may still be excellent but committees sometimes weight letterhead. Ask about this.",
      "They're a peer in age but senior in title — the letter may read as 'friend of the candidate' rather than evaluator. Find someone with clearer seniority hierarchy.",
      "They have written letters for many of your cohort — admissions readers see patterns. Ask 'how do you think this letter would compare to the one you wrote for [name]?' If they can't differentiate, find someone else.",
    ],
    ask: {
      subject: "Recommendation letter — grad school applications",
      body:
`Dear [Name],

Hope you're well. I'm applying to grad programs in [field] this cycle: [list 3 schools]. Deadlines run [earliest] through [latest]. I'd be honoured if you would write a letter of recommendation.

You're in the best position of anyone in my network to write the letter I most want admissions committees to read. You've watched me [growth arc: started doing X, moved to Y, by end of [program/role] was leading Z]. A letter that captures THAT arc is what I want to ask for.

To make it concrete, I'll send you a packet this week:

- A timeline of the projects we worked on together, with dates + my specific role + outcomes
- My CV and draft personal statement (so the letter and statement reinforce each other, not duplicate)
- The list of programs and what each is looking for (a couple of them weight letters heavily; one I'd love your letter to specifically address)
- All submission deadlines and portal links

If a call would help you write more crisply, I'd love to schedule one for any week in [date range].

With gratitude,
[Your Name]
[Phone]`,
    },
    followup: {
      subject: "Re: Recommendation letter — checking in",
      body:
`Dear [Name],

Quick check-in on the letter ask from [date]. First deadline is [date]. Happy to send any additional materials or jump on a call if it helps. If now isn't the right time, just say — I'd rather know with enough lead time than scramble.

[Your Name]`,
    },
    thanks: {
      subject: "Thank you — letter submitted",
      body:
`Dear [Name],

Your letter just landed at [program]. Thank you. I know it took time to do justice to the years we worked together, and I trust the letter does. I'll be in touch when results come back.

[One specific update or memory from the work you did together + how it's still informing what you're applying to study.]

With gratitude,
[Your Name]`,
    },
  },
  {
    label: "The peer / colleague with context — non-traditional but valuable",
    profile:
      "A former co-fellow, lab partner, founder you've worked with as a peer — someone roughly your age or junior who has watched you work closely AND can write at length. Almost never a primary recommender, but a strong third letter in a packet where you want a 360-degree view.",
    bestAt:
      "Best at: collaboration + how you treat people + what it's like to work with you day-to-day. Programs that care about cohort fit (smaller MA, fellowships, research labs) value this.",
    redFlags: [
      "Most US PhD programs and many MBA programs explicitly want recommenders senior to you — read the program's recommendation guidelines before asking.",
      "They've never written a rec letter — your packet to them needs to include a sample letter structure, not just bullet points.",
      "Your packets to multiple programs need different letters; a peer recommender writing the same letter to all 5 programs will feel generic. Ask if they're up for tailoring.",
    ],
    ask: {
      subject: "Recommendation letter — would you be open?",
      body:
`Hi [Firstname],

Bit of an unusual ask. I'm applying to [program type] this cycle: [list 3 schools]. One of them ([school]) accepts a "non-traditional" third letter from someone who has worked with you closely without being your superior. I'd love to ask if you'd be willing to write that letter for me.

The reason I'm asking specifically you: [the specific project + outcome you watched me deliver + the thing about how I worked you'd be uniquely able to describe]. The program's prompt is "describe a time the applicant…" — and you're the person who's actually seen me do that.

If you say yes, I'll send a packet:
- The exact prompt the program is asking the letter to respond to
- A brief on what makes a strong rec letter (so the format isn't a guessing game)
- The two or three stories from our work together I think would land hardest, in case you want to draw on them
- The submission portal — usually a 10-minute online form

If your answer is no — totally fine. It's a real time commitment and the writing format is unfamiliar.

Thanks for considering,
[Your Name]`,
    },
    followup: {
      subject: "Re: Recommendation letter — quick check-in",
      body:
`Hi [Firstname],

Following up on the rec letter ask from [date]. Submission opens [date]. If you're not up for it, no problem — just let me know so I can plan accordingly.

[Your Name]`,
    },
    thanks: {
      subject: "Thank you — letter submitted",
      body:
`Hi [Firstname],

Your letter just landed. Thank you for writing it — peer letters are rare and they're rare BECAUSE they take more thought, not less. I appreciate the time.

[One specific thing about working with them + how this application connects forward.]

[Your Name]`,
    },
  },
];

/** The packet you send to every recommender once they've said yes. */
export interface PacketItem {
  item: string;
  what: string;
  why: string;
}

export const RECOMMENDER_PACKET: PacketItem[] = [
  {
    item: "Brag sheet",
    what: "A one-page document with: the projects you worked on together, the dates, your specific role, the outcomes, and any specific feedback they gave you that you'd want them to draw on.",
    why: "Recommenders write letters from MEMORY — and memory is fuzzy 6 months out. The brag sheet gives them the specifics that turn a generic letter into a specific one. This single document raises letter quality more than any other input.",
  },
  {
    item: "CV (current)",
    what: "Your most up-to-date CV, in PDF. Include things that happened AFTER the time they knew you, so the letter can reference your trajectory beyond just your work with them.",
    why: "Lets the recommender contextualise their letter — 'when I worked with [Name] in 2023, they were doing X; since then, they've gone on to Y' — that single sentence makes the letter feel grounded in a longer story.",
  },
  {
    item: "Draft personal statement",
    what: "Your draft statement of purpose / personal statement / motivation letter — even if it's still rough.",
    why: "Lets the recommender's letter REINFORCE your application rather than duplicate it. If your statement says you want to study X, the recommender can lean into evidence of X-readiness; if your statement is silent on Y, they can fill the Y gap.",
  },
  {
    item: "List of programs + deadlines + portals",
    what: "A simple table: program / school / submission portal URL / deadline / any program-specific letter prompts. Sorted by deadline ascending.",
    why: "Recommenders procrastinate (sorry, they do) — and one missed deadline ruins an application. A clear table forces the order. Some programs have specific prompts ('describe a time the applicant…') and the recommender needs to see those upfront.",
  },
  {
    item: "Specific stories you'd like them to draw on (optional)",
    what: "2–3 specific anecdotes from your time together that you'd love the letter to anchor on. Don't dictate; suggest.",
    why: "Recommenders sometimes default to writing about WHAT YOU ARE (smart, hardworking) rather than WHAT YOU DID (the time you took on X, the moment you handled Y). Specific stories tilt them toward the second register — which is what admissions committees actually want.",
  },
];

/** The universal 6-line ask template — for the tear-out card. */
export const UNIVERSAL_ASK = `Dear [Name],

I'm applying to [3 programs in field] this cycle, deadlines starting [date]. I'd be honoured if you would write a recommendation letter for me — specifically because [one concrete reason from our time together].

I'll send a packet this week with my CV, draft personal statement, the deadlines + portals, and a brag sheet so the letter can be specific.

Would you be willing? No hard feelings if it's not the right time — better to know now than scramble later.

With thanks,
[Your Name]`;
