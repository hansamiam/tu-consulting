// Account — the hub authed users land on. Surfaces tracker stats,
// documents, brief status, nudge controls + the existing subscription
// info. Bilingual via the `language` prop.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Crown, Sparkles, ExternalLink, Loader2, LogOut, Calendar,
  Inbox, FileText, Bot, Bell, BellOff, ArrowRight, Search, Users,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS } from "date-fns/locale";

interface AccountProps { language?: "en" | "ru"; }

const COPY = {
  en: {
    signInH: "Sign in to view your account",
    signIn: "Sign in",
    couldntPortal: "Couldn't open billing portal. Try again.",
    couldntNudge: "Couldn't update nudge preference.",
    nudgeResumed: "Weekly nudges resumed.",
    nudgePaused: "Weekly nudges paused.",
    nudgePausedFromUrl: "Weekly nudges paused. You can re-enable any time below.",
    welcomeAboard: "Welcome aboard! Your Founding Membership is active.",
    couldntPause: "Couldn't update nudge preference. Try again.",
    yourTopuni: "Your TopUni",
    welcomeBack: (name: string) => name ? `Welcome back, ${name}.` : "Welcome back.",
    statTracking: "Tracking",
    statUrgent: (n: number) => `${n} urgent`,
    statDocuments: "Documents",
    statReady: (n: number) => `${n} ready`,
    statBrief: "Brief",
    statBriefPremium: "Premium",
    statBriefBasic: "Basic",
    statBriefNone: "Not yet",
    statBriefUpdated: (rel: string) => `Updated ${rel} ago`,
    statBriefGenerate: "Generate yours",
    statCounselor: "Counselor",
    statCounselorPremium: "Premium",
    statCounselorFree: "Free",
    statCounselorCaseAware: "case-aware",
    comingUp: "Coming up",
    openPipeline: "Open pipeline",
    morePipeline: (n: number) => `+ ${n} more in your pipeline`,
    recentDocuments: "Recent documents",
    manage: "Manage",
    docReady: "ready",
    docFailed: "failed",
    docReading: "reading",
    statusPrefix: (s: string) => `Status: ${s}`,
    membership: "Membership",
    tierFounding: "Founding Member",
    tierPro: "Pro",
    tierFree: "Free",
    foundingMemberNumber: (n: number) => `Founding Member #${n} of 100`,
    upgrade: "Upgrade",
    earnedTrialActive: "🎁 Earned trial active",
    earnedTrialBody: (until: string) => `You've unlocked Pro until ${until}. Upgrade anytime to keep the access.`,
    seePlans: "See plans",
    renewsOn: "Renews",
    endsOn: "Ends",
    intervalMonth: "monthly",
    intervalYear: "yearly",
    manageBilling: "Manage billing",
    weeklyNudges: "Weekly nudges",
    nudgesBody: "Sundays at 10 UTC, your AI coach reads your tracker state and writes a tight 3-things-this-week check-in. Cite-the-actual-scholarship-by-name personal, not generic.",
    lastSent: (rel: string) => `Last sent ${rel} ago`,
    jumpTo: "Jump to",
    quickAi: "AI counselor + brief",
    quickDiscover: "Discover scholarships",
    quickPipeline: "Application pipeline",
    quickCalendar: "Deadline calendar",
    quickEssay: "Essay critique",
    quickRefer: "Refer a friend",
    signOut: "Sign out",
    rollingVaries: "Rolling / varies",
    closed: "Closed",
    daysWord: (d: number) => d === 1 ? "1 day" : `${d} days`,
    monthsWord: (m: number) => `${m} months`,
  },
  ru: {
    signInH: "Войдите чтобы открыть аккаунт",
    signIn: "Войти",
    couldntPortal: "Не удалось открыть биллинг. Попробуйте снова.",
    couldntNudge: "Не удалось обновить настройку.",
    nudgeResumed: "Еженедельные напоминания возобновлены.",
    nudgePaused: "Еженедельные напоминания приостановлены.",
    nudgePausedFromUrl: "Напоминания приостановлены. Можно включить снова ниже.",
    welcomeAboard: "С присоединением! Ваше основательное членство активно.",
    couldntPause: "Не удалось обновить настройку. Попробуйте снова.",
    yourTopuni: "Ваш TopUni",
    welcomeBack: (name: string) => name ? `С возвращением, ${name}.` : "С возвращением.",
    statTracking: "В трекере",
    statUrgent: (n: number) => `${n} срочно`,
    statDocuments: "Документы",
    statReady: (n: number) => `${n} готово`,
    statBrief: "Бриф",
    statBriefPremium: "Premium",
    statBriefBasic: "Базовый",
    statBriefNone: "Ещё нет",
    statBriefUpdated: (rel: string) => `Обновлено ${rel} назад`,
    statBriefGenerate: "Создать",
    statCounselor: "Коуч",
    statCounselorPremium: "Premium",
    statCounselorFree: "Free",
    statCounselorCaseAware: "знает ваш кейс",
    comingUp: "Ближайшее",
    openPipeline: "Открыть воронку",
    morePipeline: (n: number) => `+ ${n} ещё в воронке`,
    recentDocuments: "Недавние документы",
    manage: "Управлять",
    docReady: "готов",
    docFailed: "ошибка",
    docReading: "читаем",
    statusPrefix: (s: string) => `Статус: ${s}`,
    membership: "Членство",
    tierFounding: "Основатель",
    tierPro: "Pro",
    tierFree: "Free",
    foundingMemberNumber: (n: number) => `Основатель №${n} из 100`,
    upgrade: "Обновить",
    earnedTrialActive: "🎁 Заработанный пробный активен",
    earnedTrialBody: (until: string) => `Вы открыли Pro до ${until}. Обновите в любой момент чтобы сохранить доступ.`,
    seePlans: "Смотреть тарифы",
    renewsOn: "Продление",
    endsOn: "Заканчивается",
    intervalMonth: "ежемесячно",
    intervalYear: "ежегодно",
    manageBilling: "Управлять биллингом",
    weeklyNudges: "Еженедельные напоминания",
    nudgesBody: "Воскресенье 10 UTC: AI-коуч читает ваш трекер и пишет короткое напоминание о 3 делах на неделю. Конкретно по вашим стипендиям, а не шаблонно.",
    lastSent: (rel: string) => `Последнее отправлено ${rel} назад`,
    jumpTo: "Перейти к",
    quickAi: "AI-коуч и бриф",
    quickDiscover: "Поиск стипендий",
    quickPipeline: "Воронка заявок",
    quickCalendar: "Календарь дедлайнов",
    quickEssay: "Критика эссе",
    quickRefer: "Пригласить друга",
    signOut: "Выйти",
    rollingVaries: "По мере поступления / варьируется",
    closed: "Закрыто",
    daysWord: (d: number) => {
      const last = d % 10, lastTwo = d % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `${d} дней`;
      if (last === 1) return `${d} день`;
      if (last >= 2 && last <= 4) return `${d} дня`;
      return `${d} дней`;
    },
    monthsWord: (m: number) => {
      const last = m % 10, lastTwo = m % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `${m} месяцев`;
      if (last === 1) return `${m} месяц`;
      if (last >= 2 && last <= 4) return `${m} месяца`;
      return `${m} месяцев`;
    },
  },
} as const;

