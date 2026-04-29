import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { BetaBanner } from "@/components/BetaBanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search, LayoutList, LayoutGrid, Calendar, ExternalLink,
  Bookmark, BookmarkCheck, AlertTriangle, CheckCircle2,
  XCircle, Clock, Award, Lightbulb, ArrowRight, X, Sparkles,
  SlidersHorizontal, Zap, TrendingUp, GraduationCap, DollarSign,
  Target, Filter, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { DiscoverProfileGate, getStoredProfile, type DiscoverProfile } from "@/components/discover/DiscoverProfileGate";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Scholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  official_url: string | null;
  host_country: string | null;
  eligible_countries: string[] | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  coverage_type: string;
  min_gpa: number | null;
  gpa_scale: number | null;
  min_ielts: number | null;
  min_toefl: number | null;
  min_sat: number | null;
  citizenship_requirements: string | null;
  application_deadline: string | null;
  deadline_type: string | null;
  required_documents: string[] | null;
  essay_required: boolean | null;
  recommendation_letters_required: number | null;
  interview_required: boolean | null;
  separate_application_required: boolean | null;
  selectivity_level: string | null;
  effort_level: string | null;
  effort_reason: string | null;
  ideal_candidate_profile: string | null;
  common_rejection_reasons: string | null;
  strategy_notes: string | null;
  best_for_tags: string[] | null;
  why_this_fits: string | null;
  how_to_win: string | null;
  what_to_prepare_first: string | null;
  next_step: string | null;
  risk_note: string | null;
}

interface Profile {
  country: string;
  degree: string;
  gpa: string;
  gpaScale: string;
  ielts: string;
  sat: string;
  field: string;
  budget: string;
}

const DEFAULT_PROFILE: Profile = { country: "", degree: "undergraduate", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" };

interface Scored extends Scholarship {
  match: number;
  eligibility: "eligible" | "likely" | "missing" | "not_eligible";
  priority: "strong_match" | "competitive" | "low_priority";
  reward: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  reasons: string[];
}

type View = "list" | "cards" | "deadline";
type SortBy = "match" | "deadline" | "value" | "effort";

interface Filters {
  search: string;
  coverage: string;
  degree: string;
  effort: string;
  onlyEligible: boolean;
  closingSoon: boolean;
  onlyShortlisted: boolean;
}

const DEFAULT_FILTERS: Filters = { search: "", coverage: "all", degree: "all", effort: "all", onlyEligible: false, closingSoon: false, onlyShortlisted: false };

/* ─── Scoring ────────────────────────────────────────────────────────── */
const normalizeGpa = (gpa: number, scale: number): number => {
  if (!gpa || !scale) return 0;
  if (scale <= 5.5) return (gpa / scale) * 4.0;
  return (gpa / 100) * 4.0;
};

const score = (s: Scholarship, p: Profile): Scored => {
  const reasons: string[] = [];
  let match = 50;
  let eligibility: Scored["eligibility"] = "likely";

  if (s.eligible_countries && p.country) {
    const list = s.eligible_countries.map(c => c.toLowerCase());
    const allCountries = list.some(c => c.includes("all countries"));
    const matched = allCountries || list.some(c => c.includes(p.country.toLowerCase()));
    if (matched) { match += 15; reasons.push(`Open to ${p.country}`); }
    else { eligibility = "not_eligible"; match -= 40; reasons.push(`Not open to ${p.country}`); }
  }
  if (s.target_degree_level && p.degree) {
    if (s.target_degree_level.includes(p.degree)) { match += 10; reasons.push(`Matches ${p.degree} level`); }
    else { eligibility = "not_eligible"; match -= 25; }
  }
  if (s.min_gpa && p.gpa) {
    const userGpa4 = normalizeGpa(parseFloat(p.gpa), parseFloat(p.gpaScale));
    const reqGpa4 = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
    if (userGpa4 >= reqGpa4) { match += 15; reasons.push(`GPA above the ${s.min_gpa}/${s.gpa_scale ?? 4.0} threshold`); }
    else if (userGpa4 >= reqGpa4 - 0.3) { match += 5; reasons.push("GPA borderline"); if (eligibility !== "not_eligible") eligibility = "missing"; }
    else { match -= 20; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`Below GPA min (${s.min_gpa})`); }
  }
  if (s.min_ielts && p.ielts) {
    const u = parseFloat(p.ielts);
    if (u >= s.min_ielts) { match += 8; reasons.push(`IELTS meets ${s.min_ielts}`); }
    else { match -= 10; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`IELTS below ${s.min_ielts}`); }
  }
  if (s.min_sat && p.sat) {
    const u = parseInt(p.sat);
    if (u >= s.min_sat) { match += 8; reasons.push(`SAT meets ${s.min_sat}`); }
    else { match -= 8; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`SAT below ${s.min_sat}`); }
  }

  const value = s.estimated_total_value_usd ?? 0;
  const reward: Scored["reward"] = value >= 80000 ? "high" : value >= 25000 ? "medium" : "low";
  if (s.coverage_type === "full_ride") match += 12;
  if (p.budget === "low" && reward === "high") { match += 6; reasons.push("High financial value for your budget"); }

  const effort: Scored["effort"] = (s.effort_level as Scored["effort"]) ?? "medium";

  if (s.application_deadline) {
    const days = Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000);
    if (days > 0 && days < 60) { match += 5; reasons.push(`Deadline in ${days} days`); }
    if (days > 0 && days < 14) { match += 3; }
  }

  if (eligibility === "likely" && match >= 70) eligibility = "eligible";
  match = Math.max(0, Math.min(100, Math.round(match)));
  const priority: Scored["priority"] =
    eligibility === "not_eligible" ? "low_priority" :
    match >= 75 ? "strong_match" :
    match >= 55 ? "competitive" : "low_priority";

  return { ...s, match, eligibility, priority, reward, effort, reasons };
};

