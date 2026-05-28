// TopUni Field Guide N°3 — The Application Submission Checklist.
// $19 paid product. Concrete, paint-by-numbers, the kind of product
// where the buyer knows exactly what they're getting before they
// hand over money. No essay-writing-advice fluff — pure checklist
// rigour for the 72 hours before you hit submit.
//
// Why this exists: ~5% of applications get binned at the office
// level (before any committee reads them) for stupid reasons —
// missing docs, name mismatches, deadline-timezone errors, wrong
// file format. The fix is procedural, not strategic. This is the
// procedure.

export interface ChecklistItem {
  /** The thing to verify. */
  item: string;
  /** Why it matters — the failure mode it prevents. */
  why: string;
  /** Optional tactic — how to actually verify it. */
  how?: string;
}

/** The 12-item night-before verification list. The pocket card. */
export const NIGHT_BEFORE_CHECK: ChecklistItem[] = [
  {
    item: "Name matches across every document",
    why: "Admissions databases are dumb — they string-match on your name. A passport that says \"Jonathan\" + a transcript that says \"Jon\" + a CV that says \"J.\" can fail to merge. You end up looking like three half-applicants.",
    how: "Pick ONE form of your name. Use it identically on the application form, CV, statement, transcripts cover sheet, and recommender packet. Most legally-restrictive form wins (the one on your passport).",
  },
  {
    item: "Email address you'll still own in 12 months",
    why: "Decisions come 4–8 months after submission. Some programs mail you waitlist updates 12 months later. If your application email is a school account that gets deactivated when you graduate, your offer letter vanishes.",
    how: "Use a personal Gmail / Proton / Fastmail address you control independently. Auto-forward your school email to it.",
  },
  {
    item: "Phone number with country code",
    why: "Some programs call you for an interview. If the form takes a US-format-only field and you're in Bishkek, the interviewer dials a wrong number and you miss the slot.",
    how: "Use the program's expected format if specified. Otherwise: full international (+996...) format with no spaces.",
  },
  {
    item: "Transcript copies are official + sealed (where required)",
    why: "Many US grad programs require transcripts mailed directly from your university or uploaded via a service like WES. Photocopies you upload yourself = silently rejected by the office.",
    how: "Check each program's transcript policy. WES / ECE / SpanTran credentials evaluations take 4–6 weeks; start NOW if you haven't.",
  },
  {
    item: "Recommendation portal URLs were sent to recommenders 3+ weeks ago",
    why: "Recommenders submit through their own portal link, on their own time. If you sent the link 5 days before deadline, you're either getting a hurried letter or no letter.",
    how: "Verify each recommender clicked their link. Most portals show 'pending / submitted' status to you. If still pending 7 days before deadline, send the polite nudge from Field Guide N°2.",
  },
  {
    item: "File names are clean + descriptive",
    why: "Admissions reviewers see your files in a directory. \"document_final_v3_FINAL_use this one.pdf\" reads as careless. Even worse: \"untitled.pdf\" — committee assumes you don't care.",
    how: "Format: \"[Lastname]_[Firstname]_[Document]_[Program].pdf\". Example: \"Khan_Aisha_PersonalStatement_Yale.pdf\". Boring on purpose.",
  },
  {
    item: "PDFs are real PDFs, not photos",
    why: "Photos of documents (especially transcripts) are sometimes rejected at the office level. Scanned-as-image PDFs can fail OCR + searchability checks.",
    how: "Use Adobe Scan / Microsoft Lens / Apple Notes scanner — they produce real PDFs with OCR'd text. Photo-as-PDF from your camera roll = re-scan.",
  },
  {
    item: "Statement word count is UNDER the limit",
    why: "Some portals auto-truncate at the word limit. If you submit 1050 words on a 1000-word limit, you might submit a sentence that ends mid-thought. Reviewer reads garbage.",
    how: "Aim for 95% of the limit. Always test by pasting into the actual portal before final submission — the portal's counter is the source of truth, not Word's.",
  },
  {
    item: "Application fee payment confirmed",
    why: "Some applications submit \"successfully\" but the payment isn't processed (card declined silently, currency conversion failed, fee-waiver request still pending). You think you applied; the system thinks you owe $90.",
    how: "Check the application status page 24h after payment. If status still says \"awaiting payment\" — the system hasn't taken your money. Re-submit fee.",
  },
  {
    item: "Deadline is in YOUR timezone OR you've calculated correctly",
    why: "\"Midnight Jan 31\" usually means midnight in the program's local timezone, not yours. A Bishkek applicant submitting at \"11pm Jan 31 my time\" might be submitting at 8am Feb 1 in Boston. Deadline missed.",
    how: "Convert the deadline to YOUR timezone in writing. Submit 12+ hours early. Period.",
  },
  {
    item: "All program-specific essays answered (not just the main one)",
    why: "Many programs have 1 main statement + 3–5 short \"why this program\" / diversity / leadership essays. The portal may show them in tabs you have to click. Forgetting one = automatic rejection at the office level.",
    how: "Make a checklist of every required + optional essay BEFORE you start. Optional essays are usually worth doing — half of applicants skip them and look weaker for it.",
  },
  {
    item: "You actually clicked the final \"Submit\" button",
    why: "More applications die in 'saved draft' than you'd believe. Status of \"Application started — payment pending\" or \"Saved\" = NOT submitted. You'll get an email confirmation. If you don't, you didn't.",
    how: "After submitting: refresh the application status page. It should say \"Submitted\" or \"Under review.\" Take a screenshot. Forward the confirmation email to yourself.",
  },
];