const Account = ({ language = "en" }: AccountProps) => {
  const t = COPY[language];
  const dateLocale = language === "ru" ? ruLocale : enUS;
  const { user, loading, subscription, signOut, refreshSubscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  const [trackerStats, setTrackerStats] = useState<{ tracked: number; urgent: number; pending: number; nextRow?: TrackerLite } | null>(null);
  const [docs, setDocs] = useState<{ count: number; ready: number; recent: DocLite[] }>({ count: 0, ready: 0, recent: [] });
  const [brief, setBrief] = useState<{ generated_at: string; report_grade: string } | null>(null);
  const [profileMeta, setProfileMeta] = useState<{ nudge_opt_out: boolean; last_nudge_sent_at: string | null }>({ nudge_opt_out: false, last_nudge_sent_at: null });
  const [hubLoading, setHubLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) setAuthOpen(true);
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const justSubscribed = params.get("subscribed") === "1";
    const action = params.get("action");
    (async () => {
      if (action === "pause-nudges") {
        const { error } = await supabase.from("student_profiles").update({ nudge_opt_out: true }).eq("user_id", user.id);
        if (error) toast.error(t.couldntPause); else toast.success(t.nudgePausedFromUrl);
        window.history.replaceState({}, "", language === "ru" ? "/account/ru" : "/account");
      }
      if (justSubscribed) {
        for (let i = 0; i < 3; i++) {
          try {
            await supabase.functions.invoke("check-subscription");
            await refreshSubscription();
            break;
          } catch { await new Promise((r) => setTimeout(r, 1500)); }
        }
        toast.success(t.welcomeAboard);
        window.history.replaceState({}, "", language === "ru" ? "/account/ru" : "/account");
      } else {
        refreshSubscription();
      }
    })();
  }, [user, refreshSubscription, t.couldntPause, t.nudgePausedFromUrl, t.welcomeAboard, language]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setHubLoading(true);
      const [trackerRes, docsRes, briefRes, profileRes] = await Promise.all([
        loadTrackerStats(user.id),
        loadDocStats(user.id),
        loadBrief(user.id),
        loadProfileMeta(user.id),
      ]);
      if (cancelled) return;
      setTrackerStats(trackerRes);
      setDocs(docsRes);
      setBrief(briefRes);
      setProfileMeta(profileRes);
      setHubLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const openPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setPortalLoading(false);
    if (error || !data?.url) { toast.error(t.couldntPortal); return; }
    window.open(data.url, "_blank");
  };

  const toggleNudge = async (next: boolean) => {
    if (!user) return;
    setProfileMeta((p) => ({ ...p, nudge_opt_out: !next }));
    const { error } = await supabase.from("student_profiles").update({ nudge_opt_out: !next }).eq("user_id", user.id);
    if (error) {
      setProfileMeta((p) => ({ ...p, nudge_opt_out: !p.nudge_opt_out }));
      toast.error(t.couldntNudge);
    } else {
      toast.success(next ? t.nudgeResumed : t.nudgePaused);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const homePath = language === "ru" ? "/ru" : "/";
  const aiPath = language === "ru" ? "/topuni-ai/ru" : "/topuni-ai";
  const discoverPath = language === "ru" ? "/discover/ru" : "/discover";
  const pipelinePath = language === "ru" ? "/pipeline/ru" : "/pipeline";
  const calendarPath = language === "ru" ? "/calendar/ru" : "/calendar";
  const essayPath = language === "ru" ? "/essay/ru" : "/essay";
  const referPath = language === "ru" ? "/refer/ru" : "/refer";
  const pricingPath = language === "ru" ? "/pricing/ru" : "/pricing";

  if (!user) {
    return (
      <>
        <Navigation language={language} />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-2xl font-bold">{t.signInH}</h1>
          <Button onClick={() => setAuthOpen(true)}>{t.signIn}</Button>
        </div>
        <AuthDialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) navigate(homePath); }} />
        <Footer language={language} />
      </>
    );
  }

  const tier = subscription.tier;
  const tierLabel = tier === "founding" ? t.tierFounding : tier === "pro" ? t.tierPro : t.tierFree;
  const tierColor = tier === "founding"
    ? "bg-gold/15 text-gold-dark border-gold/30"
    : tier === "pro" ? "bg-primary/10 text-primary border-primary/20"
    : "bg-muted text-muted-foreground";

  const firstName = (user.email || "").split("@")[0];
  const dateOpts = { locale: dateLocale };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        {/* Welcome */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-2">{t.yourTopuni}</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">{t.welcomeBack(firstName)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Inbox className="w-4 h-4" />}
            label={t.statTracking}
            value={hubLoading ? "—" : (trackerStats?.tracked ?? 0).toString()}
            sub={trackerStats && trackerStats.urgent > 0 ? t.statUrgent(trackerStats.urgent) : undefined}
            subTone={trackerStats && trackerStats.urgent > 0 ? "warn" : "neutral"}
            href={pipelinePath}
          />
          <StatCard
            icon={<FileText className="w-4 h-4" />}
            label={t.statDocuments}
            value={hubLoading ? "—" : docs.count.toString()}
            sub={docs.ready > 0 ? t.statReady(docs.ready) : undefined}
            href={aiPath}
          />
          <StatCard
            icon={<Sparkles className="w-4 h-4" />}
            label={t.statBrief}
            value={hubLoading ? "—" : brief ? (brief.report_grade === "premium" ? t.statBriefPremium : t.statBriefBasic) : t.statBriefNone}
            sub={brief ? t.statBriefUpdated(formatDistanceToNow(new Date(brief.generated_at), dateOpts)) : t.statBriefGenerate}
            href={aiPath}
          />
          <StatCard
            icon={<Bot className="w-4 h-4" />}
            label={t.statCounselor}
            value={tier !== "free" ? t.statCounselorPremium : t.statCounselorFree}
            sub={tier !== "free" ? t.statCounselorCaseAware : undefined}
            href={aiPath}
          />
        </div>

        {/* Pipeline preview */}
        {trackerStats && trackerStats.tracked > 0 && trackerStats.nextRow && (
          <Card className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-heading font-semibold tracking-tight">{t.comingUp}</h2>
              <Link to={pipelinePath} className="text-xs text-muted-foreground hover:text-gold-dark transition-colors inline-flex items-center gap-1">
                {t.openPipeline} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <PipelinePreviewRow row={trackerStats.nextRow} t={t} pipelinePath={pipelinePath} />
            {trackerStats.tracked > 1 && (
              <p className="text-[11px] text-muted-foreground mt-3">{t.morePipeline(trackerStats.tracked - 1)}</p>
            )}
          </Card>
        )}

        {/* Recent documents */}
        {docs.recent.length > 0 && (
          <Card className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-heading font-semibold tracking-tight">{t.recentDocuments}</h2>
              <Link to={aiPath} className="text-xs text-muted-foreground hover:text-gold-dark transition-colors inline-flex items-center gap-1">
                {t.manage} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {docs.recent.map((d) => (
                <div key={d.document_id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{d.title || d.filename}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground shrink-0">{d.kind}</span>
                  <span className={`text-[10px] font-medium shrink-0 ${
                    d.parse_status === "ready" ? "text-emerald-600"
                    : d.parse_status === "failed" ? "text-destructive"
                    : "text-amber-600 dark:text-amber-500"
                  }`}>
                    {d.parse_status === "ready" ? t.docReady : d.parse_status === "failed" ? t.docFailed : t.docReading}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Membership */}
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold tracking-tight">{t.membership}</h2>
                <Badge variant="outline" className={tierColor}>
                  {tier === "founding" && <Crown className="w-3 h-3 mr-1" />}
                  {tier === "pro" && <Sparkles className="w-3 h-3 mr-1" />}
                  {tierLabel}
                </Badge>
              </div>
              {subscription.is_founding_member && subscription.founding_member_number && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t.foundingMemberNumber(subscription.founding_member_number)}
                </p>
              )}
            </div>
            {tier === "free" && !subscription.earned_trial_active && (
              <Button onClick={() => navigate(pricingPath)} className="gap-2">
                <Sparkles className="w-4 h-4" /> {t.upgrade}
              </Button>
            )}
          </div>

          {subscription.earned_trial_active && tier === "free" && (
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
              <p className="font-medium text-sm">{t.earnedTrialActive}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.earnedTrialBody(subscription.earned_trial_expires_at ? format(new Date(subscription.earned_trial_expires_at), "PPP", dateOpts) : "")}
              </p>
              <Button size="sm" className="mt-3" onClick={() => navigate(pricingPath)}>{t.seePlans}</Button>
            </div>
          )}

          {subscription.current_period_end && tier !== "free" && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {subscription.cancel_at_period_end ? t.endsOn : t.renewsOn}{" "}
              {format(new Date(subscription.current_period_end), "PPP", dateOpts)}
              {subscription.billing_interval && ` (${subscription.billing_interval === "year" ? t.intervalYear : t.intervalMonth})`}
            </div>
          )}

          {tier !== "free" && (
            <Button variant="outline" onClick={openPortal} disabled={portalLoading} className="gap-2">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {t.manageBilling}
            </Button>
          )}
        </Card>

        {/* Notifications */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {profileMeta.nudge_opt_out ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-gold-dark" />}
                <h2 className="font-heading font-semibold tracking-tight">{t.weeklyNudges}</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.nudgesBody}</p>
              {profileMeta.last_nudge_sent_at && !profileMeta.nudge_opt_out && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t.lastSent(formatDistanceToNow(new Date(profileMeta.last_nudge_sent_at), dateOpts))}
                </p>
              )}
            </div>
            <Switch checked={!profileMeta.nudge_opt_out} onCheckedChange={toggleNudge} />
          </div>
        </Card>

        {/* Quick links */}
        <Card className="p-5">
          <h2 className="font-heading font-semibold tracking-tight mb-3">{t.jumpTo}</h2>
          <div className="grid sm:grid-cols-2 gap-1.5 text-sm">
            <QuickLink to={aiPath}        icon={<Bot className="w-3.5 h-3.5" />}      label={t.quickAi} />
            <QuickLink to={discoverPath}  icon={<Search className="w-3.5 h-3.5" />}   label={t.quickDiscover} />
            <QuickLink to={pipelinePath}  icon={<Inbox className="w-3.5 h-3.5" />}    label={t.quickPipeline} />
            <QuickLink to={calendarPath}  icon={<Calendar className="w-3.5 h-3.5" />} label={t.quickCalendar} />
            <QuickLink to={essayPath}     icon={<FileText className="w-3.5 h-3.5" />} label={t.quickEssay} />
            <QuickLink to={referPath}     icon={<Users className="w-3.5 h-3.5" />}    label={t.quickRefer} />
          </div>
        </Card>

        <Button variant="ghost" onClick={() => signOut().then(() => navigate(homePath))} className="gap-2 text-muted-foreground">
          <LogOut className="w-4 h-4" /> {t.signOut}
        </Button>
      </main>
      <Footer language={language} />
    </div>
  );
};

