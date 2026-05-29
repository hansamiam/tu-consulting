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
      // 2026-05-30 — dropped the "— for students applying abroad on
      // scholarships" tail. Audience is already obvious from context
      // (they just got a scholarship-strategy dossier). Tail read as
      // salesy filler.
      en: "Monthly workshops, office hours, and member-only scholarship insights.",
      ru: "Ежемесячные воркшопы, office hours и member-only инсайды по стипендиям.",
    },
  },
];

// 2026-05-30 — launch-discount pricing. $39.99 standard struck through,
// $29.99 shown as the live price for the first 50 founders. Decoupled
// from the founding_member_counter status: if the cap is reached we
// fall back to showing $39.99 as the standard price.
const STANDARD_PRICE = "$39.99";
const LAUNCH_PRICE = "$29.99";

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

  // 2026-05-30 — "Join Top Uni" locked. Pre-fix had "Become a member"
  // but Samuel reverted that on the dossier-CTA surface specifically;
  // the strategy report wants brand voice ("Top Uni"), not the generic
  // membership ask. Discover sidebar continues to use "Become a member".
  const ctaLabel = t(language, "Join Top Uni", "Вступить в Top Uni");

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
              {/* 2026-05-30 — drop "Launch discount — first 50." subline +
                  founding-counter scarcity row. NURZADA50 is the actual
                  50% code for Nurzada's audience (separate distribution).
                  The general early-launch discount is purely the visual
                  $39.99 → $29.99 crossed-out effect. */}
              <p className="text-[12.5px] leading-[1.45] text-foreground/85 m-0">
                {stillOpen ? (
                  <>
                    <span className="text-foreground/45 line-through mr-1.5">{STANDARD_PRICE}</span>
                    <span className="font-semibold">{LAUNCH_PRICE} / {t(language, "month", "месяц")}.</span>
                  </>
                ) : (
                  <span className="font-semibold">{STANDARD_PRICE} / {t(language, "month", "месяц")}.</span>
                )}
              </p>
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
