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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h3 className="font-heading text-2xl font-bold text-foreground tracking-tight mb-1">
          {profile.fullName
            ? t(`Building ${profile.fullName.split(" ")[0]}'s strategy`, `Готовим стратегию для ${profile.fullName.split(" ")[0]}`)
            : t("Building your strategy report", "Готовим ваш стратегический отчёт")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("This usually takes 20–30 seconds.",
             "Обычно 20–30 секунд.")}
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full bg-gradient-to-r from-gold-dark to-gold"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3, ease: "linear" }}
        />
      </div>

      {/* Step list */}
      <ul className="space-y-3">
        {steps.map((step, i) => {
          const isDone = elapsed >= step.doneAt;
          const isActive = !isDone && (i === 0 || elapsed >= steps[i - 1].doneAt);
          const isPending = !isDone && !isActive;

          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              {/* Status indicator */}
              <span className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                isDone
                  ? "bg-gold-dark text-primary-foreground shadow-sm"
                  : isActive
                    ? "bg-gold/20 text-gold-dark ring-1 ring-gold/40"
                    : "bg-muted text-muted-foreground/50"
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <step.Icon className="w-3.5 h-3.5" />}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`font-medium text-sm transition-colors ${
                    isDone ? "text-foreground" :
                    isActive ? "text-foreground" :
                    "text-muted-foreground/70"
                  }`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[11px] font-medium text-gold-dark whitespace-nowrap"
                    >
                      {t("running", "идёт")}
                    </motion.span>
                  )}
                  {isDone && (
                    <span className="text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                      {t("done", "готово")}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 leading-snug ${
                  isPending ? "text-muted-foreground/40" : "text-muted-foreground"
                }`}>
                  {step.detail}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
    </div>
  );
}
