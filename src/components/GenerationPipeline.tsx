import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  FileText,
  Compass,
  BarChart3,
  MapPin,
} from "lucide-react";

/**
 * GenerationPipeline — v2 pipeline (2026-05-29 rewrite).
 *
 * Honest narration of what the v2 strategy edge function actually
 * does (no more v1 embeddings + ranking + essay angles + deadlines
 * lies). Each step references the actual intake so the loading state
 * feels bespoke, not templated.
 *
 * Steps map roughly to the function's real phases:
 *   1. Reading your intake (degree, scores, signals)
 *   2. Resolving cultural context (CIS/first-gen/global)
 *   3. Scoring readiness across 5 axes
 *   4. Drafting the honest diagnosis (Gemini 2.5 Flash call)
 *   5. Naming the weaknesses + what they cost
 *   6. Composing your strategic-frame pathway
 *
 * Step timings calibrated to the typical ~15-20s Gemini call so the
 * pipeline visually catches up just before the response arrives.
 * Step list never shows 100% — parent unmounts on response.
 */

interface Profile {
  fullName?: string;
  targetCountries?: string[];
  gpa?: string;
  ielts?: string;
  major?: string;
  gradeLevel?: string;
}

interface Props {
  profile: Profile;
  isRu?: boolean;
}

interface Step {
  id: string;
  Icon: typeof Check;
  /** Headline shown when the step is active or completed */
  label: string;
  /** Sub-line — references real data when possible */
  detail: string;
  /** ms from start when this step turns "done" */
  doneAt: number;
}

