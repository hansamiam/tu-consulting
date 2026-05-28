import { Check, AlertTriangle, Target } from "lucide-react";
import { SectionTitle } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  strengths: string[];
  watchouts: string[];
  focusNext: string[];
  language: Language;
}

interface ColumnProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconColor: string;
  border: string;
  bg: string;
  title: string;
  items: string[];
}

const Column = ({ icon: Icon, iconColor, border, bg, title, items }: ColumnProps) => (
  <div className={`rounded-2xl border ${border} ${bg} p-5`}>
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-3.5 h-3.5 ${iconColor}`} strokeWidth={2.4} />
      <SectionTitle>{title}</SectionTitle>
    </div>
    <ul className="m-0 p-0 list-none space-y-2">
      {items.filter((s) => s && s.trim()).map((s, i) => (
        <li key={i} className="text-[14px] leading-[1.45] text-foreground/85">
          {s}
        </li>
      ))}
    </ul>
  </div>
);

export const StrengthsWatchouts = ({ strengths, watchouts, focusNext, language }: Props) => (
  <section className="mb-8 sm:mb-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
    <Column
      icon={Check}
      iconColor="text-emerald-700 dark:text-emerald-400"
      border="border-emerald-500/25"
      bg="bg-emerald-500/[0.04]"
      title={t(language, "Strengths", "Сильные стороны")}
      items={strengths}
    />
    <Column
      icon={AlertTriangle}
      iconColor="text-amber-700 dark:text-amber-400"
      border="border-amber-500/30"
      bg="bg-amber-500/[0.05]"
      title={t(language, "Watch-outs", "На что обратить внимание")}
      items={watchouts}
    />
    <Column
      icon={Target}
      iconColor="text-gold-dark"
      border="border-gold/35"
      bg="bg-gold/[0.06]"
      title={t(language, "Focus next", "Фокус сейчас")}
      items={focusNext}
    />
  </section>
);
