// v4: not a 3-col grid anymore. Three separate stacked sections —
// STRENGTHS, WEAKNESSES TO FIX, NEXT STEPS — each a label + plain
// bullet list. No colored dots; no hairlines; no card chrome.

import { SectionLabel } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  strengths: string[];
  watchouts: string[]; // displayed as "Weaknesses to Fix"
  focusNext: string[];
  language: Language;
}

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="m-0 p-0 list-none space-y-1.5">
    {items.filter((s) => s && s.trim()).map((s, i) => (
      <li key={i} className="flex gap-2 text-[13px] leading-[1.55] text-foreground/85">
        <span className="text-foreground/70 mt-[6px] shrink-0 leading-none text-[7px]">●</span>
        <span>{s}</span>
      </li>
    ))}
  </ul>
);

export const StrengthsWatchouts = ({ strengths, watchouts, focusNext, language }: Props) => (
  <>
    {strengths && strengths.length > 0 && (
      <section className="mb-5">
        <SectionLabel>{t(language, "Strengths to Build Around", "Сильные стороны")}</SectionLabel>
        <BulletList items={strengths} />
      </section>
    )}

    {watchouts && watchouts.length > 0 && (
      <section className="mb-5">
        <SectionLabel>{t(language, "Weaknesses to Fix", "Слабые стороны")}</SectionLabel>
        <BulletList items={watchouts} />
      </section>
    )}

    {focusNext && focusNext.length > 0 && (
      <section className="mb-5">
        <SectionLabel>{t(language, "This Month", "В этом месяце")}</SectionLabel>
        <BulletList items={focusNext} />
      </section>
    )}
  </>
);
