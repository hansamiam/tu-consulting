/**
 * Pipeline — application mission-control view at /pipeline.
 *
 * Reads from useApplicationTracker (offline-first, DB-synced when
 * authed) + hydrates full scholarship rows for the tracked IDs.
 * Renders a column-per-status pipeline (Shortlisted → Researching →
 * Drafting → Submitted → Decision) with each card showing the live
 * deadline countdown.
 *
 * This is the surface that turns the tracker from invisible state into
 * a product the student opens daily during application season.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ExternalLink, Clock, Check, X, Calendar,
  StickyNote, Loader2, Search, Inbox, ChevronDown, Bot, KanbanSquare, FileText,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useApplicationTracker, type AppStatus } from "@/hooks/useApplicationTracker";
import { useAuth } from "@/contexts/AuthContext";
import { ScholarshipChecklist } from "@/components/pipeline/ScholarshipChecklist";
import { DueThisWeek } from "@/components/pipeline/DueThisWeek";
import { CountryArt } from "@/lib/countryArt";
import { accentForCountry, shortCountry } from "@/lib/countryAccent";
import { cleanScholarshipName, cleanProvider } from "@/lib/scholarshipFields";
import { CalendarSubscribeDialog } from "@/components/pipeline/CalendarSubscribeDialog";
import { EssayDraftPanel } from "@/components/pipeline/EssayDraftPanel";
import { AdditionalEssaysPanel } from "@/components/pipeline/AdditionalEssaysPanel";
import { RecommendersPanel } from "@/components/pipeline/RecommendersPanel";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";
import { UpcomingDeadlines } from "@/components/pipeline/UpcomingDeadlines";
import { EssaysTab } from "@/components/pipeline/EssaysTab";
import { UpgradeChip } from "@/components/UpgradeChip";
import { InstaFollowChip } from "@/components/InstaFollowChip";

interface Scholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  deadline_type: string | null;
  official_url: string | null;
  data_source: string | null;
  verification_status: string | null;
  last_verified_at: string | null;
  lifecycle_status: string | null;
  next_open_at: string | null;
}

// Pipeline workspace simplified (round 9): collapsed from 5 columns
// to 3. Researching / Drafting / Submitted merged into a single
// "Working on it" column — the granular status is still tracked per
// row (and shown as a chip) but doesn't fragment the visual workspace.
// 'decision' rows continue under "Awaiting decision". Five vertical
// columns was visual overload for what's practically a "saved /
// active / decided" workflow.
const COLUMNS: { key: AppStatus | "shortlisted" | "active"; label: { en: string; ru: string }; tone: string; bar: string }[] = [
  { key: "shortlisted", label: { en: "Saved",              ru: "Сохранено" },           tone: "text-muted-foreground",                            bar: "bg-muted-foreground/40" },
  { key: "active",      label: { en: "Working on it",      ru: "В работе" },             tone: "text-amber-700 dark:text-amber-400",               bar: "bg-amber-500" },
  { key: "decision",    label: { en: "Submitted · awaiting",ru: "Подал · жду ответа" },  tone: "text-primary",                                     bar: "bg-primary" },
];

const STATUS_OPTIONS: { value: AppStatus | null | "shortlisted"; label: { en: string; ru: string } }[] = [
  { value: "shortlisted", label: { en: "Shortlisted only",  ru: "В шорт-лист" } },
  { value: "researching", label: { en: "Researching",       ru: "Изучаю" } },
  { value: "drafting",    label: { en: "Drafting",          ru: "Готовлю" } },
  { value: "submitted",   label: { en: "Submitted",         ru: "Подал" } },
  { value: "decision",    label: { en: "Awaiting decision", ru: "Жду ответа" } },
  { value: "rejected",    label: { en: "Rejected",          ru: "Отклонено" } },
  { value: "accepted",    label: { en: "Accepted",          ru: "Принят" } },
  { value: null,          label: { en: "Remove status",     ru: "Снять статус" } },
];

const fmtMoney = (v: number | null | undefined): string | null => {
  if (!v) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
};

const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400_000);
};

interface PipelineProps {
  language?: "en" | "ru";
}

const Pipeline = ({ language = "en" }: PipelineProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const tracker = useApplicationTracker();
  const { user } = useAuth();
  // Pulled once per render; cheap localStorage hit. The student's name
  // here is used to sign drafted reminder emails to recommenders.
  const studentName = useMemo(() => getStoredProfile()?.fullName?.trim() || null, []);
  const trackedIds = useMemo(
    () => Array.from(new Set([...tracker.shortlist, ...Object.keys(tracker.statusMap)])),
    [tracker.shortlist, tracker.statusMap],
  );

  /* Hydrate full scholarship rows for the IDs in the tracker. Runs
     whenever the set of tracked IDs changes. Public RLS allows anon
     reads. */
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trackedIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "application_deadline, deadline_type, official_url, data_source, " +
          "verification_status, last_verified_at, " +
          "lifecycle_status, next_open_at",
        )
        .in("scholarship_id", trackedIds);
      if (cancelled) return;
      setRows((data as Scholarship[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [trackedIds.join(",")]);

  /* Bucketing — each row goes into exactly one column based on status.
     Rows with no status but shortlisted show up in "Shortlisted".
     Rejected / accepted are excluded from the kanban view but counted
     in the stats banner. */
  const buckets = useMemo(() => {
    // Three columns: saved (no status) / active (researching/drafting/
    // submitted) / decision (awaiting). Rejected + accepted drop off the
    // workspace — they're outcomes, not active work.
    const map: Record<string, Scholarship[]> = {
      shortlisted: [], active: [], decision: [],
    };
    for (const r of rows) {
      const status = tracker.statusMap[r.scholarship_id] as AppStatus | undefined;
      if (status === "researching" || status === "drafting" || status === "submitted") {
        map.active.push(r);
      } else if (status === "decision") {
        map.decision.push(r);
      } else if (!status && tracker.shortlist.has(r.scholarship_id)) {
        map.shortlisted.push(r);
      }
    }
    // Sort each bucket by deadline urgency (closest first; null deadlines last)
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const ad = daysUntil(a.application_deadline);
        const bd = daysUntil(b.application_deadline);
        if (ad === null && bd === null) return a.scholarship_name.localeCompare(b.scholarship_name);
        if (ad === null) return 1;
        if (bd === null) return -1;
        return ad - bd;
      });
    }
    return map;
  }, [rows, tracker.statusMap, tracker.shortlist]);

  /* Stats banner — total tracked, deadlines in next 30 days, total
     potential funding stack (sum of estimated_total_value_usd for
     non-rejected non-hidden tracked scholarships) + the new "Won"
     stat aggregating awardedAmountUsd across all accepted statuses. */
  const stats = useMemo(() => {
    const active = rows.filter(
      (r) => !tracker.hidden.has(r.scholarship_id) && tracker.statusMap[r.scholarship_id] !== "rejected",
    );
    const urgent = active.filter((r) => {
      const d = daysUntil(r.application_deadline);
      return d !== null && d > 0 && d <= 30;
    });
    const stackUsd = active.reduce((s, r) => s + (r.estimated_total_value_usd ?? 0), 0);
    const submitted = rows.filter((r) => tracker.statusMap[r.scholarship_id] === "submitted").length;
    const decisions = rows.filter((r) => {
      const s = tracker.statusMap[r.scholarship_id];
      return s === "accepted" || s === "rejected";
    }).length;
    let wonUsd = 0;
    let wonCount = 0;
    for (const id of Object.keys(tracker.statusMap)) {
      if (tracker.statusMap[id] !== "accepted") continue;
      wonCount += 1;
      wonUsd += tracker.awardedMap[id] ?? 0;
    }
    return {
      totalTracked: active.length,
      urgentCount: urgent.length,
      stackUsd,
      submitted,
      decisions,
      wonUsd,
      wonCount,
      stackText: fmtMoney(stackUsd),
      wonText: fmtMoney(wonUsd),
    };
  }, [rows, tracker.statusMap, tracker.hidden, tracker.awardedMap]);

  /* Workspace consolidation (round 22): the three tabs (Board /
   * Calendar / Essays) flattened into one page that scrolls. The
   * scholarships block keeps its by-category kanban as the default
   * but gains a list view toggle for users who want a flat
   * deadline-sorted view. Calendar + essays render as inline
   * sections below.
   *
   * `?view=list` is supported as a deep-link hint — the URL is no
   * longer the source of truth for tabs (those are gone), but the
   * boardView preference does deserve to survive a refresh. */
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const boardView: "category" | "list" = viewParam === "list" ? "list" : "category";
  const setBoardView = (next: "category" | "list") => {
    const params = new URLSearchParams(searchParams);
    if (next === "category") params.delete("view"); else params.set("view", next);
    setSearchParams(params, { replace: true });
  };

  /* Detail sheet state */
  const [openDetail, setOpenDetail] = useState<Scholarship | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  /* Award-capture prompt — opens whenever a member flips a row's status
     to 'accepted'. We keep the scholarship_id the prompt is for so the
     dialog can render the name + write the captured amount back via
     tracker.setAwardedAmount. Skip leaves awardedAmountUsd null (the
     row still counts as 'accepted'; it just doesn't contribute to the
     "Won" stat). */
  const [awardPromptId, setAwardPromptId] = useState<string | null>(null);
  const [awardDraft, setAwardDraft] = useState<string>("");
  // Two-step prompt: Step 1 captures the amount, Step 2 celebrates +
  // surfaces the highest-trust referral moment in the entire product.
  // Most members will never accept a scholarship inside our membership
  // window — the ones who do are 10× more likely to refer at this
  // exact moment than at any nudge-driven email later.
  const [awardStep, setAwardStep] = useState<"capture" | "celebrate">("capture");
  const awardPromptScholarship = useMemo(
    () => rows.find((r) => r.scholarship_id === awardPromptId) ?? null,
    [rows, awardPromptId],
  );

  const handleStatusChange = (scholarshipId: string, status: AppStatus | null) => {
    tracker.setStatus(scholarshipId, status);
    if (status === "accepted") {
      // Pre-fill the input with the existing captured amount (if any) or
      // the row's estimated_total_value_usd as a sensible default.
      const existing = tracker.awardedMap[scholarshipId];
      const fallback = rows.find((r) => r.scholarship_id === scholarshipId)?.estimated_total_value_usd ?? null;
      setAwardDraft(existing != null ? String(existing) : fallback != null ? String(fallback) : "");
      setAwardStep("capture");
      setAwardPromptId(scholarshipId);
    }
  };

  const submitAward = () => {
    if (!awardPromptId) return;
    const cleaned = awardDraft.replace(/[$,\s]/g, "");
    const num = cleaned ? Number.parseInt(cleaned, 10) : NaN;
    tracker.setAwardedAmount(awardPromptId, Number.isFinite(num) && num >= 0 ? num : null);
    // Don't close the dialog — transition to the celebrate step.
    setAwardStep("celebrate");
  };
  const skipAward = () => {
    if (!awardPromptId) return;
    // Skip on the capture step nulls the amount; skip on the celebrate
    // step just dismisses (amount was already saved).
    if (awardStep === "capture") {
      tracker.setAwardedAmount(awardPromptId, null);
    }
    setAwardPromptId(null);
    setAwardDraft("");
    setAwardStep("capture");
  };
  const closeAwardPrompt = () => {
    setAwardPromptId(null);
    setAwardDraft("");
    setAwardStep("capture");
  };

  useEffect(() => {
    if (openDetail) setDraftNote(tracker.notesMap[openDetail.scholarship_id] || "");
  }, [openDetail, tracker.notesMap]);

  const saveNote = () => {
    if (!openDetail) return;
    tracker.setNote(openDetail.scholarship_id, draftNote);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      {/* ─── Header ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <Link
            to={isRu ? "/discover/ru" : "/discover"}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("Back to Discover", "К Discover")}
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {t("Workspace", "Рабочая зона")}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            {t("Your applications, in one place.", "Все ваши заявки в одном месте.")}
          </h1>
          <p className="text-primary-foreground/75 text-sm sm:text-base max-w-xl leading-relaxed">
            {t(
              user
                ? "Pipeline, deadline calendar, and essay drafts — one workspace, synced across devices."
                : "Pipeline, deadline calendar, and essay drafts in one workspace. Sign up to sync across devices.",
              user
                ? "Воронка, календарь дедлайнов и черновики эссе — одна рабочая зона, синхронизация на устройствах."
                : "Воронка, календарь дедлайнов и черновики эссе в одной рабочей зоне. Зарегистрируйтесь для синхронизации.",
            )}
          </p>
          {user && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="gold"
                size="sm"
                className="gap-2"
                onClick={() => setCalendarOpen(true)}
              >
                <Calendar className="h-3.5 w-3.5" />
                {t("Sync deadlines to my calendar", "Дедлайны в календарь")}
              </Button>
              <Link
                to={isRu ? "/refer/ru" : "/refer"}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground/85 hover:text-gold-light transition-colors underline-offset-4 hover:underline"
              >
                {t("Refer a friend → free month", "Пригласить друга → бесплатный месяц")}
                <ArrowRight className="h-3 w-3" />
              </Link>
              {/* Round-34: small Account link gives a clear path
                  to the separate billing/settings page without
                  bloating the Workspace body with that content. */}
              <Link
                to={isRu ? "/account/ru" : "/account"}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground/65 hover:text-primary-foreground transition-colors ml-auto"
              >
                {t("Account · settings", "Аккаунт · настройки")}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── Stats banner ─────────────────────────────────────────── */}
      <section className="border-b border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Stat
              label={t("Tracked", "Отслеживается")}
              value={stats.totalTracked.toString()}
              hint={loading ? t("loading…", "загрузка…") : undefined}
            />
            <Stat
              label={t("Deadlines · 30 days", "Дедлайны · 30 дней")}
              value={stats.urgentCount.toString()}
              tone={stats.urgentCount > 0 ? "warn" : "neutral"}
              hint={stats.urgentCount > 0 ? t("act this month", "действовать в этом месяце") : undefined}
            />
            <Stat
              label={t("Submitted", "Подано")}
              value={stats.submitted.toString()}
            />
            <Stat
              label={t("Funding stack", "Стек финансирования")}
              value={stats.stackText || "—"}
              hint={t("est. potential", "потенциал")}
            />
            <Stat
              label={t("Won", "Выиграно")}
              value={stats.wonText || (stats.wonCount > 0 ? "$0" : "—")}
              tone={stats.wonUsd > 0 ? "good" : "neutral"}
              hint={stats.wonCount > 0 ? `${stats.wonCount} ${t("accepted", "принято")}` : undefined}
            />
          </div>
        </div>
      </section>

      {/* ─── Scholarships section ───────────────────────────────────
          Tabs retired (round 22). Workspace is now a single scrolling
          page: scholarships → calendar → essays. The category-vs-list
          toggle is local to this section and persists via ?view=list. */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {loading && trackedIds.length > 0 ? (
          <div className="py-20 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t("Loading your pipeline…", "Загружаем вашу воронку…")}</span>
          </div>
        ) : trackedIds.length === 0 ? (
          <EmptyState language={language} />
        ) : (
          <>
            {/* Round-34: DueThisWeek banner retired. The aggregated
                checklist-blocker callout was overpromising the scope
                of features we currently ship reliably; the simpler
                signal is "see your kanban → click into a scholarship
                → its detail sheet shows the next action." Removing
                the banner keeps the page focused on the actual
                tracker rather than a stack of editorial summaries. */}
          </>
        )}
        {/* View toggle — by-category (kanban) vs flat list. Only shown
            when there's actual tracked content; on the empty state the
            toggle would just sit above an empty page. */}
        {trackedIds.length > 0 && !loading && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
              {t("Tracked scholarships", "Отслеживаемые стипендии")}
            </p>
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setBoardView("category")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  boardView === "category"
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KanbanSquare className="h-3.5 w-3.5" />
                <span>{t("By stage", "По этапу")}</span>
              </button>
              <button
                type="button"
                onClick={() => setBoardView("list")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  boardView === "list"
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{t("List", "Список")}</span>
              </button>
            </div>
          </div>
        )}

        {trackedIds.length > 0 && !loading && boardView === "category" && (
          // Mobile: horizontal scroll-snap of 3 columns (one stage per swipe).
          // Desktop (lg+): standard 3-col grid. Each column gets more room.
          <div className="-mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 overflow-x-auto lg:overflow-visible snap-x snap-mandatory lg:snap-none">
            <div className="grid grid-flow-col auto-cols-[85vw] sm:auto-cols-[60vw] lg:grid-flow-row lg:grid-cols-3 lg:auto-cols-auto gap-5 pb-2 lg:pb-0">
            {COLUMNS.map((col) => {
              const items = buckets[col.key] || [];
              return (
                <div key={col.key} className="space-y-3 snap-start lg:snap-align-none">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-6 rounded-full ${col.bar}`} />
                      <p className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${col.tone}`}>
                        {col.label[isRu ? "ru" : "en"]}
                      </p>
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {items.length === 0 ? (
                      <div className="border border-dashed border-border rounded-xl px-3 py-5 text-center text-[11px] text-muted-foreground/60">
                        {col.key === "shortlisted"
                          ? t("Tap save on a scholarship to start", "Сохраните стипендию, чтобы начать")
                          : t("None at this stage", "Пока ничего")}
                      </div>
                    ) : (
                      items.map((s) => (
                        <PipelineCard
                          key={s.scholarship_id}
                          scholarship={s}
                          status={tracker.statusMap[s.scholarship_id]}
                          isShortlisted={tracker.shortlist.has(s.scholarship_id)}
                          note={tracker.notesMap[s.scholarship_id]}
                          recommenders={tracker.recommendersMap[s.scholarship_id]}
                          hasEssay={!!tracker.essayMap[s.scholarship_id]}
                          isRu={isRu}
                          onOpen={() => setOpenDetail(s)}
                          onStatusChange={(status) => handleStatusChange(s.scholarship_id, status)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Flat list view — every tracked scholarship sorted by deadline
            (soonest first), regardless of stage. Use case: "what's
            actually due next?" without flipping between three columns. */}
        {trackedIds.length > 0 && !loading && boardView === "list" && (
          <div className="space-y-2">
            {[...rows]
              .filter((r) => trackedIds.includes(r.scholarship_id))
              .sort((a, b) => {
                const ad = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.POSITIVE_INFINITY;
                const bd = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.POSITIVE_INFINITY;
                return ad - bd;
              })
              .map((s) => (
                <PipelineCard
                  key={s.scholarship_id}
                  scholarship={s}
                  status={tracker.statusMap[s.scholarship_id]}
                  isShortlisted={tracker.shortlist.has(s.scholarship_id)}
                  note={tracker.notesMap[s.scholarship_id]}
                  recommenders={tracker.recommendersMap[s.scholarship_id]}
                  hasEssay={!!tracker.essayMap[s.scholarship_id]}
                  isRu={isRu}
                  onOpen={() => setOpenDetail(s)}
                  onStatusChange={(status) => handleStatusChange(s.scholarship_id, status)}
                />
              ))}
          </div>
        )}

        {/* Subtle "come hang out" chip — placed below the kanban so it
            only registers after the user has engaged with their data.
            Auto-dismisses + 60-day cooldown via localStorage. */}
        {trackedIds.length > 0 && !loading && (
          <div className="mt-10 flex justify-center">
            <InstaFollowChip surface="pipeline" language={language} />
          </div>
        )}
      </section>

      {/* ─── Inline calendar — was a separate tab; now lives below the
            scholarships list on the same page so the user gets the
            deadline picture without a tab swap. Only renders when
            there are tracked items to plot — empty calendar above an
            empty essays section reads as broken. */}
      {trackedIds.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12">
          <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-4 tracking-tight">
            {t("Upcoming deadlines", "Ближайшие дедлайны")}
          </h2>
          {/* Round-34: replaced the full month-grid WorkspaceCalendar
              with a compact UpcomingDeadlines list — same data
              (next-N tracked-scholarship deadlines), tighter
              footprint. The "month view" use case is covered by the
              .ics calendar feed (Apple / Google / Outlook get the
              full grid natively). */}
          <UpcomingDeadlines
            rows={rows.map(r => ({
              scholarship_id: r.scholarship_id,
              scholarship_name: r.scholarship_name,
              host_country: r.host_country,
              application_deadline: r.application_deadline,
            }))}
            hidden={tracker.hidden}
            loading={loading}
            language={language}
            onSubscribe={user ? () => setCalendarOpen(true) : undefined}
            onSelectScholarship={(id) => {
              const found = rows.find(r => r.scholarship_id === id);
              if (found) setOpenDetail(found);
            }}
          />
        </section>
      )}

      {/* ─── Inline essays — was a separate tab; now lives below the
            calendar. EssaysTab self-renders an empty state when no row
            has an essay started, so we let it show even at zero items
            — that empty state is the discoverability surface. */}
      {trackedIds.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12">
          <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-4 tracking-tight">
            {t("Essay drafts", "Черновики эссе")}
          </h2>
          <EssaysTab
            rows={rows}
            essayMap={tracker.essayMap}
            language={language}
            onOpen={(s) => setOpenDetail(s)}
          />
        </section>
      )}

      {/* Round-34: Membership + Settings card removed from Workspace.
          They live on /account now — Workspace stays focused on
          application work (tracker, calendar, essays). The header
          has a small "Account" link that takes the user there. */}

      {/* Quiet upgrade chip — only renders for free-tier users with at
          least one tracked scholarship. Anchored as a thin footer strip
          so it's present without being in the work surface. Auto-hides
          for Pro/Founding members. */}
      {trackedIds.length > 0 && (
        <UpgradeChip
          surface="pipeline-footer"
          variant="footer"
          language={language}
          message={t(
            "Free preview of essay critique. Pro unlocks the full reader-perspective rewrite + your saved-search alerts.",
            "Бесплатно — только превью эссе. Pro открывает полный разбор и алерты по сохранённым поискам.",
          )}
        />
      )}

      {/* Detail sheet */}
      <Sheet open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        {/* Round-36: detail sheet widened from sm:max-w-lg (32rem) to
            sm:max-w-2xl (42rem) on mid screens and lg:max-w-4xl (56rem)
            on desktop so the EssayDraftPanel's side-by-side editor +
            critique layout actually has room to render. The previous
            512px container was too narrow to host both columns
            comfortably; now the AI critique sits to the right of the
            textarea on desktop instead of pushing it down. */}
        <SheetContent className="sm:max-w-2xl lg:max-w-4xl flex flex-col p-0 overflow-hidden">
          {openDetail && (
            <>
              <SheetHeader className="px-6 py-5 border-b border-border bg-card/30 shrink-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
                    {openDetail.host_country || t("Multiple", "Множественно")}
                  </p>
                </div>
                <SheetTitle className="font-heading text-xl tracking-tight leading-snug">
                  {cleanScholarshipName(openDetail.scholarship_name)}
                </SheetTitle>
                {(() => {
                  const cp = cleanProvider(openDetail.provider_name);
                  return cp ? (
                    <SheetDescription className="text-xs leading-relaxed">
                      {cp}
                    </SheetDescription>
                  ) : null;
                })()}
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Key facts */}
                <div className="grid grid-cols-2 gap-3">
                  <Fact
                    label={t("Deadline", "Дедлайн")}
                    value={
                      openDetail.application_deadline
                        ? `${openDetail.application_deadline}${(() => {
                            const d = daysUntil(openDetail.application_deadline);
                            return d !== null
                              ? ` · ${d <= 0 ? t("closed", "закрыто") : d + (isRu ? " дн." : "d")}`
                              : "";
                          })()}`
                        : t("Varies", "Варьируется")
                    }
                    tone={(() => {
                      const d = daysUntil(openDetail.application_deadline);
                      if (d === null) return "neutral";
                      if (d <= 7) return "danger";
                      if (d <= 30) return "warn";
                      return "neutral";
                    })()}
                  />
                  {/* Coverage tile — was defaulting "partial" rows to
                      "Stipend" which mislabeled them. The DB has four
                      coverage_types: full_ride / tuition_only /
                      stipend / partial. Each gets its own readable
                      label now, with a generic "Funding" fallback for
                      future values rather than a wrong stipend tag. */}
                  <Fact
                    label={t("Coverage", "Покрытие")}
                    value={(() => {
                      const ct = openDetail.coverage_type;
                      if (ct === "full_ride") return t("Full ride", "Полное");
                      if (ct === "tuition_only") return t("Tuition only", "Только обучение");
                      if (ct === "stipend") return t("Stipend", "Стипендия");
                      if (ct === "partial") return t("Partial funding", "Частичное");
                      return t("Funding", "Финансирование");
                    })()}
                  />
                </div>

                {openDetail.award_amount_text && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
                      {t("Award", "Награда")}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{openDetail.award_amount_text}</p>
                  </div>
                )}

                {/* Status setter */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
                    {t("Status", "Статус")}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 w-full justify-between">
                        <span>
                          {(() => {
                            const s = tracker.statusMap[openDetail.scholarship_id];
                            if (s) {
                              const opt = STATUS_OPTIONS.find((o) => o.value === s);
                              return opt?.label[isRu ? "ru" : "en"] ?? s;
                            }
                            return tracker.shortlist.has(openDetail.scholarship_id)
                              ? t("Shortlisted only", "В шорт-листе")
                              : t("Set status", "Поставить статус");
                          })()}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {STATUS_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                          key={String(opt.value)}
                          onClick={() => {
                            if (opt.value === "shortlisted") {
                              tracker.setStatus(openDetail.scholarship_id, null);
                              if (!tracker.shortlist.has(openDetail.scholarship_id)) {
                                tracker.toggleShortlist(openDetail.scholarship_id);
                              }
                            } else {
                              handleStatusChange(openDetail.scholarship_id, opt.value as AppStatus | null);
                            }
                          }}
                        >
                          {opt.label[isRu ? "ru" : "en"]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Round-34: ScholarshipChecklist component removed
                    from this surface. The AI-generated 8-item
                    checklist (Documents / Essays / Recommendations /
                    Portal Actions / Logistics) was overpromising
                    polish we don't yet ship reliably; cached
                    completion state, mid-rendering flicker, and
                    sometimes-stale items made it feel half-baked.
                    The user's own Notes + RecommendersPanel + Essay
                    drafter cover the same ground at a quality bar
                    we can actually hold. The checklist returns when
                    the underlying generation is solid enough to be
                    a feature, not a placeholder. */}

                {/* Notes */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
                    {t("Your notes", "Ваши заметки")}
                  </p>
                  <Textarea
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    onBlur={saveNote}
                    placeholder={t(
                      "Recommender shortlist, essay angles, fee plan…",
                      "Рекомендатели, идеи для эссе, план оплаты…",
                    )}
                    rows={5}
                    className="resize-none"
                  />
                </div>

                {/* Recommender tracking — most common reason a strong
                    application misses its deadline isn't ineligibility,
                    it's a recommender who agreed but never submitted.
                    Three-state per recommender (asked / agreed /
                    submitted), unlimited per scholarship. */}
                <RecommendersPanel
                  value={tracker.recommendersMap[openDetail.scholarship_id] ?? []}
                  onChange={(next) => tracker.setRecommenders(openDetail.scholarship_id, next.length > 0 ? next : null)}
                  language={language}
                  scholarshipName={cleanScholarshipName(openDetail.scholarship_name)}
                  applicationDeadline={openDetail.application_deadline}
                  studentName={studentName}
                />

                {/* Primary essay draft. Auto-saves through the
                    tracker hook; AI critique streams in a side
                    column on desktop. */}
                <EssayDraftPanel
                  scholarshipId={openDetail.scholarship_id}
                  scholarshipName={cleanScholarshipName(openDetail.scholarship_name)}
                  value={tracker.essayMap[openDetail.scholarship_id] || ""}
                  onChange={(next) => tracker.setEssayDraft(openDetail.scholarship_id, next || null)}
                  language={language}
                />

                {/* Additional essays — multi-essay support for
                    Schwarzman / Rhodes / Marshall / Fulbright-style
                    programs that require 2-3 distinct essays. Default
                    state is a single "Add another essay" button;
                    expanding it reveals per-essay slots with their
                    own title, prompt, target, draft, and AI critique. */}
                <AdditionalEssaysPanel
                  scholarshipId={openDetail.scholarship_id}
                  scholarshipName={cleanScholarshipName(openDetail.scholarship_name)}
                  value={tracker.additionalEssaysMap[openDetail.scholarship_id] ?? null}
                  onChange={(next) => tracker.setAdditionalEssays(openDetail.scholarship_id, next)}
                  language={language}
                />

                {/* Links — actions the user might take from this card.
                    "Ask the counselor" stashes a session prefill so when
                    they land on /topuni-ai the counselor tab opens with a
                    suggested question already in the chat input. */}
                <div className="space-y-2 pt-2 border-t border-border">
                  {openDetail.official_url && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-between">
                      <a href={openDetail.official_url} target="_blank" rel="noopener noreferrer">
                        {t("Open official site", "Официальный сайт")}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild className="w-full justify-between">
                    <Link to={`/scholarships/${openDetail.scholarship_id}`}>
                      {t("Open scholarship detail", "Открыть детали стипендии")}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="w-full justify-between"
                    onClick={() => {
                      try {
                        const cleanedName = cleanScholarshipName(openDetail.scholarship_name);
                        sessionStorage.setItem(
                          "topuni-counselor-prefill",
                          JSON.stringify({
                            scholarshipId: openDetail.scholarship_id,
                            scholarshipName: cleanedName,
                            question: isRu
                              ? `Помогите с подачей на ${cleanedName} — стратегия, документы, тайминг.`
                              : `Walk me through ${cleanedName} — strategy, documents, timing.`,
                            ts: Date.now(),
                          }),
                        );
                      } catch { /* ignore */ }
                    }}
                  >
                    <Link to={isRu ? "/topuni-ai/ru" : "/topuni-ai"}>
                      <span className="inline-flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        {t("Ask the AI counselor about this", "Спросить AI советника об этом")}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CalendarSubscribeDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        language={language}
      />

      {/* Award + celebrate prompt — fires when status flips to
          'accepted'. Two-step: (1) capture amount, (2) celebrate +
          surface the highest-trust referral moment in the entire
          product. Step 2 is the moat-shaped move — most members
          never reach this state, so the few who do are 10× more
          likely to refer at this moment than at any nudge later. */}
      <Dialog open={!!awardPromptId} onOpenChange={(o) => !o && skipAward()}>
        <DialogContent className="sm:max-w-md">
          {awardStep === "capture" ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg leading-tight">
                  {t("Congrats — what was the award?", "Поздравляем — на какую сумму?")}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {awardPromptScholarship ? cleanScholarshipName(awardPromptScholarship.scholarship_name) : ""}
                  <span className="block mt-2 text-muted-foreground">
                    {t(
                      "Logging the amount unlocks your personal 'won' total and helps future TopUni members see what's actually possible. Your name is never attached.",
                      "Сумма даёт вам личный итог «выиграно» и помогает будущим членам TopUni увидеть, что реально. Ваше имя никогда не привязывается.",
                    )}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <label className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
                  {t("Award amount (USD)", "Сумма (USD)")}
                </label>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder={t("e.g. 25000", "напр. 25000")}
                    value={awardDraft}
                    onChange={(e) => setAwardDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitAward(); }}
                    className="pl-7"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t(
                    "Just the headline number is fine — tuition + stipend + travel rolled together.",
                    "Достаточно общей суммы — обучение + стипендия + проезд вместе.",
                  )}
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" onClick={skipAward} className="text-muted-foreground">
                  {t("Skip", "Пропустить")}
                </Button>
                <Button variant="gold" onClick={submitAward} disabled={!awardDraft.trim()}>
                  {t("Save", "Сохранить")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* Celebrate step — single quiet moment. No confetti
                  cannon, no marketing pitch. Just real congratulations
                  + two genuine post-acceptance actions. */}
              <DialogHeader className="text-center">
                <div className="text-4xl mb-2" aria-hidden>🎉</div>
                <DialogTitle className="font-heading text-2xl leading-tight">
                  {t("That's huge.", "Это огромно.")}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-center">
                  {awardPromptScholarship
                    ? t(
                        `You won ${cleanScholarshipName(awardPromptScholarship.scholarship_name)}. That's the moment this whole platform exists for.`,
                        `Вы выиграли ${cleanScholarshipName(awardPromptScholarship.scholarship_name)}. Ради этого момента и существует платформа.`,
                      )
                    : t("That's the moment this whole platform exists for.", "Ради этого момента и существует платформа.")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-2 space-y-3">
                {/* Refer friend — highest-trust moment in the
                    product. A user who just won is 10× more likely
                    to vouch than a user we nudged via email. */}
                <Link
                  to="/refer"
                  onClick={closeAwardPrompt}
                  className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/[0.05] hover:bg-gold/[0.08] px-4 py-3.5 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-[14px] leading-tight">
                      {t("Tell a friend who's applying", "Расскажите другу, кто тоже подаёт")}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                      {t(
                        "You both get a free month — your win could be theirs too.",
                        "Оба получаете бесплатный месяц — ваш выигрыш может стать и их выигрышем.",
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gold-dark group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                {/* See your won total — pulls them into Workspace
                    Won stat which we just lit up. */}
                <Link
                  to={isRu ? "/pipeline/ru" : "/pipeline"}
                  onClick={closeAwardPrompt}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-card/80 px-4 py-3.5 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-[14px] leading-tight">
                      {t("See your full Won total", "Посмотреть весь «Выиграно»")}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                      {t(
                        "Stack of accepted scholarships, total awarded.",
                        "Стопка принятых стипендий, общая сумма.",
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" onClick={closeAwardPrompt} className="text-muted-foreground">
                  {t("Close", "Закрыть")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer language={isRu ? "ru" : "en"} />
    </div>
  );
};

export default Pipeline;

/* ─── Internals ─────────────────────────────────────────────────── */

const Stat = ({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "neutral" | "warn" | "good" }) => {
  const valueClass =
    tone === "warn" ? "text-amber-700 dark:text-amber-500" : tone === "good" ? "text-emerald-600" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{label}</p>
      <p className={`font-heading font-bold text-xl tabular-nums tracking-tight leading-none ${valueClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground/80 mt-1">{hint}</p>}
    </div>
  );
};

const Fact = ({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warn" | "danger" }) => {
  const valueClass =
    tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-700 dark:text-amber-500" : "text-foreground";
  return (
    <div className="bg-muted/40 border border-border rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-0.5">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
};

const PipelineCard = ({
  scholarship: s, status, isShortlisted, note, recommenders, hasEssay, isRu, onOpen, onStatusChange,
}: {
  scholarship: Scholarship;
  status: AppStatus | undefined;
  isShortlisted: boolean;
  note: string | undefined;
  recommenders: import("@/hooks/useApplicationTracker").Recommender[] | undefined;
  hasEssay: boolean;
  isRu: boolean;
  onOpen: () => void;
  onStatusChange: (s: AppStatus | null) => void;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const days = daysUntil(s.application_deadline);
  // Recommender progress + staleness signal. "Asked" >7d ago without
  // moving to "agreed" or "submitted" gets the amber dot — that's the
  // letter most likely to torpedo the application.
  const recCount = recommenders?.length ?? 0;
  const recSubmitted = recommenders?.filter((r) => r.status === "submitted").length ?? 0;
  const recStale = (() => {
    if (!recommenders || recommenders.length === 0) return false;
    const cutoff = Date.now() - 7 * 86400_000;
    return recommenders.some((r) => {
      if (r.status === "submitted") return false;
      if (!r.asked_at) return false;
      return new Date(r.asked_at).getTime() < cutoff;
    });
  })();
  const daysClass =
    days === null ? "text-muted-foreground" : days <= 0 ? "text-destructive" : days <= 7 ? "text-destructive" : days <= 30 ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground";
  const daysText =
    days === null
      ? s.application_deadline ? "Rolling" : t("Varies", "Варьируется")
      : days <= 0
        ? t("Closed", "Закрыто")
        : days === 1
          ? t("1 day", "1 день")
          : days <= 30
            ? `${days} ${t("days", "дн.")}`
            : `${Math.ceil(days / 30)} ${t("mo", "мес.")}`;
  const accent = accentForCountry(s.host_country);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-gold/40 hover:shadow-sm transition-all cursor-pointer"
      onClick={onOpen}
    >
      {/* Country gradient stripe — same regional identity as Discover
          cards so the user sees the same scholarship as the same
          object across surfaces. Landmark silhouette overlaid right. */}
      <div className={`relative h-7 bg-gradient-to-r ${accent} overflow-hidden`}>
        <CountryArt country={s.host_country} className="absolute right-1 inset-y-0 h-full opacity-35 pointer-events-none text-white" />
        <span className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative h-full flex items-center justify-between gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/95 whitespace-nowrap">
          <span className="truncate drop-shadow-sm">
            {s.host_country ? shortCountry(s.host_country) : "—"}
          </span>
          <span className={`tabular-nums shrink-0 px-1.5 py-0.5 rounded ${days !== null && days <= 7 ? "bg-destructive text-destructive-foreground" : days !== null && days <= 30 ? "bg-amber-500 text-amber-950" : "bg-white/15 text-white/95"}`}>
            {daysText}
          </span>
        </div>
      </div>

      <div className="p-3">
      {/* Lifecycle status banner — when a saved scholarship has closed,
          surface it explicitly. The user committed to tracking this row;
          they need to know it's no longer accepting applications without
          us silently letting them keep it on the active board. */}
      {(s.lifecycle_status === "closed_recent" || s.lifecycle_status === "closed_archived") && (
        <div className="-mt-1 mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.12em] bg-muted text-muted-foreground border border-border">
          {s.lifecycle_status === "closed_recent" ? "Recently closed" : "Closed"}
        </div>
      )}
      {s.lifecycle_status === "reopens_annually" && s.next_open_at && (
        <div className="-mt-1 mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.12em] bg-gold/10 text-gold-dark border border-gold/25">
          Reopens {new Date(s.next_open_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
        </div>
      )}
      <h4 className="font-heading font-semibold text-[14px] text-foreground line-clamp-2 leading-snug mb-1.5 group-hover:text-gold-dark transition-colors">
        {cleanScholarshipName(s.scholarship_name)}
      </h4>
      {note && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground mb-1.5">
          <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-gold-dark/70" />
          <p className="line-clamp-2 leading-snug">{note}</p>
        </div>
      )}
      {/* Application-readiness pills — surface the per-card blockers
          without making the student open every detail sheet. Recommender
          progress is the highest-stakes one (an unsigned letter blocks
          submission); essay-draft existence is a secondary signal. */}
      {(recCount > 0 || hasEssay) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {recCount > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                recSubmitted === recCount
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                  : recStale
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-1 ring-amber-500/30"
                    : "bg-muted text-muted-foreground"
              }`}
              aria-label={t(
                `${recSubmitted} of ${recCount} recommenders submitted`,
                `${recSubmitted} из ${recCount} рекомендателей подали`,
              )}
            >
              {recStale && recSubmitted < recCount && <span className="h-1 w-1 rounded-full bg-amber-500" />}
              {recSubmitted}/{recCount} {t("letters", "писем")}
            </span>
          )}
          {hasEssay && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-foreground/[0.05] text-muted-foreground">
              <FileText className="w-2.5 h-2.5" />
              {t("Essay", "Эссе")}
            </span>
          )}
        </div>
      )}
      {/* Inline status quick-cycle (skip for shortlisted-only column) */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {t("Set status", "Статус")} <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUS_OPTIONS.filter((o) => o.value !== "shortlisted").map((opt) => (
              <DropdownMenuItem key={String(opt.value)} onClick={() => onStatusChange(opt.value as AppStatus | null)}>
                {opt.label[isRu ? "ru" : "en"]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ language }: { language: "en" | "ru" }) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="h-16 w-16 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-5">
        <Inbox className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground tracking-tight mb-2">
        {t("Nothing tracked yet.", "Пока ничего не отслеживается.")}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {t(
          "Save a scholarship from Discover and it'll appear here. The pipeline is your control panel during application season.",
          "Сохраните стипендию в Discover, и она появится здесь. Воронка — ваш центр управления в сезон заявок.",
        )}
      </p>
      <Button variant="gold" asChild className="gap-2">
        <Link to={isRu ? "/discover/ru" : "/discover"}>
          <Search className="w-4 h-4" />
          {t("Find scholarships", "Найти стипендии")}
        </Link>
      </Button>
    </div>
  );
};