/** The pre-submission preparation checklist — done 1-4 weeks before
 *  deadline. Different from the night-before — these are the things
 *  that take time to assemble. */
export const PRE_SUBMISSION_CHECK: ChecklistItem[] = [
  {
    item: "Statement drafts have been read by 2+ people",
    why: "You can't proofread your own writing. Things that read fine to you read confusing to a stranger. The whole point of the statement is to land for a stranger; have a stranger read it.",
    how: "One subject-matter person (knows the field) + one outsider (doesn't know the field). The outsider catches what you're assuming the reader already knows.",
  },
  {
    item: "Recommender packet has been sent to each recommender",
    why: "Generic asks get generic letters. The packet (CV, draft statement, deadlines + portals, brag sheet) makes the letter specific.",
    how: "See Field Guide N°2 — Recommendation Letter Asks for the full packet structure.",
  },
  {
    item: "Test scores have been sent to every program",
    why: "ETS / GMAC / IELTS / TOEFL score-send happens at YOUR request, not automatic. Some programs need scores reported by their deadline; you may need to send them 2–3 weeks ahead.",
    how: "Log into the score-provider portal. For each program: confirm the score has been ordered. ETS takes ~7 days; GMAT ~5 days; IELTS varies.",
  },
  {
    item: "CV is 1–2 pages, formatted consistently",
    why: "Reviewers spend ~90 seconds on your CV. A 4-page CV with inconsistent date formats reads as someone who doesn't respect the reader's time.",
    how: "1 page for college applicants. 2 pages max for grad applicants. Dates aligned right, jobs in reverse-chronological order, no photo, no \"Objective\" section.",
  },
  {
    item: "Application fee waivers (if applicable) are approved",
    why: "Fee waivers take 2–4 weeks to approve. If you apply 'fee pending,' some systems lock your application until approval — past the deadline.",
    how: "Apply for waivers 3+ weeks before earliest deadline. NEED waiver = US programs offer them for low-income applicants; international programs vary.",
  },
];

/** Five reasons applications get rejected at the OFFICE level —
 *  before any admissions committee reads them. Not the strategic
 *  reasons (weak essay, low GPA) — the procedural reasons. */
