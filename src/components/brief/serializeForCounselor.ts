/**
 * serializeBriefForCounselor — flatten a v6 magazine brief's structured
 * sections back into plain prose so the counselor edge function can
 * embed it in its system prompt.
 *
 * The counselor doesn't render; it just needs to read what the student
 * already saw. Output is light markdown-ish (## headings, dashes for
 * bullets) for readability inside the system prompt block. No JSX,
 * no formatting beyond what the LLM can absorb.
 */
import type { BriefSections, SchoolEntry, ScholarshipEntry, EssayEntry, GapEntry, WeekBlock } from "./types";

const headings = (s: { headline?: string; lead?: string }, fallback: string) => {
  const head = s.headline ?? fallback;
  const lead = s.lead ? `\n${s.lead}` : "";
  return `## ${head}${lead}`;
};

const formatSchool = (e: SchoolEntry): string => {
  const parts = [
    `- ${e.name}${e.country ? ` (${e.country})` : ""} — ${e.tier.toUpperCase()}`,
  ];
  if (e.whyItFits) parts.push(`  · Why it fits: ${e.whyItFits}`);
  if (e.threshold) parts.push(`  · Threshold: ${e.threshold}`);
  if (e.careerAnchor) parts.push(`  · Career: ${e.careerAnchor}`);
  return parts.join("\n");
};

const formatScholarship = (e: ScholarshipEntry): string => {
  const parts = [
    `- ${e.name}${e.coverage ? ` — ${e.coverage}` : ""}${e.awardText ? ` (${e.awardText})` : ""}`,
  ];
  if (e.deadline) parts.push(`  · Deadline: ${e.deadline}`);
  if (e.howProfileMaps) parts.push(`  · How profile maps: ${e.howProfileMaps}`);
  if (e.firstTask) parts.push(`  · First task: ${e.firstTask}`);
  return parts.join("\n");
};

const formatEssay = (e: EssayEntry, idx: number): string => {
  const parts = [`### Angle ${idx + 1}: ${e.title}`];
  if (e.whyItWorks) parts.push(`Why it works: ${e.whyItWorks}`);
  if (e.anchorItWith) parts.push(`Anchor with: ${e.anchorItWith}`);
  if (e.playsBestTo) parts.push(`Plays best to: ${e.playsBestTo}`);
  return parts.join("\n");
};

const formatGap = (e: GapEntry, idx: number): string => {
  const parts = [`### Gap ${idx + 1} (${e.priority.toUpperCase()}): ${e.title}`];
  if (e.whyItMatters) parts.push(`Why it matters: ${e.whyItMatters}`);
  if (e.actionThisMonth) parts.push(`This month: ${e.actionThisMonth}`);
  if (e.next60Days) parts.push(`Next 60 days: ${e.next60Days}`);
  return parts.join("\n");
};

const formatWeek = (w: WeekBlock): string => {
  const parts = [`### ${w.label}${w.focus ? `: ${w.focus}` : ""}`];
  for (const t of w.tasks ?? []) parts.push(`- ${t}`);
  return parts.join("\n");
};

export function serializeBriefForCounselor(sections: BriefSections): string {
  const out: string[] = [];

  if (sections.whereYouStand) {
    out.push(headings(sections.whereYouStand, "Where you stand"));
    if (sections.whereYouStand.body) out.push(sections.whereYouStand.body);
    if (sections.whereYouStand.pullquote) out.push(`> ${sections.whereYouStand.pullquote}`);
  }

  if (sections.whereYouCanLand) {
    out.push(headings(sections.whereYouCanLand, "Where you can land"));
    // v7 country-buckets shape wins when present; old reach/target/safety
    // entries are the fallback path for cached briefs.
    if (sections.whereYouCanLand.buckets && sections.whereYouCanLand.buckets.length > 0) {
      for (const b of sections.whereYouCanLand.buckets) {
        out.push(`**${b.country}${b.cities ? ` — ${b.cities}` : ""}**`);
        for (const s of b.schools) {
          out.push(`- ${s.name}${s.lore ? ` — ${s.lore}` : ""}`);
        }
      }
    } else {
      for (const e of sections.whereYouCanLand.entries ?? []) {
        out.push(formatSchool(e));
      }
    }
  }

  if (sections.howYoullPay) {
    out.push(headings(sections.howYoullPay, "How you'll pay"));
    for (const e of sections.howYoullPay.entries ?? []) {
      out.push(formatScholarship(e));
    }
    if (sections.howYoullPay.stackingNote) out.push(`> ${sections.howYoullPay.stackingNote}`);
  }

  if (sections.whatToWrite) {
    out.push(headings(sections.whatToWrite, "What to write"));
    if (sections.whatToWrite.essaySeed) {
      const s = sections.whatToWrite.essaySeed;
      if (s.title) out.push(`**${s.title}**`);
      if (s.body) out.push(s.body);
      if (s.closer) out.push(`> ${s.closer}`);
    } else {
      (sections.whatToWrite.entries ?? []).forEach((e, i) => out.push(formatEssay(e, i)));
    }
  }

  if (sections.whatsBlockingYou) {
    out.push(headings(sections.whatsBlockingYou, "What's blocking you"));
    (sections.whatsBlockingYou.entries ?? []).forEach((e, i) => out.push(formatGap(e, i)));
  }

  if (sections.whatToDoThisMonth) {
    out.push(headings(sections.whatToDoThisMonth, "What to do this month"));
    if (sections.whatToDoThisMonth.mondayMove) {
      const m = sections.whatToDoThisMonth.mondayMove;
      if (m.headline) out.push(`**${m.headline}**`);
      if (m.body) out.push(m.body);
      if (m.closer) out.push(`> ${m.closer}`);
    } else {
      for (const w of sections.whatToDoThisMonth.weeks ?? []) {
        out.push(formatWeek(w));
      }
      if (sections.whatToDoThisMonth.closingLine) out.push(`> ${sections.whatToDoThisMonth.closingLine}`);
    }
  }

  return out.join("\n\n");
}
