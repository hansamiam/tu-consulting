import { AlertTriangle } from "lucide-react";

/**
 * <PathAFallbackCard /> — renders the scholarship's existing Path A
 * strategy fields (how_to_win + strategy_notes + common_rejection_reasons
 * + risk_note) verbatim, with no LLM call. Used by <DeepDiveModal /> as
 * the fail-mode banner when the v6 generation hits a parse / banned-
 * vocab / network failure and the edge function returns the fallback
 * shape.
 *
 * The point: a member never sees an empty deep-dive panel. If the AI
 * insight can't render, the strategist's summary still does.
 */

export interface PathAFields {
  how_to_win: string | null;
  common_rejection_reasons: string | null;
  strategy_notes: string | null;
  risk_note: string | null;
}

interface Props {
  scholarship: PathAFields;
  language?: "en" | "ru";
}

export const PathAFallbackCard = ({ scholarship, language = "en" }: Props) => {
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  const sections: Array<{ kicker: string; body: string }> = [];
  if (scholarship.how_to_win) {
    sections.push({ kicker: t("How to win it", "Как выиграть"), body: scholarship.how_to_win });
  }
  if (scholarship.strategy_notes) {
    sections.push({ kicker: t("Strategist's note", "Заметка стратега"), body: scholarship.strategy_notes });
  }
  if (scholarship.common_rejection_reasons) {
    sections.push({ kicker: t("Why people get rejected", "Почему отказывают"), body: scholarship.common_rejection_reasons });
  }
  if (scholarship.risk_note) {
    sections.push({ kicker: t("Honest risk", "Честные риски"), body: scholarship.risk_note });
  }

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/10 p-5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-foreground/80 leading-snug">
            {t(
              "AI insight is loading — refresh in a moment.",
              "ИИ-анализ загружается — обновите через секунду.",
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/10 p-5 space-y-4">
      <div className="flex items-start gap-2.5 pb-1 border-b border-amber-300/30">
        <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-amber-900 dark:text-amber-200 leading-snug">
          {t(
            "AI insight is loading — meanwhile, here's the strategist's summary.",
            "ИИ-анализ загружается — а пока вот краткая сводка стратега.",
          )}
        </p>
      </div>
      <div className="space-y-4">
        {sections.map((sec, i) => (
          <div key={i}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
              {sec.kicker}
            </p>
            <p className="text-sm text-foreground/85 leading-snug">{sec.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
