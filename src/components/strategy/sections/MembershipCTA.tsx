import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Eyebrow } from "../primitives";
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

const CTA_POOL: CtaCopy[] = [
  {
    eyebrow: { en: "This is only the beginning", ru: "Это только начало" },
    headline: {
      en: "Your snapshot is the diagnosis. The plan is the next step.",
      ru: "Ваш отчёт — это диагноз. Дальше нужен план.",
    },
    body: {
      en: "Inside Top Uni Membership we build your actual application list, line up deadlines, and cut the scholarships that don't fit your profile. You don't have to figure this out alone.",
      ru: "В Top Uni Membership мы собираем ваш реальный список заявок, расставляем дедлайны и отсекаем стипендии, которые не подходят профилю. Не нужно разбираться в одиночку.",
    },
  },
  {
    eyebrow: { en: "Want help turning this into a real plan?", ru: "Хотите превратить это в реальный план?" },
    headline: {
      en: "Join Top Uni Membership.",
      ru: "Вступайте в Top Uni Membership.",
    },
    body: {
      en: "Monthly strategy workshops, office hours with our team, Discover database access, application templates, and curated scholarship opportunities — for students applying abroad with scholarships.",
      ru: "Ежемесячные стратегические воркшопы, office hours с командой, доступ к Discover, шаблоны заявок и подобранные стипендии — для студентов, поступающих за рубеж со стипендией.",
    },
  },
  {
    eyebrow: { en: "Don't apply blind", ru: "Не подавайте вслепую" },
    headline: {
      en: "Stop guessing which scholarships you actually have a shot at.",
      ru: "Хватит гадать, где у вас реально есть шанс.",
    },
    body: {
      en: "Members get monthly strategy workshops, office hours, the Discover database, and feedback on application materials before they're submitted. Structure and access, not another AI tool.",
      ru: "Участники получают ежемесячные стратегические воркшопы, office hours, доступ к Discover и фидбек на материалы до подачи. Структура и доступ, а не очередной AI-инструмент.",
    },
  },
  {
    eyebrow: { en: "You have potential. You also have gaps.", ru: "У вас есть потенциал. И есть пробелы." },
    headline: {
      en: "Don't close those gaps alone.",
      ru: "Не закрывайте эти пробелы в одиночку.",
    },
    body: {
      en: "Top Uni Membership gives you the structure and access to fix what your snapshot just diagnosed — without the price tag of an elite consulting firm.",
      ru: "Top Uni Membership даёт структуру и доступ, чтобы закрыть то, что только что диагностировал ваш отчёт — без ценника элитной консалтинговой фирмы.",
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
      <section className="mt-3 mb-4 pt-6 border-t border-foreground/15 print:break-inside-avoid">
        <div
          data-strategy-cta
          className="rounded-2xl border border-gold/40 bg-gold/[0.06] p-5 sm:p-6"
        >
          <div className="mb-2">
            <Eyebrow>{copy.eyebrow[language]}</Eyebrow>
          </div>
          <h2 className="font-heading text-[20px] sm:text-[24px] font-bold leading-[1.2] tracking-tight text-foreground m-0 mb-3">
            {copy.headline[language]}
          </h2>
          <p className="text-[14.5px] leading-[1.55] text-foreground/75 m-0 mb-4">
            {copy.body[language]}
          </p>

          {stillOpen ? (
            <div className="mb-5">
              <p className="text-[13px] leading-[1.5] text-foreground m-0 mb-1">
                <span className="font-bold">$39.99 / {t(language, "month", "месяц")}.</span>{" "}
                <span className="text-foreground/65">
                  {t(
                    language,
                    "First 50 students get 50% off — use the promo code at checkout.",
                    "Первые 50 студентов получают 50% скидку — используйте промокод на оплате.",
                  )}
                </span>
              </p>
              <p className="text-[12.5px] text-gold-dark font-bold m-0 uppercase tracking-wider">
                {language === "ru"
                  ? `Осталось ${foundingLeft} из ${foundingCap} мест со скидкой.`
                  : `${foundingLeft} of ${foundingCap} discounted spots left.`}
              </p>
            </div>
          ) : (
            <p className="text-[13px] leading-[1.5] text-foreground m-0 mb-5">
              <span className="font-bold">$39.99 / {t(language, "month", "месяц")}.</span>{" "}
              <span className="text-foreground/65">
                {t(language, "Cancel anytime.", "Отмена в любой момент.")}
              </span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <Button
              variant="gold"
              size="lg"
              onClick={startCheckout}
              disabled={loading}
              className="gap-1.5"
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
            <p className="mt-3 text-[12.5px] text-rose-700 dark:text-rose-400 m-0">
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
