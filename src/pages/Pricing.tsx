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
  Check,
  Crown,
  Loader2,
  Award,
  Shield,
  ArrowRight,
  Lock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { EmbeddedCheckoutPanel } from "@/components/pricing/EmbeddedCheckoutPanel";
import { hasStripePublishableKey } from "@/lib/stripeClient";

interface PricingProps { language?: "en" | "ru"; }

// ─── Copy table — one place, both languages, no drift ─────────────────────
// Round-19 redo: stripped the Hormozi-style stacked-value framing
// (`$597+ total value`, `save 93%`, itemised $99/$199 line items).
// Tier renamed from `TopUni Pro` to `TopUni Membership` — leaves
// `Elite` open for the future tier with 1-on-1 founder coaching +
// mock interviews. Time-boxed action-plan claim retired from
// included-list. Page now reads as a clean "what membership
// includes" sheet, not an offer-stack.
const COPY = {
  en: {
    badge: (cap: number) => `Early access · first ${cap} members lock in this price for life`,
    h1a: "Plan your education, your funding, and your career",
    h1b: "with the alumni who got in.",
    sub: "Yale, Cambridge, and Harvard alumni × AI. Admissions strategy that fits, at a price traditional consulting prices students out of.",
    spotsLeft: (left: number, cap: number) => `Only ${left} of ${cap} early-access spots left`,
    tier: "TopUni Membership",
    tierTagline: "Everything you need to plan, apply, and win.",
    /** Membership inclusions — short, scannable, no individual
     *  price tags. The whole point is to NOT play stacked-value
     *  arithmetic. */
    /* 2026-05-23 polish: rewrote the includes list to match the
       locked Membership bundle from the stage-2 spec. The brief +
       Discover database STAY FREE (traffic acquisition surface) —
       Membership unlocks the three gates: unlimited saves, per-
       scholarship insights, workspace tools. Plus Academy. */
    includes: [
      { title: "Unlimited Discover saves",               body: "Save every scholarship that matches your profile — not just the first five." },
      { title: "Per-scholarship insights",               body: "\"Why this fits you\" + \"How to win this one\" pointers on every saved row." },
      { title: "Workspace — kanban + deadlines",         body: "Calendar view of every deadline, synced to Google / Apple Calendar." },
      { title: "Live workshops + office hours, every two weeks", body: "One workshop and one office hour each month, alternating fortnights. Yale · Cambridge & Tsinghua · Harvard alumni — essay clinics, scholarship strategy, country deep-dives, plus open Q&A." },
      { title: "Recordings library, kept forever",       body: "The library compounds with every cohort." },
      { title: "Direct line to the team",                body: "Submit questions, vote on what the next workshop covers, get product input rights." },
    ],
    foundingPriceLabel: "Launch price",
    perMonth: "/month",
    publicNote: "Promo codes accepted at checkout.",
    publicNoteRest: "Cancel anytime — no long-term lock-in.",
    capacityClaimed: (claimed: number, cap: number) => `${claimed} / ${cap} claimed`,
    capacityLeft: (left: number) => `${left} left`,
    cta: {
      loading: "",
      isFounding: "Your membership is active · Manage in Account",
      isMember: "You're a member · Manage in Account",
      soldOut: "Sold out — join waitlist",
      claim: "Claim my membership",
    },
    riskReversalBold: "30-day money-back guarantee.",
    riskReversal: "Full refund, no questions asked. Cancel anytime after.",
    stripeBilling: "Stripe secure checkout · billed monthly · cancel anytime",
    finalH2a: "First",
    finalH2b: "early-access members lock the launch price for life.",
    finalH2c: "",
    finalLeftPrefix: "early-access spots left. Promo codes accepted at checkout.",
    finalNoLeft: "Early-access cohort filled. Membership is still open at $39.99/mo — promo codes accepted at checkout.",
    finalGuarantee: "30-day money-back guarantee · Cancel anytime",
    notReady: "Not ready?",
    notReadyMid: "still gets you a personalized strategy from TopUni AI and your top 3 scholarship matches.",
    needHelp: "Need 1:1 help?",
    seeConsulting: "See consulting →",
    authTitle: "Create your account",
    authDesc: "One-tap sign in.",
    free: "Free",
  },
  ru: {
    badge: (cap: number) => `Ранний доступ · первые ${cap} закрепляют эту цену навсегда`,
    h1a: "Образование, финансирование, карьера —",
    h1b: "с выпускниками, которые поступили.",
    sub: "Выпускники Yale, Cambridge и Harvard × AI. Стратегия, которая реально подходит — без цен традиционного консалтинга.",
    spotsLeft: (left: number, cap: number) => `Осталось ${left} из ${cap} мест раннего доступа`,
    tier: "Членство TopUni",
    tierTagline: "Всё необходимое чтобы спланировать, подать и выиграть.",
    includes: [
      { title: "Без лимита сохранений в Discover",        body: "Сохраняйте любую стипендию из подбора — не только первые пять." },
      { title: "Инсайты по каждой стипендии",             body: "«Почему подходит именно тебе» + «Как выиграть эту» — конкретные указания." },
      { title: "Рабочая зона — канбан + дедлайны",        body: "Календарь дедлайнов, синхронизированный с Google / Apple Calendar." },
      { title: "Воркшопы + office hours каждые две недели", body: "Один воркшоп и один office hour в месяц, чередуются раз в две недели. Выпускники Yale, Cambridge & Tsinghua, Harvard ведут эссе-клиники, стратегию, страновые разборы и открытые Q&A." },
      { title: "Библиотека записей навсегда",             body: "Библиотека пополняется каждый месяц." },
      { title: "Прямая линия с командой",                 body: "Задавайте вопросы, голосуйте за темы воркшопов, влияйте на продукт." },
    ],
    foundingPriceLabel: "Цена запуска",
    perMonth: "/месяц",
    publicNote: "Промокоды принимаются на оплате.",
    publicNoteRest: "Отмена в любой момент — без долгосрочных обязательств.",
    capacityClaimed: (claimed: number, cap: number) => `${claimed} / ${cap} занято`,
    capacityLeft: (left: number) => `${left} осталось`,
    cta: {
      loading: "",
      isFounding: "Ваше членство активно · Управление в Аккаунте",
      isMember: "Вы участник · Управление в Аккаунте",
      soldOut: "Распродано — в лист ожидания",
      claim: "Открыть членство",
    },
    riskReversalBold: "Гарантия возврата 30 дней.",
    riskReversal: "Полный возврат, без лишних вопросов. Отмена в любой момент.",
    stripeBilling: "Безопасная оплата Stripe · ежемесячно · отмена в любой момент",
    finalH2a: "Первые",
    finalH2b: "членов раннего доступа закрепляют цену запуска навсегда.",
    finalH2c: "",
    finalLeftPrefix: "мест раннего доступа осталось. Промокоды принимаются на оплате.",
    finalNoLeft: "Когорта раннего доступа заполнена. Членство открыто за $39.99/мес — промокоды принимаются на оплате.",
    finalGuarantee: "Гарантия 30 дней · отмена в любой момент",
    notReady: "Ещё не готовы?",
    notReadyMid: "даёт вам персональную стратегию от TopUni AI и топ-3 подобранные стипендии.",
    needHelp: "Нужна 1:1 помощь?",
    seeConsulting: "Смотреть консалтинг →",
    authTitle: "Создайте аккаунт",
    authDesc: "Вход в один клик.",
    free: "Бесплатно",
  },
} as const;

