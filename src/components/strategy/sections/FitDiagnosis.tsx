import { Eyebrow, SectionTitle } from "../primitives";
import type { FitRow, Language } from "../types";
import { t } from "../types";

interface Props {
  rows: FitRow[];
  language: Language;
}

export const FitDiagnosis = ({ rows, language }: Props) => {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="mb-8 sm:mb-10">
      <div className="mb-3">
        <Eyebrow>{t(language, "Fit diagnosis", "Диагностика fit")}</Eyebrow>
        <SectionTitle>
          {t(language, "Where you actually fit", "Где вы реально подходите")}
        </SectionTitle>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`px-5 py-4 ${i < rows.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-foreground/55">
                {row.subcategory}
              </span>
              <span className="font-heading text-[14.5px] font-bold text-foreground">
                {row.verdict}
              </span>
            </div>
            {row.reason && (
              <p className="text-[13.5px] leading-[1.45] text-foreground/72 m-0">
                {row.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
