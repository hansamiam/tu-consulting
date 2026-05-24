import { useEffect, useMemo, useState } from "react";
import { Crown, Loader2, ArrowRight, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProComparisonModal } from "@/components/ProComparisonModal";
import { PathAFallbackCard, type PathAFields } from "./PathAFallbackCard";

/**
 * <DeepDiveModal /> — Membership-gated per-scholarship deep-dive
 * insight modal. Opens from a "Deep dive" CTA on the scholarship
 * detail page. Renders TWO stacked cards from the v6
 * scholarship-deep-dive edge function:
 *
 *   B1 — "How to win this scholarship"  (always for paying members)
 *   B2 — "Why this fits you"            (profile-gated upsell)
 *
 * Each card = one cousin-voice opening sentence (the_read) + 3-4
 * scan-density bullets. If the edge function returns _fallback on a
 * card, that slot renders <PathAFallbackCard /> with a banner cue
 * instead — never an empty modal.
 *
 * Membership check happens client-side via useAuth() so non-members
 * open the existing <ProComparisonModal /> directly (no 402 round-
 * trip to the edge function). Members trigger the function call and
 * see a skeleton state during generation (~3-8s first-click for
 * cache misses; ~120ms for cache hits).
 */

interface CardOutput {
  the_read: string;
  bullets: string[];
  sources_used?: string[];
  _cached?: boolean;
  _generated_at?: string;
  _tier?: "standard" | "premium";
  _fallback?: boolean;
}

interface DeepDiveResponse {
  how_to_win?: CardOutput;
  why_fits?: CardOutput | null;
}

interface ProfileForDive {
  fullName?: string;
  nationality?: string;
  major?: string;
  field?: string;
  gradeLevel?: string;
  targetCountries?: string[];
  gpa?: string | number;
  ielts?: string | number;
  toefl?: string | number;
  sat?: string | number;
  archetype?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scholarshipId: string;
  scholarshipName: string | null;
  /** Local-storage profile adapted to the edge function's shape, or
   *  null when the user hasn't built one. B1 still renders without it
   *  (cached per nationality_bucket); B2 shows a build-profile CTA. */
  profile: ProfileForDive | null;
  /** Path A backfilled fields — surfaced as the fail-mode fallback
   *  card when the v6 generation can't land. Always pass these. */
  fallback: PathAFields;
  /** Navigate callback to /topuni-ai when user clicks the B2 build-
   *  profile CTA. */
  onBuildProfile: () => void;
  language?: "en" | "ru";
}

