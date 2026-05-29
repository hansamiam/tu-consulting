import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { SectionLabel } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  language: Language;
}

/* CTA copy rotation pool. Single CTA visible at a time — we pick one
 * variant per mount. Variants stay deliberately offer-AGNOSTIC for
 * now: per `feedback_founding_20_dead.md` the founding-20 framing is
 * killed (rebranded to "Top Uni Membership"). The "first 50 students
 * get 50% off" launch incentive ships via promo code at checkout — the
 * underlying Stripe SKU is $39.99/mo per `Pricing.tsx`. CTA button
 * routes directly to create-subscription-checkout (no /pricing detour
 * — Samuel explicitly asked for single-click). */
interface CtaCopy {
  eyebrow: { en: string; ru: string };
  headline: { en: string; ru: string };
  body: { en: string; ru: string };
}

// 2026-05-29 — purged the "You have potential / You have gaps" memo-
// speak variant ("internal thought, not client-facing" per Samuel).
// Single locked CTA — no random rotation surfacing a bad copy.
const CTA_POOL: CtaCopy[] = [
  {
    eyebrow: { en: "Turn this snapshot into a real scholarship plan", ru: "Превратите этот snapshot в реальный план" },
    headline: {
      en: "Join the first-ever Top Uni Membership Program.",
      ru: "Вступайте в первую программу Top Uni Membership.",
    },
    body: {
      en: "Monthly workshops, office hours, and member-only scholarship insights — for students applying abroad on scholarships.",
      ru: "Ежемесячные воркшопы, office hours и member-only инсайды по стипендиям — для студентов, поступающих за рубеж со стипендией.",
    },
  },
];

export const MembershipCTA = ({ language }: Props) => {
  const { user } = useAuth();
  const [foundingLeft, setFoundingLeft] = useState<number | null>(null);
  const [foundingCap, setFoundingCap] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("founding_member_counter")
      .select("claimed_count, cap")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFoundingLeft(Math.max(0, (data.cap as number) - (data.claimed_count as number)));
          setFoundingCap(data.cap as number);
        }
      });
  }, []);

  const copy = useMemo(
    () => CTA_POOL[Math.floor(Math.random() * CTA_POOL.length)],
    [],
  );

  const stillOpen = foundingLeft != null && foundingLeft > 0;

  const startCheckout = async () => {
    setError(null);

    if (!user) {
      // Send them back to the dossier after auth so they can continue
      // from where they were. Trigger the auth modal inline — no
      // /pricing detour, per Samuel's "remove click friction" direction.
      setPostAuthRedirect(window.location.pathname + window.location.search);
      setAuthOpen(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "create-subscription-checkout",
        { body: { tier: "founding", interval: "month", embedded: false } },
      );
      if (invokeError) throw new Error(invokeError.message);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Checkout URL missing from response");
    } catch (e) {
      const msg = (e as Error).message || "Checkout failed";
      console.error("[membership-cta] checkout error:", msg);
      setError(
        t(
          language,
          "Couldn't open checkout. Please refresh and try again.",
          "Не удалось открыть оплату. Обновите страницу и попробуйте снова.",
        ),
      );
      setLoading(false);
    }
  };

  const ctaLabel = stillOpen
    ? t(language, "Claim 50% Off — Join Top Uni", "Получить 50% — вступить в Top Uni")
    : t(language, "Join Top Uni Membership", "Вступить в Top Uni Membership");

  return (
    <>
      {/* 2026-05-29 v2 — quieter card mirroring the Discover detail-sheet
          AcademyHookCta look (subtle muted bg, single accent line, small
          right-aligned button). The previous gold-border ALL-CAPS variant
          jarred against the dossier's editorial tone — Samuel called it
          "jarring" against the polished pull-up CTA. Pricing + scarcity
          stay because they're load-bearing trust signals; just at the
          same weight as the body. */}
      <section className="mt-3 mb-4 pt-6 border-t border-foreground/15 print:break-inside-avoid">
        <div
          data-strategy-cta
          className="rounded-xl border border-border/60 bg-muted/30 p-5"
        >
          <div className="mb-1.5">
            <SectionLabel>{copy.eyebrow[language]}</SectionLabel>
          </div>
          <h2 className="font-heading text-[17px] sm:text-[18px] font-bold leading-tight tracking-tight text-foreground m-0 mb-2">
            {copy.headline[language]}
          </h2>
          <p className="text-[13.5px] leading-[1.55] text-foreground/70 m-0 mb-3">
            {copy.body[language]}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] leading-[1.45] text-foreground/85 m-0">
                <span className="font-semibold">$39.99 / {t(language, "month", "месяц")}.</span>
                {stillOpen && (
                  <>
                    {" "}
                    <span className="text-foreground/60">
                      {t(language, "First 50 students get 50% off.", "Первые 50 студентов — 50% скидка.")}
                    </span>
                  </>
                )}
              </p>
              {stillOpen && (
                <p className="text-[10.5px] text-gold-dark font-semibold m-0 mt-0.5 uppercase tracking-[0.14em]">
                  {language === "ru"
                    ? `Осталось ${foundingLeft} из ${foundingCap}`
                    : `${foundingLeft} of ${foundingCap} spots left`}
                </p>
              )}
            </div>
            <Button
              onClick={startCheckout}
              disabled={loading}
              size="sm"
              className="shrink-0 gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              {ctaLabel}
            </Button>
          </div>

          {error && (
            <p className="mt-3 text-[12px] text-rose-700 dark:text-rose-400 m-0">
              {error}
            </p>
          )}
        </div>
      </section>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        language={language}
        initialMode="signup"
      />
    </>
  );
};
