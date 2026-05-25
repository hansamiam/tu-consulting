import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, CheckCircle2, Lightbulb, AlertTriangle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * <ScholarshipMiniGuide /> — pre-generated static guide for one scholarship,
 * read from public.scholarship_mini_guides. Generic to the scholarship
 * (NOT per-profile) — replaces the live scholarship-deep-dive call for
 * Discover's "How this scholarship plays" panel.
 *
 * Background: per-profile deep-dive hallucinated eligibility (Commonwealth
 * → Kazakhstani user → "demonstrate impact in Kazakhstan"). Sam picked
 * deterministic offline-generated guides instead — recorded in
 * project_topuni_deep_dive_decisions_2026_05_25.md. The deep-dive function
 * and component stay in tree for future revival as a member-only feature.
 *
 * Renders nothing if no row exists (graceful degrade — the static
 * scholarship info below still renders).
 */

export interface MiniGuideContent {
  schema_version: number;
  who_fits: string;
  how_to_win: string[];
  watch_out: string[];
  what_to_prepare: string[];
  typical_admit: string;
}

interface Props {
  scholarshipId: string;
  language?: "en" | "ru";
}

export const ScholarshipMiniGuide = ({ scholarshipId, language = "en" }: Props) => {
  const [content, setContent] = useState<MiniGuideContent | null>(null);
  const [loading, setLoading] = useState(true);

  const t = useMemo(() => (en: string, ru: string) => (language === "ru" ? ru : en), [language]);

  useEffect(() => {
    if (!scholarshipId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("scholarship_mini_guides")
        .select("content")
        .eq("scholarship_id", scholarshipId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[mini-guide] fetch error", error);
        setContent(null);
      } else if (data?.content) {
        setContent(data.content as MiniGuideContent);
      } else {
        setContent(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scholarshipId]);

  if (loading || !content) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="not-prose mb-8 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-card to-card overflow-hidden"
    >
      <div className="px-5 sm:px-7 pt-6 pb-5 border-b border-border/60">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1.5">
          {t("How this scholarship plays", "Как работает эта стипендия")}
        </p>
        <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
          {content.who_fits}
        </h3>
      </div>

      <div className="grid lg:grid-cols-2 gap-x-7 gap-y-6 px-5 sm:px-7 py-6">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-gold-dark" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("How to win it", "Как выиграть")}
            </p>
          </div>
          <ol className="space-y-2.5">
            {content.how_to_win.map((pt, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-snug">
                <span className="shrink-0 w-5 h-5 rounded-full bg-gold/15 text-gold-dark text-[11px] font-bold tabular-nums flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{pt}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-3.5 h-3.5 text-gold-dark" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("What to prepare", "Что подготовить")}
            </p>
          </div>
          <ul className="space-y-2">
            {content.what_to_prepare.map((pt, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-success" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-3.5 h-3.5 text-gold-dark" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("Typical winner", "Кто обычно выигрывает")}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border/60 p-3.5">
            <p className="text-[13px] text-foreground/85 leading-snug">{content.typical_admit}</p>
          </div>
        </div>

        {content.watch_out.length > 0 && (
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive">
                  {t("Watch out", "Будьте осторожны")}
                </p>
              </div>
              <ul className="space-y-1.5">
                {content.watch_out.map((a, i) => (
                  <li key={i} className="text-[13px] text-foreground/85 leading-snug pl-4 relative">
                    <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-destructive" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};
