// Pricing — Hormozi-style stacked-value offer page.
// Dual-language via the `language` prop ("en" | "ru"). All user-facing
// copy lives in COPY at the top of the file so EN/RU stay in lockstep
// — there is exactly one place to edit.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, Crown, Loader2, Sparkles, Shield,
  ArrowRight, Lock, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OutcomesBar } from "@/components/OutcomesBar";

interface PricingProps { language?: "en" | "ru"; }

// ─── Copy table — one place, both languages, no drift ─────────────────────
const COPY = {
  en: {
    badge: (cap: number) => `Founding cohort · first ${cap} get the launch discount`,
    h1a: "Apply to top universities with the team that",
    h1b: "already got in.",
    sub: "Yale, Schwarzman/Cambridge, and Harvard alumni teach you the exact strategy that works — every month, live, with the recordings yours.",
    spotsLeft: (left: number, cap: number) => `Only ${left} of ${cap} founding spots left`,
    tier: "TopUni Pro",
    tierTagline: "The full toolkit.",
    valueStack: [
      { title: "Personalized strategy report (TopUni AI)",          body: "Tailored shortlist, funding pathway, 90-day action plan. Downloadable PDF you can share with parents and counselors.", value: "$99" },
      { title: "Full Discover database with strategy notes",         body: "Every ranked scholarship match with how-to-win strategy notes, ideal-candidate profiles, and common rejection patterns.",         value: "$199" },
      { title: "Live monthly workshops with our founders",           body: "Yale · Schwarzman / Cambridge · Harvard. Essay clinics, scholarship strategy, country deep-dives. They've done it. Now they coach you.", value: "$200/mo" },
      { title: "Recordings library — every workshop forever",        body: "Miss one? Catch up on your schedule. The library compounds every month.",                                              value: "$99" },
      { title: "Direct line to the founders",                        body: "Submit questions, get product input rights, vote on workshop topics. Your influence shapes the platform.",            value: "Priceless" },
    ],
    valueTotalLabel: "$597+/mo",
    totalValueRow: "Total value if bought separately",
    foundingPriceLabel: "Launch price",
    perMonth: "/month",
    youSave: "You save 93%",
    publicNote: "Founding cohort discount available with code at checkout.",
    publicNoteRest: "Cancel anytime — no long-term lock-in.",
    capacityClaimed: (claimed: number, cap: number) => `${claimed} / ${cap} claimed`,
    capacityLeft: (left: number) => `${left} left`,
    valueWordPrefix: "value",
    cta: {
      loading: "",
      isFounding: "You're a Founding Member",
      soldOut: "Sold out — join waitlist",
      claim: "Start with TopUni Pro",
    },
    riskReversalBold: "30-day money-back guarantee.",
    riskReversal: "Full refund, no questions asked. Cancel anytime after.",
    stripeBilling: "Stripe secure checkout · billed monthly · cancel anytime",
    finalH2a: "First",
    finalH2b: "founding members get the launch discount.",
    finalH2c: "",
    finalLeftPrefix: "spots left at the founding price. After they fill, $39/mo standard.",
    finalNoLeft: "Founding cohort filled. $39/mo standard with promo codes available.",
    finalGuarantee: "30-day money-back guarantee · Cancel anytime",
    notReady: "Not ready?",
    notReadyMid: "still gets you the TopUni AI report and your top 3 scholarship matches.",
    needHelp: "Need 1:1 help?",
    seeConsulting: "See consulting →",
    authTitle: "Create your account",
    authDesc: "One-tap sign in. We'll redirect you to checkout.",
    free: "Free",
  },
  ru: {
    badge: (cap: number) => `Основательная когорта · скидка для первых ${cap}`,
    h1a: "Поступайте в топ-университеты с командой, которая",
    h1b: "уже там училась.",
    sub: "Выпускники Yale, Schwarzman/Cambridge и Harvard учат вас стратегии, которая реально работает — каждый месяц, в прямом эфире, с записями.",
    spotsLeft: (left: number, cap: number) => `Осталось ${left} из ${cap} мест по скидке`,
    tier: "TopUni Pro",
    tierTagline: "Полный набор инструментов.",
    valueStack: [
      { title: "Персональный отчёт-стратегия (TopUni AI)",                body: "Подобранный шорт-лист, путь к финансированию, план действий на 90 дней. PDF, которым можно поделиться с родителями и консультантами.", value: "$99" },
      { title: "Полная база Discover со стратегическими заметками",      body: "Каждая стипендия с ранжированным подбором, заметками «как победить», портретом идеального кандидата и типичными причинами отказов.",   value: "$199" },
      { title: "Ежемесячные воркшопы с основателями вживую",              body: "Yale · Schwarzman/Cambridge · Harvard. Эссе-клиники, стратегия стипендий, разборы по странам. Они через это прошли. Теперь учат вас.", value: "$200/мес" },
      { title: "Библиотека записей — каждый воркшоп навсегда",            body: "Пропустили? Догоните в своём ритме. Библиотека пополняется каждый месяц.",                                                            value: "$99" },
      { title: "Прямая линия с основателями",                              body: "Задавайте вопросы, влияйте на продукт, голосуйте за темы воркшопов. Ваш голос формирует платформу.",                              value: "Бесценно" },
    ],
    valueTotalLabel: "$597+/мес",
    totalValueRow: "Общая стоимость если покупать отдельно",
    foundingPriceLabel: "Цена запуска",
    perMonth: "/месяц",
    youSave: "Экономия 93%",
    publicNote: "Скидка основательной когорты доступна по промокоду на оплате.",
    publicNoteRest: "Отмена в любой момент — без долгосрочных обязательств.",
    capacityClaimed: (claimed: number, cap: number) => `${claimed} / ${cap} занято`,
    capacityLeft: (left: number) => `${left} осталось`,
    valueWordPrefix: "ценность",
    cta: {
      loading: "",
      isFounding: "Вы — основательный член",
      soldOut: "Распродано — в лист ожидания",
      claim: "Начать с TopUni Pro",
    },
    riskReversalBold: "Гарантия возврата 30 дней.",
    riskReversal: "Полный возврат, без лишних вопросов. Отмена в любой момент.",
    stripeBilling: "Безопасная оплата Stripe · ежемесячно · отмена в любой момент",
    finalH2a: "Первые",
    finalH2b: "получают скидку основательной когорты.",
    finalH2c: "",
    finalLeftPrefix: "мест по основательной цене. После заполнения — $39/мес стандарт.",
    finalNoLeft: "Основательная когорта заполнена. $39/мес стандарт, доступны промокоды.",
    finalGuarantee: "Гарантия 30 дней · отмена в любой момент",
    notReady: "Ещё не готовы?",
    notReadyMid: "даёт вам отчёт TopUni AI и топ-3 подобранные стипендии.",
    needHelp: "Нужна 1:1 помощь?",
    seeConsulting: "Смотреть консалтинг →",
    authTitle: "Создайте аккаунт",
    authDesc: "Вход в один клик. Мы перенаправим на оплату.",
    free: "Бесплатно",
  },
} as const;