export const OFFICE_REJECT_REASONS: { reason: string; mechanism: string; fix: string }[] = [
  {
    reason: "Missing required document",
    mechanism:
      "Your application is flagged 'incomplete' by the admissions office. The committee never reads it. You don't get a notification — the system just doesn't move you forward.",
    fix: "Check the application status page weekly until you see \"Submitted — Under Review.\" If status still says \"Incomplete,\" call the admissions office (yes, call) to ask what's missing.",
  },
  {
    reason: "Name / DOB / passport mismatch",
    mechanism:
      "Your transcript says Jonathan Khan; your application form says John Khan; your test score report says J. M. Khan. The system can't merge them into one applicant; you appear as three half-files.",
    fix: "Pick the name on your passport. Use it everywhere. Past records you can't change → submit a name-change note in the supplementary docs section.",
  },
  {
    reason: "Transcripts not received via the right channel",
    mechanism:
      "Some US programs ONLY accept transcripts mailed directly from your university or uploaded via a credentials-evaluation service (WES / ECE). Self-uploaded scans = treated as 'unofficial' and not counted.",
    fix: "Check each program's transcript policy 4+ weeks before deadline. WES / ECE take 4–6 weeks to process. Start NOW if you haven't.",
  },
  {
    reason: "Recommendation letters submitted late",
    mechanism:
      "Most programs accept letters up to 1–2 weeks after your deadline if all OTHER materials are in. But some programs reject applications missing letters at deadline. Your application is binned.",
    fix: "Get letters submitted 5+ days before deadline. Verify in the application portal — most show 'pending' / 'submitted' status per recommender.",
  },
  {
    reason: "Application fee not processed",
    mechanism:
      "Your card was declined, your international payment failed, your fee waiver is still pending. Application sits in 'fee owed' status and never moves to review.",
    fix: "Pay the fee 5+ days before deadline. Confirm by checking application status — it should change from 'Fee Due' to 'Submitted' within 48 hours of payment.",
  },
];

/** Waitlist letter — when programs put you on the waitlist after
 *  Round 1, a well-crafted letter of continued interest can move
 *  you to admit. Template here. */
export const WAITLIST_LETTER = {
  subject: "Continued interest — [Program], [Your Name]",
  body:
`Dear [Admissions Officer or Committee],

Thank you for placing me on the waitlist for [Program] this cycle. I'm writing to confirm my continued strong interest in joining the [Year] cohort.

Since my application, [one substantive update — a new job role, a published paper, a completed project, a leadership transition, a relevant award or scholarship]. This [reinforces / expands] the case I made in my statement for [the specific narrative thread you want them to remember]: [one sentence connecting the new development to your application's central claim].

[Program] remains my top choice because [one paragraph: a SPECIFIC reason that has emerged since you applied — a research paper you read by a faculty member, a class you'd want to take, a community signal — NOT a generic "great program / great fit" line]. If admitted, I will accept by [date] and matriculate without delay.

Please let me know if there are additional materials or interviews that would help the committee's evaluation. I'm grateful for the committee's continued consideration.

Sincerely,
[Your Name]
[Application ID, if you have one]
[Phone + alternate email]`,
};

/** Interview prep checklist — for the 5% of programs that conduct
 *  interviews. Most are 30 minutes; preparation should be ~10 hours
 *  per interview. */
export const INTERVIEW_PREP: ChecklistItem[] = [
  {
    item: "Re-read your own application",
    why: "Interviewers ask you to elaborate on things from your statement. If you can't remember which version of the essay you submitted, you fumble obvious follow-ups.",
    how: "Print your statement + CV + every short essay. Re-read 24h before. Identify the 3 things you most want them to ask you about.",
  },
  {
    item: "Research the interviewer + the program",
    why: "Interview slots are scarce. If you walk in without knowing what the interviewer's research is, you signal 'I don't care.' Same for not knowing the program's recent news.",
    how: "Google the interviewer; read 1 recent paper or interview they've done. Check the program's news page for the last 30 days. Have 2 specific questions ready that reference these.",
  },
  {
    item: "Prepare 3 stories — STAR format",
    why: "Most interview questions ('tell me about a time you led / struggled / failed / impacted') are answered with stories. Pre-built stories let you adapt fast under pressure.",
    how: "Pick 3 of your strongest experiences. Structure each as Situation / Task / Action / Result, ~90 seconds long. Practise telling them out loud.",
  },
  {
    item: "Have your 3 'why this program' lines ready",
    why: "Every interview asks 'why us?' A generic answer ('great program / great fit') signals you'd take any offer. Specific answers ('I want to work with Prof X because…' / 'Class Y maps to my interest in…') signal commitment.",
    how: "Write 3 reasons that ONLY apply to this program (no other program could swap in). Memorise. Be ready to elaborate on any of the three.",
  },
  {
    item: "Test the tech (if remote)",
    why: "Remote interviews crash. If Zoom / Webex / your camera dies in minute 2, you've lost half the slot.",
    how: "Use the EXACT setup (laptop + camera + mic + bandwidth) 30 min before. Have phone as backup. Quiet room, neutral background, soft natural light from the front (not behind).",
  },
];