export function GenerationPipeline({ profile, isRu = false }: Props) {
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const countryList = (profile.targetCountries || []).slice(0, 2).join(", ");
  const gpa = profile.gpa?.trim();
  const ielts = profile.ielts?.trim();
  const majorText = profile.major?.trim() || "";
  const gradeText = profile.gradeLevel?.trim() || "";

  // 2026-05-29 v2 — 6 steps → 4. Each line is one short, true sentence.
  // Trimmed the editorial buzz ("honest diagnosis", "Optimistic-realist
  // framing", "Funding-first · Research-first · …") that read as filler.
  const steps: Step[] = useMemo(() => [
    {
      id: "intake",
      Icon: FileText,
      label: t("Reading your intake", "Читаем твою анкету"),
      detail: gradeText && majorText
        ? `${gradeText} · ${majorText}${gpa ? ` · GPA ${gpa}` : ""}`
        : t("Degree, scores, narrative", "Уровень, оценки, нарратив"),
      doneAt: 2000,
    },
    {
      id: "context",
      Icon: Compass,
      label: t("Framing your context", "Рамка контекста"),
      detail: t("Cultural lens + funding posture", "Культурная рамка + finансы"),
      doneAt: 5000,
    },
    {
      id: "readiness",
      Icon: BarChart3,
      label: t("Scoring your readiness", "Оцениваем готовность"),
      detail: ielts || gpa
        ? t(
            `Across academics${gpa ? ` (GPA ${gpa})` : ""}, testing, experience`,
            `По академике${gpa ? ` (GPA ${gpa})` : ""}, тестам, опыту`,
          )
        : t("Across academics, testing, experience, narrative", "По академике, тестам, опыту, нарративу"),
      doneAt: 9500,
    },
    {
      id: "strategy",
      Icon: MapPin,
      label: t("Writing your strategy", "Пишем твою стратегию"),
      detail: countryList
        ? t(`Honest diagnosis · play · pivot · blindspot — ${countryList}`, `Диагноз · play · pivot · blindspot — ${countryList}`)
        : t("Honest diagnosis · play · pivot · blindspot", "Диагноз · play · pivot · blindspot"),
      doneAt: 15000,
    },
  ], [countryList, gpa, ielts, majorText, gradeText, isRu]);

  // Continuous progress bar tied to wall-clock; steps "complete" when their
  // doneAt ms is hit. We never show 100% until the response actually arrives;
  // that's the parent's job to unmount us.
  const totalDuration = steps[steps.length - 1].doneAt + 2000;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => setElapsed(Date.now() - start);
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  const progressPct = Math.min(95, (elapsed / totalDuration) * 100);

  // 2026-05-30 — loading screen polish per Samuel ("bland / too much
  // space"). Changes:
  //   • drop min-h-screen flex-center; let it sit naturally with top
  //     padding so the page doesn't feel like a vast empty canvas
  //   • header block grows: monogram + "TU STRATEGY ENGINE" eyebrow +
  //     larger headline + name pill + progress %
  //   • each step row now has a left vertical thread connecting the
  //     status indicators so the pipeline reads as a flowing path
  //   • current step's detail line gets a soft animated underline
  return (
    <div className="px-4 py-16 sm:py-20">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          {/* Eyebrow row — monogram square + brand line */}
          <div className="flex items-center gap-2.5 mb-4">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-gold-dark text-primary-foreground font-heading font-bold text-[12px] leading-none shadow-sm">
              TU
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-gold-dark">
              {t("Top Uni · Strategy engine", "Top Uni · Strategy engine")}
            </span>
          </div>

          <h3 className="font-heading text-[26px] sm:text-[32px] font-bold text-foreground tracking-tight leading-[1.1] mb-2">
            {profile.fullName
              ? t(`Building ${profile.fullName.split(" ")[0]}'s strategy`, `Готовим стратегию для ${profile.fullName.split(" ")[0]}`)
              : t("Building your strategy report", "Готовим твой стратегический отчёт")}
          </h3>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            {t("Usually 20–30 seconds. Hang tight.",
               "Обычно 20–30 секунд. Подожди немного.")}
          </p>
        </motion.div>

        {/* Progress bar + numeric % so the user has a concrete signal */}
        <div className="flex items-center gap-3 mb-7">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex-1">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-dark bg-[length:200%_100%]"
              initial={{ width: 0, backgroundPosition: "0% 50%" }}
              animate={{
                width: `${progressPct}%`,
                backgroundPosition: ["0% 50%", "200% 50%"],
              }}
              transition={{
                width: { duration: 0.3, ease: "linear" },
                backgroundPosition: { duration: 2.5, ease: "linear", repeat: Infinity },
              }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-foreground/55 font-semibold min-w-[2.5ch] text-right">
            {Math.round(progressPct)}%
          </span>
        </div>

        {/* Step list with a vertical thread connecting status indicators */}
        <ul className="relative space-y-4">
          <span
            aria-hidden
            className="absolute left-[13px] top-3.5 bottom-3.5 w-px bg-gradient-to-b from-transparent via-border to-transparent"
          />
          {steps.map((step, i) => {
            const isDone = elapsed >= step.doneAt;
            const isActive = !isDone && (i === 0 || elapsed >= steps[i - 1].doneAt);
            const isPending = !isDone && !isActive;

            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-start gap-3.5"
              >
                {/* Status indicator (sits over the thread) */}
                <span className={`relative z-10 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                  isDone
                    ? "bg-gold-dark text-primary-foreground shadow-sm"
                    : isActive
                      ? "bg-gold/15 text-gold-dark ring-2 ring-gold/50 shadow-[0_0_0_4px_rgba(218,165,32,0.08)]"
                      : "bg-card border border-border/70 text-muted-foreground/50"
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <step.Icon className="w-3.5 h-3.5" />}
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`font-semibold text-[14px] transition-colors ${
                      isDone ? "text-foreground/85" :
                      isActive ? "text-foreground" :
                      "text-muted-foreground/75"
                    }`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10.5px] font-bold text-gold-dark uppercase tracking-[0.14em] whitespace-nowrap"
                      >
                        {t("running", "идёт")}
                      </motion.span>
                    )}
                    {isDone && (
                      <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-[0.14em] whitespace-nowrap">
                        {t("done", "готово")}
                      </span>
                    )}
                  </div>
                  <p className={`text-[12.5px] mt-0.5 leading-snug ${
                    isPending ? "text-muted-foreground/45" : "text-muted-foreground"
                  }`}>
                    {step.detail}
                  </p>
                  {/* Soft animated underline on the active step's detail —
                      moving gradient cue that something is happening even
                      when the spinner is just spinning. */}
                  {isActive && (
                    <motion.span
                      aria-hidden
                      className="block h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent mt-1.5"
                      initial={{ width: "0%" }}
                      animate={{ width: ["0%", "100%", "0%"] }}
                      transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                    />
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