export default Account;

/* ─── Internals ─────────────────────────────────────────────────── */

interface TrackerLite {
  scholarship_id: string;
  status: string | null;
  scholarship: { scholarship_name: string; host_country: string | null; application_deadline: string | null } | null;
}
interface DocLite {
  document_id: string;
  filename: string;
  title: string | null;
  kind: string;
  parse_status: string;
}

type T = typeof COPY["en"];

async function loadTrackerStats(userId: string) {
  const { data: tracker } = await supabase
    .from("application_tracker")
    .select(`
      scholarship_id, status, hidden, shortlisted,
      scholarship:scholarship_id ( scholarship_name, host_country, application_deadline )
    `)
    .eq("user_id", userId)
    .returns<(TrackerLite & { hidden: boolean; shortlisted: boolean })[]>();

  const now = Date.now();
  const visible = (tracker ?? []).filter((t) => !t.hidden && (t.status || t.shortlisted));
  const urgent = visible.filter((t) => {
    const dl = t.scholarship?.application_deadline;
    if (!dl) return false;
    const days = Math.ceil((new Date(dl).getTime() - now) / 86400_000);
    return days > 0 && days <= 30;
  }).length;
  const pending = visible.filter((t) => !t.status).length;
  const sorted = [...visible].sort((a, b) => {
    const ad = a.scholarship?.application_deadline ? new Date(a.scholarship.application_deadline).getTime() : Infinity;
    const bd = b.scholarship?.application_deadline ? new Date(b.scholarship.application_deadline).getTime() : Infinity;
    return ad - bd;
  });
  return { tracked: visible.length, urgent, pending, nextRow: sorted[0] };
}