const Pricing = ({ language = "en" }: PricingProps) => {
  const t = COPY[language];
  const { user, subscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundingLeft, setFoundingLeft] = useState<number | null>(null);
  // Cohort cap default — 50 for the early-access tier (re-bumped from
  // 20 on 2026-05-27 per Sam's updated "first 50 signups" copy). The
  // production value still comes from `founding_member_counter.cap` in
  // Supabase — this is just the fallback for the initial render before
  // the count fetch resolves.
  const [foundingCap, setFoundingCap] = useState<number>(50);
  // Billing interval — annual saves ~23% vs month-to-month. Default
  // monthly (lower commitment threshold, easier conversion).
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.title;
    // 2026-05-23: SHOW_FULL_PRICING flipped to true (see below) —
    // the Membership page is live. Title now reflects the real
    // Membership offer; the legacy Coming Soon branch is removed.
    document.title = language === "ru"
      ? "Цены — TopUni Membership · Стратегия поступления и стипендий"
      : "Pricing — TopUni Membership · Admissions + scholarship strategy";
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
    return () => { document.title = prev; };
  }, [language]);

  // 2026-05-27: Stripe Embedded Checkout. When VITE_STRIPE_PUBLISHABLE_KEY
  // is set, /pricing renders the Stripe form inline below the price card —
  // no redirect off-domain, so the pitch + payment live on the same screen.
  // When the env var is missing, the legacy redirect-mode flow still works.
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const wantsEmbed = hasStripePublishableKey();

  const startCheckout = async () => {
    if (!user) {
      setPostAuthRedirect(language === "ru" ? "/pricing/ru" : "/pricing");
      setAuthOpen(true);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
      body: { tier: "founding", interval: billingInterval, embedded: wantsEmbed },
    });
    setLoading(false);
    if (error) {
      toast.error((data && (data as { error?: string }).error) || (language === "ru" ? "Не удалось начать оплату. Попробуйте снова." : "Couldn't start checkout. Please try again."));
      return;
    }
    if (wantsEmbed) {
      const cs = (data as { client_secret?: string } | null)?.client_secret;
      if (!cs) {
        toast.error(language === "ru" ? "Не удалось начать оплату. Попробуйте снова." : "Couldn't start checkout. Please try again.");
        return;
      }
      setClientSecret(cs);
      return;
    }
    const url = (data as { url?: string } | null)?.url;
    if (!url) {
      toast.error(language === "ru" ? "Не удалось начать оплату. Попробуйте снова." : "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = url;
  };

  // "Currently a founding-tier subscriber" = tier=founding AND active.
  // Was previously checking just the tier; a canceled founding user
  // would have kept the founding CTA + crown rendered as if they were
  // still in the cohort.
  const isFounding = subscription.tier === "founding" && subscription.is_active;
  // Regular paid Pro members were previously seeing the "Become a
  // member" CTA on the pricing page, which is misleading — they
  // already are members. Treat any active paid tier (founding OR pro)
  // as a member so the CTA points to Account management instead.
  const isPaidMember = isFounding || (subscription.tier === "pro" && subscription.is_active);
  const claimed = foundingLeft != null ? foundingCap - foundingLeft : 0;
  const claimedPct = foundingLeft != null ? Math.round((claimed / foundingCap) * 100) : 0;

  // CTA: founding members keep the Crown (genuine status moment).
  // Regular Pro members get a "You're a member" label that links to
  // Account where they can manage billing. Anonymous + free users see
  // the conversion CTA. Plain typography — the gold button does the
  // visual work; previous Award icon read as "AI magic" and
  // competed with the actual AI surfaces on the site.
  const ctaLabel = loading ? <Loader2 className="w-4 h-4 animate-spin" />
    : isFounding ? <><Crown className="w-4 h-4" /> {t.cta.isFounding}</>
    : isPaidMember ? <><Check className="w-4 h-4" /> {t.cta.isMember}</>
    : foundingLeft === 0 ? t.cta.soldOut
    : t.cta.claim;

  // 2026-05-23 stage-2 flip: Membership offer locked (single
  // tier, founding-cohort scarcity, 6 perks aligned with the 3
  // gates + Academy). Full pricing live. Coming-soon branch
  // below kept dormant for fast rollback if needed.
  const SHOW_FULL_PRICING = true;
  if (!SHOW_FULL_PRICING) {
    const isRu = language === "ru";
    return (
      <div className="min-h-screen relative bg-background">
        <div className="relative z-10">
          <Navigation language={language} />
          <main className="flex items-center justify-center px-6" style={{ minHeight: "calc(100vh - 80px)" }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 px-3 py-1 rounded-full text-gold-dark text-[11px] font-medium tracking-[0.18em] uppercase mb-6">
                <Crown className="h-3.5 w-3.5" />
                {isRu ? "Скоро" : "Coming soon"}
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-5 leading-tight">
                {isRu ? "Подписка скоро." : "Membership, coming soon."}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                {isRu
                  ? "TopUni AI и Discover уже доступны бесплатно во время беты."
                  : "TopUni AI and Discover are live and free during beta."}
              </p>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
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
              {/* Round-41: OutcomesBar removed from hero — same outcomes strip
                  shows up on the home page already; doubling it here read as
                  pre-CTA marketing rather than information. */}
            </motion.div>
          </div>
        </section>

        {/* MEMBERSHIP CARD — round 19 redo. Stacked-value framing
            ($597+ total / save 93% / itemised $99/$199 line items)
            retired. Page now reads as a clean "what membership
            includes" sheet, not an offer-stack. */}
        <section className="px-5 sm:px-8 py-10 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative bg-card border border-border rounded-3xl p-7 sm:p-10 shadow-sm">
              {foundingLeft != null && foundingLeft > 0 && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-primary text-xs font-bold tracking-wide uppercase px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> {t.spotsLeft(foundingLeft, foundingCap)}
                </div>
              )}

              {/* Tier name + tagline — quiet header, no Crown icon
                  visual gimmick. The header is information, the price
                  block carries the conversion weight. */}
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1.5">{t.tier}</p>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{t.tierTagline}</h2>
              </div>

              {/* Billing interval toggle — monthly vs annual. Annual is
                  ~23% off ($360/yr ≈ $30/mo equiv vs $39/mo). Default
                  monthly so the lower-threshold option is the no-click
                  path; annual is one-click upgrade. */}
              <div role="tablist" aria-label="Billing interval" className="inline-flex items-center bg-muted/40 border border-border/60 rounded-full p-1 mb-5 text-xs font-semibold">
                <button
                  role="tab"
                  aria-selected={billingInterval === "month"}
                  onClick={() => setBillingInterval("month")}
                  className={`px-3.5 py-1.5 rounded-full transition-all ${billingInterval === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {language === "ru" ? "Ежемесячно" : "Monthly"}
                </button>
                <button
                  role="tab"
                  aria-selected={billingInterval === "year"}
                  onClick={() => setBillingInterval("year")}
                  className={`px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 ${billingInterval === "year" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {language === "ru" ? "Год" : "Annual"}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wide ${billingInterval === "year" ? "bg-gold/20 text-gold-dark" : "bg-foreground/[0.06] text-foreground/70"}`}>
                    {language === "ru" ? "−23%" : "Save 23%"}
                  </span>
                </button>
              </div>

              {/* Price strip — swaps based on interval. Annual shows the
                  per-month equivalent prominently so the price doesn't
                  spike visually + adds a small "$360 billed yearly"
                  hint underneath. */}
              <div className="border-t border-b border-border/60 py-5 mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1.5">{t.foundingPriceLabel}</p>
                {billingInterval === "month" ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums leading-none">$39.99</span>
                      <span className="text-muted-foreground">{t.perMonth}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">
                      {t.publicNote} {t.publicNoteRest}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums leading-none">$30</span>
                      <span className="text-muted-foreground">{t.perMonth}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">
                      {language === "ru"
                        ? "$360 в год — экономия $108 vs ежемесячная оплата. Отмена в любой момент."
                        : "$360 billed yearly — save $108 vs paying monthly. Cancel anytime."}
                    </p>
                  </>
                )}
              </div>

              {/* Inclusions — clean checklist, no per-line dollar
                  values. Each line is a real thing membership opens. */}
              <ul className="space-y-3.5 mb-7">
                {t.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-1 text-gold-dark shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm leading-snug">{item.title}</p>
                      <p className="text-muted-foreground text-[13px] leading-relaxed mt-0.5">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Early-access progress bar — quiet scarcity, kept
                  because it's real (capped) not fabricated. */}
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

              <Button variant="gold" size="lg" className="w-full gap-2 text-base h-12 shadow-md" disabled={loading || foundingLeft === 0 || isFounding} onClick={isPaidMember ? () => navigate(language === "ru" ? "/account/ru" : "/account") : startCheckout}>
                {ctaLabel}
                {!isFounding && foundingLeft !== 0 && !loading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
              {/* Trust strip retired (round 33). The "30-day money-back
                  · Stripe secure · cancel anytime" line was filler that
                  competed with the actual pricing decision; users
                  reading the pricing page already trust enough to be
                  here, the line just made the section feel salesier. */}
            </div>
          </motion.div>
        </section>

        {/* Round-41: ROI math section removed. The "$25K avg award · 53×
            return" math read as Hormozi-stack pitch rather than honest
            information; numbers we can't substantiate per individual user
            don't belong on a pricing page. The membership card above
            carries the conversion weight on its own. */}

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
              <Button variant="gold" size="lg" className="gap-2 text-base h-12 px-10 shadow-md" disabled={loading || foundingLeft === 0 || isFounding} onClick={isPaidMember ? () => navigate(language === "ru" ? "/account/ru" : "/account") : startCheckout}>
                {ctaLabel}
                {!isFounding && foundingLeft !== 0 && !loading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
              <p className="text-xs text-muted-foreground mt-6">
                {t.notReady} <strong className="text-foreground">{t.free}</strong> {t.notReadyMid}
                {" · "}
                {t.needHelp} <button onClick={() => navigate(language === "ru" ? "/offerings/ru" : "/offerings")} className="underline text-foreground hover:text-gold-dark">{t.seeConsulting}</button>
              </p>
            </motion.div>
          </div>
        </section>

        {/* Embedded Stripe Checkout — renders inline below the final CTA
            when the user starts checkout and we have a publishable key.
            Replaces the Stripe redirect flow so the pitch + payment form
            live on the same screen. */}
        {clientSecret && (
          <EmbeddedCheckoutPanel
            clientSecret={clientSecret}
            language={language}
            onClose={() => setClientSecret(null)}
          />
        )}
      </main>

      <Footer language={language} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} title={t.authTitle} description={t.authDesc} language={language} />
      </div>
    </div>
  );
};

export default Pricing;
