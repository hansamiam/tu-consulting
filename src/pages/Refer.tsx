/**
 * Refer — share your referral code at /refer (and /refer/ru).
 *
 * Authed-only. Calls get_or_create_my_referral_code() to lazily mint a
 * code on first visit. Shows the user's code, share link, copy button,
 * and a stats panel: total signups, premium conversions, who's waiting
 * to convert.
 *
 * Stripe-side credit logic (free month for both when referee converts)
 * lives in the existing check-subscription / Stripe webhook flow —
 * this page is the user-facing surface that drives the loop.
 *
 * Bilingual via the `language` prop. Strings live in COPY at the top.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Copy, Check, Share2, ArrowLeft, ArrowRight, Crown,
  Loader2, Mail, MessageCircle, Users,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CampusBackdrop } from "@/components/CampusBackdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS } from "date-fns/locale";

interface ReferProps { language?: "en" | "ru"; }

const COPY = {
  en: {
    docTitle: "Refer a friend — TopUni",
    signInH: "Sign in to get your referral code",
    signIn: "Sign in",
    backToAccount: "Back to account",
    kicker: "Refer a friend",
    h1: "Send a friend. Save together.",
    sub: "When a friend signs up via your link and becomes a paying member, you both get a free month of Premium. They get faster, deeper AI strategy. You extend your subscription. No limit on referrals.",
    yourCode: "Your referral code",
    generating: "Generating…",
    copy: "Copy",
    copied: "Copied",
    orShareLink: "Or share the direct link",
    emailFriend: "Email a friend",
    whatsapp: "WhatsApp",
    share: "Share…",
    yourReferrals: "Your referrals",
    viewAccount: "View account",
    signups: "Signups",
    premiumConversions: "Premium conversions",
    none: "No referrals yet. Share your code and they'll appear here as friends sign up.",
    recent: "Recent",
    premium: "Premium",
    free: "Free",
    friendSignedUp: (rel: string) => `Friend signed up ${rel}`,
    howItWorks: "How it works",
    steps: [
      "Share your code or link. WhatsApp / email / wherever your friends already are.",
      "Your friend signs up at TopUni. They get the same product you have — AI strategy, scholarship database, application tracker.",
      "When your friend upgrades to Premium, you both get a free month added to your subscription.",
    ],
    creditNote: "Credit is applied the next billing cycle. We email both parties when the bonus posts. No referral cap. Self-referrals don't count.",
    openAi: "Open TopUni AI",
    shareTitle: "Try TopUni — AI admissions strategy",
    shareText: "I'm using TopUni to plan scholarships and applications — here's a referral link:",
    emailSubject: "Try TopUni — AI admissions strategy",
    emailBody: (link: string) => "I've been using TopUni to plan my scholarship applications. The AI is genuinely useful — and if you sign up via my link we both get a free month of Premium:\n\n" + link,
    whatsappText: (link: string) => "I'm using TopUni for my admissions strategy — sign up via my link and we both get a free month of Premium: " + link,
    errCode: "Couldn't load your referral code.",
    errCopy: "Couldn't copy.",
    toastCode: "Code copied",
    toastLink: "Share link copied",
  },
  ru: {
    docTitle: "Пригласить друга — TopUni",
    signInH: "Войдите, чтобы получить реферальный код",
    signIn: "Войти",
    backToAccount: "В аккаунт",
    kicker: "Пригласить друга",
    h1: "Пригласите друга. Экономьте вместе.",
    sub: "Когда друг регистрируется по вашей ссылке и оформляет платную подписку — вы оба получаете бесплатный месяц Premium. Они получают более глубокую AI-стратегию. Вы продлеваете подписку. Без лимита на приглашения.",
    yourCode: "Ваш реферальный код",
    generating: "Генерируется…",
    copy: "Копировать",
    copied: "Скопировано",
    orShareLink: "Или поделитесь прямой ссылкой",
    emailFriend: "Написать другу",
    whatsapp: "WhatsApp",
    share: "Поделиться…",
    yourReferrals: "Ваши приглашения",
    viewAccount: "Открыть аккаунт",
    signups: "Регистрации",
    premiumConversions: "Конверсии в Premium",
    none: "Пока нет приглашений. Поделитесь кодом — они появятся здесь когда друзья зарегистрируются.",
    recent: "Недавние",
    premium: "Premium",
    free: "Free",
    friendSignedUp: (rel: string) => `Друг зарегистрировался ${rel}`,
    howItWorks: "Как это работает",
    steps: [
      "Поделитесь кодом или ссылкой. WhatsApp / email / где удобно вашим друзьям.",
      "Друг регистрируется в TopUni. Получает тот же продукт что у вас — AI-стратегия, база стипендий, трекер заявок.",
      "Когда друг оформляет Premium — вы оба получаете бесплатный месяц к подписке.",
    ],
    creditNote: "Бонус начисляется в следующий биллинговый цикл. Мы отправляем email обеим сторонам когда бонус активируется. Без лимита приглашений. Самоприглашения не считаются.",
    openAi: "Открыть TopUni AI",
    shareTitle: "Попробуй TopUni — AI-стратегия поступления",
    shareText: "Я использую TopUni чтобы планировать стипендии и подачу — вот реферальная ссылка:",
    emailSubject: "Попробуй TopUni — AI-стратегия поступления",
    emailBody: (link: string) => "Использую TopUni для планирования заявок на стипендии. AI правда полезный — если зарегистрируешься по моей ссылке, мы оба получим бесплатный месяц Premium:\n\n" + link,
    whatsappText: (link: string) => "Использую TopUni для стратегии поступления — зарегистрируйся по моей ссылке и мы оба получим бесплатный месяц Premium: " + link,
    errCode: "Не удалось загрузить реферальный код.",
    errCopy: "Не удалось скопировать.",
    toastCode: "Код скопирован",
    toastLink: "Ссылка скопирована",
  },
} as const;

const Refer = ({ language = "en" }: ReferProps) => {
  const t = COPY[language];
  const dateLocale = language === "ru" ? ruLocale : enUS;
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; premium: number }>({ total: 0, premium: 0 });
  const [recent, setRecent] = useState<{ signed_up_at: string; became_premium_at: string | null }[]>([]);
  const [hubLoading, setHubLoading] = useState(true);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    document.title = t.docTitle;
    if (!loading && !user) setAuthOpen(true);
  }, [loading, user, t.docTitle]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setHubLoading(true);
      const { data: codeData, error: codeErr } = await supabase.rpc("get_or_create_my_referral_code");
      if (cancelled) return;
      if (codeErr) {
        toast.error(t.errCode);
        setHubLoading(false);
        return;
      }
      setCode(codeData as string);

      const { data: codeRow } = await supabase
        .from("referral_codes")
        .select("total_uses, premium_conversions")
        .eq("user_id", user.id)
        .maybeSingle<{ total_uses: number; premium_conversions: number }>();
      if (cancelled) return;
      setStats({
        total: codeRow?.total_uses ?? 0,
        premium: codeRow?.premium_conversions ?? 0,
      });

      const { data: refs } = await supabase
        .from("referrals")
        .select("signed_up_at, became_premium_at")
        .eq("referrer_user_id", user.id)
        .order("signed_up_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      setRecent((refs as typeof recent) ?? []);
      setHubLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const aiPath = language === "ru" ? "/topuni-ai/ru" : "/topuni-ai";
  const shareLink = code ? `https://topuni.org${aiPath}?ref=${code}` : "";

  const copy = async (what: "code" | "link") => {
    if (!code) return;
    const text = what === "code" ? code : shareLink;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
      toast.success(what === "code" ? t.toastCode : t.toastLink);
    } catch {
      toast.error(t.errCopy);
    }
  };

  const tryNativeShare = async () => {
    if (!shareLink) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: t.shareTitle, text: t.shareText, url: shareLink });
      } catch { /* user dismissed */ }
    } else {
      copy("link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation language={language} />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-2xl font-bold">{t.signInH}</h1>
          <Button onClick={() => setAuthOpen(true)}>{t.signIn}</Button>
        </div>
        <AuthDialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) navigate(language === "ru" ? "/ru" : "/"); }} />
        <Footer language={language} />
      </>
    );
  }

  return (
    <div className="min-h-screen relative bg-background">
      <CampusBackdrop />
      <div className="relative z-10">
      <Navigation language={language} />

      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <Link to="/account" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.backToAccount}
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">{t.kicker}</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">{t.h1}</h1>
          <p className="text-primary-foreground/80 text-sm sm:text-base leading-relaxed max-w-xl">{t.sub}</p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-6">
        {/* Code card */}
        <Card className="p-6 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">{t.yourCode}</p>
            {hubLoading || !code ? (
              <div className="h-10 flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> {t.generating}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <code className="font-heading text-3xl sm:text-4xl font-bold tracking-[0.18em] text-foreground bg-muted/40 border border-border rounded-lg px-4 py-2">
                  {code}
                </code>
                <Button variant={copied === "code" ? "outline" : "gold"} size="sm" onClick={() => copy("code")} className="gap-1.5">
                  {copied === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "code" ? t.copied : t.copy}
                </Button>
              </div>
            )}
          </div>

          {code && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">{t.orShareLink}</p>
              <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2.5">
                <code className="text-xs sm:text-sm text-foreground flex-1 truncate font-mono">{shareLink}</code>
                <Button variant={copied === "link" ? "outline" : "gold"} size="sm" onClick={() => copy("link")} className="gap-1.5 shrink-0">
                  {copied === "link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "link" ? t.copied : t.copy}
                </Button>
              </div>
            </div>
          )}

          {code && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`mailto:?subject=${encodeURIComponent(t.emailSubject)}&body=${encodeURIComponent(t.emailBody(shareLink))}`}>
                  <Mail className="w-3.5 h-3.5" /> {t.emailFriend}
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent(t.whatsappText(shareLink))}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-3.5 h-3.5" /> {t.whatsapp}
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={tryNativeShare}>
                <Share2 className="w-3.5 h-3.5" /> {t.share}
              </Button>
            </div>
          )}
        </Card>

        {/* Stats card */}
        <Card className="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-heading font-semibold text-lg tracking-tight">{t.yourReferrals}</h2>
            <Link to="/account" className="text-xs text-muted-foreground hover:text-gold-dark transition-colors">{t.viewAccount}</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{t.signups}</p>
              <p className="font-heading text-3xl font-bold tabular-nums tracking-tight text-foreground">{stats.total}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{t.premiumConversions}</p>
              <p className={`font-heading text-3xl font-bold tabular-nums tracking-tight ${stats.premium > 0 ? "text-gold-dark" : "text-foreground"}`}>{stats.premium}</p>
            </div>
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{t.none}</p>
          ) : (
            <div className="border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">{t.recent}</p>
              <div className="space-y-2">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="flex-1 text-muted-foreground">
                      {t.friendSignedUp(formatDistanceToNow(new Date(r.signed_up_at), { addSuffix: true, locale: dateLocale }))}
                    </span>
                    {r.became_premium_at ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-gold-dark font-semibold">
                        <Crown className="w-3 h-3" /> {t.premium}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t.free}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* How it works */}
        <Card className="p-6">
          <h2 className="font-heading font-semibold text-lg tracking-tight mb-4">{t.howItWorks}</h2>
          <ol className="space-y-3 text-sm">
            {t.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="h-5 w-5 shrink-0 rounded-full bg-gold/15 text-gold-dark text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span className="text-foreground/90 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-muted-foreground mt-5 leading-relaxed">{t.creditNote}</p>
        </Card>

        {/* Closing CTA */}
        <div className="text-center pt-2">
          <Button variant="ghost" asChild className="gap-1.5">
            <Link to={aiPath}>
              {t.openAi} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </main>
      <Footer language={language} />
      </div>
    </div>
  );
};

export default Refer;