/* ─── Style helpers ──────────────────────────────────────────────────── */
const MATCH_COLOR = (match: number) =>
  match >= 75 ? "text-emerald-600 dark:text-emerald-400" :
  match >= 55 ? "text-amber-600 dark:text-amber-400" :
  "text-muted-foreground";

const MATCH_BAR_COLOR = (match: number) =>
  match >= 75 ? "bg-emerald-500" :
  match >= 55 ? "bg-amber-500" :
  "bg-muted-foreground/30";

const ELIG_META: Record<Scored["eligibility"], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  eligible:     { label: "Eligible",          icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400" },
  likely:       { label: "Likely eligible",   icon: CheckCircle2, cls: "text-emerald-600/70 dark:text-emerald-400/70" },
  missing:      { label: "Missing req.",      icon: AlertTriangle, cls: "text-amber-600 dark:text-amber-400" },
  not_eligible: { label: "Not eligible",     icon: XCircle,       cls: "text-destructive" },
};

const COVERAGE_LABEL: Record<string, string> = {
  full_ride:    "Full ride",
  tuition_only: "Tuition",
  stipend:      "Stipend",
};

const EFFORT_META: Record<string, { label: string; cls: string }> = {
  low:    { label: "Easy apply",  cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  medium: { label: "Medium",      cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  high:   { label: "Competitive", cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
};

/* ─── Filters Panel ──────────────────────────────────────────────────── */
const FiltersPanel = ({ filters, setFilters, activeCount }: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  activeCount: number;
}) => (
  <div className="space-y-5">
    {/* Coverage */}
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Coverage</p>
      <div className="space-y-0.5">
        {[{ v: "all", l: "All types" }, { v: "full_ride", l: "Full ride" }, { v: "tuition_only", l: "Tuition only" }, { v: "stipend", l: "Stipend" }].map(o => (
          <button key={o.v} onClick={() => setFilters(f => ({ ...f, coverage: o.v }))}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${filters.coverage === o.v ? "bg-accent/15 text-accent font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
            {o.l}
          </button>
        ))}
      </div>
    </div>

    <Separator />

    {/* Degree */}
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Degree level</p>
      <div className="space-y-0.5">
        {[{ v: "all", l: "All levels" }, { v: "undergraduate", l: "Bachelor's" }, { v: "master's", l: "Master's" }, { v: "PhD", l: "PhD" }].map(o => (
          <button key={o.v} onClick={() => setFilters(f => ({ ...f, degree: o.v }))}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${filters.degree === o.v ? "bg-accent/15 text-accent font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
            {o.l}
          </button>
        ))}
      </div>
    </div>

    <Separator />

    {/* Effort */}
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Application effort</p>
      <div className="space-y-0.5">
        {[{ v: "all", l: "Any effort" }, { v: "low", l: "Low — quick to apply" }, { v: "medium", l: "Medium" }, { v: "high", l: "High / competitive" }].map(o => (
          <button key={o.v} onClick={() => setFilters(f => ({ ...f, effort: o.v }))}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${filters.effort === o.v ? "bg-accent/15 text-accent font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
            {o.l}
          </button>
        ))}
      </div>
    </div>

    <Separator />

    {/* Toggles */}
    <div className="space-y-3">
      {([
        { id: "oe", label: "Eligible / likely only", key: "onlyEligible" as keyof Filters },
        { id: "cs", label: "Closing within 90 days", key: "closingSoon" as keyof Filters },
        { id: "sl", label: "My shortlist only",      key: "onlyShortlisted" as keyof Filters },
      ] as const).map(t => (
        <div key={t.id} className="flex items-center justify-between">
          <Label htmlFor={t.id} className="text-sm cursor-pointer text-foreground/80">{t.label}</Label>
          <Switch id={t.id} checked={filters[t.key] as boolean} onCheckedChange={v => setFilters(f => ({ ...f, [t.key]: v }))} />
        </div>
      ))}
    </div>

    {activeCount > 0 && (
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setFilters(DEFAULT_FILTERS)}>
        <X className="h-3 w-3 mr-1" /> Clear all ({activeCount})
      </Button>
    )}
  </div>
);

/* ─── Scholarship Row (list view) ────────────────────────────────────── */
const ScholarshipRow = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored;
  onSelect: () => void;
  isBookmarked: boolean;
  onBookmark: (e: React.MouseEvent) => void;
}) => {
  const EligIcon = ELIG_META[s.eligibility].icon;
  const days = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/40 cursor-pointer transition-colors ${s.priority === "strong_match" ? "border-l-2 border-l-emerald-500" : s.priority === "competitive" ? "border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent"}`}
      onClick={onSelect}
    >
      {/* Eligibility dot */}
      <EligIcon className={`h-4 w-4 shrink-0 ${ELIG_META[s.eligibility].cls}`} />

      {/* Match % */}
      <div className="w-10 shrink-0 text-right">
        <span className={`text-sm font-bold tabular-nums ${MATCH_COLOR(s.match)}`}>{s.match}</span>
        <span className="text-[10px] text-muted-foreground">%</span>
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{s.scholarship_name}</p>
        <p className="text-xs text-muted-foreground truncate">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
      </div>

      {/* Badges — hidden on small screens */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {s.coverage_type && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-border">
            {COVERAGE_LABEL[s.coverage_type] || s.coverage_type}
          </Badge>
        )}
        {s.estimated_total_value_usd ? (
          <span className="text-xs text-muted-foreground font-medium w-16 text-right">
            {s.estimated_total_value_usd >= 1000 ? `$${Math.round(s.estimated_total_value_usd / 1000)}K` : `$${s.estimated_total_value_usd}`}
          </span>
        ) : <span className="w-16" />}
        <span className={`text-xs w-20 text-right tabular-nums ${days !== null && days > 0 && days <= 30 ? "text-red-600 dark:text-red-400 font-semibold" : days !== null && days <= 90 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
          {days === null ? "Rolling" : days <= 0 ? "Closed" : `${days}d left`}
        </span>
      </div>

      {/* Bookmark */}
      <button
        onClick={onBookmark}
        className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
        title={isBookmarked ? "Remove from shortlist" : "Add to shortlist"}
      >
        {isBookmarked
          ? <BookmarkCheck className="h-4 w-4 text-accent" />
          : <Bookmark className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
      </button>

      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 hidden sm:block" />
    </motion.div>
  );
};

/* ─── Scholarship Card (cards view) ──────────────────────────────────── */
const ScholarshipCard = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored;
  onSelect: () => void;
  isBookmarked: boolean;
  onBookmark: (e: React.MouseEvent) => void;
}) => {
  const EligIcon = ELIG_META[s.eligibility].icon;
  const days = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null;
  const effort = EFFORT_META[s.effort] ?? EFFORT_META.medium;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card hover:border-accent/40 hover:shadow-sm transition-all flex flex-col cursor-pointer"
      onClick={onSelect}
    >
      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-sm leading-snug text-foreground">{s.scholarship_name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-2xl font-bold tabular-nums leading-none ${MATCH_COLOR(s.match)}`}>{s.match}</span>
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">match</span>
          </div>
        </div>

        {/* Match bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${MATCH_BAR_COLOR(s.match)}`} style={{ width: `${s.match}%` }} />
        </div>

        {/* Eligibility */}
        <div className="flex items-center gap-1.5">
          <EligIcon className={`h-3.5 w-3.5 ${ELIG_META[s.eligibility].cls}`} />
          <span className={`text-xs font-medium ${ELIG_META[s.eligibility].cls}`}>{ELIG_META[s.eligibility].label}</span>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Award className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="truncate">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</span>
          </div>
          <div className={`flex items-center gap-1.5 ${days !== null && days > 0 && days <= 30 ? "text-red-600 dark:text-red-400 font-semibold" : days !== null && days <= 90 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{days === null ? "Rolling" : days <= 0 ? "Closed" : `${days}d left`}</span>
          </div>
        </div>

        {/* Why this fits */}
        {s.why_this_fits && (
          <div className="bg-accent/5 border border-accent/15 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-accent font-semibold mb-1 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Why it fits
            </p>
            <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-3">{s.why_this_fits}</p>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{COVERAGE_LABEL[s.coverage_type] || s.coverage_type}</Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${effort.cls}`}>{effort.label}</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={e => { e.stopPropagation(); onSelect(); }}>
          Details <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
        <button onClick={onBookmark} className="p-2 rounded-md border border-border hover:bg-muted transition-colors">
          {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
        </button>
        {s.official_url && (
          <Button size="sm" asChild className="text-xs" onClick={e => e.stopPropagation()}>
            <a href={s.official_url} target="_blank" rel="noopener noreferrer">
              Apply <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Detail Sheet ───────────────────────────────────────────────────── */
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark }: {
  s: Scored | null;
  open: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  onBookmark: () => void;
}) => {
  if (!s) return null;
  const EligIcon = ELIG_META[s.eligibility].icon;
  const days = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null;
  const effort = EFFORT_META[s.effort] ?? EFFORT_META.medium;
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0">
        {/* Hero */}
        <div className={`px-6 pt-6 pb-5 border-b ${s.priority === "strong_match" ? "bg-emerald-500/5" : s.priority === "competitive" ? "bg-amber-500/5" : "bg-muted/20"}`}>
          <SheetHeader className="mb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <SheetTitle className="font-heading text-lg leading-snug">{s.scholarship_name}</SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-4xl font-bold tabular-nums ${MATCH_COLOR(s.match)}`}>{s.match}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">match score</div>
              </div>
            </div>
          </SheetHeader>

          {/* Match bar */}
          <div className="mt-4 h-2 w-full bg-muted/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${s.match}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${MATCH_BAR_COLOR(s.match)}`}
            />
          </div>

          {/* Quick badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={`gap-1 text-xs ${ELIG_META[s.eligibility].cls}`}>
              <EligIcon className="h-3 w-3" />{ELIG_META[s.eligibility].label}
            </Badge>
            {s.coverage_type && <Badge variant="outline" className="text-xs">{COVERAGE_LABEL[s.coverage_type] || s.coverage_type}</Badge>}
            <Badge variant="outline" className={`text-xs ${effort.cls}`}>{effort.label}</Badge>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          {/* Financial overview */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Financial overview</h4>
            <div className="bg-muted/30 rounded-xl p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {s.award_amount_text && <div className="col-span-2 flex justify-between"><span className="text-muted-foreground">Award</span><span className="font-semibold text-foreground text-right max-w-[55%]">{s.award_amount_text}</span></div>}
              {s.estimated_total_value_usd && <div className="flex justify-between"><span className="text-muted-foreground">Est. total value</span><span className="font-semibold">${s.estimated_total_value_usd.toLocaleString()}</span></div>}
              {s.coverage_type && <div className="flex justify-between"><span className="text-muted-foreground">Coverage</span><span className="font-semibold">{COVERAGE_LABEL[s.coverage_type] || s.coverage_type}</span></div>}
            </div>
          </section>

          {/* Requirements */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />Requirements</h4>
            <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-xs">
              {s.min_gpa != null && <div className="flex justify-between"><span className="text-muted-foreground">Min GPA</span><span className="font-semibold">≥ {s.min_gpa}/{s.gpa_scale ?? 4.0}</span></div>}
              {s.min_ielts != null && <div className="flex justify-between"><span className="text-muted-foreground">Min IELTS</span><span className="font-semibold">≥ {s.min_ielts}</span></div>}
              {s.min_toefl != null && <div className="flex justify-between"><span className="text-muted-foreground">Min TOEFL</span><span className="font-semibold">≥ {s.min_toefl}</span></div>}
              {s.min_sat != null && <div className="flex justify-between"><span className="text-muted-foreground">Min SAT</span><span className="font-semibold">≥ {s.min_sat}</span></div>}
              {s.citizenship_requirements && <div className="flex flex-col gap-0.5"><span className="text-muted-foreground">Citizenship</span><span className="font-medium text-foreground/90">{s.citizenship_requirements}</span></div>}
              {s.application_deadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className={`font-semibold ${days !== null && days <= 30 ? "text-red-600 dark:text-red-400" : days !== null && days <= 90 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                    {new Date(s.application_deadline).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    {days !== null && days > 0 && <span className="ml-1.5 text-[10px]">({days}d left)</span>}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Match reasons */}
          {s.reasons.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Why this matched you</h4>
              <ul className="space-y-1.5">
                {s.reasons.map((r, i) => {
                  const isPositive = !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not open");
                  return (
                    <li key={i} className={`flex items-start gap-2 text-xs ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {isPositive ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                      {r}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Documents */}
          {s.required_documents && s.required_documents.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Required documents</h4>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {s.required_documents.map((d, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-foreground/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                {s.essay_required && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-amber-500" />Essay required</span>}
                {s.interview_required && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-amber-500" />Interview</span>}
                {s.recommendation_letters_required && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-amber-500" />{s.recommendation_letters_required} rec letter{s.recommendation_letters_required > 1 ? "s" : ""}</span>}
              </div>
            </section>
          )}

          {/* Why this fits */}
          {s.why_this_fits && (
            <section className="bg-accent/5 border border-accent/15 rounded-xl p-3.5">
              <h4 className="text-xs font-semibold text-accent mb-2 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Why it fits your profile</h4>
              <p className="text-xs text-foreground/85 leading-relaxed">{s.why_this_fits}</p>
            </section>
          )}

          {/* Application approach */}
          {s.how_to_win && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Application approach</h4>
              <p className="text-xs text-foreground/85 leading-relaxed">{s.how_to_win}</p>
            </section>
          )}

          {/* Strategy notes */}
          {s.strategy_notes && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Strategy</h4>
              <p className="text-xs text-foreground/85 leading-relaxed">{s.strategy_notes}</p>
            </section>
          )}

          {/* What to prepare first */}
          {s.what_to_prepare_first && (
            <section className="bg-muted/30 rounded-xl p-3 border-l-2 border-l-accent">
              <h4 className="text-xs font-semibold text-foreground mb-1">Start here</h4>
              <p className="text-xs text-foreground/85">{s.what_to_prepare_first}</p>
            </section>
          )}

          {/* Risk note */}
          {s.risk_note && (
            <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Watch out</h4>
              <p className="text-xs text-foreground/85">{s.risk_note}</p>
            </section>
          )}

          {/* Scores prep cross-sell */}
          {(s.min_ielts || s.min_sat) && (
            <section className="bg-primary/5 border border-border rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-foreground/80">Need to hit the score threshold? <Link to="/prep" className="text-accent underline underline-offset-2">Open Prep →</Link></p>
            </section>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onBookmark}
            >
              {isBookmarked ? <><BookmarkCheck className="h-4 w-4 mr-1.5 text-accent" />Shortlisted</> : <><Bookmark className="h-4 w-4 mr-1.5" />Shortlist</>}
            </Button>
            {s.official_url && (
              <Button size="sm" asChild className="flex-1">
                <a href={s.official_url} target="_blank" rel="noopener noreferrer">
                  Official page <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ─── Deadline Board column ──────────────────────────────────────────── */
const DeadlineCol = ({ title, color, items, onSelect, shortlist, onBookmark }: {
  title: string;
  color: string;
  items: Scored[];
  onSelect: (s: Scored) => void;
  shortlist: Set<string>;
  onBookmark: (id: string) => void;
}) => (
  <div className="min-w-[260px] max-w-[320px] flex-1">
    <div className={`text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-t-lg ${color}`}>
      {title} <span className="opacity-60 ml-1">({items.length})</span>
    </div>
    <div className="border border-border rounded-b-lg divide-y divide-border bg-card overflow-hidden">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground p-4 text-center">None in this window</p>
      ) : (
        items.map(s => {
          const days = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null;
          return (
            <div key={s.scholarship_id} className="p-3 hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => onSelect(s)}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-foreground leading-snug">{s.scholarship_name}</p>
                <span className={`text-[11px] font-bold tabular-nums shrink-0 ${MATCH_COLOR(s.match)}`}>{s.match}%</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{s.host_country}</p>
              {days !== null && days > 0 && (
                <p className={`text-[11px] font-semibold mt-1 ${days <= 30 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                  <Clock className="h-2.5 w-2.5 inline mr-1" />{days} days left
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
);

/* ─── Main component ─────────────────────────────────────────────────── */
interface Props { language?: "en" | "ru" }

const Discover = ({ language = "en" }: Props) => {
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [submitted, setSubmitted] = useState(false);
  const [gateOpen, setGateOpen] = useState(() => !getStoredProfile());
  const [unlocked, setUnlocked] = useState(() => !!getStoredProfile());
  const [view, setView] = useState<View>("list");
  const [sortBy, setSortBy] = useState<SortBy>("match");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [openDetail, setOpenDetail] = useState<Scored | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shortlist, setShortlist] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("tu_shortlist") || "[]")); }
    catch { return new Set(); }
  });

  const handleGateComplete = (lead: DiscoverProfile) => {
    setProfile(p => ({
      ...p,
      country: lead.nationality || p.country,
      degree: lead.targetDegree === "phd" ? "PhD" : lead.targetDegree === "master" ? "master's" : "undergraduate",
      gpa: lead.gpa || p.gpa,
      ielts: lead.ieltsScore || p.ielts,
      field: lead.fieldOfInterest || p.field,
      budget: lead.budgetRange?.startsWith("0") || lead.budgetRange?.startsWith("5000-") ? "low" : "medium",
    }));
    setSubmitted(true);
    setUnlocked(true);
    setGateOpen(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("scholarships").select("*").order("estimated_total_value_usd", { ascending: false });
      if (data) setRows(data as unknown as Scholarship[]);
      setLoading(false);
    })();
  }, []);

  const toggleBookmark = (id: string) => {
    setShortlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("tu_shortlist", JSON.stringify([...next]));
      return next;
    });
  };

  const ranked = useMemo(() => {
    if (!submitted) return rows.map(r => score(r, DEFAULT_PROFILE));
    return rows.map(r => score(r, profile)).sort((a, b) => {
      const elig = { eligible: 0, likely: 1, missing: 2, not_eligible: 3 };
      if (elig[a.eligibility] !== elig[b.eligibility]) return elig[a.eligibility] - elig[b.eligibility];
      return b.match - a.match;
    });
  }, [rows, profile, submitted]);

  const filtered = useMemo(() => {
    let list = ranked;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(s => s.scholarship_name.toLowerCase().includes(q) || (s.host_country?.toLowerCase() || "").includes(q) || (s.provider_name?.toLowerCase() || "").includes(q));
    }
    if (filters.coverage !== "all") list = list.filter(s => s.coverage_type === filters.coverage);
    if (filters.degree !== "all") list = list.filter(s => s.target_degree_level?.includes(filters.degree));
    if (filters.effort !== "all") list = list.filter(s => s.effort === filters.effort);
    if (filters.onlyEligible) list = list.filter(s => s.eligibility === "eligible" || s.eligibility === "likely");
    if (filters.closingSoon) list = list.filter(s => {
      const days = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null;
      return days !== null && days > 0 && days <= 90;
    });
    if (filters.onlyShortlisted) list = list.filter(s => shortlist.has(s.scholarship_id));
    if (sortBy === "deadline") return [...list].sort((a, b) => { if (!a.application_deadline) return 1; if (!b.application_deadline) return -1; return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime(); });
    if (sortBy === "value") return [...list].sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0));
    if (sortBy === "effort") { const ord: Record<string, number> = { low: 0, medium: 1, high: 2 }; return [...list].sort((a, b) => (ord[a.effort] ?? 1) - (ord[b.effort] ?? 1)); }
    return list;
  }, [ranked, filters, sortBy, shortlist]);

  const stats = useMemo(() => ({
    total: ranked.length,
    strong: ranked.filter(s => s.priority === "strong_match").length,
    closingSoon: ranked.filter(s => { const d = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null; return d !== null && d > 0 && d <= 60; }).length,
    totalValue: ranked.filter(s => s.priority !== "low_priority").reduce((sum, s) => sum + (s.estimated_total_value_usd ?? 0), 0),
  }), [ranked]);

  const activeFiltersCount = [
    filters.search !== "",
    filters.coverage !== "all",
    filters.degree !== "all",
    filters.effort !== "all",
    filters.onlyEligible,
    filters.closingSoon,
    filters.onlyShortlisted,
  ].filter(Boolean).length;

  const deadlineGroups = useMemo(() => {
    const getDays = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;
    return {
      urgent:  filtered.filter(s => { const d = getDays(s.application_deadline); return d !== null && d > 0 && d <= 30; }),
      soon:    filtered.filter(s => { const d = getDays(s.application_deadline); return d !== null && d > 30 && d <= 90; }),
      later:   filtered.filter(s => { const d = getDays(s.application_deadline); return d !== null && d > 90; }),
      rolling: filtered.filter(s => !s.application_deadline || s.deadline_type === "rolling"),
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />
      <BetaBanner />

      {/* Profile gate */}
      <DiscoverProfileGate open={gateOpen && !unlocked} onComplete={handleGateComplete} language={language} />

      {/* ── Hero & Stats ── */}
      <section className="bg-primary py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gold">Scholarship Database</span>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground">
                {submitted ? "Your matched scholarships" : "Scholarship database"}
              </h1>
              {submitted && profile.country && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {[profile.country, profile.degree, profile.gpa ? `GPA ${profile.gpa}/${profile.gpaScale}` : null, profile.ielts ? `IELTS ${profile.ielts}` : null].filter(Boolean).map(chip => (
                    <span key={chip} className="text-xs bg-primary-foreground/10 text-primary-foreground/90 border border-primary-foreground/20 px-2.5 py-1 rounded-full">{chip}</span>
                  ))}
                </div>
              )}
            </div>
            {/* Stats pills */}
            {unlocked && !loading && (
              <div className="flex flex-wrap gap-3 shrink-0">
                <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-primary-foreground">{stats.total}</div>
                  <div className="text-[10px] uppercase tracking-wide text-primary-foreground/60">Scholarships</div>
                </div>
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.strong}</div>
                  <div className="text-[10px] uppercase tracking-wide text-emerald-300/70">Strong matches</div>
                </div>
                {stats.closingSoon > 0 && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2 text-center">
                    <div className="text-2xl font-bold text-red-300">{stats.closingSoon}</div>
                    <div className="text-[10px] uppercase tracking-wide text-red-300/70">Closing soon</div>
                  </div>
                )}
                {stats.totalValue > 0 && (
                  <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-2 text-center">
                    <div className="text-2xl font-bold text-gold">{stats.totalValue >= 1000000 ? `$${(stats.totalValue/1000000).toFixed(1)}M` : `$${Math.round(stats.totalValue/1000)}K`}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gold/70">Available funding</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {unlocked && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex gap-6">

            {/* ── Sidebar (desktop) ── */}
            <aside className="hidden lg:block w-[220px] shrink-0">
              <div className="sticky top-4 bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><SlidersHorizontal className="h-4 w-4 text-accent" />Filters</h3>
                  {activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-accent/20 text-accent border-0">{activeFiltersCount}</Badge>}
                </div>
                <FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} />
              </div>
            </aside>

            {/* ── Main content ── */}
            <main className="flex-1 min-w-0">

              {/* Profile refinement (compact, collapsible) */}
              <div className="bg-card border border-border rounded-xl p-4 mb-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Citizenship</Label>
                    <Input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} placeholder="Kazakhstan" className="h-8 text-sm mt-1" />
                  </div>
                  <div className="min-w-[130px]">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Degree</Label>
                    <Select value={profile.degree} onValueChange={v => setProfile(p => ({ ...p, degree: v }))}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="undergraduate">Bachelor's</SelectItem>
                        <SelectItem value="master's">Master's</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 min-w-[140px]">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">GPA</Label>
                      <Input value={profile.gpa} onChange={e => setProfile(p => ({ ...p, gpa: e.target.value }))} placeholder="3.8" className="h-8 text-sm mt-1 w-20" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Scale</Label>
                      <Select value={profile.gpaScale} onValueChange={v => setProfile(p => ({ ...p, gpaScale: v }))}>
                        <SelectTrigger className="h-8 text-sm mt-1 w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4.0">/4.0</SelectItem>
                          <SelectItem value="5.0">/5.0</SelectItem>
                          <SelectItem value="100">/100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="min-w-[100px]">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">IELTS</Label>
                    <Input value={profile.ielts} onChange={e => setProfile(p => ({ ...p, ielts: e.target.value }))} placeholder="7.0" className="h-8 text-sm mt-1" />
                  </div>
                  <Button size="sm" className="h-8 gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0" onClick={() => setSubmitted(true)}>
                    <Zap className="h-3.5 w-3.5" />Rematch
                  </Button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Search scholarship, country..."
                    className="pl-9 h-9 text-sm"
                  />
                  {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                </div>

                {/* Mobile filters button */}
                <Button variant="outline" size="sm" className="lg:hidden gap-1.5 h-9" onClick={() => setFiltersOpen(true)}>
                  <Filter className="h-4 w-4" />Filters{activeFiltersCount > 0 && <Badge className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0 ml-0.5">{activeFiltersCount}</Badge>}
                </Button>

                {/* Sort */}
                <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                  <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="match">Best match</SelectItem>
                    <SelectItem value="deadline">Deadline first</SelectItem>
                    <SelectItem value="value">Highest value</SelectItem>
                    <SelectItem value="effort">Easiest first</SelectItem>
                  </SelectContent>
                </Select>

                {/* View toggle */}
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  {([["list", LayoutList], ["cards", LayoutGrid], ["deadline", Calendar]] as [View, typeof LayoutList][]).map(([v, Icon]) => (
                    <button key={v} onClick={() => setView(v)} className={`p-2 transition-colors ${view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>

                {/* Results count */}
                <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                  {filtered.length} of {ranked.length}
                </span>
              </div>

              {/* ── Content area ── */}
              {loading ? (
                <div className={view === "cards" ? "grid sm:grid-cols-2 gap-4" : "space-y-1"}>
                  {[1,2,3,4].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-muted/10">
                  <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-heading font-semibold text-foreground mb-1">No scholarships found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or profile</p>
                  <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {/* LIST VIEW */}
                  {view === "list" && (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border border-border rounded-xl overflow-hidden bg-card">
                      {/* Group headers */}
                      {(() => {
                        const groups: { label: string; cls: string; items: Scored[] }[] = [
                          { label: "Strong match", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/20", items: filtered.filter(s => s.priority === "strong_match") },
                          { label: "Worth pursuing", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-b border-amber-500/20", items: filtered.filter(s => s.priority === "competitive") },
                          { label: "Lower fit", cls: "bg-muted/50 text-muted-foreground border-b border-border", items: filtered.filter(s => s.priority === "low_priority") },
                        ].filter(g => g.items.length > 0);
                        return groups.map(g => (
                          <div key={g.label}>
                            <div className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wider ${g.cls}`}>
                              {g.label} · {g.items.length}
                            </div>
                            {g.items.map(s => (
                              <ScholarshipRow
                                key={s.scholarship_id}
                                s={s}
                                onSelect={() => setOpenDetail(s)}
                                isBookmarked={shortlist.has(s.scholarship_id)}
                                onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }}
                              />
                            ))}
                          </div>
                        ));
                      })()}
                    </motion.div>
                  )}

                  {/* CARDS VIEW */}
                  {view === "cards" && (
                    <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filtered.map(s => (
                        <ScholarshipCard
                          key={s.scholarship_id}
                          s={s}
                          onSelect={() => setOpenDetail(s)}
                          isBookmarked={shortlist.has(s.scholarship_id)}
                          onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }}
                        />
                      ))}
                    </motion.div>
                  )}

                  {/* DEADLINE BOARD */}
                  {view === "deadline" && (
                    <motion.div key="deadline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex gap-3 overflow-x-auto pb-4">
                        <DeadlineCol title="This month" color="bg-red-500/10 text-red-700 dark:text-red-400" items={deadlineGroups.urgent} onSelect={setOpenDetail} shortlist={shortlist} onBookmark={toggleBookmark} />
                        <DeadlineCol title="1–3 months" color="bg-amber-500/10 text-amber-700 dark:text-amber-400" items={deadlineGroups.soon} onSelect={setOpenDetail} shortlist={shortlist} onBookmark={toggleBookmark} />
                        <DeadlineCol title="3+ months" color="bg-blue-500/10 text-blue-700 dark:text-blue-400" items={deadlineGroups.later} onSelect={setOpenDetail} shortlist={shortlist} onBookmark={toggleBookmark} />
                        <DeadlineCol title="Rolling / TBD" color="bg-muted/80 text-muted-foreground" items={deadlineGroups.rolling} onSelect={setOpenDetail} shortlist={shortlist} onBookmark={toggleBookmark} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </main>
          </div>
        </div>
      )}

      {/* Mobile filters sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-[280px] overflow-y-auto">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filters</SheetTitle></SheetHeader>
          <div className="mt-4">
            <FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <DetailSheet
        s={openDetail}
        open={!!openDetail}
        onClose={() => setOpenDetail(null)}
        isBookmarked={openDetail ? shortlist.has(openDetail.scholarship_id) : false}
        onBookmark={() => openDetail && toggleBookmark(openDetail.scholarship_id)}
      />

      <Footer language={language} />
    </div>
  );
};

export default Discover;
