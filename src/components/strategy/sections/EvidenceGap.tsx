// Master/PhD-only callout: the SINGLE load-bearing missing piece of
// evidence in the application. Distinct from the weaknesses list —
// this is the one thing that, if unaddressed, sinks the candidacy.
//
// Renders nothing for Bachelor (the field is empty string).

import { AlertOctagon } from "lucide-react";
import { Eyebrow } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  text: string;
  language: Language;
}

export const EvidenceGap = ({ text, language }: Props) => {
  if (!text || !text.trim()) return null;
  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
        <AlertOctagon
          className="w-4 h-4 mt-[3px] text-amber-700 dark:text-amber-400 shrink-0"
          strokeWidth={2.5}
        />
        <div>
          <Eyebrow>{t(language, "Evidence Gap", "Пробел в доказательствах")}</Eyebrow>
          <p className="text-[14.5px] leading-[1.5] text-foreground/85 m-0 mt-1.5">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
};
