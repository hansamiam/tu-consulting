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
  ArrowLeft, ArrowRight, ExternalLink, Calendar,
  StickyNote, Loader2, Search, Inbox, ChevronDown, Bot, KanbanSquare, FileText, PenLine,
  ChevronLeft, ChevronRight,
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
import { CountryArt } from "@/lib/countryArt";
import { accentForCountry, shortCountry } from "@/lib/countryAccent";
import { cleanScholarshipName, cleanProvider } from "@/lib/scholarshipFields";
import { daysUntil } from "@/lib/dates";
import { toast } from "sonner";
import { CalendarSubscribeDialog } from "@/components/pipeline/CalendarSubscribeDialog";
import { EssayDraftPanel } from "@/components/pipeline/EssayDraftPanel";
import { AdditionalEssaysPanel } from "@/components/pipeline/AdditionalEssaysPanel";
import { RecommendersPanel } from "@/components/pipeline/RecommendersPanel";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";
// Round-41: UpcomingDeadlines, EssaysTab, SavedAlertsSection,
// ActivityFeedSection, UpgradeChip, InstaFollowChip imports retired
// — Workspace stripped down to a focus-mode 2-pane (sorter + drafter).
// Components still live in the codebase for re-use elsewhere.

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
  { value: "shortlisted", label: { en: "Saved only",         ru: "Только сохранённые" } },
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

  // Stable string key for the trackedIds set so the effect doesn't
  // re-fire on every render. Computed in render (cheap) rather than
  // dropped into the dep array directly — that previous pattern
  // tripped exhaustive-deps because the array literal expression
  // wasn't statically checkable.
  const trackedKey = trackedIds.join(",");
  useEffect(() => {
    if (trackedIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
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
      if (error) {
        // Don't blow away `rows` — keep whatever we already had so the
        // user's board doesn't suddenly empty out on a transient
        // network blip. Surface the failure as a toast so the user
        // knows to retry.
        toast.error(language === "ru"
          ? "Не удалось загрузить ваш pipeline. Проверьте соединение."
          : "Couldn't refresh your pipeline. Check your connection.");
        setLoading(false);
        return;
      }
      setRows((data as Scholarship[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedKey]);

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
      // Include today (d === 0) — a same-day deadline is the *most*
      // urgent kind. Excluding it (the previous `d > 0` bound) hid
      // exactly the row the banner was supposed to surface.
      return d !== null && d >= 0 && d <= 30;
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
   * `?view=list|calendar` is supported as a deep-link hint — the URL is
   * no longer the source of truth for tabs (those are gone), but the
   * boardView preference does deserve to survive a refresh. Adds a
   * calendar option 2026-05-10 — minimal addition, expands the main
   * canvas into a month grid when active so the writing surface stays
   * untouched on Stage / Deadline. */
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const boardView: "category" | "list" | "calendar" =
    viewParam === "list" ? "list" :
    viewParam === "calendar" ? "calendar" :
    "category";
  const setBoardView = (next: "category" | "list" | "calendar") => {
    const params = new URLSearchParams(searchParams);
    if (next === "category") params.delete("view"); else params.set("view", next);
    setSearchParams(params, { replace: true });
  };

  /* Detail sheet state */
  const [openDetail, setOpenDetail] = useState<Scholarship | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  /* Round-41: workspace pivot to a focus-mode writing surface. The page
   * is now a 2-pane layout — a scholarship sorter on the left, an
   * A4-feeling essay canvas on the right. selectedId tracks which
   * scholarship's draft is open in the canvas. Defaults to the
   * deadline-soonest tracked row so users land in working state, not
   * an empty paper. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedId && rows.some(r => r.scholarship_id === selectedId)) return;
    if (rows.length === 0) { setSelectedId(null); return; }
    const sorted = [...rows].sort((a, b) => {
      const ad = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    setSelectedId(sorted[0]?.scholarship_id ?? null);
  }, [rows, selectedId]);
  const selectedScholarship = useMemo(
    () => rows.find(r => r.scholarship_id === selectedId) ?? null,
    [rows, selectedId],
  );

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

  // Sync the note-draft from the tracker ONLY when the detail sheet
  // opens for a different scholarship. Previously this also ran on
  // every tracker.notesMap change — and notesMap is a fresh Map ref
  // on every state mutation (saving an essay draft, toggling a
  // shortlist, anything). So a user editing notes for scholarship A
  // while ANY other tracker change fired would have their in-progress
  // typing overwritten with the last-persisted DB value.
  useEffect(() => {
    if (openDetail) setDraftNote(tracker.notesMap[openDetail.scholarship_id] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetail?.scholarship_id]);

  const saveNote = () => {
    if (!openDetail) return;
    tracker.setNote(openDetail.scholarship_id, draftNote);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      {/* ─── Slim header strip ─────────────────────────────────────────
           Round-41: replaced the giant navy hero + 5-stat banner. The
           Workspace surface should feel like a writing tool, not a
           marketing page. A single low-key strip is enough to root the
           user — back-link to Discover, page title, account/calendar
           controls. The work itself happens below. */}
      <section className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3.5 flex items-center gap-3">
          <Link
            to={isRu ? "/discover/ru" : "/discover"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-foreground/[0.04]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("Discover", "Discover")}</span>
          </Link>
          <span className="hidden sm:block self-stretch w-px bg-border/60 my-1" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark dark:text-gold-light">
            {t("TopUni", "TopUni")}
          </p>
          <h1 className="font-heading text-base sm:text-lg font-bold text-foreground tracking-tight leading-none -ml-1.5">
            {t("Workspace", "Рабочая зона")}
          </h1>
          <div className="flex-1" />
          {user && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 text-xs hidden sm:inline-flex"
                onClick={() => setCalendarOpen(true)}
              >
                <Calendar className="h-3.5 w-3.5" />
                {t("Calendar sync", "Календарь")}
              </Button>
              <Link
                to={isRu ? "/account/ru" : "/account"}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
              >
                {t("Account", "Аккаунт")}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Stats banner removed (round 41) — Workspace is a focus surface
          for writing, not a dashboard. Counts that mattered (urgent
          deadlines) surface inline in the sidebar list. */}
      {/* ─── Workspace body — focus mode ─────────────────────────────
           Round-41 redesign: 2-pane layout with the application sorter
           on the left and an A4-feeling essay canvas on the right.
           Strips out stats, calendar block, saved-alerts block, essays
           grid, upgrade chip, and the kanban-as-main treatment. The
           writing surface is the workspace; everything else is
           reachable via the row's Open-details affordance. */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {trackedIds.length === 0 ? (
          <EmptyState language={language} />
        ) : loading ? (
          <div className="py-20 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t("Loading your applications…", "Загружаем заявки…")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-5 lg:gap-6">
            {/* Sidebar: scholarship sorter with view toggle. */}
            <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-3.5">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("Applications", "Заявки")}
                </p>
                <span className="text-[10px] tabular-nums text-muted-foreground/70">{rows.length}</span>
              </div>

              <div className="inline-flex items-center w-full rounded-md border border-border bg-card overflow-hidden mb-3">
                <button
                  type="button"
                  onClick={() => setBoardView("category")}
                  className={`flex-1 h-7 text-[11px] font-medium transition-colors ${
                    boardView === "category"
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("Stage", "Этап")}
                </button>
                <button
                  type="button"
                  onClick={() => setBoardView("list")}
                  className={`flex-1 h-7 text-[11px] font-medium transition-colors ${
                    boardView === "list"
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("Deadline", "Дедлайн")}
                </button>
                <button
                  type="button"
                  onClick={() => setBoardView("calendar")}
                  className={`flex-1 h-7 text-[11px] font-medium transition-colors ${
                    boardView === "calendar"
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("Calendar", "Календарь")}
                </button>
              </div>

              {boardView === "category" ? (
                <div className="space-y-3.5">
                  {COLUMNS.map((col) => {
                    const items = buckets[col.key] || [];
                    if (items.length === 0) return null;
                    return (
                      <div key={col.key} className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1 w-4 rounded-full ${col.bar}`} />
                            <p className={`text-[9px] uppercase tracking-[0.18em] font-semibold ${col.tone}`}>
                              {col.label[isRu ? "ru" : "en"]}
                            </p>
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground/70">{items.length}</span>
                        </div>
                        <div className="space-y-1">
                          {items.map((s) => (
                            <SidebarRow
                              key={s.scholarship_id}
                              scholarship={s}
                              isSelected={s.scholarship_id === selectedId}
                              hasEssay={!!tracker.essayMap[s.scholarship_id]}
                              onSelect={() => setSelectedId(s.scholarship_id)}
                              isRu={isRu}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {[...rows]
                    .sort((a, b) => {
                      const ad = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.POSITIVE_INFINITY;
                      const bd = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.POSITIVE_INFINITY;
                      return ad - bd;
                    })
                    .map((s) => (
                      <SidebarRow
                        key={s.scholarship_id}
                        scholarship={s}
                        isSelected={s.scholarship_id === selectedId}
                        hasEssay={!!tracker.essayMap[s.scholarship_id]}
                        onSelect={() => setSelectedId(s.scholarship_id)}
                        isRu={isRu}
                      />
                    ))}
                </div>
              )}
            </aside>

            {/* Main canvas: A4 essay drafter, OR a deadline calendar
                when the calendar view is active. The calendar replaces
                the writing surface so it has room to breathe — minimal
                addition, sleek treatment, returns to drafting on click. */}
            <main className="min-w-0">
              {boardView === "calendar" ? (
                <DeadlineCalendar
                  rows={rows}
                  language={language}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setBoardView("list");
                  }}
                />
              ) : selectedScholarship ? (
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <header className="px-6 py-4 border-b border-border bg-muted/20 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark dark:text-gold-light mb-0.5">
                        {t("Drafting", "Черновик")}
                      </p>
                      <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight">
                        {cleanScholarshipName(selectedScholarship.scholarship_name)}
                      </h2>
                      {(() => {
                        const cp = cleanProvider(selectedScholarship.provider_name);
                        return cp ? (
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{cp}</p>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setOpenDetail(selectedScholarship)}
                      >
                        {t("Details", "Детали")}
                      </Button>
                      {selectedScholarship.official_url && (
                        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                          <a href={selectedScholarship.official_url} target="_blank" rel="noopener noreferrer">
                            {t("Apply", "Подать")}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </header>
                  <div className="px-4 sm:px-6 py-5 sm:py-6 max-w-[816px] mx-auto">
                    <EssayDraftPanel
                      scholarshipId={selectedScholarship.scholarship_id}
                      scholarshipName={cleanScholarshipName(selectedScholarship.scholarship_name)}
                      value={tracker.essayMap[selectedScholarship.scholarship_id] || ""}
                      onChange={(next) => tracker.setEssayDraft(selectedScholarship.scholarship_id, next || null)}
                      language={language}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border shadow-sm p-10 sm:p-14 text-center">
                  <PenLine className="h-9 w-9 text-muted-foreground/40 mx-auto mb-4" />
                  <h2 className="font-heading text-lg font-semibold tracking-tight mb-2">
                    {t("Pick a scholarship to draft", "Выберите стипендию для черновика")}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {t(
                      "Tap any saved scholarship in the sidebar to open its draft canvas.",
                      "Нажмите на любую сохранённую стипендию в боковой панели, чтобы открыть холст для эссе.",
                    )}
                  </p>
                </div>
              )}
            </main>
          </div>
        )}
      </section>



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
                              ? t("Saved only", "Только сохранённые")
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
                  {/* AI Counselor entry hidden 2026-05-09 (token-cost / low usage).
                      Code path retained for re-enable. */}
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

/* DeadlineCalendar — month-grid view of tracked scholarship deadlines.
   Each day with one or more deadlines renders a small chip per deadline
   showing the program's first 2 letters. Clicking the chip jumps to
   that scholarship's draft canvas. Lightweight (no calendar lib) so
   bundle stays clean and the visual matches the rest of the workspace.

   Design choice: month-paged (← previous / → next / Today). One month
   on screen at a time keeps the chips readable. Cap each cell to 3
   visible chips with a "+N" overflow so a deadline-heavy day doesn't
   blow up the row height. */
const DeadlineCalendar = ({
  rows, language, selectedId, onSelect,
}: {
  rows: { scholarship_id: string; scholarship_name: string; provider_name: string | null; application_deadline: string | null; deadline_type: string | null }[];
  language: "en" | "ru";
  selectedId: string | null;
  onSelect: (scholarshipId: string) => void;
}) => {
  const isRu = language === "ru";
  const t = (en: string, r: string) => (isRu ? r : en);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  // Group dated rows by ISO date (YYYY-MM-DD) for quick day-cell lookup.
  // Rows with no application_deadline are ignored — they belong in the
  // "Undated" list below the grid so the user can still see them.
  const byDay = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!r.application_deadline) continue;
      const key = r.application_deadline.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [rows]);

  const undated = useMemo(() => rows.filter(r => !r.application_deadline), [rows]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleString(
    isRu ? "ru-RU" : "en-US",
    { month: "long", year: "numeric" },
  );

  // First day of week for the rendered month (0 = Sunday). We render a
  // 6-row × 7-col grid starting from the Sunday on or before day 1, so
  // months always span 42 cells regardless of how they line up.
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const initials = (name: string) => {
    const cleaned = name.replace(/^(the\s+)/i, "").trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  };

  const dayHeaders = isRu
    ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goPrev = () => {
    setCursor(c => {
      const m = c.month - 1;
      return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
    });
  };
  const goNext = () => {
    setCursor(c => {
      const m = c.month + 1;
      return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
    });
  };
  const goToday = () => {
    const today = new Date();
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <header className="px-5 py-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark dark:text-gold-light mb-0.5">
            {t("Deadlines", "Дедлайны")}
          </p>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight capitalize">
            {monthLabel}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={goPrev} aria-label={t("Previous month", "Предыдущий месяц")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToday}>
            {t("Today", "Сегодня")}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={goNext} aria-label={t("Next month", "Следующий месяц")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-3">
        {/* Day-of-week header row */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {dayHeaders.map((d) => (
            <div key={d} className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 text-center py-1">
              {d}
            </div>
          ))}
        </div>

        {/* 6×7 month grid */}
        <div className="grid grid-cols-7 gap-px bg-border/60 rounded-lg overflow-hidden border border-border/60">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.month;
            const key = dayKey(d);
            const isToday = key === todayKey;
            const items = byDay.get(key) ?? [];
            return (
              <div
                key={i}
                className={`min-h-[78px] sm:min-h-[92px] bg-card p-1.5 flex flex-col gap-1 ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] tabular-nums font-semibold ${
                    isToday
                      ? "text-gold-dark"
                      : inMonth ? "text-foreground/80" : "text-muted-foreground"
                  }`}>
                    {d.getDate()}
                  </span>
                  {isToday && <span className="h-1 w-1 rounded-full bg-gold-dark" />}
                </div>
                {items.slice(0, 3).map((r) => {
                  const isSel = r.scholarship_id === selectedId;
                  const daysLeft = daysUntil(r.application_deadline);
                  const tone = daysLeft === null
                    ? "bg-muted text-foreground/70"
                    : daysLeft <= 0
                      ? "bg-muted/50 text-muted-foreground/60 line-through"
                      : daysLeft <= 7
                        ? "bg-destructive/15 text-destructive"
                        : daysLeft <= 30
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-gold/10 text-gold-dark dark:text-gold-light";
                  return (
                    <button
                      key={r.scholarship_id}
                      type="button"
                      onClick={() => onSelect(r.scholarship_id)}
                      title={cleanScholarshipName(r.scholarship_name)}
                      className={`w-full text-left text-[10px] font-semibold rounded px-1.5 py-0.5 leading-tight tracking-tight truncate transition-colors hover:brightness-110 ${tone} ${
                        isSel ? "ring-1 ring-gold-dark" : ""
                      }`}
                    >
                      {initials(r.scholarship_name)} · {cleanScholarshipName(r.scholarship_name).slice(0, 14)}
                    </button>
                  );
                })}
                {items.length > 3 && (
                  <span className="text-[9px] text-muted-foreground/70 px-1">
                    +{items.length - 3} {t("more", "ещё")}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Undated list — surfaces tracked rows without an application_deadline
            so they don't disappear when the user is in calendar mode.
            Compact, single-line per row. */}
        {undated.length > 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {t("Undated · varies / rolling", "Без даты · варьируется / rolling")}
              <span className="ml-1.5 text-muted-foreground/60 tabular-nums">({undated.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {undated.map((r) => (
                <button
                  key={r.scholarship_id}
                  type="button"
                  onClick={() => onSelect(r.scholarship_id)}
                  className={`text-[11px] px-2 py-1 rounded-md border bg-card hover:border-gold/40 transition-colors ${
                    r.scholarship_id === selectedId ? "border-gold-dark text-gold-dark" : "border-border text-foreground/80"
                  }`}
                >
                  {cleanScholarshipName(r.scholarship_name).slice(0, 28)}
                  {cleanScholarshipName(r.scholarship_name).length > 28 && "…"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* SidebarRow — compact list-row for the sorter pane. Selected state
   is the high-signal cue (gold left border + tinted background); the
   row also carries an in-line deadline urgency dot and an essay-started
   marker so users can see writing progress at a glance. */
const SidebarRow = ({
  scholarship: s, isSelected, hasEssay, onSelect, isRu,
}: {
  scholarship: Scholarship;
  isSelected: boolean;
  hasEssay: boolean;
  onSelect: () => void;
  isRu: boolean;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const days = daysUntil(s.application_deadline);
  const urgency =
    days === null ? "neutral"
    : days < 0 ? "closed"
    : days <= 7 ? "red"
    : days <= 30 ? "amber"
    : "neutral";
  const dotCls =
    urgency === "red" ? "bg-destructive"
    : urgency === "amber" ? "bg-amber-500"
    : urgency === "closed" ? "bg-muted-foreground/40"
    : "bg-emerald-500/60";
  const daysLabel =
    days === null
      ? (s.application_deadline ? "Rolling" : t("Varies", "Варьируется"))
      : days < 0 ? t("Closed", "Закрыто")
      : days === 0 ? t("Today", "Сегодня")
      : days === 1 ? t("1d", "1д")
      : days <= 90 ? `${days}d`
      : `${Math.ceil(days / 30)}mo`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-md px-2.5 py-2 transition-colors flex items-start gap-2 group ${
        isSelected
          ? "bg-gold/[0.12] border border-gold/45 shadow-sm"
          : "border border-transparent hover:bg-foreground/[0.04]"
      }`}
    >
      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] leading-snug font-medium tracking-tight line-clamp-2 ${
          isSelected ? "text-foreground" : "text-foreground/85"
        }`}>
          {cleanScholarshipName(s.scholarship_name)}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
          <span className="tabular-nums">{daysLabel}</span>
          {s.host_country && (
            <>
              <span className="opacity-50">·</span>
              <span className="truncate">{s.host_country}</span>
            </>
          )}
          {hasEssay && (
            <>
              <span className="opacity-50">·</span>
              <PenLine className="h-2.5 w-2.5 text-gold-dark" aria-label="Draft started" />
            </>
          )}
        </div>
      </div>
    </button>
  );
};

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
        {/* Silhouette is bounded so it never covers the days-chip on
            the right. Earlier the unbounded h-full image could span the
            full width on narrow cards and partially clip the deadline
            countdown — same class of bug as the Discover ScholarCard
            "+1" overflow (615cd5c). */}
        <CountryArt country={s.host_country} className="absolute right-1 inset-y-0 h-full max-w-[28%] opacity-35 pointer-events-none text-white" />
        <span className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative h-full flex items-center justify-between gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/95 whitespace-nowrap">
          <span className="truncate drop-shadow-sm min-w-0">
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
