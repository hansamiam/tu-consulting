import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Target, Lightbulb, AlertCircle, CheckCircle2,
  MinusCircle, HelpCircle, Crown, ArrowRight, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type {
  ScholarshipDeepDiveData, DeepDiveBreakdownStatus, DeepDiveOddsBucket,
} from "@/types/scholarshipDeepDive";

/**
 * <ScholarshipDeepDive /> — calls the scholarship-deep-dive edge function
 * with the current scholarship + the user's locally-stored profile, then
 * renders a four-panel personalized analysis above the static scholarship
 * info on /scholarships/:id.
 *
 * Soft-fails: if the user has no profile in localStorage, we render an
 * onboarding prompt instead of a chart. If the generation request errors,
 * we hide the panel — the static info below still renders fine.
 *
 * Generation is fast (~2-3s flash-tier) and cached server-side per
 * (scholarship × profile_hash), so re-visits are instant.
 */

interface ProfileForDive {
  fullName?: string;
  nationality?: string;
  major?: string;
  field?: string;
  gradeLevel?: string;
  targetCountries?: string[];
  gpa?: string;
  gpaScale?: string;
  ielts?: string;
  toefl?: string;
  sat?: string;
}

interface Props {
  scholarshipId: string;
  profile: ProfileForDive | null;
  language?: "en" | "ru";
  /** Called when the user has no profile yet — host page can route them
   *  to the wizard. */
  onBuildProfile?: () => void;
}

const STATUS_META: Record<DeepDiveBreakdownStatus, { Icon: typeof CheckCircle2; cls: string }> = {
  met:     { Icon: CheckCircle2, cls: "text-success" },
  near:    { Icon: AlertCircle,  cls: "text-amber-700 dark:text-amber-400" },
  miss:    { Icon: MinusCircle,  cls: "text-destructive" },
  unknown: { Icon: HelpCircle,   cls: "text-muted-foreground" },
};

const ODDS_META: Record<DeepDiveOddsBucket, { en: string; ru: string; cls: string; ringCls: string }> = {
  primary: {
    en: "Top match",
    ru: "Чёткое соответствие",
    cls: "text-success",
    ringCls: "ring-success/30 bg-success/5",
  },
  competitive: {
    en: "Within reach",
    ru: "Вполне достижимо",
    cls: "text-gold-dark",
    ringCls: "ring-gold/30 bg-gold/5",
  },
  aspirational: {
    en: "Aim high",
    ru: "Целься высоко",
    cls: "text-amber-700 dark:text-amber-400",
    ringCls: "ring-amber-300/40 bg-amber-50 dark:bg-amber-950/20",
  },
};