async function loadDocStats(userId: string) {
  const { data } = await supabase
    .from("student_documents")
    .select("document_id, filename, title, kind, parse_status, uploaded_at")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });
  const all = (data as (DocLite & { uploaded_at: string })[]) ?? [];
  return {
    count: all.length,
    ready: all.filter((d) => d.parse_status === "ready").length,
    recent: all.slice(0, 3),
  };
}

async function loadBrief(userId: string) {
  const { data } = await supabase
    .from("pathway_reports")
    .select("generated_at, report_grade")
    .eq("user_id", userId)
    .maybeSingle<{ generated_at: string; report_grade: string }>();
  return data;
}

async function loadProfileMeta(userId: string) {
  const { data } = await supabase
    .from("student_profiles")
    .select("nudge_opt_out, last_nudge_sent_at")
    .eq("user_id", userId)
    .maybeSingle<{ nudge_opt_out: boolean; last_nudge_sent_at: string | null }>();
  return data ?? { nudge_opt_out: false, last_nudge_sent_at: null };
}

const StatCard = ({ icon, label, value, sub, subTone = "neutral", href }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; subTone?: "neutral" | "warn"; href?: string;
}) => {
  const subClass = subTone === "warn" ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground/80";
  const card = (
    <Card className="p-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">{label}</span>
      </div>
      <p className="font-heading font-bold text-xl tabular-nums tracking-tight leading-none text-foreground">{value}</p>
      {sub && <p className={`text-[11px] mt-1 ${subClass}`}>{sub}</p>}
    </Card>
  );
  if (href) return <Link to={href} className="contents">{card}</Link>;
  return card;
};

