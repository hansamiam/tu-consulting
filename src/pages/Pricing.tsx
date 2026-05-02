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
  ArrowRight, Lock, Zap, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface PricingProps { language?: "en" | "ru"; }

// ─── Copy table — one place, both languages, no drift ─────────────────────
const COPY = {
  en: {
    badge: (cap: number) => `Founding membership · capped at ${cap}`,
    h1a: "Apply to top universities with the team that",
    h1b: "already got in.",
    sub: "Yale, Schwarzman/Cambridge, and Harvard alumni teach you the exact strategy that works — every month, live, with the recordings yours forever.",
    spotsLeft: (left: number, cap: number) => `Only ${left} of ${cap} spots left`,
    tier: "Founding Pro",
    tierTagline: "Everything, locked for life.",
    valueStack: [
      { title: "Personalized strategy report (TopUni AI)",          body: "Tailored shortlist, funding pathway, 90-day action plan. Downloadable PDF you can share with parents and counselors.", value: "$99" },
      { title: "Full Discover database with strategy notes",         body: "Every ranked scholarship match with how-to-win strategy notes, ideal-candidate profiles, and common rejection patterns.",         value: "$199" },
      { title: "Live monthly workshops with our founders",           body: "Yale · Schwarzman / Cambridge · Harvard. Essay clinics, scholarship strategy, country deep-dives. They've done it. Now they coach you.", value: "$200/mo" },
      { title: "Recordings library — every workshop forever",        body: "Miss one? Catch up on your schedule. The library compounds every month.",                                              value: "$99" },
      { title: "Direct line to the founders",                        body: "Submit questions, get product input rights, vote on workshop topics. Your influence shapes the platform.",            value: "Priceless" },
    ],
    valueTotalLabel: "$597+/mo",
    totalValueRow: "Total value if bought separately",
    foundingPriceLabel: "Your founding price",
    perMonth: "/month",
    youSave: "You save 96%",
    publicNote: "Public price after the founding cohort fills:",
    publicNoteRest: "Yours stays at $19/mo for as long as you remain a member.",
    capacityClaimed: (claimed: number, cap: number) => `${claimed} / ${cap} claimed`,
    capacityLeft: (left: number) => `${left} left`,
    valueWordPrefix: "value",
    cta: {
      loading: "",
      isFounding: "You're a Founding Member",
      soldOut: "Sold out — join waitlist",
      claim: "Claim my founding spot",
    },
    riskReversalBold: "30-day money-back guarantee.",
    riskReversal: "Full refund, no questions asked. Cancel anytime after.",
    stripeBilling: "Stripe secure checkout · billed monthly · price locked for life",
    compareKicker: "The math",
    compareH2a: "The same outcome — at",
    compareH2b: "a fraction",
    compareH2c: "of the cost.",
    compareSub: "How Founding Pro stacks up against your other options.",
    colUs: "Founding Pro",
    colConsultant: "Private consultant",
    colDiy: "DIY",
    comparison: [
      { row: "Personalized strategy report",                     us: "Included",                consultant: "$500–$2,000",          diy: "Hours of research, no real plan" },
      { row: "Verified scholarship database",                    us: "Full access, ranked",     consultant: "Sometimes",             diy: "Scattered across Google and ChatGPT (often outdated or wrong)" },
      { row: "Live workshops with admitted founders",            us: "Monthly, included",       consultant: "Per session, $300+",    diy: "—" },
      { row: "Recorded library (compounds every month)",         us: "Included forever",        consultant: "—",                     diy: "—" },
      { row: "Strategy notes (how-to-win, rejection patterns)",  us: "Included",                consultant: "Maybe",                 diy: "Guesswork" },
      { row: "Total cost (one application year)",                us: "$228",                    consultant: "$5,000 – $15,000",      diy: "Hidden cost: missed deadlines" },
    ],
    socialKicker: "From students who joined early",
    socialH2: "What founding members are saying.",
    testimonials: [
      { quote: "Walked into my Yale interview with a real plan instead of nervous energy. The strategy report was the deliverable I needed.", name: "M.", school: "Yale '28 (placeholder)" },
      { quote: "Saved me 6 weeks of research. I had my matched scholarships and a 90-day timeline in 48 hours.",                              name: "A.", school: "Cambridge '28 (placeholder)" },
      { quote: "The workshops alone are worth more than $19/mo. The founders actually answered my essay questions live.",                     name: "D.", school: "MIT '28 (placeholder)" },
    ],
    faqKicker: "Honest answers",
    faqH2: "Common questions before you join.",
    faq: [
      { q: "Why is it $19/mo when other consultants charge thousands?",                                a: "We're early. The founding price is intentionally low to onboard our first 100 members and turn them into our case studies. Public price after the cohort fills will be $39/mo. Founding members lock in $19/mo for life — that locked rate alone is worth more than the first year of membership." },
      { q: "What if I'm not applying yet — I'm in 9th or 10th grade?",                                  a: "That's actually the highest-leverage time to start. Strategy now means stronger essays, better course choices, and more scholarship-ready credentials by senior year. The 90-day action plan in your strategy report adapts to your grade level." },
      { q: "What if I'm already working with a private consultant?",                                    a: "Founding Pro complements outside advisors. Most consultants charge per session — bring your TopUni strategy doc into those sessions and you'll spend their hourly rate on actual writing instead of background research." },
      { q: "What if I want to cancel?",                                                                  a: "Cancel any time from your account. We don't lock you in. The 30-day money-back guarantee covers your first month — full refund, no questions asked. After that, you stop billing whenever you want." },
      { q: "Is the founding price really locked for life?",                                              a: "Yes. As long as your subscription stays active, $19/mo is your price for as long as we run the platform. Even when public price moves to $39, $59, or $99/mo, you stay at $19." },
      { q: "What if I get into my dream school in month 2 — do I just cancel?",                          a: "You can. But most members keep the subscription through senior year because the workshops keep going (gap year planning, freshman prep, scholarship renewals) and the recordings library keeps compounding. Up to you." },
    ],
    finalH2a: "When the",
    finalH2b: "founding spots fill, the price",
    finalH2c: "doubles.",
    finalLeftPrefix: "spots left at $19/mo. Lock in the founding price for life — even after we move to $39/mo.",
    finalNoLeft: "Lock in the founding price for life — even after we move to $39/mo.",
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
    badge: (cap: number) => `Основательное членство · только ${cap} мест`,
    h1a: "Поступайте в топ-университеты с командой, которая",
    h1b: "уже там училась.",
    sub: "Выпускники Yale, Schwarzman/Cambridge и Harvard учат вас стратегии, которая реально работает — каждый месяц, в прямом эфире, с записями навсегда.",
    spotsLeft: (left: number, cap: number) => `Осталось ${left} из ${cap} мест`,
    tier: "Founding Pro",
    tierTagline: "Всё. Цена зафиксирована навсегда.",
    valueStack: [
      { title: "Персональный отчёт-стратегия (TopUni AI)",                body: "Подобранный шорт-лист, путь к финансированию, план действий на 90 дней. PDF, которым можно поделиться с родителями и консультантами.", value: "$99" },
      { title: "Полная база Discover со стратегическими заметками",      body: "Каждая стипендия с ранжированным подбором, заметками «как победить», портретом идеального кандидата и типичными причинами отказов.",   value: "$199" },
      { title: "Ежемесячные воркшопы с основателями вживую",              body: "Yale · Schwarzman/Cambridge · Harvard. Эссе-клиники, стратегия стипендий, разборы по странам. Они через это прошли. Теперь учат вас.", value: "$200/мес" },
      { title: "Библиотека записей — каждый воркшоп навсегда",            body: "Пропустили? Догоните в своём ритме. Библиотека пополняется каждый месяц.",                                                            value: "$99" },
      { title: "Прямая линия с основателями",                              body: "Задавайте вопросы, влияйте на продукт, голосуйте за темы воркшопов. Ваш голос формирует платформу.",                              value: "Бесценно" },
    ],
    valueTotalLabel: "$597+/мес",
    totalValueRow: "Общая стоимость если покупать отдельно",
    foundingPriceLabel: "Ваша основательная цена",
    perMonth: "/месяц",
    youSave: "Экономия 96%",
    publicNote: "Публичная цена после набора основателей:",
    publicNoteRest: "Ваша остаётся $19/мес пока вы участник.",
    capacityClaimed: (claimed: number, cap: number) => `${claimed} / ${cap} занято`,
    capacityLeft: (left: number) => `${left} осталось`,
    valueWordPrefix: "ценность",
    cta: {
      loading: "",
      isFounding: "Вы — основательный член",
      soldOut: "Распродано — в лист ожидания",
      claim: "Забронировать моё место основателя",
    },
    riskReversalBold: "Гарантия возврата 30 дней.",
    riskReversal: "Полный возврат, без лишних вопросов. Отмена в любой момент.",
    stripeBilling: "Безопасная оплата Stripe · ежемесячно · цена зафиксирована навсегда",
    compareKicker: "Математика",
    compareH2a: "Тот же результат — за",
    compareH2b: "малую долю",
    compareH2c: "стоимости.",
    compareSub: "Как Founding Pro выглядит на фоне других вариантов.",
    colUs: "Founding Pro",
    colConsultant: "Частный консультант",
    colDiy: "Своими силами",
    comparison: [
      { row: "Персональный отчёт-стратегия",                       us: "Включено",                  consultant: "$500–$2,000",         diy: "Часы поиска без реального плана" },
      { row: "Проверенная база стипендий",                          us: "Полный доступ, ранжирование", consultant: "Иногда",              diy: "Разбросано по Google и ChatGPT (часто устаревшее или неверное)" },
      { row: "Воркшопы с основателями-выпускниками",                us: "Каждый месяц, включено",   consultant: "За сессию, от $300",  diy: "—" },
      { row: "Библиотека записей (растёт каждый месяц)",            us: "Включена навсегда",         consultant: "—",                    diy: "—" },
      { row: "Стратегические заметки (как победить, причины отказов)", us: "Включено",              consultant: "Может быть",          diy: "Догадки" },
      { row: "Общая стоимость (год подачи)",                         us: "$228",                      consultant: "$5,000 – $15,000",   diy: "Скрытая цена: упущенные дедлайны" },
    ],
    socialKicker: "От студентов, которые присоединились рано",
    socialH2: "Что говорят основательные члены.",
    testimonials: [
      { quote: "Пришла на интервью Yale с настоящим планом, а не нервной энергией. Отчёт-стратегия — то, что мне было нужно.",        name: "М.", school: "Yale '28 (плейсхолдер)" },
      { quote: "Сэкономило 6 недель ресёрча. Подобранные стипендии и план на 90 дней — всё за 48 часов.",                                name: "А.", school: "Cambridge '28 (плейсхолдер)" },
      { quote: "Одни воркшопы стоят больше $19/мес. Основатели реально отвечали на мои вопросы по эссе вживую.",                          name: "Д.", school: "MIT '28 (плейсхолдер)" },
    ],
    faqKicker: "Честные ответы",
    faqH2: "Частые вопросы перед тем как присоединиться.",
    faq: [
      { q: "Почему $19/мес если другие консультанты берут тысячи?",                                          a: "Мы только начинаем. Основательная цена намеренно низкая чтобы онбордить первых 100 членов и сделать их кейсами. Публичная цена после набора когорты будет $39/мес. Основатели фиксируют $19/мес навсегда — одна эта зафиксированная ставка стоит больше года членства." },
      { q: "Что если я ещё не подаю — я в 9 или 10 классе?",                                                  a: "Это самое выгодное время начать. Стратегия сейчас = более сильные эссе, лучший выбор курсов и больше готовых для стипендий достижений к выпускному. План на 90 дней адаптируется под ваш класс." },
      { q: "Что если я уже работаю с частным консультантом?",                                                  a: "Founding Pro дополняет внешних советников. Большинство консультантов берут за сессию — приходите с вашим TopUni документом стратегии и тратьте их часы на само написание, а не на ресёрч." },
      { q: "Что если я хочу отменить?",                                                                        a: "Отмените в любой момент в личном кабинете. Мы не блокируем. Гарантия 30 дней покрывает первый месяц — полный возврат без вопросов. После — биллинг останавливается когда захотите." },
      { q: "Цена основателя реально зафиксирована навсегда?",                                                  a: "Да. Пока подписка активна, $19/мес — ваша цена пока мы работаем. Даже когда публичная цена станет $39, $59 или $99/мес — вы остаётесь на $19." },
      { q: "Что если я поступлю в школу мечты на 2-й месяц — просто отменить?",                                  a: "Можно. Но большинство членов оставляют подписку до выпускного потому что воркшопы продолжаются (планирование gap year, подготовка к первому курсу, продление стипендий) и библиотека записей растёт. Решать вам." },
    ],
    finalH2a: "Когда",
    finalH2b: "основательных мест заполнятся, цена",
    finalH2c: "удвоится.",
    finalLeftPrefix: "мест по $19/мес. Зафиксируйте основательную цену навсегда — даже после перехода на $39/мес.",
    finalNoLeft: "Зафиксируйте основательную цену навсегда — даже после перехода на $39/мес.",
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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
            </motion.div>
          </div>
        </section>

        {/* VALUE STACK */}
        <section className="px-5 sm:px-8 pb-12">
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
                      <span className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">$19</span>
                      <span className="text-muted-foreground">{t.perMonth}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gold-dark font-semibold tabular-nums">{t.youSave}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  {t.publicNote} <span className="line-through">$39{t.perMonth}</span>. {t.publicNoteRest}
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

        {/* COMPARISON */}
        <section className="px-5 sm:px-8 py-16 bg-canvas-soft border-y border-border">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark text-center mb-3">{t.compareKicker}</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3 leading-tight">
              {t.compareH2a} <span className="text-gold-dark">{t.compareH2b}</span> {t.compareH2c}
            </h2>
            <p className="text-center text-muted-foreground text-base mb-10 max-w-2xl mx-auto">{t.compareSub}</p>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1.4fr,1fr,1fr,1fr] text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground border-b border-border bg-muted/30">
                <div className="px-3 sm:px-5 py-3"></div>
                <div className="px-2 sm:px-5 py-3 text-center bg-gold/8 text-gold-dark">{t.colUs}</div>
                <div className="px-2 sm:px-5 py-3 text-center">{t.colConsultant}</div>
                <div className="px-2 sm:px-5 py-3 text-center">{t.colDiy}</div>
              </div>
              {t.comparison.map((row, i) => (
                <div key={i} className="grid grid-cols-[1.4fr,1fr,1fr,1fr] items-center text-xs sm:text-sm border-b border-border/60 last:border-0">
                  <div className="px-3 sm:px-5 py-3 sm:py-4 text-foreground font-medium">{row.row}</div>
                  <div className="px-2 sm:px-5 py-3 sm:py-4 text-center bg-gold/[0.04] text-foreground font-semibold">{row.us}</div>
                  <div className="px-2 sm:px-5 py-3 sm:py-4 text-center text-muted-foreground">{row.consultant}</div>
                  <div className="px-2 sm:px-5 py-3 sm:py-4 text-center text-muted-foreground">{row.diy}</div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="gold" size="lg" className="gap-2 px-8" onClick={startCheckout} disabled={loading || foundingLeft === 0 || isFounding}>
                {ctaLabel}
              </Button>
            </div>
          </motion.div>
        </section>

        {/* SOCIAL */}
        <section className="px-5 sm:px-8 py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark text-center mb-3">{t.socialKicker}</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-center mb-10 leading-tight">{t.socialH2}</h2>
            {/* TODO: REPLACE WITH REAL TESTIMONIALS BEFORE PUBLIC LAUNCH */}
            <div className="grid sm:grid-cols-3 gap-4">
              {t.testimonials.map((tt, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:border-gold/30 transition-colors">
                  <div className="text-gold-dark mb-3">★★★★★</div>
                  <p className="text-foreground/85 text-sm leading-relaxed mb-4">"{tt.quote}"</p>
                  <p className="text-xs font-semibold text-foreground">{tt.name} · <span className="text-muted-foreground font-normal">{tt.school}</span></p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* FAQ */}
        <section className="px-5 sm:px-8 py-16 bg-canvas-soft border-y border-border">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark text-center mb-3">{t.faqKicker}</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-center mb-10 leading-tight">{t.faqH2}</h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {t.faq.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="border-b border-border/60 last:border-0">
                    <button onClick={() => setOpenFaq(open ? null : i)} className="w-full text-left px-5 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                      <span className="font-heading font-semibold text-foreground text-[15px] leading-snug">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-5 sm:px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{item.a}</motion.div>
                    )}
                  </div>
                );
              })}
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