export const ScholarshipDeepDive = ({
  scholarshipId, profile, language = "en", onBuildProfile,
}: Props) => {
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const [data, setData] = useState<ScholarshipDeepDiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile is "filled enough" for a deep dive when we have at least
  // nationality + (gpa or ielts) + targetCountries OR field. Below that
  // bar the AI can't generate something specific, so we render an
  // onboarding prompt instead.
  const profileFilled = useMemo(() => {
    if (!profile) return false;
    const hasIdentity = !!profile.nationality;
    const hasAcademic = !!(profile.gpa || profile.ielts || profile.toefl || profile.sat);
    const hasIntent = !!(profile.major || profile.field || (profile.targetCountries && profile.targetCountries.length > 0));
    return hasIdentity && (hasAcademic || hasIntent);
  }, [profile]);

  useEffect(() => {
    if (!profileFilled || !scholarshipId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<ScholarshipDeepDiveData>(
          "scholarship-deep-dive",
          { body: { scholarshipId, profile, language } },
        );
        if (cancelled) return;
        if (error) throw new Error(error.message);
        if (!data || !data.match) throw new Error("Empty payload");
        setData(data);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [scholarshipId, profileFilled, language, profile]);

  // ── Render branches ────────────────────────────────────────────────────

  if (!profileFilled) {
    return (
      <div className="not-prose mb-8 rounded-2xl border-2 border-dashed border-gold/40 bg-gradient-to-br from-gold/[0.06] to-card p-6 sm:p-7">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-gold-dark" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1.5">
              {t("Personalized analysis", "Персональный анализ")}
            </p>
            <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground tracking-tight mb-1.5">
              {t("Will this scholarship work for you?",
                 "Подойдёт ли вам эта стипендия?")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xl">
              {t("Build your profile (60 seconds) and we'll show you a match-score breakdown vs your stats, a strategy specific to your background, realistic odds, and a 30-day plan for THIS scholarship.",
                 "Заполните профиль (60 секунд) — и мы покажем разбор соответствия по вашим показателям, стратегию под ваш бэкграунд, реальные шансы и план на 30 дней под эту конкретную стипендию.")}
            </p>
            <Button variant="gold" onClick={onBuildProfile} className="gap-1.5">
              {t("Build my profile", "Заполнить профиль")} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="not-prose mb-8 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.05] to-card p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="w-4 h-4 animate-spin text-gold-dark" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
            {t("Analyzing for your profile…", "Анализируем под ваш профиль…")}
          </p>
        </div>
        <div className="space-y-2.5">
          <div className="h-3 rounded bg-muted/60 animate-pulse" />
          <div className="h-3 rounded bg-muted/60 animate-pulse w-4/5" />
          <div className="h-3 rounded bg-muted/60 animate-pulse w-3/5" />
        </div>
      </div>
    );
  }

  // Error: silently hide. The static scholarship info below still renders.
  if (error || !data) return null;

  // Back-compat: any cached deep-dive rows from before SCHEMA_VERSION 2 used
  // the bucket value "stretch" — a banned word. Map it to "aspirational"
  // until the backend cache flushes naturally on next regeneration.
  const bucket = (data.odds.bucket as string) === "stretch" ? "aspirational" : data.odds.bucket;
  const oddsMeta = ODDS_META[bucket as DeepDiveOddsBucket] ?? ODDS_META.competitive;
  const overall = Math.max(0, Math.min(100, Math.round(data.match.overall_score)));
  const overallColor = overall >= 75 ? "text-success" : overall >= 55 ? "text-gold-dark" : overall >= 35 ? "text-amber-700 dark:text-amber-400" : "text-destructive";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="not-prose mb-8 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-card to-card overflow-hidden"
    >
      <div className="absolute" />

      {/* Header — overall score + odds bucket */}
      <div className="px-5 sm:px-7 pt-6 pb-5 border-b border-border/60 flex items-baseline justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary mb-2">
            <Crown className="w-3 h-3" />
            {t("Personalized for you", "Персонально для вас")}
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            {t("Your fit analysis", "Ваш разбор соответствия")}
          </h3>
        </div>
        <div className="flex items-baseline gap-3 shrink-0">
          <div className="flex items-baseline gap-1">
            <span className={`font-heading font-bold tabular-nums leading-none text-3xl sm:text-4xl ${overallColor}`}>{overall}</span>
            <span className="text-xs text-muted-foreground tabular-nums">/100</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.16em] uppercase ring-1 ${oddsMeta.cls} ${oddsMeta.ringCls}`}>
            <Target className="w-3 h-3" />
            {oddsMeta[language === "ru" ? "ru" : "en"]}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-x-7 gap-y-6 px-5 sm:px-7 py-6">
        {/* ── Match breakdown ──────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            {t("Match breakdown", "Соответствие по пунктам")}
          </p>
          <ul className="space-y-2.5">
            {data.match.breakdown.map((item, i) => {
              const meta = STATUS_META[item.status] ?? STATUS_META.unknown;
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <meta.Icon className={`w-4 h-4 shrink-0 mt-0.5 ${meta.cls}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{item.label}</p>
                    <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{item.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Odds + typical admit ─────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            {t("Realistic odds", "Реальные шансы")}
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed mb-3">
            {data.odds.rationale}
          </p>
          <div className="rounded-lg bg-muted/40 border border-border/60 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">
              {t("Typical successful applicant", "Типичный успешный кандидат")}
            </p>
            <p className="text-[13px] text-foreground/85 leading-snug">{data.odds.typical_admit_profile}</p>
          </div>
        </div>

        {/* ── Strategy ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-gold-dark" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("Strategy for you", "Стратегия под вас")}
            </p>
          </div>
          <p className="font-heading text-base sm:text-lg font-semibold text-foreground leading-tight tracking-tight mb-3">
            "{data.strategy.headline}"
          </p>
          <ol className="space-y-2 mb-4">
            {data.strategy.points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-snug">
                <span className="shrink-0 w-5 h-5 rounded-full bg-gold/15 text-gold-dark text-[11px] font-bold tabular-nums flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>{pt}</span>
              </li>
            ))}
          </ol>
          {data.strategy.avoid.length > 0 && (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive mb-1.5">
                {t("Don't do this", "Чего не делать")}
              </p>
              <ul className="space-y-1.5">
                {data.strategy.avoid.map((a, i) => (
                  <li key={i} className="text-[13px] text-foreground/85 leading-snug pl-4 relative">
                    <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-destructive" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── 30-day plan ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            {t("Your 30-day plan for this scholarship", "Ваш 30-дневный план под эту стипендию")}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.thirty_day.items.slice(0, 4).map((item, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark mb-2">
                  {t(`Week ${item.week}`, `Неделя ${item.week}`)}
                </p>
                <p className="text-[13px] text-foreground/85 leading-relaxed break-words">{item.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
};