export const DeepDiveModal = ({
  open, onOpenChange, scholarshipId, scholarshipName,
  profile, fallback, onBuildProfile, language = "en",
}: Props) => {
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const [data, setData] = useState<DeepDiveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fire the function when the modal is actually open. Avoids
  // wasting LLM spend on members who hover/preview without committing.
  useEffect(() => {
    if (!open || !scholarshipId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const { data: resp, error: invokeErr } = await supabase.functions.invoke<DeepDiveResponse>(
          "scholarship-deep-dive",
          {
            body: {
              scholarshipId,
              card: "both",
              nationality: profile?.nationality ?? "",
              profile: profile ?? undefined,
              language,
            },
          },
        );
        if (cancelled) return;
        if (invokeErr) throw new Error(invokeErr.message);
        if (!resp) throw new Error("Empty response");
        setData(resp);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, scholarshipId, language, profile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 sm:px-8 pt-6 pb-4 border-b border-border/60">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary self-start mb-2">
            <Crown className="w-3 h-3" />
            {t("Deep dive", "Глубокий разбор")}
          </div>
          <DialogTitle className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            {scholarshipName ?? t("This scholarship", "Эта стипендия")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 sm:px-8 py-6 space-y-7">
          {loading && <DeepDiveSkeleton language={language} />}

          {!loading && error && (
            // Network-level error (function unreachable): the edge function
            // is supposed to always return 200 with a fallback payload, but
            // if even THAT fails we render the local fallback derived from
            // Path A fields. Never an empty modal.
            <>
              <DeepDiveSectionHeader
                kicker={t("How to win this scholarship", "Как выиграть эту стипендию")}
              />
              <PathAFallbackCard scholarship={fallback} language={language} />
            </>
          )}

          {!loading && !error && data && (
            <>
              {/* ── B1: How to win this scholarship (always renders) ── */}
              <section>
                <DeepDiveSectionHeader
                  kicker={t("How to win this scholarship", "Как выиграть эту стипендию")}
                  tier={data.how_to_win?._tier}
                />
                {data.how_to_win && !data.how_to_win._fallback
                  ? <DeepDiveCard card={data.how_to_win} />
                  : <PathAFallbackCard scholarship={fallback} language={language} />}
              </section>

              {/* ── B2: Why this fits you (profile-gated upsell) ── */}
              <section>
                <DeepDiveSectionHeader
                  kicker={t("Why this fits you", "Почему это подходит вам")}
                />
                {data.why_fits === null
                  ? <BuildProfileCard onBuild={onBuildProfile} language={language} />
                  : data.why_fits && !data.why_fits._fallback
                    ? <DeepDiveCard card={data.why_fits} />
                    : data.why_fits
                      ? <PathAFallbackCard scholarship={fallback} language={language} />
                      : <BuildProfileCard onBuild={onBuildProfile} language={language} />}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Sub-components ──────────────────────────────────────────────── */

const DeepDiveSectionHeader = ({ kicker, tier }: { kicker: string; tier?: "standard" | "premium" }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
      {kicker}
    </p>
    {tier === "premium" && (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-[0.12em] uppercase bg-gold/10 text-gold-dark border border-gold/30"
        title="Premium tier — grounded in additional research articles"
      >
        <BadgeCheck className="w-2.5 h-2.5" />
        Premium
      </span>
    )}
  </div>
);

const DeepDiveCard = ({ card }: { card: CardOutput }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] to-card p-5 sm:p-6"
  >
    <p className="font-heading text-base sm:text-lg font-semibold text-foreground leading-snug tracking-tight mb-4">
      {card.the_read}
    </p>
    <ul className="space-y-2.5">
      {card.bullets.map((b, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-sm text-foreground/85 leading-snug"
        >
          <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-dark/70" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);

const DeepDiveSkeleton = ({ language }: { language: "en" | "ru" }) => {
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-dark" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
            {t("Loading the strategist's read…", "Загружаем разбор стратега…")}
          </p>
        </div>
        <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/[0.04] to-card p-5 sm:p-6 space-y-3">
          <div className="h-4 rounded bg-muted/60 animate-pulse w-5/6" />
          <div className="h-4 rounded bg-muted/60 animate-pulse w-4/6" />
          <div className="pt-2 space-y-2">
            <div className="h-3 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 rounded bg-muted/50 animate-pulse w-11/12" />
            <div className="h-3 rounded bg-muted/50 animate-pulse w-9/12" />
            <div className="h-3 rounded bg-muted/50 animate-pulse w-10/12" />
          </div>
        </div>
      </div>
      <div>
        <div className="h-3 rounded bg-muted/40 animate-pulse w-1/3 mb-3" />
        <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/[0.04] to-card p-5 sm:p-6 space-y-3">
          <div className="h-4 rounded bg-muted/60 animate-pulse w-3/4" />
          <div className="pt-2 space-y-2">
            <div className="h-3 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 rounded bg-muted/50 animate-pulse w-10/12" />
            <div className="h-3 rounded bg-muted/50 animate-pulse w-8/12" />
          </div>
        </div>
      </div>
    </>
  );
};

const BuildProfileCard = ({
  onBuild, language,
}: { onBuild: () => void; language: "en" | "ru" }) => {
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  return (
    <div className="rounded-xl border-2 border-dashed border-gold/40 bg-gradient-to-br from-gold/[0.05] to-card p-5 sm:p-6">
      <p className="text-sm text-foreground/85 leading-snug mb-4">
        {t(
          "Complete your free strategy report and we'll show you why this scholarship fits you specifically — anchored to your numbers, your major, your nationality.",
          "Заполните бесплатный стратегический отчёт — и мы покажем, почему именно эта стипендия подходит лично вам — с привязкой к вашим показателям, специальности, гражданству.",
        )}
      </p>
      <Button variant="gold" onClick={onBuild} className="gap-1.5">
        {t("Build my strategy report", "Заполнить стратегический отчёт")}
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

/* ─── Convenience trigger button ─────────────────────────────────── */

interface TriggerProps {
  scholarshipId: string;
  scholarshipName: string | null;
  profile: ProfileForDive | null;
  fallback: PathAFields;
  onBuildProfile: () => void;
  language?: "en" | "ru";
}

/**
 * <DeepDiveTriggerButton /> — bundled CTA + modal trigger. Renders a
 * "Deep dive" button; on click, checks membership status. Member →
 * opens DeepDiveModal. Non-member → opens ProComparisonModal (skips
 * the 402 round-trip to the edge function).
 *
 * Drop-in replacement for the retired <ScholarshipDeepDive /> inline
 * component. Use this on ScholarshipDetail.tsx.
 */
export const DeepDiveTriggerButton = ({
  scholarshipId, scholarshipName, profile, fallback, onBuildProfile,
  language = "en",
}: TriggerProps) => {
  const { subscription } = useAuth();
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const isMember = useMemo(() => {
    const tier = subscription?.tier ?? "free";
    const active = subscription?.is_active ?? false;
    return (tier === "pro" || tier === "founding") && active;
  }, [subscription]);

  const handleClick = () => {
    if (isMember) setDeepDiveOpen(true);
    else setPaywallOpen(true);
  };

  return (
    <>
      <div className="not-prose mb-8 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-card to-card overflow-hidden p-5 sm:p-7">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gold to-gold-dark border border-gold/40 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1.5">
              {t("Members only", "Только для участников")}
            </p>
            <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground tracking-tight mb-1.5">
              {t(
                "The strategist's deep dive on this scholarship",
                "Глубокий разбор этой стипендии от стратега",
              )}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xl">
              {t(
                "How to win it, and why it fits your profile — grounded in the official page and the strategist's read on what actually wins.",
                "Как её выиграть и почему она подходит вашему профилю — на основе официальной страницы и оценки стратега.",
              )}
            </p>
            <Button variant="gold" onClick={handleClick} className="gap-1.5">
              {t("Deep dive", "Глубокий разбор")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <DeepDiveModal
        open={deepDiveOpen}
        onOpenChange={setDeepDiveOpen}
        scholarshipId={scholarshipId}
        scholarshipName={scholarshipName}
        profile={profile}
        fallback={fallback}
        onBuildProfile={onBuildProfile}
        language={language}
      />
      <ProComparisonModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        gateId="scholarship-deep-dive"
      />
    </>
  );
};
