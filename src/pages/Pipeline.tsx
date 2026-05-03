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
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ExternalLink, Clock, Check, X, Calendar,
  StickyNote, Loader2, Search, Inbox, ChevronDown,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useApplicationTracker, type AppStatus } from "@/hooks/useApplicationTracker";
import { useAuth } from "@/contexts/AuthContext";
import { ScholarshipChecklist } from "@/components/pipeline/ScholarshipChecklist";

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
}

const COLUMNS: { key: AppStatus | "shortlisted"; label: { en: string; ru: string }; tone: string; bar: string }[] = [
  { key: "shortlisted", label: { en: "Shortlisted",         ru: "Шорт-лист" },             tone: "text-muted-foreground",                            bar: "bg-muted-foreground/40" },
  { key: "researching", label: { en: "Researching",         ru: "Изучаю" },               tone: "text-muted-foreground",                            bar: "bg-muted-foreground/60" },
  { key: "drafting",    label: { en: "Drafting",            ru: "Готовлю заявку" },        tone: "text-amber-700 dark:text-amber-400",               bar: "bg-amber-500" },
  { key: "submitted",   label: { en: "Submitted",           ru: "Подал" },                 tone: "text-blue-700 dark:text-blue-400",                 bar: "bg-blue-500" },
  { key: "decision",    label: { en: "Awaiting decision",   ru: "Жду ответа" },            tone: "text-primary",                                     bar: "bg-primary" },
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
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000);
};

interface PipelineProps {
  language?: "en" | "ru";
}

const Pipeline = ({ language = "en" }: PipelineProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const tracker = useApplicationTracker();
  const { user } = useAuth();
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
          "application_deadline, deadline_type, official_url, data_source",
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
    const map: Record<string, Scholarship[]> = {
      shortlisted: [], researching: [], drafting: [], submitted: [], decision: [],
    };
    for (const r of rows) {
      const status = tracker.statusMap[r.scholarship_id] as AppStatus | undefined;
      if (status && status !== "rejected" && status !== "accepted") {
        if (status in map) map[status].push(r);
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
     non-rejected non-hidden tracked scholarships). */
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
    return {
      totalTracked: active.length,
      urgentCount: urgent.length,
      stackUsd,
      submitted,
      decisions,
      stackText: fmtMoney(stackUsd),
    };
  }, [rows, tracker.statusMap, tracker.hidden]);

  /* Detail sheet state */
  const [openDetail, setOpenDetail] = useState<Scholarship | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");

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
            {t("Application pipeline", "Воронка заявок")}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            {t("Your applications, in one place.", "Все ваши заявки в одном месте.")}
          </h1>
          <p className="text-primary-foreground/75 text-sm sm:text-base max-w-xl leading-relaxed">
            {t(
              user
                ? "Status, notes, and deadlines for every scholarship you save. Synced across devices."
                : "Track status and notes for every scholarship you save. Sign up to sync across devices.",
              user
                ? "Статус, заметки и дедлайны для каждой сохранённой стипендии. Синхронизация на устройствах."
                : "Отслеживайте статус и заметки. Зарегистрируйтесь для синхронизации на устройствах.",
            )}
          </p>
        </div>
      </section>

      {/* ─── Stats banner ─────────────────────────────────────────── */}
      <section className="border-b border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          </div>
        </div>
      </section>

      {/* ─── Pipeline columns ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {loading && trackedIds.length > 0 ? (
          <div className="py-20 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t("Loading your pipeline…", "Загружаем вашу воронку…")}</span>
          </div>
        ) : trackedIds.length === 0 ? (
          <EmptyState language={language} />
        ) : (
          // Mobile: horizontal scroll-snap of 5 columns (one stage per swipe).
          // Desktop (lg+): standard 5-col grid. Negative margins extend the
          // scroll area to the screen edge so card shadows aren't cropped.
          <div className="-mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 overflow-x-auto lg:overflow-visible snap-x snap-mandatory lg:snap-none">
            <div className="grid grid-flow-col auto-cols-[85vw] sm:auto-cols-[60vw] lg:grid-flow-row lg:grid-cols-5 lg:auto-cols-auto gap-4 pb-2 lg:pb-0">
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
                          isRu={isRu}
                          onOpen={() => setOpenDetail(s)}
                          onStatusChange={(status) => tracker.setStatus(s.scholarship_id, status)}
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
      </section>

      {/* Detail sheet */}
      <Sheet open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0 overflow-hidden">
          {openDetail && (
            <>
              <SheetHeader className="px-6 py-5 border-b border-border bg-card/30 shrink-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">
                  {openDetail.host_country || t("Multiple", "Множественно")}
                </p>
                <SheetTitle className="font-heading text-xl tracking-tight leading-snug">
                  {openDetail.scholarship_name}
                </SheetTitle>
                {openDetail.provider_name && (
                  <SheetDescription className="text-xs leading-relaxed">
                    {openDetail.provider_name}
                  </SheetDescription>
                )}
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
                  <Fact
                    label={t("Coverage", "Покрытие")}
                    value={
                      openDetail.coverage_type === "full_ride"
                        ? t("Full ride", "Полное")
                        : openDetail.coverage_type === "tuition_only"
                          ? t("Tuition only", "Только обучение")
                          : t("Stipend", "Стипендия")
                    }
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
                              tracker.setStatus(openDetail.scholarship_id, opt.value as AppStatus | null);
                            }
                          }}
                        >
                          {opt.label[isRu ? "ru" : "en"]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* AI-generated application checklist — universal per
                    scholarship (cached server-side), with per-user
                    completion state mirrored to localStorage and the
                    application_tracker row for authed users. */}
                <ScholarshipChecklist
                  scholarshipId={openDetail.scholarship_id}
                  language={language}
                />

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

                {/* Links */}
                <div className="space-y-2 pt-2 border-t border-border">
                  {openDetail.official_url && (
                    <Button variant="outline" size="sm" asChild className="w-full justify-between">
                      <a href={openDetail.official_url} target="_blank" rel="noopener noreferrer">
                        {t("Open official site", "Официальный сайт")}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild className="w-full justify-between">
                    <Link to={isRu ? "/discover/ru" : "/discover"}>
                      {t("View in Discover", "Открыть в Discover")}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
  scholarship: s, status, isShortlisted, note, isRu, onOpen, onStatusChange,
}: {
  scholarship: Scholarship;
  status: AppStatus | undefined;
  isShortlisted: boolean;
  note: string | undefined;
  isRu: boolean;
  onOpen: () => void;
  onStatusChange: (s: AppStatus | null) => void;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const days = daysUntil(s.application_deadline);
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group bg-card border border-border rounded-xl p-3 hover:border-gold/40 hover:shadow-sm transition-all cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate font-semibold">
          {s.host_country || "—"}
        </p>
        <span className={`text-[10px] tabular-nums font-semibold shrink-0 ${daysClass}`}>{daysText}</span>
      </div>
      <h4 className="font-heading font-semibold text-[14px] text-foreground line-clamp-2 leading-snug mb-1.5 group-hover:text-gold-dark transition-colors">
        {s.scholarship_name}
      </h4>
      {note && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground mb-1.5">
          <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-gold-dark/70" />
          <p className="line-clamp-2 leading-snug">{note}</p>
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
