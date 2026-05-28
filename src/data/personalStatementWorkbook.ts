// Personal Statement Workbook — TopUni's free Field Guide on what
// actually makes a strong grad-school personal statement. Not a
// "10 winning essays" plagiarism kit — a STRUCTURAL teardown of the
// shape that lands, with prompts the applicant works through.
//
// Five sections × the move each section makes × the prompts that
// surface the candidate's version of that move. The output is the
// reader's draft, not someone else's recycled paragraph.

export interface SectionMove {
  /** Section name as it'll appear in the printed booklet. */
  label: string;
  /** What this section is DOING for the reader. The strategic role. */
  role: string;
  /** A typical (or anti-typical) opening sentence — anchor for the
   *  applicant to riff off when they write theirs. */
  openerExample: string;
  /** What goes wrong if you skip this section or write it lazily. */
  failureMode: string;
  /** 3 prompts that pull the candidate's specific material for this
   *  section. Should be answerable in writing in 5–10 minutes each. */
  prompts: string[];
  /** A short "what to watch out for" — habits to avoid in this part. */
  watchOuts: string[];
}

export const SECTIONS: SectionMove[] = [
  {
    label: "Open — earn the next sentence",
    role:
      "The first 2–3 sentences decide whether the reader keeps reading or skims to the third paragraph. They don't have to be poetic — they have to be SPECIFIC enough that the reader feels they're about a particular human, not a category.",
    openerExample:
      `"At the end of my second year, my supervisor handed me a paper with three problems and said pick one. I picked the wrong one for a year before realising the problem with the problem itself was the real research question."`,
    failureMode:
      "Generic 'ever since I was a child' openers signal you can't differentiate. So do quotes from famous scientists / Einstein / Mandela. Reader bins these in the first paragraph.",
    prompts: [
      "Write the most specific sentence you can about a moment that committed you to this field. Names, dates, places, what you did NOT what you felt.",
      "What's a question you spent at least 6 months trying to answer? Not 'why does X happen' but the specific phrasing you actually used at the time.",
      "Write a sentence that someone applying to your same program with your same GPA could NOT also write. If they could, rewrite.",
    ],
    watchOuts: [
      "Avoid: 'ever since I was a child', 'I have always been passionate about'.",
      "Avoid: opening with a quote, especially a famous one.",
      "Avoid: stating your major. The reader knows your major from the form.",
    ],
  },
  {
    label: "Trajectory — show the arc, not the list",
    role:
      "Your CV is the list. The personal statement is the ARC — what each step taught you and how it set up the next step. Reader is checking: does this person know why their own past makes sense?",
    openerExample:
      `"The research project that taught me the most wasn't the one I planned — it was the cleanup of someone else's dataset that took six months and revealed why the original conclusions were wrong."`,
    failureMode:
      "Listing experiences chronologically without showing the THREAD. 'I did X. Then I did Y. Then I did Z.' The reader can't tell what you LEARNED from any of them.",
    prompts: [
      "Pick 3 experiences (research, internship, project, course) from your CV. For each, write ONE sentence on what you'd do differently knowing what you know now.",
      "Of those 3, which one taught you something the next one couldn't have? Connect them with a sentence: 'X taught me Y, which is why I pursued Z.'",
      "What's the experience on your CV that LOOKS impressive but actually didn't matter much? You don't need to dunk on it — but knowing which is which is half of self-awareness.",
    ],
    watchOuts: [
      "Don't recite your CV. Pick 2–3 things and go deep, skip the rest.",
      "Don't claim equal value across every project — the reader notices when you can't differentiate.",
      "Don't list course names. Reader sees them on the transcript. Discuss CONTENT.",
    ],
  },
  {
    label: "Synthesis — what you actually think the question is",
    role:
      "The shift from 'here's what I did' → 'here's what I think the field needs to figure out next.' This is the move that signals you can READ the field, not just consume from it. The hardest section to write well.",
    openerExample:
      `"The field assumes [common assumption]. My work over the last two years has made me increasingly suspicious of that assumption — specifically, [the limit case I've seen]."`,
    failureMode:
      "Hand-waving about how 'AI is the future' or 'we need more sustainable solutions.' If your synthesis could appear in any application that year, it's not synthesis.",
    prompts: [
      "Write one sentence: what's a common assumption in your field that you've come to doubt? Why?",
      "What's a question that ISN'T being asked in your field that you think should be? Don't worry about being right — show you can frame.",
      "If you had 5 years and unlimited resources, what specifically would you investigate? Be embarrassingly concrete — 'I'd run experiment X with population Y'.",
    ],
    watchOuts: [
      "Avoid grandiose claims about 'changing the field'. Reader rolls eyes.",
      "Avoid statements you can't defend in an interview. Everything here is interview material.",
      "Avoid jargon that sounds smart but obscures what you mean. Plain language wins.",
    ],
  },
  {
    label: "Fit — the program, the people, the moment",
    role:
      "The 'why us, why now' paragraph. The reader is verifying you actually researched the program. The bar is high: vague fit statements ('great program', 'amazing faculty') prove the opposite.",
    openerExample:
      `"Professor [Name]'s [Year] paper on [specific topic] addresses exactly the gap I described above — that's why this program is uniquely positioned for what I want to do next."`,
    failureMode:
      "'Your program is renowned for excellence in X' — fine to say, useless to write. The reader's checking whether you can be specific about WHICH excellence and WHY it maps to you.",
    prompts: [
      "Name 2 specific faculty members whose work matches yours. For each: cite ONE recent paper / project / direction by name.",
      "What's one CLASS at this program that maps directly to what you want to learn? Cite the course code.",
      "What's something about the program — not the faculty, the actual structure or culture — that fits you specifically? (Cohort size, exam-vs-coursework, location, etc.)",
    ],
    watchOuts: [
      "Avoid generic 'world-class', 'renowned', 'leading'. Words anyone could use.",
      "Avoid faculty lists. Two specific names with one concrete reason each beats a list of seven.",
      "Avoid sycophancy. The reader is the program — they don't need to be flattered.",
    ],
  },
  {
    label: "Close — set up the next conversation",
    role:
      "The closing sentence is what the reader holds in their head when they put the file down. It should make them want to KEEP reading you — into your CV, your essays, your references. Best closes are forward-looking, not summary.",
    openerExample:
      `"If I'm admitted, the first project I want to take on is [specific thing] — a question I've been circling for two years and one that this program is uniquely positioned to help me crack."`,
    failureMode:
      "'In conclusion, I am passionate about X and would be honoured to attend Y.' Reads as box-ticking. Reader's eyes glaze.",
    prompts: [
      "What's the FIRST specific project / question / conversation you want to take on if admitted? Be embarrassingly specific.",
      "Write one sentence that's a forward-looking commitment — 'If admitted, I will...' — that's true to your trajectory.",
      "What's the one line you'd want the reader to remember from your statement 10 minutes after they put it down?",
    ],
    watchOuts: [
      "Don't summarise. The reader just read it. They don't need a recap.",
      "Don't thank the committee. You'll be evaluated, not granted favours.",
      "Don't end on uncertainty. The reader's deciding to invest in you — give them something certain.",
    ],
  },
];

