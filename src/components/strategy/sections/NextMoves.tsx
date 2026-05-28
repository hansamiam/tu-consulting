import { ArrowRight, Ban } from "lucide-react";
import { Eyebrow } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  bestNextMove: string;
  doNotWaste: string;
  language: Language;
}

export const NextMoves = ({ bestNextMove, doNotWaste, language }: Props) => {
  if (!bestNextMove && !doNotWaste) return null;
  return (
    <section className="mb-8 sm:mb-10 space-y-3">
      {bestNextMove && (
        <div className="flex items-start gap-3 rounded-2xl border border-gold/35 bg-gold/[0.06] p-5">
          <ArrowRight className="w-4 h-4 mt-[3px] text-gold-dark shrink-0" strokeWidth={2.5} />
          <div>
            <Eyebrow>{t(language, "Best next move", "Лучший следующий шаг")}</Eyebrow>
            <p className="font-heading text-[15.5px] sm:text-[16.5px] font-bold leading-[1.4] text-foreground m-0 mt-1">
              {bestNextMove}
            </p>
          </div>
        </div>
      )}
      {doNotWaste && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-5">
          <Ban className="w-4 h-4 mt-[3px] text-rose-700 dark:text-rose-400 shrink-0" strokeWidth={2.5} />
          <div>
            <Eyebrow>{t(language, "Don't waste time on", "Не тратьте время на")}</Eyebrow>
            <p className="font-heading text-[15.5px] sm:text-[16.5px] font-bold leading-[1.4] text-foreground m-0 mt-1">
              {doNotWaste}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
