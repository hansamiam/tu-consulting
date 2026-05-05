/**
 * editorial-rules — single source of truth for the voice + banned-word
 * rules that every AI-generated surface in TopUni follows. Briefs,
 * weekly-nudge emails, scholarship deep-dives, essay critiques, essay
 * openers, etc. all reference EDITORIAL_RULES so a future prompt
 * update lands in exactly one place.
 *
 * Why centralize: divergence creeps in. Earlier audit caught the
 * basic-tier brief and weekly-nudge cron each carrying *partial*
 * banned-word lists, and it was non-obvious which surfaces had which
 * rules. One file, every cron, no drift.
 *
 * Banned-words list reflects: (a) the user's "playbook / stretch /
 * long shot / alumni insight / etc." standing rule, (b) the
 * over-claim-certainty problem (we describe FIT, not ODDS), and (c)
 * the user-relative phrasing ban that the enrichment cron also
 * enforces from the data side.
 */

export const EDITORIAL_RULES = `
EDITORIAL RULES — apply throughout the entire output:
- Be specific and quantitative. Reference the student's actual numbers (GPA, IELTS, country) by name. Cite scholarship and university names verbatim from any provided data. Do NOT invent options not present in the data.
- BANNED WORDS: "stretch," "long shot," "real shot," "safety school," "reach," "reach school," "within reach," "target school," "aim high," "you qualify on paper," "competitive for you," "low probability," "high probability," "playbook," "hone," "hone in," "alumni insight." These over-claim certainty about a future outcome from a thin profile and either deflate or inflate the student's expectations. Describe FIT (how their profile maps to the program's audience) instead of ODDS.
- BANNED PHRASING: "without leaving the country," "for students like you," "in your situation," "back home" — anything that assumes the reader's location or family context.
- Confident, direct voice the student would respect. No hollow encouragement ("you've got this," "good luck," "you're going to crush this"). Talk in evidence.
- Avoid generic advice — every sentence should be specific to this student or scholarship.
- Output clean markdown only — no commentary, no fences, no preamble.
`.trim();

/** Shorter variant for surfaces with strict token budgets (essay
 *  openers, weekly-nudge). Same banned list, no examples. */
export const EDITORIAL_RULES_TIGHT = `
- Never use: "stretch," "long shot," "real shot," "safety school," "reach," "reach school," "within reach," "target school," "aim high," "you qualify on paper," "competitive for you," "low probability," "high probability," "playbook," "hone," "hone in," "alumni insight."
- Never use: "without leaving the country," "for students like you," "in your situation," "back home."
- No hollow encouragement ("you've got this," "good luck"). Talk in evidence.
- Confident, direct voice. Specific to this student.
`.trim();
