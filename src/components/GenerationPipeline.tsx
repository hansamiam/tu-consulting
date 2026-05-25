import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  Database,
  Award,
  Target,
  FileText,
  Calendar,
  Brain,
} from "lucide-react";

/**
 * GenerationPipeline — the trust-building loading experience.
 *
 * Rather than a generic "loading…" spinner, this component shows a real-time
 * pipeline view of what the AI is doing on the backend:
 *   1. Retrieving 200+ scholarships from the verified database
 *   2. Embedding your profile (1536-dim semantic vector)
 *   3. Ranking by 6 dimensions (academic / country / field / coverage / ...)
 *   4. Drafting strategic positioning + 90-day plan
 *   5. Mapping deadlines onto your timeline
 *   6. Finalizing brief
 *
 * Each step references the actual user profile (GPA, IELTS, countries) so it
 * reads as bespoke rather than templated. Steps tick at calibrated timings
 * that roughly match real backend phases — by the time step 3-4 ticks, the
 * first stream chunk is usually arriving.
 *
 * Visual treatment: dense, technical, premium. Like watching a build pipeline
 * complete — each step is a small celebration of competence.
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

  const steps: Step[] = useMemo(() => [
    {
      id: "retrieve",
      Icon: Database,
      label: t("Loading the verified Discover catalog", "Загружаем верифицированный каталог Discover"),
      detail: t("Programs from governments, universities, and foundations", "Программы от правительств, университетов и фондов"),
      doneAt: 700,
    },
    {
      id: "embed",
      Icon: Brain,
      label: t("Embedding your profile", "Векторизуем ваш профиль"),
      detail: countryList
        ? t(`Targeting ${countryList} · ${majorText || "your field"}`, `Цель: ${countryList} · ${majorText || "ваше направление"}`)
        : t("Encoding into a 1536-dim semantic vector", "Кодируем в 1536-мерный вектор"),
      doneAt: 1700,
    },
    {
      id: "rank",
      Icon: Target,
      label: t("Ranking on 6 dimensions", "Ранжируем по 6 измерениям"),
      detail: gpa || ielts
        ? t(
            `Academics ${gpa ? `(GPA ${gpa})` : ""}${ielts ? `, English (IELTS ${ielts})` : ""}, eligibility, coverage, urgency`,
            `Академика ${gpa ? `(GPA ${gpa})` : ""}${ielts ? `, английский (IELTS ${ielts})` : ""}, право на участие, покрытие, срочность`
          )
        : t("Academics · eligibility · coverage · field · country · timing", "Академика · право · покрытие · направление · страна · сроки"),
      doneAt: 3100,
    },
    {
      id: "shortlist",
      Icon: Award,
      label: t("Mapping schools to your funding", "Привязываем школы к вашему финансированию"),
      detail: t("3 schools where your scholarships actually land you", "3 школы, куда вас приведут эти стипендии"),
      doneAt: 5000,
    },
    {
      id: "essay",
      Icon: FileText,
      label: t("Drafting 3 essay angles", "Составляем 3 ракурса для эссе"),
      detail: t("Each anchored to a specific signal in your profile", "Каждый — на основе конкретного сигнала вашего профиля"),
      doneAt: 7500,
    },
    {
      id: "calendar",
      Icon: Calendar,
      label: t("Mapping upcoming deadlines", "Сводим ближайшие дедлайны"),
      detail: t("Sorted to surface what's most urgent first", "Сортируем по срочности"),
      doneAt: 10500,
    },
  ], [countryList, gpa, ielts, majorText, isRu]);

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        {/* 2026-05-25: stripped the "WORKING" 10px mono-uppercase
            tracking-[0.22em] eyebrow — that style is exactly the
            AI-template smell Samuel called out on the brief. Pulse dot
            alone says the same thing without the templated label. */}
        <div className="mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-dark opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-dark" />
          </span>
        </div>
        <h3 className="font-heading text-2xl font-bold text-foreground tracking-tight mb-1">
          {profile.fullName
            ? t(`Building ${profile.fullName.split(" ")[0]}'s strategy`, `Готовим стратегию для ${profile.fullName.split(" ")[0]}`)
            : t("Building your strategy report", "Готовим ваш стратегический отчёт")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("This usually takes 20–40 seconds. The brief streams in below as it generates.",
             "Обычно 20–40 секунд. Брифинг появится ниже по мере генерации.")}
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