/** What to check before submitting. The 6 self-edits that catch
 *  90% of avoidable problems. */
export const SELF_EDIT_CHECKLIST: { check: string; why: string }[] = [
  {
    check: "Can the first paragraph apply to anyone else?",
    why: "If yes, rewrite. Specificity is the cheapest way to differentiate.",
  },
  {
    check: "Did you use 'passionate' more than once?",
    why: "Cut every instance. The word is so worn it signals the opposite of itself.",
  },
  {
    check: "Did you name at least 2 specific faculty / papers / classes?",
    why: "If not, you didn't research the program. Reader will see.",
  },
  {
    check: "Is there a single sentence the reader could not have predicted?",
    why: "If no, the essay is hollow. Find a real thing and write it.",
  },
  {
    check: "Did you state any feeling without proving it with a behaviour?",
    why: "Replace 'I'm fascinated by X' with the time you spent 3 hours digging into X.",
  },
  {
    check: "Is the final sentence forward-looking, not summary?",
    why: "Summary lands flat. A forward commitment lingers.",
  },
];

/** The deliberate inverse — what NOT to write. Saves applicants more
 *  hours than the rest of the workbook combined. */
export const AVOID_LIST: string[] = [
  '"Ever since I was a child…" or any childhood opener.',
  "Quotes by Einstein, Mandela, Gandhi, Marie Curie, Steve Jobs.",
  "'My passion for [field] knows no bounds.' Or any sentence with 'passion' in it.",
  "Listing every course you've taken. Reader sees the transcript.",
  "Listing every paper you've read. Pick two and discuss.",
  "'Your prestigious program' / 'your renowned institution'. The reader works there; they know.",
  "Promising to 'give back to society' without naming the specific society.",
  "Phrases like 'I am uniquely qualified' — let the evidence say that.",
  "Mentioning your GPA / test scores. They're on the application form.",
  "More than one humblebrag per paragraph. The pattern is obvious.",
];
