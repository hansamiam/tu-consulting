import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

/**
 * <ScholarshipMiniGuide /> — pre-generated static guide for one scholarship,
 * read from public.scholarship_mini_guides. Generic to the scholarship
 * (NOT per-profile) — replaces the live scholarship-deep-dive call.
 *
 * 2026-05-25 redesign: stripped the gold-gradient-border card chrome,
 * mono-uppercase tracking-[0.22em] eyebrows, lucide icons next to every
 * label — all the same AI-template smell Samuel called out on the brief.
 * Matches the new editorial-magazine aesthetic.
 *
 * Renders nothing if no row exists (graceful degrade).
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
    if (!scholarshipId) {
      console.log("[mini-guide] no-scholarship-id");
      return;
    }
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
        console.warn("[mini-guide] fetch error", { scholarshipId, error });
        setContent(null);
      } else if (data?.content) {
        setContent(data.content as MiniGuideContent);
      } else {
        console.log("[mini-guide] no-row-found", { scholarshipId });
        setContent(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scholarshipId]);

  if (loading || !content) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="not-prose mb-8 max-w-2xl"
    >
      {/* Lead — who fits, as the section's display headline */}
      <p className="m-0 mb-2 text-[12px] uppercase tracking-[0.08em] font-semibold text-foreground/55">
        {t("How this scholarship plays", "Как работает эта стипендия")}
      </p>
      <h3 className="font-heading text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-[1.15] text-foreground m-0 mb-6 text-balance">
        {content.who_fits}
      </h3>

      <Block title={t("How to win it", "Как выиграть")}>
        <ol className="space-y-2.5 m-0 pl-0 list-none">
          {content.how_to_win.map((pt, i) => (
            <li
              key={i}
              className="grid grid-cols-[20px_1fr] gap-3 text-[15px] leading-[1.6] text-foreground/85"
            >
              <span className="font-heading font-semibold text-foreground/45 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{pt}</span>
            </li>
          ))}
        </ol>
      </Block>

      <Block title={t("What to prepare", "Что подготовить")}>
        <ul className="space-y-2 m-0 pl-0 list-none">
          {content.what_to_prepare.map((pt, i) => (
            <li
              key={i}
              className="grid grid-cols-[20px_1fr] gap-3 text-[15px] leading-[1.6] text-foreground/85"
            >
              <span className="font-heading text-foreground/45 leading-[1.6]">·</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t("Typical winner", "Кто обычно выигрывает")}>
        <p className="text-[15px] leading-[1.6] text-foreground/85 m-0">
          {content.typical_admit}
        </p>
      </Block>

      {content.watch_out.length > 0 && (
        <Block title={t("Watch out", "Будьте осторожны")}>
          <ul className="space-y-2 m-0 pl-0 list-none">
            {content.watch_out.map((a, i) => (
              <li
                key={i}
                className="grid grid-cols-[20px_1fr] gap-3 text-[15px] leading-[1.6] text-foreground/85"
              >
                <span className="text-rose-700/80 leading-[1.6]">!</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </motion.section>
  );
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-7 pt-6 border-t border-border/50">
    <p className="m-0 mb-3 text-[12px] uppercase tracking-[0.08em] font-semibold text-foreground/55">
      {title}
    </p>
    {children}
  </div>
);