const Pricing = ({ language = "en" }: PricingProps) => {
  const t = COPY[language];
  const { user, subscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundingLeft, setFoundingLeft] = useState<number | null>(null);
  const [foundingCap, setFoundingCap] = useState<number>(100);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("founding_member_counter")
      .select("claimed_count, cap")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFoundingLeft(Math.max(0, data.cap - data.claimed_count));
          setFoundingCap(data.cap);
        }
      });
  }, []);

  const startCheckout = async () => {
    if (!user) {
      sessionStorage.setItem("post_auth_redirect", language === "ru" ? "/pricing/ru" : "/pricing");
      setAuthOpen(true);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
      body: { tier: "founding", interval: "month" },
    });
    setLoading(false);
    if (error || !data?.url) {
      toast.error((data && (data as { error?: string }).error) || (language === "ru" ? "Не удалось начать оплату. Попробуйте снова." : "Couldn't start checkout. Please try again."));
      return;
    }
    window.location.href = data.url;
  };

  const isFounding = subscription.tier === "founding";
  const claimed = foundingLeft != null ? foundingCap - foundingLeft : 0;
  const claimedPct = foundingLeft != null ? Math.round((claimed / foundingCap) * 100) : 0;

  const ctaLabel = loading ? <Loader2 className="w-4 h-4 animate-spin" />
    : isFounding ? <><Crown className="w-4 h-4" /> {t.cta.isFounding}</>
    : foundingLeft === 0 ? t.cta.soldOut
    : <><Sparkles className="w-4 h-4" /> {t.cta.claim}</>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      <main>
        {/* HERO */}
        <section className="relative py-20 sm:py-24 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-72 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(180deg, hsl(var(--primary) / 0.10) 0%, transparent 100%)" }} />
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center relative">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="mb-5 bg-gold/15 text-gold-dark border-gold/35 px-3 py-1">
                <Crown className="w-3 h-3 mr-1.5" /> {t.badge(foundingCap)}
              </Badge>
              <h1 className="font-heading text-[clamp(2.25rem,5.5vw,4rem)] font-bold tracking-[-0.025em] leading-[1.05]">
                {t.h1a} <span className="text-gold-dark">{t.h1b}</span>
              </h1>
              <p className="text-foreground/65 text-lg sm:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">{t.sub}</p>
              <div className="mt-6 flex justify-center">
                <OutcomesBar variant="card" language={language} />
              </div>
            </motion.div>
          </div>
        </section>

        {/* VALUE STACK — round 11: cut Shift / Social / FAQ, lead with
            the offer. Hero sets the pitch; this card delivers the
            offer + price + urgency in one block; comparison below
            anchors against alternatives; final CTA closes. */}
        <section className="px-5 sm:px-8 py-10 sm:py-12">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto">
            <div className="relative bg-card border-2 border-gold/40 rounded-3xl p-7 sm:p-10 shadow-xl">
              {foundingLeft != null && foundingLeft > 0 && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-primary text-xs font-bold tracking-wide uppercase px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> {t.spotsLeft(foundingLeft, foundingCap)}
                </div>
              )}
              <div className="flex items-center justify-between gap-4 mb-7">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1.5">{t.tier}</p>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">{t.tierTagline}</h2>
                </div>
                <Crown className="w-8 h-8 text-gold-dark shrink-0 hidden sm:block" />
              </div>
              <div className="space-y-3 mb-7">
                {t.valueStack.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.4 }} className="grid grid-cols-[auto,1fr,auto] gap-3 sm:gap-4 items-start py-3 border-b border-border/60 last:border-0">
                    <Check className="w-4 h-4 mt-1 text-gold-dark shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm sm:text-base leading-snug">{item.title}</p>
                      <p className="text-muted-foreground text-xs sm:text-[13px] leading-relaxed mt-0.5">{item.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap pt-1">{t.valueWordPrefix} <strong className="text-foreground/80">{item.value}</strong></span>
                  </motion.div>
                ))}
              </div>
              <div className="bg-gold/5 border border-gold/20 rounded-2xl px-5 py-4 mb-6">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">{t.totalValueRow}</span>
                  <span className="font-bold tabular-nums line-through text-muted-foreground">{t.valueTotalLabel}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1">{t.foundingPriceLabel}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">$39</span>
                      <span className="text-muted-foreground">{t.perMonth}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gold-dark font-semibold tabular-nums">{t.youSave}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  {t.publicNote} {t.publicNoteRest}
                </p>
              </div>
              {foundingLeft != null && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground tabular-nums">{t.capacityClaimed(claimed, foundingCap)}</span>
                    <span className="text-gold-dark font-semibold tabular-nums">{t.capacityLeft(foundingLeft)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all" style={{ width: `${claimedPct}%` }} />
                  </div>
                </div>
              )}
              <Button variant="gold" size="lg" className="w-full gap-2 text-base h-12 shadow-md" disabled={loading || foundingLeft === 0 || isFounding} onClick={startCheckout}>
                {ctaLabel}
                {!isFounding && foundingLeft !== 0 && !loading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-success" />
                <span><strong className="text-foreground">{t.riskReversalBold}</strong> {t.riskReversal}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 text-center mt-1.5">{t.stripeBilling}</p>
            </div>
          </motion.div>
        </section>

        {/* FINAL CTA */}
        <section className="px-5 sm:px-8 py-20 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.05) 60%, hsl(var(--primary) / 0.20) 100%)" }} />
          <div className="max-w-2xl mx-auto text-center relative">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Lock className="w-7 h-7 text-gold-dark mx-auto mb-5" />
              <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
                {t.finalH2a} {foundingCap} {t.finalH2b} <span className="text-gold-dark">{t.finalH2c}</span>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-9 max-w-xl mx-auto leading-relaxed">
                {foundingLeft != null ? (
                  <><span className="text-foreground font-semibold tabular-nums">{foundingLeft}</span> {t.finalLeftPrefix}</>
                ) : (
                  t.finalNoLeft
                )}
              </p>
              <Button variant="gold" size="lg" className="gap-2 text-base h-12 px-10 shadow-md" disabled={loading || foundingLeft === 0 || isFounding} onClick={startCheckout}>
                {ctaLabel}
                {!isFounding && foundingLeft !== 0 && !loading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                <Shield className="w-3 h-3 inline mr-1 text-success" /> {t.finalGuarantee}
              </p>
              <p className="text-xs text-muted-foreground mt-6">
                {t.notReady} <strong className="text-foreground">{t.free}</strong> {t.notReadyMid}
                {" · "}
                {t.needHelp} <button onClick={() => navigate(language === "ru" ? "/offerings/ru" : "/offerings")} className="underline text-foreground hover:text-gold-dark">{t.seeConsulting}</button>
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer language={language} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} title={t.authTitle} description={t.authDesc} />
    </div>
  );
};

export default Pricing;
