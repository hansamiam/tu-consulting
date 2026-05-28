import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  FileText,
  Compass,
  BarChart3,
  Quote,
  AlertOctagon,
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

  const steps: Step[] = useMemo(() => [
    {
      id: "intake",
      Icon: FileText,
      label: t("Reading your intake", "Читаем вашу анкету"),
      detail: gradeText && majorText
        ? t(`${gradeText} · ${majorText}${gpa ? ` · GPA ${gpa}` : ""}`, `${gradeText} · ${majorText}${gpa ? ` · GPA ${gpa}` : ""}`)
        : t("Degree, scores, signals, free-text", "Уровень, оценки, сигналы, free-text"),
      doneAt: 1200,
    },
    {
      id: "context",
      Icon: Compass,
      label: t("Resolving cultural context", "Определяем культурный контекст"),
      detail: t(
        "Framing for first-gen-abroad vs first-gen-college vs global-step",
        "Рамка для first-gen-abroad / first-gen-college / global-step",
      ),
      doneAt: 2800,
    },
    {
      id: "axes",
      Icon: BarChart3,
      label: t("Scoring readiness across 5 axes", "Оцениваем готовность по 5 осям"),
      detail: ielts || gpa
        ? t(
            `Academic ${gpa ? `(GPA ${gpa})` : ""}${ielts ? ` · English (IELTS ${ielts})` : ""} · testing · experience · funding`,
            `Академика ${gpa ? `(GPA ${gpa})` : ""}${ielts ? ` · английский (IELTS ${ielts})` : ""} · тесты · опыт · финансирование`,
          )
        : t(
            "Academic strength · testing · experience · narrative · funding",
            "Академика · тесты · опыт · нарратив · финансирование",
          ),
      doneAt: 5500,
    },
    {
      id: "diagnosis",
      Icon: Quote,
      label: t("Drafting your honest diagnosis", "Готовим честный диагноз"),
      detail: countryList
        ? t(`Optimistic-realist framing for ${countryList}`, `Optimistic-realist рамка для ${countryList}`)
        : t(
            "Two-to-three sentence pull-quote — honest about the gap, the lever, and the stakes",
            "2-3 предложения — про рычаг, пробел и ставки",
          ),
      doneAt: 9000,
    },
    {
      id: "weaknesses",
      Icon: AlertOctagon,
      label: t("Naming weaknesses and what they cost", "Называем слабости и их цену"),
      detail: t(
        "Each gap with the specific application-time consequence",
        "Каждый пробел с конкретной ценой при подаче",
      ),
      doneAt: 12500,
    },
    {
      id: "pathway",
      Icon: MapPin,
      label: t("Composing your strategic pathway", "Складываем стратегию"),
      detail: t(
        "Funding-first · Research-first · Applied · Affordability-first — one frame",
        "Funding-first · Research-first · Applied · Affordability-first — одна рамка",
      ),
      doneAt: 15500,
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
    <div className="py-10 px-4 max-w-2xl mx-auto">
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
  );
}
