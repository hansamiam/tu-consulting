// Data-fetching wrapper around StrategyDossier.
// Loading state = the build-pipeline experience (GenerationPipeline)
// brought back per Samuel 2026-05-29 ("generic crap" → "bring back").
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import topuniBg from "@/assets/topuni-bg.jpg";
import { EDGE_FUNCTIONS_URL } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";
import { GenerationPipeline } from "@/components/GenerationPipeline";
import { StrategyDossier } from "./StrategyDossier";
import type { Language, StrategyApiResponse, StrategyReportV2 } from "./types";
import { t } from "./types";

interface Props {
  // deno-lint-ignore no-explicit-any
  profile: any;
  language: Language;
}

export const StrategyView = ({ profile, language }: Props) => {
  const [report, setReport] = useState<StrategyReportV2 | null>(null);
  const [loading, setLoading] = useState(true);
  // 2026-05-29 v2 — between "report arrived" and "dossier mounted" we
  // hold a brief reveal frame (~750ms) so the transition reads as a
  // letter unsealing instead of a brutal swap. Skipped on error path.
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authHeader = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};

        const resp = await fetch(`${EDGE_FUNCTIONS_URL}/topuni-ai-pathway`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ profile, language }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`${resp.status}: ${txt.slice(0, 200)}`);
        }

        const json = (await resp.json()) as StrategyApiResponse;
        if (!cancelled) {
          setReport(json.report);
          // Trigger the reveal animation. Loading false ⇒ pipeline
          // unmounts; revealing true ⇒ reveal frame mounts in its place
          // for ~750ms before the actual dossier slides in.
          setLoading(false);
          setRevealing(true);
          setTimeout(() => { if (!cancelled) setRevealing(false); }, 750);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [profile, language]);

  if (loading || revealing) {
    return (
      // 2026-05-29 v2 — campus parallax backdrop mirrors the wizard's
      // visual signature so the loading state doesn't feel like a
      // separate app. Cream canvas + fixed-position blurred topuniBg
      // at 12% opacity — same recipe as TopUniAI.tsx:734.
      <main
        className="min-h-screen relative overflow-hidden"
        style={{ background: "hsl(38 35% 97%)" }}
      >
        <div
          className="fixed inset-0 z-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: `url(${topuniBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(3px)",
          }}
          aria-hidden
        />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <GenerationPipeline profile={profile} isRu={language === "ru"} />
              </motion.div>
            )}
            {!loading && revealing && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="min-h-screen flex items-center justify-center px-4"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-block px-5 py-2 rounded-full border border-gold/40 bg-gold/10 text-[11px] uppercase tracking-[0.22em] font-bold text-gold-dark mb-5"
                  >
                    {t(language, "Strategy ready", "Стратегия готова")}
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="font-heading text-[28px] sm:text-[36px] font-bold tracking-tight text-foreground"
                  >
                    {t(language, "Opening your dossier…", "Открываем твой dossier…")}
                  </motion.h2>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "hsl(38 35% 97%)" }}
      >
        <div className="text-center max-w-md px-6">
          <h2 className="font-heading text-[22px] font-bold leading-tight text-foreground mb-3">
            {t(language, "Something went wrong.", "Что-то пошло не так.")}
          </h2>
          <p className="text-[14px] leading-[1.5] text-foreground/70 m-0 mb-4">
            {t(
              language,
              "We couldn't generate your strategy. Try refreshing in a minute.",
              "Не получилось сгенерировать стратегию. Попробуйте обновить страницу через минуту.",
            )}
          </p>
          {error && (
            <p className="text-[11px] font-mono text-foreground/40 m-0 break-words">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return <StrategyDossier report={report} />;
};
