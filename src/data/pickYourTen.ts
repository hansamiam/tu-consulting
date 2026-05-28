// "Pick Your 10 Programs in 7 Days" — TopUni's free email-course
// curriculum. Sibling product to LF's Cyrillic in 7 Days. Helps the
// paralysed applicant move from a vague "I want to apply to grad
// school" to a concrete list of 10 programs they'll send applications
// to this cycle.
//
// Why 10: research + field consensus says applying to 8–12 programs
// hits the sweet spot of "enough variance to land somewhere" without
// "so many that quality drops." Below 5 = under-spread. Above 15 =
// every essay is hurried.
//
// Why 7 days: most applicants spend 2 weeks paralysed in research
// mode + 2 weeks of "I should email someone" + zero actual commits.
// A structured 7-day sprint forces commits.

export interface PickDay {
  day: number;
  /** Day title — the decision being made. */
  title: string;
  /** Mental model in one sentence. */
  mentalModel: string;
  /** The 3–5 concrete prompts the reader works through that day. */
  prompts: string[];
  /** One 2-minute exercise to commit progress before tomorrow. */
  exercise: string;
}

export const PICK_YOUR_TEN: PickDay[] = [
  {
    day: 1,
    title: "Decide the shape of the list",
    mentalModel:
      "Before you find programs, decide what the list is FOR. The same person could end up with three valid different lists depending on the question. 'Where do I most want to live for 5 years?' and 'Where will I get the strongest research training?' are different questions. Pick one as the anchor.",
    prompts: [
      "Write one sentence: what is this list optimising for? (career outcomes, research training, geography, prestige, cost, partner's location, all of the above?)",
      "Rank these 6 factors 1–6 for YOU specifically: research fit, career outcomes, cost, geography, prestige, cohort feel. The rank list is the silent tie-breaker for every decision below.",
      "Are you applying for one degree (5 PhD programs in same field) or hedging (3 PhD + 4 master's + 3 MBA)? Hedging is fine; just decide now.",
      "What's your timeline — are you applying this cycle to start fall 2027, or deferring a year to apply better?",
    ],
    exercise:
      "Write your one-sentence answer to question 1 on a piece of paper. Stick it on your monitor. Every program you consider tomorrow gets evaluated against this sentence. No drift.",
  },
  {
    day: 2,
    title: "The tier-stretch math",
    mentalModel:
      "A balanced list has 3 categories: 1–2 reach (top ~10% acceptance for someone with your profile), 4–6 fit (your profile matches the cohort, ~30% chance), 2–3 safety (a high-quality program where you're a strong applicant, ~70%+). Most paralysed applicants over-index reach and end up with no offers.",
    prompts: [
      "List 2 programs in your target field where YOU would be a stretch applicant. Be honest — the cohort profile matters. Look at the program's published student stats.",
      "List 6 programs where your profile matches the published cohort closely. Same standardised test percentile, same field, similar undergrad institution rank.",
      "List 3 programs where you'd be a strong applicant — programs you might overlook because they're 'not as prestigious' but where you'd thrive.",
      "If you can't find 3 safety programs, your reach list is probably miscalibrated. Re-read your safety programs' actual cohort profile, not their reputation.",
    ],
    exercise:
      "Write the 2/6/3 lists on the paper. Don't worry yet about whether they overlap with what you'd actually apply to — this is a working list. Tomorrow you cut.",
  },
  {
    day: 3,
    title: "Geographic + institutional diversification",
    mentalModel:
      "Three reach schools all in one city, all in one specific subfield, all funded by the same alumni network → your variance is way lower than it looks. Diversify across geography, institutional culture, and (where applicable) funding source. This way one bad season doesn't tank the cycle.",
    prompts: [
      "Look at your 11-program working list. Pull out countries — are you 100% US? 100% Europe? Both work, but make it intentional, not accidental.",
      "Pull out institutional types — R1 research universities vs. teaching-focused vs. policy/professional schools. A list that's all one type is less diversified than it looks.",
      "Are any of your reaches in the same specific subfield? If 'all 3 are AI Safety' that's not diversification, it's concentration. Spread across 2 or 3 subfields.",
      "For PhD applicants: are you applying to programs with different funding models (NSF GRFP-compatible, externally funded, fully institutional)? This affects what kind of student they take.",
    ],
    exercise:
      "Mark each of your 11 programs with: country / institution type / specific subfield. If 7+ share a single category, swap 2 out for something different. Diversification is mechanical, not creative.",
  },
  {
    day: 4,
    title: "Field-of-study fit — specialist vs generalist programs",
    mentalModel:
      "Some programs admit you for a specific subfield + a specific advisor. Others admit you to a general cohort and you pick later. They want very different applicants. A 'I want to work with X on Y' essay lands at the specialist program; the same essay confuses the generalist program.",
    prompts: [
      "For each of your 11 programs, find out: do you apply to the program OR to a specific advisor / lab? US PhD programs mostly admit to the program; UK + EU mostly admit to a specific advisor.",
      "For the specialist-mode programs, identify 1–3 specific faculty members per program whose work matches yours. If you can't name 2, that program shouldn't be on your list.",
      "For the generalist-mode programs, prepare a more thematic essay — what you want to study, not who you want to study with.",
      "Cut any program where you'd be writing a generic 'this is a strong program' essay. Better to drop a program than dilute the rest.",
    ],
    exercise:
      "For each program, write the 1-sentence pitch you'd use in the application: 'I want to work with [advisor / lab] on [specific question]' OR 'I want to study [theme] in [department].' If you can't write it in one sentence, the fit isn't there yet.",
  },
  {
    day: 5,
    title: "The recommender constraint",
    mentalModel:
      "Your recommenders can each submit a finite number of letters before they start phoning it in. A recommender writing 8 different letters in one cycle is writing version 1 + 7 copies. Most people can comfortably write 4–6 strong tailored letters per cycle. Cap your list to what your recommenders can support.",
    prompts: [
      "Identify your 3 likely recommenders. For each, how many letters can you ask them to write this cycle? (Default: 4–6 each.)",
      "If you have 3 recommenders × 5 letters each = 15 total letters. But you need 3 letters per program. So your max is 5 programs unless your recommenders agree to more.",
      "If you have 11 programs on your list but only 12 letters of total bandwidth, you need to cut 7 programs to get to 4. Don't ask one recommender to write 9 letters — the quality drops.",
      "Alternative: find a 4th recommender for some programs. Adds 4–5 letters of bandwidth. Often the bottleneck is the count, not the candidates.",
    ],
    exercise:
      "Do the math: your 3 recommenders × their per-cycle bandwidth = max letters available. Divide by 3 letters/program = your maximum program count. If it's less than 10, cut your list now.",
  },
  {
    day: 6,
    title: "The application-fee budget",
    mentalModel:
      "Application fees range from \$0 to \$250 per program. International students often pay more (transcript evaluation, score-send fees, currency conversion). 10 programs at \$120 average = \$1,200 + \$300 for credential evaluation + \$300 for test sends = \$1,800 minimum. Plan for it now.",
    prompts: [
      "List the application fee for each of your remaining programs. Most are on the program's website; some require digging.",
      "Look up the credential-evaluation fee (WES / ECE / SpanTran if you're international). Usually \$200–\$300 for the first program + \$30 per additional.",
      "Look up the test-score-send fees (ETS for GRE: \$30 per program; GMAT: \$35; IELTS: varies). Multiply by your program count.",
      "Add it up. Is the total a real constraint? If yes — apply for fee waivers NOW for the programs that offer them. Most US programs do; international programs vary.",
    ],
    exercise:
      "Make the budget. If you're over budget, cut programs that have the highest fees OR apply for waivers TODAY. Waivers take 2–4 weeks to approve — don't wait.",
  },
  {
    day: 7,
    title: "Lock the list and start the calendar",
    mentalModel:
      "You should now have ~8–10 programs you're committed to. The remaining work is procedural: the deadlines, the materials, the recommender packets, the test scores. Today you set up the project plan so the next 60 days are execution, not decisioning.",
    prompts: [
      "Write the final 8–10 programs in a single document. Date you locked the list at the top. Don't add or remove from this list except for emergencies.",
      "For each program, write: deadline / type of letters needed / application portal URL / specific essay prompts.",
      "Sort by deadline ascending. The earliest 3 deadlines are now your near-term focus.",
      "Send your recommender packet (CV + draft statement + deadlines + portals + brag sheet) to each recommender by the end of this week. See TopUni Field Guide N°2: Recommendation Letter Asks for the full packet structure.",
    ],
    exercise:
      "Open a calendar. For each program: block the deadline (red), block deadline-minus-1-week (yellow, the 'soft cutoff'), block deadline-minus-3-weeks (the recommender deadline). You should now see a structured runway, not a panic.",
  },
];

/** Course summary matrix for the preview page — lets a visitor scan
 *  the 7-day curriculum in 10 seconds. */
export const COURSE_SUMMARY: { day: number; title: string }[] =
  PICK_YOUR_TEN.map((d) => ({ day: d.day, title: d.title }));
