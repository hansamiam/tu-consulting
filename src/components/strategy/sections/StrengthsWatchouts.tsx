// 3-column Strengths · Weaknesses · Do This Next.
//
// v3 redesign: no filled cards. Each column is just an eyebrow head
// + thin gold rule + bullet list. On desktop, hairline vertical rules
// separate the columns; on mobile they stack with normal section gap.
//
// Two-color palette: gold accents (eyebrows, strength + focus bullets,
// rules) + foreground (body). Weakness bullets get a single muted
// rose dot for fast-scanning contrast — that's the only red in the
// dossier and it's a 6px dot, not a background tint.

import type { Language } from "../types";
import { t } from "../types";

interface Props {
  strengths: string[];
  watchouts: string[]; // displayed as "Weaknesses"
  focusNext: string[];
  language: Language;
}

interface ColumnProps {
  label: string;
  items: string[];
  dotClass: string;
}

const Column = ({ label, items, dotClass }: ColumnProps) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark m-0 mb-1.5">
      {label}
    </p>
    <div className="h-px bg-gold/30 mb-3" />
    <ul className="m-0 p-0 list-none space-y-2.5">
      {items.filter((s) => s && s.trim()).map((s, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] leading-[1.5] text-foreground/85">
          <span className={`${dotClass} mt-[6px] shrink-0 leading-none text-[8px]`}>●</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const StrengthsWatchouts = ({ strengths, watchouts, focusNext, language }: Props) => (
  <section className="mb-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-foreground/10 gap-y-5">
      <div className="sm:pr-5">
        <Column
          label={t(language, "Strengths", "Сильные стороны")}
          items={strengths}
          dotClass="text-gold-dark"
        />
      </div>
      <div className="sm:px-5">
        <Column
          label={t(language, "Weaknesses", "Слабые стороны")}
          items={watchouts}
          dotClass="text-rose-700/70 dark:text-rose-400/70"
        />
      </div>
      <div className="sm:pl-5">
        <Column
          label={t(language, "Do This Next", "Действуйте")}
          items={focusNext}
          dotClass="text-gold-dark"
        />
      </div>
    </div>
  </section>
);