const PipelinePreviewRow = ({ row, t, pipelinePath }: { row: TrackerLite; t: T; pipelinePath: string }) => {
  const dl = row.scholarship?.application_deadline;
  const days = dl ? Math.ceil((new Date(dl).getTime() - Date.now()) / 86400_000) : null;
  const daysClass =
    days === null ? "text-muted-foreground"
    : days <= 7 ? "text-destructive"
    : days <= 30 ? "text-amber-600 dark:text-amber-500"
    : "text-muted-foreground";
  const daysText =
    days === null ? t.rollingVaries
    : days <= 0 ? t.closed
    : days <= 30 ? t.daysWord(days)
    : t.monthsWord(Math.round(days / 30));
  return (
    <Link to={pipelinePath} className="flex items-center gap-3 hover:bg-muted/30 transition-colors -m-2 p-2 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-0.5">
          {row.scholarship?.host_country ?? "—"}
        </p>
        <p className="font-medium text-foreground truncate">{row.scholarship?.scholarship_name}</p>
        {row.status && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{t.statusPrefix(row.status)}</p>
        )}
      </div>
      <span className={`text-xs font-semibold tabular-nums shrink-0 ${daysClass}`}>{daysText}</span>
    </Link>
  );
};

const QuickLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to} className="flex items-center gap-2 px-2.5 py-2 rounded-md text-foreground hover:bg-muted/40 transition-colors">
    <span className="text-gold-dark">{icon}</span>
    <span className="flex-1">{label}</span>
    <ArrowRight className="w-3 h-3 text-muted-foreground" />
  </Link>
);
