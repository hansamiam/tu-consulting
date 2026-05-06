/**
 * EssayOutlineCard — generates and displays a section-by-section
 * scaffold for a scholarship essay. Pairs with EssayDraftPanel +
 * AdditionalEssaysPanel: clicking "Outline" calls the
 * essay-outline edge function, the response renders here as a
 * structured card, and "Insert as scaffold" prefills the textarea
 * with the section headings + hints so the writer has a frame to
 * fill in.
 *
 * Why we ship this: blank-page paralysis is the #1 reason serious
 * applicants miss deadlines on prestige scholarships. They don't
 * lack words; they lack architecture. Giving them a Schwarzman-
 * shaped outline (anchor → stake → narrative → reflection →
 * forward) tailored to the prompt is what unblocks them.
 *
 * Design decisions:
 * - The overview line summarizes the essay's job in one sentence
 *   ("This essay needs to convince a reader that X without saying
 *   it directly"). Keeps the writer anchored to intent.
 * - Each section shows title + suggested words + hint. Click the
 *   section card to insert just that section's scaffold into the
 *   draft (so users who already have part of the essay can add
 *   only the missing structure).
 * - "Insert full scaffold" button inserts ALL sections as one
 *   block — for users starting from blank.
 * - Outline state is local (not persisted) — the value is in the
 *   resulting scaffold, not the outline itself. Re-generating
 *   gives a fresh take.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, X, ChevronRight, ListTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";

interface OutlineSection {
  title: string;
  hint: string;
  suggested_words: number;
}

interface OutlineResponse {
  overview: string;
  sections: OutlineSection[];
}

interface Props {
  scholarshipName: string;
  /** Optional verbatim prompt the scholarship is asking. */
  essayPrompt?: string | null;
  /** Optional essay slot title — "Leadership essay" / "Diversity" /
   *  empty for the primary essay. */
  essayTitle?: string | null;
  /** Word ceiling for this essay; the outline distributes
   *  suggested_words to roughly sum to this. */
  wordTarget: number;
  language?: "en" | "ru";
  /** Called when the user picks a scaffold to insert. The string
   *  is markdown-formatted — section heading lines + a one-line
   *  hint comment under each, ready to splice into the draft. */
  onInsert: (scaffold: string) => void;
}

const buildScaffold = (sections: OutlineSection[]): string => {
  return sections
    .map((s) => `## ${s.title} (~${s.suggested_words} words)\n_${s.hint}_\n\n`)
    .join("")
    .trim();
};

export const EssayOutlineCard = ({ scholarshipName, essayPrompt, essayTitle, wordTarget, language = "en", onInsert }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);

  const [outline, setOutline] = useState<OutlineResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const requestOutline = async () => {
    setLoading(true);
    try {
      // Pull the lightweight profile bits the outline endpoint
      // can use to tailor section hints. All optional — the
      // endpoint generates a generic-but-useful outline if profile
      // is empty.
      const stored = getStoredProfile();
      const studentProfile = stored ? {
        major: stored.fieldOfInterest || undefined,
        targetCountries: stored.targetCountries ?? undefined,
        gpa: stored.gpa ? Number.parseFloat(stored.gpa) : undefined,
        background: stored.educationLevel || undefined,
      } : undefined;

      const { data, error } = await supabase.functions.invoke<OutlineResponse>("essay-outline", {
        body: {
          scholarshipName,
          essayPrompt: essayPrompt || undefined,
          essayTitle: essayTitle || undefined,
          wordTarget,
          studentProfile,
          language,
        },
      });
      if (error) throw new Error(error.message);
      if (!data || !data.sections || data.sections.length === 0) {
        throw new Error(t("Outline came back empty. Try again?", "Структура пришла пустая. Попробовать снова?"));
      }
      setOutline(data);
    } catch (e) {
      toast.error((e as Error).message || t("Couldn't generate an outline", "Не удалось получить структуру"));
    } finally {
      setLoading(false);
    }
  };

  const insertFullScaffold = () => {
    if (!outline) return;
    onInsert(buildScaffold(outline.sections));
    setOutline(null);
  };

  const insertSection = (s: OutlineSection) => {
    onInsert(`## ${s.title} (~${s.suggested_words} words)\n_${s.hint}_\n\n`);
  };

  if (!outline && !loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={requestOutline}
        className="gap-1.5"
      >
        <ListTree className="w-3.5 h-3.5" />
        {t("Generate outline", "Получить структуру")}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-4">
      <div className="flex items-start gap-2 mb-3">
        <ListTree className="w-3.5 h-3.5 text-gold-dark mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-dark mb-1.5 inline-flex items-center gap-1.5">
            {t("Outline", "Структура")}
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          </p>
          {outline?.overview && (
            <p className="text-[12px] text-foreground/85 leading-relaxed italic">
              {outline.overview}
            </p>
          )}
        </div>
        <button
          onClick={() => { setOutline(null); }}
          className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
          aria-label={t("Dismiss outline", "Закрыть структуру")}
          title={t("Dismiss outline", "Закрыть структуру")}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {loading && (
        <p className="text-[11px] text-muted-foreground italic">
          {t("Designing your essay's architecture…", "Проектируем архитектуру эссе…")}
        </p>
      )}

      {outline && outline.sections.length > 0 && (
        <>
          <ul className="space-y-1.5">
            {outline.sections.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => insertSection(s)}
                  className="w-full text-left rounded-lg border border-border/60 bg-card hover:border-gold/40 hover:bg-card/80 transition-colors p-2.5 group"
                  title={t("Insert just this section into the draft", "Вставить только этот раздел в черновик")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-gold/15 text-gold-dark text-[9px] font-bold tabular-nums shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-[12px] text-foreground flex-1 min-w-0 truncate">
                      {s.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      ~{s.suggested_words} {t("w", "сл")}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-gold-dark group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug pl-6">
                    {s.hint}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gold/15">
            <Button
              variant="gold"
              size="sm"
              onClick={insertFullScaffold}
              className="gap-1.5 h-8 text-[12px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t("Insert full scaffold into draft", "Вставить всю структуру в черновик")}
            </Button>
            <button
              onClick={requestOutline}
              className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              {t("Try a different angle", "Другой ракурс")}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
