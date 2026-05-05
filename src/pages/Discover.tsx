import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { DiscoverAppBar } from "@/components/discover/DiscoverAppBar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence, useTransform, useScroll } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Sparkles, CheckCircle2, AlertTriangle, ExternalLink,
  BookmarkCheck, Bookmark, ChevronLeft, ChevronDown, Zap, RefreshCw,
  Lightbulb, X, SlidersHorizontal, Filter, Search, Trophy,
  Target, Flame, Users, FileText, Languages, Loader2,
  CreditCard, AlertOctagon, AlertCircle, UserCheck, ShieldAlert, MinusCircle, HelpCircle,
  LayoutGrid, List, EyeOff, Eye, Columns3, Circle, MoreHorizontal, GitCompare,
  Gem, DollarSign, Crown, Award, Compass, Layers, GraduationCap,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStoredProfile, saveProfile } from "@/components/discover/DiscoverProfileGate";
import { CuratedCollections } from "@/components/discover/CuratedCollections";
import { ScholarshipDeepDive } from "@/components/scholarship/ScholarshipDeepDive";
import { ExpandedScholarshipDialog } from "@/components/discover/ExpandedScholarshipDialog";
import { MatchScoreBreakdown } from "@/components/discover/MatchScoreBreakdown";
import { SavedSearchControls } from "@/components/discover/SavedSearchControls";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CountryArt } from "@/lib/countryArt";
import { FlagPattern } from "@/lib/flagPattern";
import { accentForCountry, shortCountry, canonicalCountry } from "@/lib/countryAccent";
import {
  FIELD_JUNK,
  titleCaseField,
  displayField,
  cleanScholarshipName,
  cleanProvider,
  compactAward,
  humanizeDemographic,
} from "@/lib/scholarshipFields";
import { ALL_COUNTRIES } from "@/data/countries";
import { useAuth } from "@/contexts/AuthContext";
import { useSemanticScholarshipMatch } from "@/hooks/useSemanticScholarshipMatch";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { useScholarshipTracking, useTrackView } from "@/hooks/useScholarshipTracking";
import { Lock } from "lucide-react";

const SHORTLIST_FREE_LIMIT = 5;

/* ─── Types ──────────────────────────────────────────────────────────── */
interface Scholarship {
  scholarship_id: string; scholarship_name: string; provider_name: string | null;
  official_url: string | null; host_country: string | null; eligible_countries: string[] | null;
  target_degree_level: string[] | null; target_fields: string[] | null;
  award_amount_text: string | null; estimated_total_value_usd: number | null;
  coverage_type: string; min_gpa: number | null; gpa_scale: number | null;
  min_ielts: number | null; min_toefl: number | null; min_sat: number | null;
  language_requirements: string | null;
  citizenship_requirements: string | null; application_deadline: string | null;
  deadline_type: string | null; required_documents: string[] | null;
  essay_required: boolean | null; recommendation_letters_required: number | null;
  interview_required: boolean | null; separate_application_required: boolean | null;
  application_fee_text: string | null; application_platform: string | null;
  partner_universities: string[] | null;
  selectivity_level: string | null; effort_level: string | null; effort_reason: string | null;
  ideal_candidate_profile: string | null; common_rejection_reasons: string | null;
  weak_candidate_warning: string | null;
  strategy_notes: string | null; best_for_tags: string[] | null; why_this_fits: string | null;
  target_demographics: string[] | null;
  how_to_win: string | null; what_to_prepare_first: string | null;
  next_step: string | null; risk_note: string | null;
  last_verified_date: string | null;
  last_verified_at: string | null;
  verification_status: string | null;
  source_url: string | null;
  data_source: string | null;
  url_check_status: "ok" | "redirect" | "fail" | "no_url" | null;
  url_consecutive_fails: number | null;
  url_resolved_to: string | null;
  /* Stable scholarship identity that survives URL changes. The same
   * scholarship listed on two aggregator hubs (or a program page +
   * scholarship page) collapses to one row when canonical_key matches.
   * Populated by the scrape pipeline; null on legacy rows. */
  canonical_key: string | null;
}

interface Profile {
  country: string;
  /* Multi-select: students applying to multiple levels can mark all that
   * apply. Scoring matches against any selected level. Empty array =
   * unspecified (not a constraint). */
  degrees: string[];
  gpa: string; gpaScale: string;
  ielts: string; toefl: string; sat: string; field: string;
  /* Self-identified demographic tags (canonical kebab-case). Matched
   * against scholarships.target_demographics for scoring boost. Empty
   * array = no self-identification, no demographic-based boosts. */
  demographics: string[];
}

interface Scored extends Scholarship {
  match: number;
  eligibility: "eligible" | "likely" | "missing" | "not_eligible";
  priority: "strong_match" | "competitive" | "low_priority";
  reward: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  selectivity: "very_high" | "high" | "medium" | "low" | "unknown";
  fieldMatch: boolean | null;  // null = scholarship doesn't restrict by field
  reasons: string[];
  warnings: string[];
}

interface WizardData {
  fullName: string; email: string;
  nationality: string;
  /* Multi-select: students often apply to several levels in parallel.
   * Stored as an array to drive matching against scholarships that
   * target any of the chosen levels. */
  degrees: string[];
  field: string; gpa: string; gpaScale: string;
  /* Test scores — all optional. The scorer uses each independently:
   * a scholarship requiring TOEFL is gated by the user's TOEFL, not
   * IELTS, so we collect both rather than picking one. */
  ielts: string; toefl: string; sat: string;
  /* Optional self-identification — drives demographic-targeted boost
   * (+18 with reason) when a scholarship's target_demographics overlaps. */
  demographics: string[];
}

interface FilterState {
  search: string; coverage: string; degree: string;
  field: string; selectivity: string; hostCountry: string;
  /** Demographic eligibility filter — single tag from the canonical
   *  set (women / first-generation / refugee / etc). 'all' = no filter. */
  demographic: string;
  onlyEligible: boolean; closingSoon: boolean;
}

type Phase = "landing" | "wizard" | "analyzing" | "results";
type SortBy = "match" | "deadline" | "value" | "effort" | "selectivity";
type ViewMode = "grid" | "list";
type AppSection = "browse" | "pipeline" | "shortlist" | "collections";
/* Three application stages — captures the meaningful work-in-progress
 * states. "Decision" / "Awaiting" / "Rejected" / "Accepted" were
 * removed from the picker: outcomes are out of the student's hands
 * once submitted, so tracking them in the same pill as in-progress
 * work added clutter and an asymmetric "rejected" branch that
 * triggered shame for some users.
 *
 * The underlying hook still accepts the legacy values so existing
 * rows don't break — the maps below cover all 6 values for display
 * fidelity, but the dropdown only OFFERS the 3 active stages. */
type AppStatus = "researching" | "drafting" | "submitted" | "decision" | "rejected" | "accepted";
const ACTIVE_STATUSES: AppStatus[] = ["researching", "drafting", "submitted"];

const STATUS_LABEL: Record<AppStatus, string> = {
  researching: "Researching",
  drafting:    "Drafting",
  submitted:   "Submitted",
  decision:    "Awaiting decision",
  rejected:    "Rejected",
  accepted:    "Accepted",
};

const STATUS_COLOR: Record<AppStatus, string> = {
  researching: "text-muted-foreground bg-muted/40 border-border",
  drafting:    "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25",
  submitted:   "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  decision:    "text-primary bg-primary/8 border-primary/20",
  rejected:    "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/25",
  accepted:    "text-success bg-success/8 border-success/25",
};

/* ─── Scoring ────────────────────────────────────────────────────────── */
const normalizeGpa = (gpa: number, scale: number) => {
  if (!gpa || !scale) return 0;
  if (scale <= 5.5) return (gpa / scale) * 4.0;
  return (gpa / 100) * 4.0;
};

const FIELD_SYNONYMS: Record<string, string[]> = {
  "computer science & it": ["computer science", "cs", "information technology", "it", "software", "informatics", "data science", "ai", "machine learning", "stem"],
  "business & management":  ["business", "management", "mba", "finance", "economics", "marketing", "entrepreneurship", "accounting"],
  "engineering":            ["engineering", "mechanical", "electrical", "civil", "chemical", "industrial", "stem"],
  "medicine & health":      ["medicine", "health", "medical", "nursing", "public health", "biomedical", "pharmacy"],
  "natural sciences":       ["physics", "chemistry", "biology", "mathematics", "math", "natural sciences", "stem", "research"],
  "social sciences":        ["sociology", "psychology", "anthropology", "political science", "international relations", "social"],
  "arts & humanities":      ["arts", "humanities", "history", "literature", "philosophy", "languages", "music", "design"],
  "law":                    ["law", "legal", "jurisprudence"],
};

/* Field of study match. Short synonyms ("art", "law", "cs", "IT", "ai")
 * must use word-boundary matching: a naive substring check has
 * false-positives like "earth sciences" matching "art" (because "earth"
 * contains the substring "art"), or "flaw" matching "law", or
 * "anatomy" matching "anat". Long synonyms ("physics", "engineering")
 * are unique enough that substring matching is fine and even desirable
 * — we want "biophysics" to match "physics", "bioengineering" to match
 * "engineering". The 5-char threshold draws that line. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const synMatches = (syn: string, targetField: string): boolean => {
  if (syn.length < 5) {
    return new RegExp(`\\b${escapeRegex(syn)}\\b`, "i").test(targetField);
  }
  return targetField.includes(syn) || syn.includes(targetField);
};

/* Adjectival → country aliases. The DiscoverProfileGate dropdown picks
 * adjectival nationalities ("Iraqi") but eligible_countries arrays
 * mostly carry country nouns ("Iraq"). For nationalities where the
 * adjectival drops a meaningful suffix ("Iraqi" → "Iraq") or has a
 * different stem ("Saudi Arabian" → "Saudi Arabia"), the regex stem
 * trick fails. Hardcode the small set of cases that matter — the rest
 * (Indian/India, Korean/Korea, Russian/Russia) work via prefix match. */
const NATIONALITY_COUNTRY_FORMS: Record<string, string[]> = {
  "afghan":         ["afghanistan", "afghan"],
  "iraqi":          ["iraq", "iraqi"],
  "kazakh":         ["kazakhstan", "kazakh"],
  "kyrgyz":         ["kyrgyzstan", "kyrgyz", "kyrgyzstani"],
  "tajik":          ["tajikistan", "tajik", "tajikistani"],
  "thai":           ["thailand", "thai"],
  "turkmen":        ["turkmenistan", "turkmen"],
  "uzbek":          ["uzbekistan", "uzbek"],
  "saudi arabian":  ["saudi arabia", "saudi arabian"],
  "sri lankan":     ["sri lanka", "sri lankan"],
};

/** True iff a scholarship's eligible_countries array contains any
 *  variant of the user's nationality. Word-boundary anchored so
 *  "Niger" doesn't false-match "Nigeria"; alias-extended so short
 *  adjectival forms like "Iraqi" still find their country form
 *  ("Iraq"). */
const matchesNationality = (userCountry: string, eligible: string[]): boolean => {
  const u = userCountry.toLowerCase().trim();
  if (!u) return false;
  // Build candidate variants: hardcoded alias list when applicable,
  // otherwise the full token + (for ≥6-char tokens) a length-1 stem
  // so adjectival forms ("Indian") match country entries ("India").
  const variants: string[] = [];
  if (NATIONALITY_COUNTRY_FORMS[u]) {
    variants.push(...NATIONALITY_COUNTRY_FORMS[u]);
  } else {
    variants.push(u);
    if (u.length >= 6) variants.push(u.slice(0, -1));
  }
  return eligible.some(raw => {
    const c = raw.toLowerCase();
    return variants.some(v => {
      // Tokens < 5 chars: full-word match (so "iraq" doesn't match
      // "iraqi" — the alias map already covers both forms when needed).
      // Tokens ≥ 5 chars: prefix match anchored at start (so "india"
      // matches "indian" too, but "niger" — when reached via stem of
      // a 6+ char nationality — would only be reached from "Nigerian"
      // and matches "nigeria").
      // 6-char threshold: tokens ≥ 6 chars are unique enough to allow
      // prefix match ("india" → "indian"); shorter tokens require both
      // word boundaries to avoid "niger" matching "nigeria".
      const re = v.length < 6
        ? new RegExp(`\\b${escapeRegex(v)}\\b`, "i")
        : new RegExp(`\\b${escapeRegex(v)}`, "i");
      return re.test(c);
    });
  });
};

const fieldMatches = (userField: string | null, targets: string[] | null): boolean | null => {
  if (!userField || !targets || targets.length === 0) return null;
  const u = userField.toLowerCase();
  const t = targets.map(x => x.toLowerCase());
  if (t.some(x => x.includes("all fields") || x.includes("any field") || x.includes("open to all"))) return true;
  const synonyms = FIELD_SYNONYMS[u] || [u];
  return t.some(targetField => synonyms.some(syn => synMatches(syn, targetField)));
};

const normalizeSelectivity = (s: string | null): Scored["selectivity"] => {
  if (!s) return "unknown";
  const v = s.toLowerCase();
  if (v.includes("very") || v.includes("extreme") || v.includes("top") || v.includes("ultra")) return "very_high";
  if (v.includes("high") || v.includes("competitive") || v.includes("selective")) return "high";
  if (v.includes("medium") || v.includes("moderate")) return "medium";
  if (v.includes("low") || v.includes("open") || v.includes("accessible")) return "low";
  return "unknown";
};

const scoreScholarship = (s: Scholarship, p: Profile, semanticSimilarity?: number): Scored => {
  const reasons: string[] = [];
  const warnings: string[] = [];
  // Base score lowered from 50 → 45. Combined with the steeper
  // selectivity penalty + differentiated country signal below, this
  // spreads scores so 85+ actually means "really strong fit" rather
  // than "passes basic eligibility." Without this recalibration,
  // most matched rows hit 90+ and the score loses its signal.
  let match = 45;
  let eligibility: Scored["eligibility"] = "likely";

  // Country / nationality — split "open to ${user country} nationals"
  // (a real targeted signal, often the program was DESIGNED for
  // applicants from that region) from "open to all nationalities" (a
  // weaker, non-discriminating signal). Previously both got +15. Now:
  // specific = +15, open-to-all = +7.
  //
  // matchesNationality handles country/adjectival aliasing + word
  // boundaries — see its docstring for the false-positive cases
  // ("Niger" vs "Nigeria", "Iraqi" vs "Iraq") it guards against.
  if (s.eligible_countries && p.country) {
    const list = s.eligible_countries.map(c => c.toLowerCase());
    const openToAll = list.some(c => c.includes("all countries") || c.includes("all nationalities"));
    const specific = matchesNationality(p.country, s.eligible_countries);
    if (specific) { match += 15; reasons.push(`Open to ${p.country} nationals`); }
    else if (openToAll) { match += 7; reasons.push("Open to all nationalities"); }
    else { eligibility = "not_eligible"; match -= 40; warnings.push(`Not open to ${p.country} nationals`); }
  }

  // Degree level — match if scholarship targets ANY of the user's selected
  // levels. Uses degreeBucket on both sides so "Masters", "Master's
  // Degree", "MS", "graduate" all collapse to the same bucket and a
  // user picking "master's" doesn't get told they're not eligible
  // because the scholarship happened to write "Graduate" instead.
  if (s.target_degree_level && p.degrees && p.degrees.length > 0) {
    const targetBuckets = s.target_degree_level.map(d => degreeBucket(d)).filter(Boolean);
    const matched = p.degrees.find(pd => targetBuckets.includes(degreeBucket(pd)));
    if (matched) {
      match += 10; reasons.push(`Matches ${matched} level`);
    } else if (targetBuckets.length > 0) {
      // Only declare not-eligible when we actually parsed the scholarship's
      // levels into known buckets. If we couldn't, leave eligibility alone
      // rather than firing a false negative.
      eligibility = "not_eligible"; match -= 25;
      warnings.push(`Not for ${p.degrees.join(" / ")} applicants`);
    }
  }

  // Field of study (NEW)
  const fm = fieldMatches(p.field, s.target_fields);
  if (fm === true)  { match += 10; reasons.push(`Funds ${p.field || "your field"}`); }
  if (fm === false) { match -= 15; warnings.push(`Field mismatch — does not fund ${p.field || "your field"}`); if (eligibility !== "not_eligible") eligibility = "missing"; }

  // Demographic targeting — when the scholarship targets a specific
  // group AND the user has self-identified with that group, this is one
  // of the strongest possible alignment signals (the program was
  // DESIGNED for someone like them). +18 with reason. When the user
  // has NOT self-identified for a demographic-targeted scholarship,
  // we don't penalise — the user simply hasn't told us, and the row
  // might still be a fit (or might be filtered out by the demographic
  // filter dropdown if the user is browsing intentionally).
  if (s.target_demographics && s.target_demographics.length > 0
      && p.demographics && p.demographics.length > 0) {
    const overlap = s.target_demographics.filter(d => p.demographics.includes(d));
    if (overlap.length > 0) {
      match += 18;
      const label = overlap[0]
        .replace(/-/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
      reasons.push(`Designed for ${label} applicants`);
    }
  }

  // GPA
  if (s.min_gpa && p.gpa) {
    const ug = normalizeGpa(parseFloat(p.gpa), parseFloat(p.gpaScale));
    const rg = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
    if (ug >= rg) { match += 15; reasons.push(`GPA meets ${s.min_gpa}/${s.gpa_scale ?? 4.0}`); }
    else if (ug >= rg - 0.3) { match += 5; warnings.push(`GPA borderline (need ${s.min_gpa})`); if (eligibility !== "not_eligible") eligibility = "missing"; }
    else { match -= 20; if (eligibility !== "not_eligible") eligibility = "missing"; warnings.push(`GPA below ${s.min_gpa}/${s.gpa_scale ?? 4.0}`); }
  }

  // IELTS — meets-required → +8, below → soft eligibility miss.
  if (s.min_ielts && p.ielts) {
    const u = parseFloat(p.ielts);
    if (u >= s.min_ielts) { match += 8; reasons.push(`IELTS ${u} ≥ required ${s.min_ielts}`); }
    else { match -= 10; if (eligibility !== "not_eligible") eligibility = "missing"; warnings.push(`IELTS ${u} below required ${s.min_ielts}`); }
  }

  // TOEFL — same shape as IELTS. Many programs accept either, but a
  // user with IELTS 7.5 and no TOEFL shouldn't be told a TOEFL-required
  // scholarship is "eligible" — our predicate now flags the gap rather
  // than silently passing them through.
  if (s.min_toefl && p.toefl) {
    const u = parseFloat(p.toefl);
    if (u >= s.min_toefl) { match += 8; reasons.push(`TOEFL ${u} ≥ required ${s.min_toefl}`); }
    else { match -= 10; if (eligibility !== "not_eligible") eligibility = "missing"; warnings.push(`TOEFL ${u} below required ${s.min_toefl}`); }
  }

  // SAT — undergraduate-track elite scholarships often use SAT as a
  // hard cutoff. Same shape as IELTS / TOEFL but with a wider
  // borderline band (SAT scoring spreads more linearly).
  if (s.min_sat && p.sat) {
    const u = parseFloat(p.sat);
    if (u >= s.min_sat) { match += 8; reasons.push(`SAT ${u} ≥ required ${s.min_sat}`); }
    else if (u >= s.min_sat - 80) { match += 2; warnings.push(`SAT borderline (need ${s.min_sat})`); if (eligibility !== "not_eligible") eligibility = "missing"; }
    else { match -= 10; if (eligibility !== "not_eligible") eligibility = "missing"; warnings.push(`SAT ${u} below required ${s.min_sat}`); }
  }

  // Reward / coverage
  const value = s.estimated_total_value_usd ?? 0;
  const reward: Scored["reward"] = value >= 80000 ? "high" : value >= 25000 ? "medium" : "low";
  if (s.coverage_type === "full_ride") match += 12;
  if (reward === "high") { match += 4; reasons.push("High total value"); }

  // Selectivity penalty — steeper than before. Schwarzman-tier
  // ultra-selective programs were getting only -6 which left them
  // scoring 90+ for any reasonable applicant; the score then says
  // "great fit, apply!" while reality is "1-in-2,000 chance." Honest
  // selectivity adjustment matters more than any other single signal
  // for "should I apply?" — a student deciding what's worth 20 hours
  // of essays needs the score to reflect actual odds, not just
  // eligibility.
  const selectivity = normalizeSelectivity(s.selectivity_level);
  if (selectivity === "very_high") match -= 12;
  if (selectivity === "high") match -= 6;
  if (selectivity === "medium") match -= 2;
  if (selectivity === "low") match += 4;

  // Effort
  const effort: Scored["effort"] = (s.effort_level as Scored["effort"]) ?? "medium";

  // Deadline urgency bonus (close enough to apply, not closed)
  if (s.application_deadline) {
    const days = Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000);
    if (days > 0 && days < 60) match += 4;
  }

  /* Semantic similarity from pgvector (when present): up to +20 boost
     for an exact-match embedding, falling off linearly. Caps at 20 so
     it tunes — doesn't dominate — the heuristic signals. Also surfaces
     a "Closely matches your stated field" reason when strong. */
  if (typeof semanticSimilarity === "number" && semanticSimilarity > 0) {
    const sim = Math.max(0, Math.min(1, semanticSimilarity));
    // Most embeddings cluster between 0.4–0.85; rescale so the boost
    // discriminates within that band instead of pegging to 1.0.
    const rescaled = Math.max(0, (sim - 0.30) / 0.55);
    const bonus = Math.round(rescaled * 20);
    match += bonus;
    if (bonus >= 12) reasons.push("Hits the field and goals you described");
    else if (bonus >= 6) reasons.push("Touches your field area");
  }

  if (eligibility === "likely" && match >= 70) eligibility = "eligible";
  match = Math.max(0, Math.min(100, Math.round(match)));

  const priority: Scored["priority"] =
    eligibility === "not_eligible" ? "low_priority" :
    match >= 75 ? "strong_match" : match >= 55 ? "competitive" : "low_priority";

  return { ...s, match, eligibility, priority, reward, effort, selectivity, fieldMatch: fm, reasons, warnings };
};

/* ─── Curated Collections — recommendation rule-set ──────────────────────
   Each collection is computed live from the ranked list and the user's
   profile. Surfaced as a rail above the main results so students can
   triage by intent ("I want sleepers" vs "I want prestigious") rather
   than only by raw match score. */
interface CollectionDef {
  id: string;
  title: string;
  kicker: string;
  description: string | ((p: Profile) => string);
  icon: typeof Trophy;
  accentClass: string;
  filter: (s: Scored, p: Profile) => boolean;
  sort?: (a: Scored, b: Scored) => number;
  minItems?: number;
}

const PRESTIGIOUS_NAMES = /knight-hennessy|rhodes|schwarzman|fulbright|gates cambridge|chevening|marshall|mastercard foundation|erasmus mundus|vanier|eiffel|daad|aga khan/i;

const COLLECTIONS: CollectionDef[] = [
  {
    id: "recommended",
    title: "Recommended for you",
    kicker: "Top picks",
    description: "Where your profile lines up best — strongest fits across academics, field, eligibility, and budget.",
    icon: Sparkles,
    accentClass: "text-gold-dark",
    filter: (s) => s.priority === "strong_match",
    sort: (a, b) => b.match - a.match,
    minItems: 1,
  },
  {
    id: "sleepers",
    title: "Sleeper picks",
    kicker: "Hidden gems",
    description: "Solid value, accessible competitiveness — strong odds with a focused application.",
    icon: Gem,
    accentClass: "text-primary",
    filter: (s) => s.match >= 60 && (s.selectivity === "low" || s.selectivity === "medium") && (s.estimated_total_value_usd ?? 0) >= 25000,
    sort: (a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0),
    minItems: 2,
  },
  {
    id: "prestigious",
    title: "Household names",
    kicker: "Prestigious",
    description: "Globally recognized scholarships that signal heavily on a CV.",
    icon: Crown,
    accentClass: "text-gold-dark",
    filter: (s) => PRESTIGIOUS_NAMES.test(s.scholarship_name),
    sort: (a, b) => b.match - a.match,
    minItems: 1,
  },
  {
    id: "underrated",
    title: "Underrated full-rides",
    kicker: "Big award, lower bar",
    description: "Full-funding scholarships outside the household name list — quieter but generous.",
    icon: Award,
    accentClass: "text-primary",
    filter: (s) =>
      s.coverage_type === "full_ride" &&
      !PRESTIGIOUS_NAMES.test(s.scholarship_name) &&
      (s.selectivity === "low" || s.selectivity === "medium" || s.selectivity === "unknown"),
    sort: (a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0),
    minItems: 2,
  },
  {
    id: "closing_soon",
    title: "Closing this month",
    kicker: "Act now",
    description: "Deadlines within 31 days. Decide and execute or skip cleanly.",
    icon: Flame,
    accentClass: "text-destructive",
    filter: (s) => {
      const d = daysUntil(s.application_deadline);
      return d !== null && d > 0 && d <= 31;
    },
    sort: (a, b) => {
      if (!a.application_deadline) return 1;
      if (!b.application_deadline) return -1;
      return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime();
    },
    minItems: 1,
  },
  {
    id: "biggest_checks",
    title: "Biggest checks",
    kicker: "Highest value",
    description: "Awards over $100K in total funding — life-changing money.",
    icon: DollarSign,
    accentClass: "text-gold-dark",
    filter: (s) => (s.estimated_total_value_usd ?? 0) >= 100000,
    sort: (a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0),
    minItems: 2,
  },
  {
    id: "for_your_field",
    title: "For your field",
    kicker: "Field-specific",
    description: (p) => `Scholarships explicitly funding ${p.field || "your area of study"}.`,
    icon: Target,
    accentClass: "text-primary",
    filter: (s, p) => fieldMatches(p.field, s.target_fields) === true,
    sort: (a, b) => b.match - a.match,
    minItems: 3,
  },
  {
    id: "for_your_country",
    title: "Built for your nationality",
    kicker: "Country-specific",
    description: (p) => `Programs that explicitly include ${p.country || "your country"} in their eligible list.`,
    icon: Compass,
    accentClass: "text-primary",
    filter: (s, p) => {
      if (!p.country || !s.eligible_countries || s.eligible_countries.length === 0) return false;
      const list = s.eligible_countries.map(c => c.toLowerCase());
      return list.some(c => c.includes(p.country.toLowerCase()));
    },
    sort: (a, b) => b.match - a.match,
    minItems: 2,
  },
];

/* ─── Constants ──────────────────────────────────────────────────────── */
/* Host-country flag emojis were removed — the dictionary missed too many
   countries and the inconsistent flag/globe mix looked broken. Country name
   as text is enough on cards. */

/* Country lists live in src/data/countries.ts so multiple wizard
 * surfaces share one source of truth. */

const DEGREES = [
  { v: "undergraduate", l: "Bachelor\'s", icon: "🎓", d: "3–5 year degree" },
  { v: "master\'s", l: "Master\'s", icon: "📚", d: "1–2 year graduate" },
  { v: "PhD", l: "PhD", icon: "🔬", d: "Research doctorate" },
];

const FIELDS = [
  { v: "Computer Science & IT", i: "💻" }, { v: "Business & Management", i: "📊" },
  { v: "Engineering", i: "⚙️" }, { v: "Medicine & Health", i: "🏥" },
  { v: "Natural Sciences", i: "🔬" }, { v: "Social Sciences", i: "🌐" },
  { v: "Arts & Humanities", i: "📖" }, { v: "Law", i: "⚖️" },
  { v: "Undecided", i: "✨" },
];

const SELECTIVITY_LABEL: Record<Scored["selectivity"], string> = {
  very_high: "Highly competitive", high: "Competitive", medium: "Moderate", low: "Accessible", unknown: "—",
};

/* Recognize "no real restriction" values so we don't render them as constraints */
const INCLUSIVE_PATTERNS = [
  /^open to all/i, /all nationalities/i, /any nationality/i,
  /no nationality restriction/i, /^any$/i, /open to international/i,
  /all international/i, /worldwide/i,
];
const isInclusive = (v: string | null | undefined) =>
  !!v && INCLUSIVE_PATTERNS.some(p => p.test(v.trim()));

/* Friendlier date display */
/* Defensive deadline parsers — the LLM occasionally returns junk
 * strings ("Multiple, see official site", "TBA", etc.) instead of
 * an ISO date. Naive `new Date(...)` returns Invalid Date and
 * everything downstream gets NaN day-counts → the row renders as
 * "NaN days left" or breaks sort order. Both helpers now return
 * null on bad input so callers fall back to "Rolling" / hide. */
const dateOnly = (d: string | null) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const daysUntil = (d: string | null) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
};

const WIZARD_STEPS = 4;
const DEFAULT_WIZARD: WizardData = { fullName: "", email: "", nationality: "", degrees: [], field: "", gpa: "", gpaScale: "4.0", ielts: "", toefl: "", sat: "", demographics: [] };
const DEFAULT_FILTERS: FilterState = { search: "", coverage: "all", degree: "all", field: "all", selectivity: "all", hostCountry: "all", demographic: "all", onlyEligible: false, closingSoon: false };
const COVERAGE_LABEL: Record<string, string> = {
  full_ride: "Full ride",
  tuition_only: "Tuition only",
  stipend: "Stipend",
  partial: "Partial funding",
  travel: "Travel grant",
  research: "Research funding",
  // 'other' is a valid coverage_type from the scrape SYSTEM_PROMPT
  // (used when none of the above shapes fit). Map it to a non-blank
  // label so cards never fall to "—" on the award chip just because
  // the LLM picked the catch-all bucket.
  other: "Funding offered",
};

/* Convert raw DB strings (often snake_case or all_lowercase) into human prose.
   Used everywhere `target_fields`, `target_degree_level`, etc. render directly. */
const STOP_WORDS = new Set(["and", "or", "of", "the", "in", "for", "to"]);
const humanize = (s: string | null | undefined): string => {
  if (!s) return "";
  return s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().split(" ")
    .map((w, i) => i > 0 && STOP_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

/* Degree-level display map. The DB stores compact lowercase tokens
 * ("phd", "master", "undergraduate"); rendering them raw looks
 * unfinished. This is the canonical capitalization across the app. */
const DEGREE_LABEL: Record<string, string> = {
  phd: "PhD",
  doctorate: "Doctorate",
  postdoc: "Postdoc",
  master: "Master's",
  masters: "Master's",
  "master's": "Master's",
  graduate: "Graduate",
  bachelor: "Bachelor's",
  bachelors: "Bachelor's",
  "bachelor's": "Bachelor's",
  undergraduate: "Undergraduate",
  diploma: "Diploma",
  certificate: "Certificate",
  "non_degree": "Non-degree",
};
const humanizeDegree = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const k = raw.toLowerCase().trim();
  return DEGREE_LABEL[k] ?? humanize(raw);
};

/* Provider/scholarship initials — used as avatar fallback now that flag emojis
   were stripped from card headers. Many providers in the DB are not in any
   flag dictionary, so the inconsistent flag/globe mix looked broken. */
const initials = (name: string | null | undefined): string => {
  if (!name) return "·";
  const words = name.trim().replace(/\s+/g, " ").split(" ").slice(0, 2);
  return words.map(w => w[0]?.toUpperCase() || "").join("") || "·";
};

const fmtValue = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

const deadlineDisplay = (d: string | null) => {
  // Restrained color scale — red only when truly urgent (≤7d). Past that,
  // we rely on muted tones. The previous palette painted half the
  // database red, which made every card look like an alarm.
  if (!d) return { text: "Rolling", cls: "text-foreground/40", urgent: false };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0)  return { text: "Closed", cls: "text-foreground/30 line-through", urgent: false };
  if (days <= 7)  return { text: `${days}d left`, cls: "text-destructive font-semibold", urgent: true };
  if (days <= 30) return { text: `${days}d left`, cls: "text-amber-700 dark:text-amber-400 font-medium", urgent: true };
  if (days <= 90) return { text: `${days}d left`, cls: "text-foreground/60", urgent: false };
  return { text: `${Math.ceil(days / 30)}mo`, cls: "text-foreground/40", urgent: false };
};

/* Tier labels — positive, concrete, exciting. No "stretch", "long shot",
 * "lower fit", "real shot", "safety", "more routes", "worth a scan". */
const TIER = {
  strong_match: {
    label: "Strong fit",
    dot: "bg-gold",
    text: "text-gold",
    textLight: "text-gold-dark dark:text-gold",
    grad: "from-gold via-gold-light to-gold",
    border: "border-gold/30",
  },
  competitive: {
    label: "Worth a closer look",
    dot: "bg-primary-bright",
    text: "text-primary-foreground/85",
    textLight: "text-primary dark:text-primary-bright",
    grad: "from-primary via-primary-bright to-primary",
    border: "border-primary/25",
  },
  low_priority: {
    label: "Flagship",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    textLight: "text-muted-foreground",
    grad: "from-muted-foreground/40 to-muted-foreground/60",
    border: "border-border",
  },
};

/* Country palette + label helpers live in @/lib/countryAccent so any
 * surface (Pipeline, Brief, marketing) can share the same regional
 * identity. Imported above. */

/* Extract a domain from a scholarship's URL for favicon fetching.
 * Returns null when the URL is missing or malformed. */
const domainFor = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/* ProviderAvatar — ALWAYS renders a fixed-size square. Inside, tries
 * Google's favicon service first (real institutional crest for known
 * universities); on failure / no URL falls back to a colored initials
 * monogram derived from the provider name.
 *
 * The whole point of "avatar" is consistent visual rhythm across the
 * row — non-square favicons (logos that happen to be wide rectangles
 * like VLIR-UOS) are object-cover-cropped into the square container,
 * and rows without a favicon get the monogram fallback so there's
 * never a visual gap. */
const ProviderAvatar = ({
  url, providerName, size = 18, className = "",
}: {
  url: string | null | undefined;
  providerName: string | null | undefined;
  size?: number;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const domain = domainFor(url);
  const hue = hueFromName(providerName ?? "");
  const inits = initials(providerName);
  const showFavicon = !!domain && !failed;
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-md ring-1 ring-border/40 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Gradient monogram fallback — always rendered as the BACKGROUND so
          the favicon img layered on top covers it when present, and the
          monogram shows through when the img fails or never loads. */}
      <span
        className="absolute inset-0 flex items-center justify-center text-white font-bold tracking-tight"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 55%, 45%), hsl(${(hue + 35) % 360}, 60%, 38%))`,
          fontSize: Math.max(8, Math.round(size * 0.5)),
        }}
      >
        {inits}
      </span>
      {showFavicon && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 4}`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="relative z-[1] w-full h-full object-cover bg-white"
        />
      )}
    </span>
  );
};

const hueFromName = (name: string): number => {
  if (!name) return 220;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
};

/* Backwards-compat alias — old call sites used ProviderFavicon. The
 * new ProviderAvatar always renders something, so call sites that
 * previously checked for null no longer need to. */
const ProviderFavicon = ProviderAvatar;

/* Match dial colour pairs (HSL strings, navy/gold only) */
const dialColors = (priority: Scored["priority"]): [string, string] =>
  priority === "strong_match" ? ["hsl(38 70% 40%)",  "hsl(42 80% 65%)"] :
  priority === "competitive"  ? ["hsl(210 70% 20%)", "hsl(210 70% 32%)"] :
                                ["hsl(220 10% 60%)", "hsl(220 10% 44%)"];

/* ─── Scroll-reveal wrapper ──────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = "", y = 24 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ─── Navy background with soft gold glow ────────────────────────────── */
const NavyBackdrop = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-primary" />
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(210 74% 13%) 0%, hsl(210 70% 20%) 100%)" }} />
    <motion.div
      className="absolute -top-[20%] left-[10%] w-[60vw] h-[60vw] rounded-full blur-[160px] opacity-[0.18]"
      style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 70%)" }}
      animate={{ x: [0, 40, -10, 0], y: [0, -20, 10, 0] }}
      transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-[15%] right-[5%] w-[50vw] h-[50vw] rounded-full blur-[180px] opacity-[0.10]"
      style={{ background: "radial-gradient(circle, hsl(42 80% 65%) 0%, transparent 70%)" }}
      animate={{ x: [0, -30, 15, 0], y: [0, 20, -10, 0] }}
      transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "32px 32px" }} />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
  </div>
);

/* Field/provider/name/award cleanup helpers live in
 * @/lib/scholarshipFields and are imported above. Pure functions,
 * shared with ScholarshipDetail and edge-function OG cards. */

/** Score a row by how filled-in it is. Used to pick the "best" row
 *  among duplicates and to hide rows that are too sparse to render
 *  as anything more than a blank card. */
const rowQualityScore = (s: Scholarship): number => {
  let n = 0;
  if (s.provider_name && s.provider_name.trim().length > 0) n += 3;
  if (s.host_country && s.host_country.trim().length > 0) n += 3;
  if (s.award_amount_text && s.award_amount_text.trim().length > 0) n += 2;
  if (s.estimated_total_value_usd && s.estimated_total_value_usd > 0) n += 1;
  if (s.citizenship_requirements) n += 1;
  if (s.target_fields && s.target_fields.length > 0) n += 1;
  if (s.target_degree_level && s.target_degree_level.length > 0) n += 1;
  if (s.eligible_countries && s.eligible_countries.length > 0) n += 1;
  if (s.application_deadline) n += 1;
  if (s.why_this_fits) n += 1;
  if (s.how_to_win) n += 1;
  if (s.verification_status === "verified") n += 4;
  else if (s.verification_status === "stale") n += 2;
  return n;
};

/** Two-pass row cleanup before the dashboard ever sees them:
 *
 *  1. DEDUPE: collapse rows sharing canonical_key, keep the highest-
 *     quality variant. This catches the case where the same scholarship
 *     was scraped from two different aggregator hubs / a program page +
 *     a scholarship-specific page. Rows missing canonical_key get a
 *     synthetic key from name + provider + country so manual seeds and
 *     legacy rows still de-dupe.
 *
 *  2. QUALITY GATE: drop rows that have no host_country AND no
 *     provider AND no award_amount_text — those render as visually
 *     broken "blank" cards (just title + Rolling) and erode trust.
 *     Keeping their scholarship_name in our index isn't worth the
 *     wallpaper of empty cards in the grid. The verify-cron will
 *     either fill them in on the next pass or mark them broken. */
const dedupeAndQualityFilter = (rows: Scholarship[]): Scholarship[] => {
  // Mirrors the v3 server-side normalize_scholarship_key (migration
  // 20260505230000) — same stop-word + suffix list, same token-sort,
  // same length-floor — so client-side render dedup catches the same
  // word-order / suffix-drift / stop-word variants the server does.
  // Keeping these in lockstep is mandatory: divergence creates "duped
  // on the server, deduped on the client" or vice-versa, and either
  // failure mode is invisible until users report it.
  const tightKey = (s: Scholarship) => {
    const cleanedName = cleanScholarshipName(s.scholarship_name).toLowerCase();
    const cleanedProv = (cleanProvider(s.provider_name) ?? "").toLowerCase();
    const raw = `${cleanedName} ${cleanedProv}`
      .replace(/'s\b/g, "")
      .replace(/\b(scholarships?|fellowships?|programmes?|programs?|awards?|scholars?|grants?|bursari?es?|bursarys?|prizes?|internships?|the|of|for|in|by|at|to|on|and|with|a|an|from|into|between|across|foundation|stiftung|trust|council|society|association|organi[sz]ations?|institute|university|college|school|ltd|inc|plc|gmbh|international|global|world|official)\b/g, " ")
      .replace(/\b(19|20)\d{2}\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!raw) return "";
    // Token-sort + length floor — same as the server function. Empty
    // tokens / single-char tokens get dropped so noise doesn't survive.
    const tokens = raw.split(/\s+/).filter((t) => t.length >= 2).sort();
    return tokens.join(" ");
  };
  const byKey = new Map<string, Scholarship>();
  rows.forEach(r => {
    const key = tightKey(r);
    if (!key) return;
    const cur = byKey.get(key);
    if (!cur || rowQualityScore(r) > rowQualityScore(cur)) {
      byKey.set(key, r);
    }
  });

  // Pass 2: drop rows that would render as visually thin cards.
  // Tighter bar — require AT LEAST 2 of 4 substantive fields. Single-
  // field rows ("we know the country and that's it") still rendered
  // as visually thin cards under the previous OR-gate. Bumping the
  // threshold drops more half-baked rows. The verify/enrich crons
  // backfill them on subsequent passes; once a row crosses the
  // 2-of-4 bar it re-appears automatically.
  return [...byKey.values()].filter(r => {
    const hasCountry  = !!(r.host_country && r.host_country.trim());
    const hasProvider = !!cleanProvider(r.provider_name); // null when junk
    const hasAward    = !!(r.award_amount_text && r.award_amount_text.trim()) || !!r.estimated_total_value_usd;
    const hasDeadline = !!r.application_deadline;
    const score = (hasCountry ? 1 : 0) + (hasProvider ? 1 : 0) + (hasAward ? 1 : 0) + (hasDeadline ? 1 : 0);
    return score >= 2;
  });
};

/** Map any LLM-flavoured degree string into one of three canonical
 *  buckets so filter matching tolerates the noise.
 *  Returns "" if the value doesn't recognise as a degree. */
const degreeBucket = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const v = raw.toLowerCase().trim();
  // Order matters: "phd" appearing in "phd or master's" should win bachelor's.
  if (/(phd|doctora|dphil|d\.phil|dr\.|doctor)/.test(v)) return "phd";
  if (/(master|graduate|m\.?[as]\b|m\.?phil|m\.?ba|m\.?eng|llm|m\.?fa|m\.?sc|m\.?\.?s\.?\b|magistr)/.test(v)) return "master";
  if (/(bachelor|undergrad|b\.?[as]\b|b\.?sc|b\.?eng|b\.?ba|llb|first[- ]degree)/.test(v)) return "undergraduate";
  return "";
};

/* ─── Selectivity icon ───────────────────────────────────────────────── */
const SelectivityChip = ({ level, dark = false }: { level: Scored["selectivity"]; dark?: boolean }) => {
  if (level === "unknown") return null;
  const dots = level === "very_high" ? 4 : level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${dark ? "text-primary-foreground/70" : "text-foreground/70"}`}>
      <span className="flex items-center gap-0.5">
        {[1,2,3,4].map(i => (
          <span key={i} className={`h-1 w-1 rounded-full ${i <= dots ? (dark ? "bg-gold" : "bg-gold") : (dark ? "bg-primary-foreground/15" : "bg-foreground/15")}`} />
        ))}
      </span>
      {SELECTIVITY_LABEL[level]}
    </span>
  );
};

/* ─── Animated radial dial ───────────────────────────────────────────── */
const MatchDial = ({ value, size = 64, stroke = 5, gradId, color1, color2, delay = 0 }: {
  value: number; size?: number; stroke?: number; gradId: string; color1: string; color2: string; delay?: number;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity={0.1} strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={`url(#${gradId})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c - (c * value) / 100 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
};

/* ─── Status badge + dropdown ────────────────────────────────────────── */
const StatusBadge = ({ status, onChange, dense = false }: {
  status: AppStatus | undefined;
  onChange: (s: AppStatus | null) => void;
  dense?: boolean;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 ${dense ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"} rounded-full border font-semibold uppercase tracking-[0.14em] transition-colors ${
          status ? STATUS_COLOR[status] : "text-muted-foreground bg-transparent border-dashed border-border hover:border-foreground/40 hover:text-foreground"
        }`}
      >
        <Circle className={`${dense ? "h-2 w-2" : "h-2.5 w-2.5"} ${status ? "fill-current" : ""}`} />
        {status ? STATUS_LABEL[status] : "Set status"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {ACTIVE_STATUSES.map(s => (
          <DropdownMenuItem key={s} onClick={() => onChange(s)} className="text-xs gap-2">
            <Circle className="h-2.5 w-2.5 fill-current" />
            {STATUS_LABEL[s]}
            {status === s && <CheckCircle2 className="h-3 w-3 ml-auto text-success" />}
          </DropdownMenuItem>
        ))}
        {status && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(null)} className="text-xs text-muted-foreground gap-2">
              <X className="h-3 w-3" /> Clear status
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ─── List row — country-themed, visual identity per program ───────────
 *
 * Old design read like a database admin table: identical rows, generic
 * gold award icon on every row, no regional cue. New design carries the
 * same "atlas" identity as the cards:
 *   · 4px country-gradient stripe on the left edge
 *   · Country landmark silhouette in a tinted square as the row's
 *     visual anchor (replaces the generic Award icon)
 *   · Country chip in the meta line so country reads at a glance
 *   · Award amount as a real visual chip when present
 *   · Match score circle (when real) replaces the silhouette square
 */
const ScholarRow = ({ s, onSelect, isBookmarked, onBookmark, status, onStatusChange, isHidden, onToggleHide, isComparing, onToggleCompare, index = 0, outcomes }: {
  s: Scored; onSelect: () => void;
  isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
  status: AppStatus | undefined; onStatusChange: (s: AppStatus | null) => void;
  isHidden: boolean; onToggleHide: (e: React.MouseEvent) => void;
  isComparing: boolean; onToggleCompare: (e: React.MouseEvent) => void;
  index?: number;
  /** Per-scholarship member outcome counts. Renders a tiny "X applied
   *  · Y won" pill in the row header when applied >= 3. */
  outcomes?: { applied: number; accepted: number; inPipeline: number };
}) => {
  const dl = deadlineDisplay(s.application_deadline);
  const hasRealScore = s.match > 0 && (s.reasons.length > 0 || s.warnings.length > 0);
  const isFullRide = s.coverage_type === "full_ride";
  const accent = accentForCountry(s.host_country);
  const award = compactAward(s);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.018, 0.36), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onSelect}
      className={`group relative flex items-stretch border-b border-border/60 hover:bg-canvas-soft/60 cursor-pointer transition-colors overflow-hidden ${isHidden ? "opacity-40" : ""}`}
    >
      {/* Country gradient stripe — gives every row regional identity at a
          glance. Same palette as the card hero band. */}
      <div className={`w-1 shrink-0 bg-gradient-to-b ${accent} ${isFullRide ? "ring-1 ring-inset ring-gold/30" : ""}`} aria-hidden />

      <div className="flex-1 grid grid-cols-[52px,minmax(0,1fr),auto] sm:grid-cols-[52px,minmax(0,3fr),minmax(0,1.4fr),minmax(0,0.8fr),auto] items-center gap-4 px-4 py-3.5 min-w-0">
        {/* Country-art badge. Score number ONLY shown when score is
            meaningfully strong (≥70 with eligibility eligible/likely).
            Mid-range scores (40-69) cluster across most rows and made
            the number-on-every-card pattern feel weak — better to let
            those land as just the country circle. Full-ride rows
            still get the gold corner pin either way. */}
        {(() => {
          const showScore = hasRealScore && s.match >= 70 && (s.eligibility === "eligible" || s.eligibility === "likely");
          const badge = (
            <div
              className={`relative flex items-center justify-center w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br ${accent} ${isFullRide ? "ring-2 ring-gold/40" : "ring-1 ring-border/30"}`}
              aria-label={showScore ? `Match score: ${s.match} of 100` : (s.host_country || "Scholarship")}
            >
              <CountryArt country={s.host_country} className="absolute inset-0 h-full w-full opacity-45 text-white p-1.5" />
              <span className="absolute inset-0 bg-black/15" />
              {showScore && (
                <span className="relative inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-full bg-card shadow-sm">
                  <span className="font-heading text-[13px] font-bold tabular-nums leading-none text-foreground">{s.match}</span>
                </span>
              )}
              {isFullRide && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-gold border border-card" title="Full ride">
                  <Award className="h-2.5 w-2.5 text-primary" />
                </span>
              )}
            </div>
          );
          // Hover breakdown stays available even when score isn't shown
          // — clicking the badge still surfaces the per-criteria gaps.
          if (!hasRealScore) return badge;
          // For mid-range non-strong rows we keep the badge clickable
          // for the breakdown, but the visible badge is silent (no
          // number).
          return (
            <HoverCard openDelay={120} closeDelay={80}>
              <HoverCardTrigger asChild>
                <button type="button" onClick={(e) => e.stopPropagation()} className="cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-full">
                  {badge}
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="right" align="start" className="p-0 border-0 shadow-none bg-transparent w-auto">
                <MatchScoreBreakdown
                  scholarshipId={s.scholarship_id}
                  fallback={{
                    match: s.match,
                    application_deadline: s.application_deadline,
                    estimated_total_value_usd: s.estimated_total_value_usd,
                    last_verified_at: s.last_verified_at,
                    verification_status: s.verification_status,
                    passes_eligibility: s.eligibility === "eligible" || s.eligibility === "likely",
                    why_this_fits: s.why_this_fits,
                    reasons: s.reasons,
                    warnings: s.warnings,
                  }}
                  compact
                />
              </HoverCardContent>
            </HoverCard>
          );
        })()}

        {/* Name + provider + country chip — title clamps to 2 lines so
            long names like "Wien International Scholarship Program
            (WISP) at Brandeis University" stop chopping mid-word.
            Provider line stays single-line truncate (it's the
            secondary fact). */}
        <div className="min-w-0">
          <h3
            className="font-heading font-semibold text-[15px] text-foreground tracking-tight group-hover:text-gold-dark transition-colors leading-tight"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } as React.CSSProperties}
          >
            {cleanScholarshipName(s.scholarship_name)}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 min-w-0 flex-wrap">
            {s.host_country && (
              <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded text-white bg-gradient-to-r ${accent} shrink-0`}>
                {shortCountry(s.host_country)}
              </span>
            )}
            {s.target_demographics && s.target_demographics.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-gold/12 text-gold-dark border border-gold/25 shrink-0">
                {s.target_demographics.slice(0, 2).map(humanizeDemographic).join(" · ")}
                {s.target_demographics.length > 2 && ` +${s.target_demographics.length - 2}`}
              </span>
            )}
            {outcomes && outcomes.applied >= 3 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0 tabular-nums"
                title={outcomes.accepted > 0 ? `${outcomes.applied} TopUni members applied · ${outcomes.accepted} received offers` : `${outcomes.applied} TopUni members have applied`}
              >
                {outcomes.applied} applied{outcomes.accepted > 0 ? ` · ${outcomes.accepted} won` : ""}
              </span>
            )}
            <ProviderAvatar url={s.official_url || s.source_url} providerName={cleanProvider(s.provider_name) || s.provider_name} size={16} />
            {(() => {
              const p = cleanProvider(s.provider_name);
              return p ? <p className="text-xs text-muted-foreground truncate min-w-0">{p}</p> : null;
            })()}
          </div>
        </div>

        {/* Award + deadline (desktop only) — single line, no redundant
            labels. Award value carries its own meaning ("$50K total" /
            "Full ride"); deadline value is a date + countdown that
            doesn't need a "Deadline:" prefix to be readable. The
            column header above the rows already says "Award · Deadline"
            once for the whole list. */}
        <div className="hidden sm:flex items-center gap-2 min-w-0 text-[13px]">
          {award ? (
            <span className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${isFullRide ? "text-gold-dark" : "text-foreground"}`}>
              {isFullRide && <Award className="h-3 w-3 shrink-0" />}
              {award}
            </span>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
          <span className="text-muted-foreground/30" aria-hidden>·</span>
          <span className={`tabular-nums font-medium leading-tight whitespace-nowrap ${dl.cls}`}>{dl.text}</span>
        </div>

        {/* Status — only render once the row's been bookmarked. In
            general browse, the "Set status" affordance was visual
            noise on every row of the database. After bookmarking the
            student commits to tracking this scholarship; that's when
            status becomes meaningful. */}
        <div className="hidden sm:flex items-center justify-start">
          {(isBookmarked || status) && (
            <StatusBadge status={status} onChange={onStatusChange} dense />
          )}
        </div>

        {/* Actions — bookmark stays always-visible (it's a stateful affordance);
            compare + more reveal on hover. Premium-tool pattern. */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleCompare}
            aria-label="Add to compare"
            title="Add to compare"
            className={`p-2 rounded-md transition-all ${isComparing ? "text-gold-dark bg-gold/10 opacity-100" : "text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"}`}
          >
            <GitCompare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onBookmark}
            aria-label={isBookmarked ? "Remove from shortlist" : "Save to shortlist"}
            className={`p-2 rounded-md transition-all ${isBookmarked ? "text-gold-dark hover:bg-muted/60 opacity-100" : "text-muted-foreground hover:text-gold-dark hover:bg-muted/60 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"}`}
          >
            {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-gold-dark" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }} className="text-xs">
                <FileText className="h-3 w-3 mr-2" /> Open details
              </DropdownMenuItem>
              {s.official_url && (
                <DropdownMenuItem asChild>
                  <a href={s.official_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs cursor-pointer">
                    <ExternalLink className="h-3 w-3 mr-2" /> Official page
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleHide} className="text-xs">
                {isHidden ? <Eye className="h-3 w-3 mr-2" /> : <EyeOff className="h-3 w-3 mr-2" />}
                {isHidden ? "Show again" : "Hide from list"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Scholarship card — dense, product-grade, scannable in a 3-col grid ── */
const ScholarCard = ({ s, onSelect, isBookmarked, onBookmark, status, onStatusChange, isHidden, onToggleHide, isComparing, onToggleCompare, index = 0, outcomes }: {
  s: Scored; onSelect: () => void;
  isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
  status: AppStatus | undefined; onStatusChange: (s: AppStatus | null) => void;
  isHidden: boolean; onToggleHide: (e: React.MouseEvent) => void;
  isComparing: boolean; onToggleCompare: (e: React.MouseEvent) => void;
  index?: number;
  /** Per-scholarship member outcome counts (compounding trust signal). */
  outcomes?: { applied: number; accepted: number; inPipeline: number };
}) => {
  const tier = TIER[s.priority];
  const dl = deadlineDisplay(s.application_deadline);
  /* Why-it-fits text. Falls back to scoring reasons ONLY when at
   * least one of them is a meaty insight (not a generic "Matches X
   * level" auto-reason). Without this filter the card surfaces
   * "Matches undergraduate level." as the editorial line for
   * thousands of rows — looks half-baked. */
  const meatyReasons = s.reasons.filter(r => !/^Matches \w+( level)?$/i.test(r) && !/^Open to /.test(r) && !/^Touches your field/i.test(r));
  const why = s.why_this_fits || (meatyReasons.length > 0 ? meatyReasons.slice(0, 2).join(". ") : null);
  const award = compactAward(s);
  const isFullRide = s.coverage_type === "full_ride";
  // Match score is meaningful only when the user has a real profile that
  // can score AGAINST. Without that, the score is 0 for every row and
  // showing "0/100" makes the card look broken. Use a heuristic: the
  // score is real when the row's `reasons` or `warnings` arrays got
  // populated (meaning scoreScholarship had profile data to evaluate).
  const hasRealScore = s.match > 0 && (s.reasons.length > 0 || s.warnings.length > 0);
  // Tier label only renders when we have a real score — otherwise every
  // card shows "WORTH EXPLORING" (the default for priority=low_priority
  // when match=0) which differentiates nothing.

  const accent = accentForCountry(s.host_country);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={`group relative rounded-xl bg-card border hover:shadow-lg transition-all cursor-pointer h-full flex flex-col overflow-hidden ${isComparing ? "border-gold ring-2 ring-gold/20" : isFullRide ? "border-gold/35 hover:border-gold/55" : "border-border hover:border-foreground/20"} ${isHidden ? "opacity-50" : ""}`}
    >
      {/* Hero gradient band — region-coloured per host country with a
          subtle landmark silhouette watermarked on the right (Eiffel for
          France, Mt Fuji for Japan, etc.). The band reads as a stylised
          travel poster strip rather than a database row. Text stays on
          the left where the silhouette opacity is lowest. */}
      <div className={`relative bg-gradient-to-r ${accent} px-4 h-14 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/95 overflow-hidden whitespace-nowrap`}>
        {/* Architectural texture — gothic arches + classical columns tiled
            across the band at low opacity. Whispers "campus courtyard"
            so the band feels less like a colored stripe and more like a
            postcard the student is dreaming about walking through. */}
        <FlagPattern country={s.host_country} className="absolute inset-0 w-full h-full text-white" opacity={0.16} />
        {/* Country landmark sits ABOVE the campus pattern, anchored right */}
        <CountryArt country={s.host_country} className="absolute right-2 inset-y-0 h-full opacity-35 pointer-events-none" />
        {/* fade-from-left so silhouette + pattern don't compete with text */}
        <span className={`absolute inset-0 bg-gradient-to-r from-black/30 via-black/5 to-transparent pointer-events-none`} />
        <span className="relative flex items-center gap-2 min-w-0 flex-1">
          {s.host_country && (
            <span className="truncate drop-shadow-sm">{shortCountry(s.host_country)}</span>
          )}
          {s.target_demographics && s.target_demographics.length > 0 && (
            <>
              <span className="text-white/40 shrink-0">·</span>
              <span className="inline-flex items-center gap-1 text-gold-light/95 drop-shadow-sm shrink-0">
                {humanizeDemographic(s.target_demographics[0])}
                {s.target_demographics.length > 1 && ` +${s.target_demographics.length - 1}`}
              </span>
            </>
          )}
          {isFullRide && (
            <>
              <span className="text-white/40 shrink-0">·</span>
              <span className="inline-flex items-center gap-1 text-gold-light drop-shadow-sm shrink-0">
                <Award className="h-2.5 w-2.5" />
                Full ride
              </span>
            </>
          )}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* Title + provider. Title gets 3 lines (was 2 — too much truncation
            on long names like "MEXT Japanese Government Scholarship -..."
            in the screenshot). Provider truncates on a single line below. */}
        <div className="min-w-0">
          <h3 className="font-heading text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground line-clamp-3 group-hover:text-gold-dark transition-colors mb-1">
            {cleanScholarshipName(s.scholarship_name)}
          </h3>
          {(() => {
            const p = cleanProvider(s.provider_name);
            if (!p) return null;
            return (
              <div className="flex items-center gap-1.5 min-w-0">
                <ProviderAvatar url={s.official_url || s.source_url} providerName={p} size={16} />
                <p className="text-[11px] text-muted-foreground/85 line-clamp-1">
                  {p}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Award amount — compactAward returns a tight label that fits
            the chip without truncation: "Full ride" / "$80K" / "Tuition
            covered" / "$1.2M" / etc. Long award_amount_text bodies live
            in the DetailSheet's AWARD facts box (not the card). */}
        {award && !isFullRide && (
          <div className="inline-flex self-start items-center gap-1.5 text-[12px] font-semibold text-foreground bg-muted/40 border border-border/60 px-2.5 py-1 rounded-md whitespace-nowrap">
            {award}
          </div>
        )}

        {/* Why-it-fits — italic single-paragraph editorial line. Same data,
            slightly more breathing room. line-clamp-3 instead of 2 so we
            stop chopping mid-thought.
            When the row has no real why_this_fits / meatyReasons, build
            a factual one-liner from structured fields (audience + level
            + funding shape) so the card never looks empty even before
            the enrich cron has filled the soft fields. */}
        {(() => {
          if (why) {
            return (
              <p className="text-[12px] text-foreground/70 leading-relaxed line-clamp-3 flex-1 italic">
                {why.replace(/\.+$/, "")}.
              </p>
            );
          }
          // Build a sensible factual fallback. Pieces:
          //   · level (Master's / PhD / Bachelor's)
          //   · field (humanized first target_fields entry)
          //   · funding shape (Full ride / Tuition covered / Stipend)
          //   · audience demographic if set
          const level = (s.target_degree_level && s.target_degree_level.length > 0)
            ? s.target_degree_level.slice(0, 2).map(humanizeDegree).join(" + ")
            : null;
          const fld = displayField(s.target_fields);
          const cover = COVERAGE_LABEL[s.coverage_type] ?? null;
          const demo = (s.target_demographics && s.target_demographics.length > 0)
            ? humanizeDemographic(s.target_demographics[0])
            : null;
          const parts: string[] = [];
          if (cover) parts.push(cover);
          if (level) parts.push(`${level} applicants`);
          if (fld) parts.push(`focused on ${fld}`);
          if (demo) parts.push(`for ${demo.toLowerCase()}`);
          if (s.host_country) parts.push(`in ${shortCountry(s.host_country)}`);
          const fallback = parts.length > 0 ? parts.join(" · ") : null;
          if (fallback) {
            return (
              <p className="text-[12px] text-foreground/55 leading-relaxed line-clamp-3 flex-1">
                {fallback}.
              </p>
            );
          }
          return <div className="flex-1" aria-hidden />;
        })()}

        {/* Footer meta — deadline + field. Compact, scannable. Verified
            badge moved to top strip so this row stays focused on
            decision facts. The "Pro insight" pill renders here when
            the row has Pro-tier strategy fields populated and the
            user is on free — quiet, no animation, always inline. */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`tabular-nums font-medium ${dl.cls}`}>{dl.text}</span>
          {(() => {
            const fld = displayField(s.target_fields);
            if (!fld) return null;
            return (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-muted-foreground truncate">{fld}</span>
              </>
            );
          })()}
          {outcomes && outcomes.applied >= 3 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-semibold tracking-wide tabular-nums ml-auto"
              title={outcomes.accepted > 0 ? `${outcomes.applied} TopUni members applied · ${outcomes.accepted} received offers` : `${outcomes.applied} TopUni members have applied`}
            >
              {outcomes.applied}{outcomes.accepted > 0 ? `·${outcomes.accepted}w` : ""}
            </span>
          )}
          {hasRealScore && s.match >= 70 && (s.eligibility === "eligible" || s.eligibility === "likely") && (
            <>
              <span className={`text-muted-foreground/30 ${outcomes && outcomes.applied >= 3 ? "" : "ml-auto"}`}>·</span>
              <HoverCard openDelay={120} closeDelay={80}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-baseline gap-0.5 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded shrink-0"
                    aria-label={`Match score: ${s.match} of 100. Hover for breakdown.`}
                  >
                    <span className={`tabular-nums font-bold leading-none ${tier.textLight}`}>{s.match}</span>
                    <span className="text-[9px] text-muted-foreground/60">/100</span>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent side="left" align="start" className="p-0 border-0 shadow-none bg-transparent w-auto">
                  <MatchScoreBreakdown
                    scholarshipId={s.scholarship_id}
                    fallback={{
                      match: s.match,
                      application_deadline: s.application_deadline,
                      estimated_total_value_usd: s.estimated_total_value_usd,
                      last_verified_at: s.last_verified_at,
                      verification_status: s.verification_status,
                      passes_eligibility: s.eligibility === "eligible" || s.eligibility === "likely",
                      why_this_fits: s.why_this_fits,
                      reasons: s.reasons,
                      warnings: s.warnings,
                    }}
                    compact
                  />
                </HoverCardContent>
              </HoverCard>
            </>
          )}
        </div>

        {/* Status (only when set — otherwise we skip the row entirely) */}
        {status && (
          <div onClick={(e) => e.stopPropagation()}>
            <StatusBadge status={status} onChange={onStatusChange} />
          </div>
        )}

        {/* Action row — bookmark stays visible (stateful affordance); the
            whole card is the click target so no separate CTA. */}
        <div className="flex items-center justify-end mt-auto pt-2.5 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onBookmark}
              aria-label={isBookmarked ? "Remove from shortlist" : "Save to shortlist"}
              title={isBookmarked ? "Saved · click to remove" : "Save to shortlist"}
              className={`p-1.5 rounded-md transition-all ${isBookmarked ? "text-gold-dark bg-gold/10 hover:bg-gold/15" : "text-muted-foreground hover:text-gold-dark hover:bg-muted/60"}`}
            >
              {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onToggleCompare}
              aria-label={isComparing ? "Remove from compare" : "Add to compare"}
              title={isComparing ? "Remove from compare" : "Add to compare"}
              className={`p-1.5 rounded-md transition-all ${isComparing ? "text-gold-dark bg-gold/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"}`}
            >
              <GitCompare className="h-3.5 w-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {s.official_url && (
                  <DropdownMenuItem asChild>
                    <a href={s.official_url} target="_blank" rel="noopener noreferrer" className="text-xs cursor-pointer">
                      <ExternalLink className="h-3 w-3 mr-2" /> Official page
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onToggleHide} className="text-xs">
                  {isHidden ? <Eye className="h-3 w-3 mr-2" /> : <EyeOff className="h-3 w-3 mr-2" />}
                  {isHidden ? "Show again" : "Hide from list"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

/* ─── Filters Panel ──────────────────────────────────────────────────── */
const FiltersPanel = ({ filters, setFilters, activeCount, hostCountries, fieldsAvailable }: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  activeCount: number;
  hostCountries: string[];
  fieldsAvailable: string[];
}) => {
  // Round-11 redesign: pill chips for the 3 short-list segmented filters
  // (Coverage / Degree / Competitiveness) — they're 4 options each so the
  // chips stay scannable. Eligibility-group (10 options) is now a Select;
  // it dominated the panel before. Strip rings off inactive chips so the
  // panel reads premium-quiet rather than crowded-busy. Increased the
  // section gap from 4 → 6 — more breathing room is the whole point.
  const segmented: { label: string; key: keyof FilterState; opts: { v: string; l: string }[] }[] = [
    { label: "Coverage", key: "coverage", opts: [
      { v: "all", l: "All" },
      { v: "full_ride", l: "Full ride" },
      { v: "tuition_only", l: "Tuition only" },
      { v: "partial", l: "Partial" },
    ] },
    { label: "Degree", key: "degree", opts: [
      { v: "all", l: "All" },
      { v: "undergraduate", l: "Bachelor\'s" },
      { v: "master\'s", l: "Master\'s" },
      { v: "PhD", l: "PhD" },
    ] },
    { label: "Competitiveness", key: "selectivity", opts: [
      { v: "all", l: "Any" },
      { v: "low", l: "Accessible" },
      { v: "medium", l: "Moderate" },
      { v: "high", l: "Competitive" },
    ] },
  ];
  const demographicOpts = [
    { v: "all", l: "All applicants" },
    { v: "women", l: "Women" },
    { v: "underrepresented-stem", l: "Women in STEM" },
    { v: "first-generation", l: "First-generation" },
    { v: "low-income", l: "Need-based" },
    { v: "refugee", l: "Refugees" },
    { v: "indigenous", l: "Indigenous" },
    { v: "lgbtq", l: "LGBTQ+" },
    { v: "underrepresented-minority", l: "Underrepresented" },
    { v: "disability", l: "Disability" },
  ];
  return (
    <div className="space-y-6">
      {segmented.map(section => (
        <div key={section.label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">{section.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {section.opts.map(o => {
              const active = (filters[section.key] as string) === o.v;
              return (
                <button
                  key={o.v}
                  onClick={() => setFilters(f => ({ ...f, [section.key]: o.v }))}
                  className={`px-2.5 py-1 rounded-md text-[12px] leading-tight transition-colors ${
                    active
                      ? "bg-gold/15 text-gold-dark dark:text-gold font-semibold"
                      : "text-foreground/65 hover:text-foreground hover:bg-foreground/[0.04]"
                  }`}
                >
                  {o.l}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Eligibility group — was a pill grid of 10 chips that dominated
          the panel. Now a Select; same DB tags, ~80% less space. */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Eligibility</p>
        <Select value={filters.demographic} onValueChange={v => setFilters(f => ({ ...f, demographic: v }))}>
          <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {demographicOpts.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Field + Host country — kept tight as compact dropdowns side-by-side.
          The panel was previously 2 stacked dropdown sections; this shrinks
          that to a single row at all but the narrowest widths. */}
      <div className="space-y-3">
        {fieldsAvailable.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Field</p>
            <Select value={filters.field} onValueChange={v => setFilters(f => ({ ...f, field: v }))}>
              <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All fields</SelectItem>
                {fieldsAvailable.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {hostCountries.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Host country</p>
            <Select value={filters.hostCountry} onValueChange={v => setFilters(f => ({ ...f, hostCountry: v }))}>
              <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {hostCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator className="!my-5" />
      <div className="space-y-3">
        {([
          { id: "oe", label: "Eligible only",      key: "onlyEligible"    as keyof FilterState },
          { id: "cs", label: "Closing in 90 days", key: "closingSoon"     as keyof FilterState },
        ] as const).map(t => (
          <div key={t.id} className="flex items-center justify-between">
            <Label htmlFor={t.id} className="text-[13px] cursor-pointer text-foreground/75 font-normal">{t.label}</Label>
            <Switch id={t.id} checked={filters[t.key] as boolean} onCheckedChange={v => setFilters(f => ({ ...f, [t.key]: v }))} />
          </div>
        ))}
      </div>
      {/* Saved-search controls — name + persist the current filter
          combo, then re-apply later in one click. The cron emails new
          matches against each saved search daily. */}
      <SavedSearchControls
        filters={filters as unknown as Record<string, unknown>}
        hasActiveFilters={activeCount > 0}
        onApply={(applied) => setFilters((cur) => ({ ...DEFAULT_FILTERS, ...applied, search: cur.search }) as FilterState)}
      />

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-muted-foreground hover:text-foreground" onClick={() => setFilters(DEFAULT_FILTERS)}>
          <X className="h-3 w-3 mr-1.5" /> Clear all filters
        </Button>
      )}
    </div>
  );
};

/* ─── Requirement check row (visual ✓ / ✗ / ?) ───────────────────────── */
const ReqRow = ({ label, status, detail }: {
  label: string;
  status: "met" | "miss" | "near" | "unknown" | "info";
  detail: string;
}) => {
  const cfg = {
    met:     { Icon: CheckCircle2, cls: "text-success",       bar: "bg-success" },
    near:    { Icon: AlertTriangle, cls: "text-warning",      bar: "bg-warning" },
    miss:    { Icon: MinusCircle,  cls: "text-destructive",   bar: "bg-destructive" },
    unknown: { Icon: HelpCircle,   cls: "text-muted-foreground", bar: "bg-muted-foreground/40" },
    info:    { Icon: CheckCircle2, cls: "text-success",       bar: "bg-success" },
  }[status];
  const { Icon } = cfg;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className={`h-4 w-4 ${cfg.cls} shrink-0 mt-0.5`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
};

/* ─── Detail Sheet (tabbed, visual) ──────────────────────────────────── */
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark, profile, status, onStatusChange, note, onNoteChange, similar, onSwitchTo, isMember, onUnlock, onExpand }: {
  s: Scored | null; open: boolean; onClose: () => void;
  isBookmarked: boolean; onBookmark: () => void;
  profile: Profile;
  status: AppStatus | undefined;
  onStatusChange: (s: AppStatus | null) => void;
  note: string;
  onNoteChange: (note: string) => void;
  similar: Scored[];
  onSwitchTo: (s: Scored) => void;
  isMember: boolean;
  onUnlock: () => void;
  onExpand: () => void;
}) => {
  // Hook is unconditional — must run on every render even when s is null
  // (Rules of Hooks). The track call is only fired with a real id later.
  const trackEvent = useScholarshipTracking();
  // Fire a 'viewed' event on detail-sheet open. Hook handles the 60s
  // dedup so re-renders don't inflate counts.
  useTrackView(s?.scholarship_id, "detail-sheet");
  if (!s) return null;
  const dl = deadlineDisplay(s.application_deadline);
  const [dc1, dc2] = dialColors(s.priority);
  /* Why-it-fits text. Falls back to scoring reasons ONLY when at
   * least one of them is a meaty insight (not a generic "Matches X
   * level" auto-reason). Without this filter the card surfaces
   * "Matches undergraduate level." as the editorial line for
   * thousands of rows — looks half-baked. */
  const meatyReasons = s.reasons.filter(r => !/^Matches \w+( level)?$/i.test(r) && !/^Open to /.test(r) && !/^Touches your field/i.test(r));
  const why = s.why_this_fits || (meatyReasons.length > 0 ? meatyReasons.slice(0, 2).join(". ") : null);

  // Build profile-vs-requirement checklist
  const reqs: { label: string; status: "met"|"miss"|"near"|"unknown"|"info"; detail: string }[] = [];
  if (s.min_gpa != null) {
    if (profile.gpa) {
      const ug = normalizeGpa(parseFloat(profile.gpa), parseFloat(profile.gpaScale));
      const rg = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
      const status = ug >= rg ? "met" : ug >= rg - 0.3 ? "near" : "miss";
      reqs.push({ label: `GPA ≥ ${s.min_gpa}/${s.gpa_scale ?? 4.0}`, status, detail: `Yours: ${profile.gpa}/${profile.gpaScale} (≈ ${ug.toFixed(2)}/4.0)` });
    } else { reqs.push({ label: `GPA ≥ ${s.min_gpa}/${s.gpa_scale ?? 4.0}`, status: "unknown", detail: "Add your GPA to check" }); }
  }
  if (s.min_ielts != null) {
    if (profile.ielts) {
      const u = parseFloat(profile.ielts);
      reqs.push({ label: `IELTS ≥ ${s.min_ielts}`, status: u >= s.min_ielts ? "met" : "miss", detail: `Yours: ${u}` });
    } else { reqs.push({ label: `IELTS ≥ ${s.min_ielts}`, status: "unknown", detail: "Add your IELTS to check" }); }
  }
  if (s.min_toefl != null) {
    if (profile.toefl) {
      const u = parseFloat(profile.toefl);
      reqs.push({ label: `TOEFL ≥ ${s.min_toefl}`, status: u >= s.min_toefl ? "met" : "miss", detail: `Yours: ${u}` });
    } else { reqs.push({ label: `TOEFL ≥ ${s.min_toefl}`, status: "unknown", detail: "Add your TOEFL to check" }); }
  }
  if (s.min_sat != null) {
    if (profile.sat) {
      const u = parseFloat(profile.sat);
      const status = u >= s.min_sat ? "met" : u >= s.min_sat - 80 ? "near" : "miss";
      reqs.push({ label: `SAT ≥ ${s.min_sat}`, status, detail: `Yours: ${u}` });
    } else { reqs.push({ label: `SAT ≥ ${s.min_sat}`, status: "unknown", detail: "Add your SAT to check" }); }
  }
  if (s.target_degree_level && profile.degrees && profile.degrees.length > 0) {
    // Bucket-tolerant match — see degreeBucket comment in the scoring
    // function. Without this the Requirements row showed "miss" for
    // a Master's applicant against a scholarship listing "Graduate".
    const targetBuckets = s.target_degree_level.map(d => degreeBucket(d)).filter(Boolean);
    const ok = profile.degrees.some(pd => targetBuckets.includes(degreeBucket(pd)));
    const status = targetBuckets.length === 0 ? "unknown" : ok ? "met" : "miss";
    reqs.push({ label: `Degree level: ${s.target_degree_level.map(humanizeDegree).join(", ")}`, status, detail: `Your level: ${profile.degrees.map(humanizeDegree).join(" / ")}` });
  }
  if (s.target_fields && s.target_fields.length > 0 && profile.field) {
    const fm = fieldMatches(profile.field, s.target_fields);
    reqs.push({ label: `Field of study`, status: fm === true ? "met" : fm === false ? "miss" : "unknown", detail: `Funds: ${s.target_fields.slice(0, 4).map(humanize).join(", ")}${s.target_fields.length > 4 ? "..." : ""}` });
  }
  if (s.eligible_countries && profile.country) {
    const list = s.eligible_countries.map(c => c.toLowerCase());
    const open = list.some(c => c.includes("all") || c.includes("any"));
    // Same matchesNationality used by scoreScholarship — alias-aware
    // country/adjectival pairing + word-boundary anchored.
    const ok = open || matchesNationality(profile.country, s.eligible_countries);
    reqs.push({ label: open ? "Open to all nationalities" : `Nationality eligibility`, status: ok ? "met" : "miss", detail: open ? "" : (ok ? `${profile.country} listed` : `${profile.country} not in eligible list`) });
  }
  if (s.citizenship_requirements && !isInclusive(s.citizenship_requirements)) {
    reqs.push({ label: "Citizenship rule", status: "info", detail: s.citizenship_requirements });
  }
  if (s.language_requirements) reqs.push({ label: "Language", status: "info", detail: s.language_requirements });

  const days = daysUntil(s.application_deadline);
  const deadlineDate = dateOnly(s.application_deadline);

  // Last verified
  const verifiedDate = (s as Scholarship & { last_verified_date?: string }).last_verified_date;
  const verifiedDays = verifiedDate ? Math.floor((Date.now() - new Date(verifiedDate).getTime()) / 86400000) : null;
  const isStale = verifiedDays !== null && verifiedDays > 60;

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[min(99vw,1400px)] overflow-y-auto p-0 flex flex-col">
        {/* ── POSTCARD HERO — country gradient + gothic-arch campus pattern
              + country landmark layered as a poster the student "flips
              over" when they open the sheet. Sells the dream of being
              there before any data hits the page. */}
        {(() => {
          const dsAccent = accentForCountry(s.host_country);
          return (
            <div className={`relative h-28 sm:h-32 overflow-hidden bg-gradient-to-r ${dsAccent} shrink-0`}>
              <FlagPattern country={s.host_country} className="absolute inset-0 w-full h-full text-white" opacity={0.14} />
              <CountryArt country={s.host_country} className="absolute right-4 inset-y-0 h-full opacity-40 pointer-events-none" />
              <span className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />
              <div className="relative h-full flex flex-col justify-end px-7 pb-4">
                {s.host_country && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/85 drop-shadow-sm">{shortCountry(s.host_country)}</p>
                )}
              </div>
            </div>
          );
        })()}
        {/* ── HEADER (cream, editorial — no thick navy block) ── */}
        <div className="relative bg-canvas-soft px-7 pt-6 pb-6 overflow-hidden shrink-0 border-b border-border">
          {/* Soft top wash so the header has navy presence without a slab */}
          <div className="absolute inset-x-0 top-0 h-24 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(180deg, hsl(var(--primary) / 0.06) 0%, transparent 100%)" }} />
          {/* Subtle gold ambient */}
          <div className="absolute -top-1/3 right-0 w-1/2 h-full rounded-full blur-[120px] opacity-[0.10] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />

          <SheetHeader className="relative space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <SelectivityChip level={s.selectivity} />
                </div>
                {/* Eligibility framing reworked in round 6 — earlier copy
                    ('You qualify on paper' / 'Near miss' / 'Doesn't fit')
                    over-claimed certainty from a thin profile. Show only
                    the FACTUAL gaps when there are clear ones; otherwise
                    say nothing. */}
                {s.eligibility === "missing" && s.warnings.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Watch: {s.warnings.slice(0, 1)[0]}
                  </p>
                )}
                {s.eligibility === "not_eligible" && s.warnings.length > 0 && (
                  <p className="text-destructive/85 text-xs">
                    {s.warnings.slice(0, 1)[0]}
                  </p>
                )}
              </div>
              {/* Score column removed — the row-card badge already carries
                  the score, and stamping a big '55/100' on the detail
                  panel hero just compounded the "weak score" perception
                  when the cluster of rows trended toward 55-65. */}
            </div>

            <SheetTitle className="text-foreground font-heading text-[26px] leading-[1.12] tracking-[-0.02em] pt-1 text-left">{cleanScholarshipName(s.scholarship_name)}</SheetTitle>
            <p className="text-muted-foreground text-sm text-left">
              {[cleanProvider(s.provider_name), s.host_country && shortCountry(s.host_country)].filter(Boolean).join(" · ")}
            </p>
          </SheetHeader>

          {/* Key facts row — cream tiles */}
          <div className="relative grid grid-cols-3 gap-2 mt-5">
            {/* Award facts tile: lead with the compact label so the
                box never truncates; the full award_amount_text follows
                below in muted text when it adds detail. The detail
                line clamps to two lines — long parentheticals are OK
                here because the user opened the sheet for more depth. */}
            <div className="bg-card border border-border rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">Award</div>
              <div className="text-foreground text-sm font-bold leading-tight">{compactAward(s) ?? COVERAGE_LABEL[s.coverage_type] ?? "—"}</div>
              {s.award_amount_text && s.award_amount_text.length > 16 && (
                <div className="text-[10px] text-muted-foreground/85 mt-1 leading-snug line-clamp-2">{s.award_amount_text}</div>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">Deadline</div>
              <div className={`text-xs font-semibold leading-tight ${dl.cls}`}>{dl.text}</div>
              {deadlineDate && <div className="text-muted-foreground/70 text-[10px] mt-0.5">{deadlineDate}</div>}
            </div>
            <div className="bg-card border border-border rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">Total value</div>
              <div className="text-gold-dark text-xs font-bold leading-tight">{s.estimated_total_value_usd ? fmtValue(s.estimated_total_value_usd) : "—"}</div>
            </div>
          </div>

          {/* Header CTAs — Apply (gold), Bookmark, and an escape hatch
              to the dedicated /scholarships/:id full-page view for
              users who want a more elaborate read instead of the
              side-sheet experience. The Apply click is tracked via
              the scholarship-tracking hook so we can chart click-
              through-to-apply per scholarship. */}
          <div className="relative flex items-center gap-2 mt-4">
            <Button variant="gold" size="sm" asChild className="flex-1 h-9" disabled={!s.official_url}>
              {s.official_url ? (
                <a
                  href={s.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent(s.scholarship_id, "clicked", "discover-detail-apply")}
                >
                  Apply on official site <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              ) : <span>No official link</span>}
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={onBookmark}>
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-gold-dark" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          </div>
          {/* Promoted CTA into the centered enlarged modal. The right
              panel intentionally keeps the personalized deep dive OUT
              so it stays scannable; this button is how users get to
              the heavy content (match breakdown, how-to-win,
              ideal-candidate profile). */}
          <button
            type="button"
            onClick={onExpand}
            className="mt-3 w-full inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-gold/10 via-gold/5 to-gold/10 border border-gold/30 hover:border-gold/50 hover:from-gold/15 hover:to-gold/15 transition-all group"
          >
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-gold-dark dark:text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              View full strategy
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-gold-dark/70 dark:text-gold/70 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* URL health warning — surfaces the URL freshness checker's
              verdict. 3+ consecutive fails = link probably moved.
              Nothing renders for healthy or never-checked URLs. */}
          {s.official_url && (s.url_consecutive_fails ?? 0) >= 3 && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Our weekly link-checker has failed to reach this URL {s.url_consecutive_fails}+ times.
                The provider may have moved the page — verify before applying.
              </span>
            </div>
          )}
          {s.url_check_status === "redirect" && s.url_resolved_to && s.url_resolved_to !== s.official_url && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
              Note: this URL now redirects to <code className="font-mono text-foreground/80">{s.url_resolved_to.slice(0, 80)}</code>
            </div>
          )}

        </div>

        {/* ── TABS ──
            The right-side panel is intentionally CONCISE — it's the
            "is this for me?" surface. The heavier personalized
            analysis (match breakdown, 30-day plan, odds, counsellor-
            grade strategy) lives in the enlarged centered detail
            modal opened from the "View full strategy" CTA above.
            Without that split, the right panel stretched vertically
            with cut-off text on every long deep-dive section. */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <div className="px-7 pt-5 border-b border-border bg-background sticky top-0 z-10 overflow-x-auto scrollbar-hide">
            <TabsList className="bg-transparent p-0 h-auto gap-5 sm:gap-7 w-max sm:w-full justify-start rounded-none -mb-px">
              {([
                { v: "overview",     label: "Overview" },
                { v: "requirements", label: "Requirements" },
                { v: "strategy",     label: "Strategy" },
              ] as const).map(t => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:shadow-none border-b-2 border-transparent text-muted-foreground hover:text-foreground rounded-none px-0 pb-3 pt-0 text-sm font-medium bg-transparent"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="px-7 py-6 space-y-5 m-0 focus-visible:outline-none">
            {why && (
              <div className="bg-gold/5 border border-gold/20 rounded-2xl p-5">
                <h4 className="text-[10px] font-semibold text-gold-dark dark:text-gold mb-2 flex items-center gap-2 uppercase tracking-[0.16em]">
                  <Sparkles className="h-3 w-3" /> Why this fits you
                </h4>
                <p className="text-sm text-foreground/85 leading-relaxed">{why}</p>
              </div>
            )}

            {s.reasons.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Profile signals</p>
                <div className="space-y-1.5">
                  {s.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm leading-relaxed text-success">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />{r}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.warnings.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Watch outs</p>
                <div className="space-y-1.5">
                  {s.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm leading-relaxed text-warning">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(() => {
              // Apply the same cleanup as the Field filter dropdown so the
              // chips render consistently — split comma-lists, drop junk,
              // dedupe, title-case.
              const seen = new Set<string>();
              const cleaned: string[] = [];
              (s.target_fields ?? []).forEach(raw => {
                if (!raw) return;
                const splits = raw.split(/\s*[,/;]\s*/).filter(Boolean);
                const items = splits.length > 1 ? splits : [raw];
                items.forEach(item => {
                  item = item.trim();
                  if (!item || FIELD_JUNK.test(item) || item.length > 42) return;
                  const key = item.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").replace(/s$/, "").replace(/&/g, "and");
                  if (seen.has(key)) return;
                  seen.add(key);
                  cleaned.push(titleCaseField(item.replace(/[-_]+/g, " ").replace(/\s+/g, " ")));
                });
              });
              if (cleaned.length === 0) return null;
              return (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Funds</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cleaned.slice(0, 12).map((f, i) => (
                      <span key={i} className="text-xs text-foreground/75 bg-muted/60 border border-border px-2.5 py-1 rounded-md">{f}</span>
                    ))}
                    {cleaned.length > 12 && (
                      <span className="text-xs text-muted-foreground self-center">+{cleaned.length - 12} more</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {s.best_for_tags && s.best_for_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Best for</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.best_for_tags.map((t, i) => (
                    <span key={i} className="text-xs bg-gold/10 text-gold-dark dark:text-gold border border-gold/20 px-2.5 py-1 rounded-full font-medium">{humanize(t)}</span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* REQUIREMENTS */}
          <TabsContent value="requirements" className="px-7 py-6 space-y-5 m-0 focus-visible:outline-none">
            {reqs.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">You vs. requirements</p>
                <div className="bg-muted/30 rounded-2xl px-4 py-1">
                  {reqs.map((r, i) => <ReqRow key={i} {...r} />)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  Always verify on the official site — requirements change yearly and we don't track TOEFL or every nationality nuance.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No specific requirements recorded for this scholarship.</p>
            )}

            {(s.essay_required || s.interview_required || (s.recommendation_letters_required ?? 0) > 0) && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Application demands</p>
                <div className="flex flex-wrap gap-2">
                  {s.essay_required && <span className="inline-flex items-center gap-1.5 text-xs bg-warning/10 text-warning border border-warning/20 px-2.5 py-1 rounded-full"><FileText className="h-3 w-3" />Essay required</span>}
                  {s.interview_required && <span className="inline-flex items-center gap-1.5 text-xs bg-warning/10 text-warning border border-warning/20 px-2.5 py-1 rounded-full"><Users className="h-3 w-3" />Interview</span>}
                  {(s.recommendation_letters_required ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-warning/10 text-warning border border-warning/20 px-2.5 py-1 rounded-full">
                      <FileText className="h-3 w-3" />{s.recommendation_letters_required} rec letter{(s.recommendation_letters_required ?? 0) > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            )}

            {s.required_documents && s.required_documents.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Documents needed</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {s.required_documents.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />{d}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score-gap Prep CTA removed — Prep spun off as separate product */}

            {/* Application logistics — folded in from the now-removed
                Apply tab. These are pre-application-decision facts
                ("when, where, how, fee, separate?, partners?") so they
                live alongside the eligibility requirements rather than
                getting their own tab that overlapped the gold "Apply
                on official site" button in the header. */}
            {(days !== null && days > 0 && days <= 90) && (
              <div className={`rounded-2xl p-4 border ${days <= 30 ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20"}`}>
                <div className="flex items-center gap-2.5">
                  <Flame className={`h-5 w-5 ${days <= 30 ? "text-destructive" : "text-warning"}`} />
                  <div>
                    <p className={`font-semibold text-sm ${days <= 30 ? "text-destructive" : "text-warning"}`}>{days} days until deadline</p>
                    <p className="text-xs text-muted-foreground">{deadlineDate}</p>
                  </div>
                </div>
              </div>
            )}
            {(() => {
              const rows = [
                ["Deadline", deadlineDate ? `${deadlineDate} (${dl.text})` : "Rolling"],
                ["Cycle", s.deadline_type ? humanize(s.deadline_type) : null],
                ["Platform", s.application_platform],
                ["Application fee", s.application_fee_text],
              ].filter(([, v]) => v) as [string, string][];
              if (rows.length === 0) return null;
              return (
                <div className="bg-muted/40 rounded-2xl px-4 py-1">
                  {rows.map(([label, val], i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium text-foreground text-right">{val}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            {s.separate_application_required && (
              <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-warning">Separate application required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">You're not auto-considered when admitted — you must apply separately.</p>
                </div>
              </div>
            )}
            {s.partner_universities && s.partner_universities.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" /> Partner universities · {s.partner_universities.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {s.partner_universities.slice(0, 18).map((u, i) => (
                    <span key={i} className="text-xs bg-muted/60 border border-border px-2.5 py-1 rounded-md text-foreground/80">{u}</span>
                  ))}
                  {s.partner_universities.length > 18 && (
                    <span className="text-xs text-muted-foreground self-center">+{s.partner_universities.length - 18} more</span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* STRATEGY */}
          <TabsContent value="strategy" className="px-7 py-6 space-y-5 m-0 focus-visible:outline-none relative">
            {/* "Still being drafted" state — when the row is freshly scraped
                and the daily enrichment cron hasn't filled the soft fields
                yet (typically 24-48h post-discovery), the Strategy tab would
                otherwise render blank and look broken. This state acknowledges
                the gap honestly and points the user at the enlarged
                detail dialog (the "View full strategy" CTA in the panel
                header), which always works because it uses the
                scholarship-deep-dive endpoint to generate content live
                and doesn't depend on the soft fields. */}
            {!s.what_to_prepare_first && !s.ideal_candidate_profile && !s.how_to_win
              && !s.strategy_notes && !s.common_rejection_reasons
              && !s.weak_candidate_warning && !s.risk_note && (
              <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-gold/[0.04] to-transparent px-5 py-7 text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-gold-dark to-gold mx-auto mb-3 shadow-sm">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-heading font-semibold text-base text-foreground mb-1.5">
                  Get your live strategy
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto mb-4">
                  This scholarship's pre-written strategy notes are still being drafted by
                  our cron, but you don't have to wait — open the full strategy panel and our
                  AI will analyse this scholarship against your profile right now.
                </p>
                <button
                  type="button"
                  onClick={onExpand}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-primary bg-gradient-to-r from-gold-dark to-gold hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate now
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* First strategy block — preview, free for everyone (creates desire) */}
            {s.what_to_prepare_first && (
              <div className="border-l-2 border-l-gold bg-muted/30 rounded-r-2xl px-5 py-4">
                <p className="text-[10px] font-semibold text-foreground mb-1 uppercase tracking-[0.16em]">Start here</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{s.what_to_prepare_first}</p>
              </div>
            )}

            {/* Members-only content (or unlocked if isMember). Skip the
                whole branch when no soft fields are populated — the
                "still being drafted" state above already handles that. */}
            {(s.ideal_candidate_profile || s.how_to_win || s.strategy_notes
              || s.common_rejection_reasons || s.weak_candidate_warning || s.risk_note) && (
              isMember ? (
              <>
                {s.ideal_candidate_profile && (
                  <div className="bg-primary/[0.03] border border-primary/15 rounded-2xl p-5">
                    <h4 className="text-[10px] font-semibold text-primary dark:text-primary-bright mb-2 flex items-center gap-2 uppercase tracking-[0.16em]">
                      <UserCheck className="h-3 w-3" /> Ideal candidate
                    </h4>
                    <p className="text-sm text-foreground/85 leading-relaxed">{s.ideal_candidate_profile}</p>
                  </div>
                )}
                {s.how_to_win && (
                  <div className="bg-gold/5 border border-gold/20 rounded-2xl p-5">
                    <h4 className="text-[10px] font-semibold text-gold-dark dark:text-gold mb-2 flex items-center gap-2 uppercase tracking-[0.16em]">
                      <Lightbulb className="h-3 w-3" /> How to win
                    </h4>
                    <p className="text-sm text-foreground/85 leading-relaxed">{s.how_to_win}</p>
                  </div>
                )}
                {s.strategy_notes && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Strategy notes</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{s.strategy_notes}</p>
                  </div>
                )}
                {s.common_rejection_reasons && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
                    <h4 className="text-[10px] font-semibold text-destructive mb-2 flex items-center gap-2 uppercase tracking-[0.16em]">
                      <AlertOctagon className="h-3 w-3" /> Why people get rejected
                    </h4>
                    <p className="text-sm text-foreground/85 leading-relaxed">{s.common_rejection_reasons}</p>
                  </div>
                )}
                {s.weak_candidate_warning && (
                  <div className="border-l-2 border-warning bg-warning/5 rounded-r-2xl px-5 py-4">
                    <p className="text-[10px] font-semibold text-warning mb-1 uppercase tracking-[0.16em]">Don't apply if...</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{s.weak_candidate_warning}</p>
                  </div>
                )}
                {s.risk_note && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-destructive mb-1 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Watch out</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{s.risk_note}</p>
                  </div>
                )}
              </>
            ) : (
              /* Soft paywall — show first 1-2 lines blurred + an unlock CTA */
              <div className="relative">
                <div className="space-y-5 pointer-events-none select-none">
                  {s.ideal_candidate_profile && (
                    <div className="bg-primary/[0.03] border border-primary/15 rounded-2xl p-5">
                      <h4 className="text-[10px] font-semibold text-primary dark:text-primary-bright mb-2 flex items-center gap-2 uppercase tracking-[0.16em]">
                        <UserCheck className="h-3 w-3" /> Ideal candidate
                      </h4>
                      <p className="text-sm text-foreground/85 leading-relaxed line-clamp-2 blur-[3px]">{s.ideal_candidate_profile}</p>
                    </div>
                  )}
                  {s.how_to_win && (
                    <div className="bg-gold/5 border border-gold/20 rounded-2xl p-5">
                      <h4 className="text-[10px] font-semibold text-gold-dark mb-2 flex items-center gap-2 uppercase tracking-[0.16em]">
                        <Lightbulb className="h-3 w-3" /> How to win
                      </h4>
                      <p className="text-sm text-foreground/85 leading-relaxed line-clamp-2 blur-[3px]">{s.how_to_win}</p>
                    </div>
                  )}
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/95 to-background/40 pt-16">
                  <div className="bg-card border border-gold/30 rounded-2xl p-5 max-w-sm w-full text-center shadow-md">
                    <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-gold/10 border border-gold/25 mb-3">
                      <Lock className="h-4 w-4 text-gold-dark" />
                    </div>
                    <h4 className="font-heading font-bold text-base text-foreground mb-1.5">Strategy notes are members-only</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      Ideal candidate profile, how-to-win strategy, common rejection reasons, and warnings are part of Founding Pro.
                    </p>
                    <Button variant="gold" size="sm" className="w-full gap-2" onClick={onUnlock}>
                      <Sparkles className="h-3.5 w-3.5" /> Unlock for $19/mo
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* APPLY */}
        </Tabs>

        {/* ── SIMILAR SCHOLARSHIPS — Crunchbase/IMDB pattern: keep users moving ── */}
        {similar.length > 0 && (
          <div className="px-7 py-6 border-t border-border bg-canvas-soft/50">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-3">If you like this, also look at</p>
            <div className="space-y-1.5">
              {similar.map(sim => {
                const simAccent = accentForCountry(sim.host_country);
                const simIsFullRide = sim.coverage_type === "full_ride";
                return (
                  <button
                    key={sim.scholarship_id}
                    onClick={() => onSwitchTo(sim)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border/60 hover:border-gold/30 hover:shadow-sm transition-all text-left group"
                  >
                    {/* Country gradient + landmark — same visual language
                        as the main cards/rows so similar items don't read
                        as a different product. Replaces the meaningless
                        2-letter initials slug ("UO", "NS", "UG"). */}
                    <div className={`relative h-10 w-10 rounded-lg overflow-hidden bg-gradient-to-br ${simAccent} shrink-0 ${simIsFullRide ? "ring-2 ring-gold/40" : ""}`}>
                      <CountryArt country={sim.host_country} className="absolute inset-0 h-full w-full opacity-50 text-white p-1" />
                      {simIsFullRide && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-gold border border-card">
                          <Award className="h-2.5 w-2.5 text-primary" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-gold-dark transition-colors">{cleanScholarshipName(sim.scholarship_name)}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[cleanProvider(sim.provider_name), sim.host_country && shortCountry(sim.host_country)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 group-hover:text-gold-dark transition-all" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FOOTER (data trust + provenance) ────────────────────────
            Two lines of trust signal:
            1. last_verified_date / "may be stale" — when we last looked at
               the official source.
            2. data_source pill — where the row came from. "Curated" =
               hand-checked by us. "External research" = ingested from a
               third-party report (Manus AI), not yet hand-verified. */}
        {(() => {
          return (
            <div className="px-7 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-muted-foreground">
                Click the official site link before applying for the latest details — providers update their pages often.
              </span>
              <a
                href={`mailto:hello@topuni.com?subject=${encodeURIComponent("Inaccurate scholarship data: " + s.scholarship_name)}&body=${encodeURIComponent("ID: " + s.scholarship_id + "\n\nWhat's wrong:\n")}`}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 shrink-0"
              >
                Report inaccuracy
              </a>
            </div>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
};

/* ─── Inline animated stat ───────────────────────────────────────────── */
/* ─── Section header ─────────────────────────────────────────────────── */
const SectionHeader = ({ kicker, title, subtitle, accentClass }: {
  kicker: string; title: string; subtitle: string; count?: number; accentClass: string;
}) => (
  // Section counts removed — at the current database scale a "· 12"
  // suffix reads as a thin number rather than an editorial cue. The
  // section's actual cards below already convey the count visually.
  <Reveal className="flex items-end justify-between gap-4 mb-4 pb-3 border-b border-border/60">
    <div className="min-w-0">
      <div className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${accentClass} mb-1.5`}>
        <span className={`h-1.5 w-1.5 rounded-full ${accentClass.replace("text-", "bg-")}`} />
        {kicker}
      </div>
      <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground leading-tight tracking-tight">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
    </div>
  </Reveal>
);

/* ─── Main ───────────────────────────────────────────────────────────── */
interface Props { language?: "en" | "ru" }

const Discover = ({ language = "en" }: Props) => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const isMember = subscription.tier === "founding" || subscription.tier === "pro";
  const [foundingLeft, setFoundingLeft] = useState<{ left: number; cap: number } | null>(null);

  useEffect(() => {
    supabase.from("founding_member_counter")
      .select("claimed_count, cap")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFoundingLeft({ left: Math.max(0, data.cap - data.claimed_count), cap: data.cap });
      });
  }, []);

  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({ country: "", degrees: [], gpa: "", gpaScale: "4.0", ielts: "", toefl: "", sat: "", field: "", demographics: [] });
  const [phase, setPhase] = useState<Phase>(() => getStoredProfile()?.nationality ? "results" : "landing");
  const [wizardStep, setWizardStep] = useState(0);
  const [wiz, setWiz] = useState<WizardData>(DEFAULT_WIZARD);
  const [openDetail, setOpenDetail] = useState<Scored | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<Scored | null>(null);
  /* Application tracker — offline-first hook that mirrors localStorage
     and (when authed) syncs to Postgres `application_tracker`. Replaces
     the four separate useState + useEffect blobs that lived here. */
  const tracker = useApplicationTracker();
  const { shortlist, hidden, statusMap, notesMap, setStatus, setNote, toggleShortlist, toggleHidden } = tracker;
  const [analysisStep, setAnalysisStep] = useState(0);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // Default sort depends on whether the user has profile data. With a
  // profile, "best match" is meaningful (the score actually scores). Without
  // a profile, every row's match=0, so "best match" produces effectively
  // random order — bad first impression. Default to "deadline" when there's
  // no profile so unprofiled visitors see actionable closing-soon programs
  // first. Once they build a profile and the page reloads, the default flips
  // to "match" automatically (lazy initializer reads stored profile).
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const stored = getStoredProfile();
    return stored?.nationality ? "match" : "deadline";
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  // Logic-Pro-grade app state, persisted in localStorage. Default to list —
  // serious databases lead with dense rows, not marketing card grids.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Migrate legacy localStorage values: "timeline" view was removed
    // (redundant with sort-by-deadline on grid/list); coerce to "list".
    const stored = localStorage.getItem("tu_view_mode");
    return stored === "grid" ? "grid" : "list";
  });
  const [appSection, setAppSection] = useState<AppSection>("browse");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  // statusMap / notesMap / hidden / shortlist are now driven by the
  // useApplicationTracker hook above. Their persistence (localStorage +
  // Postgres when authed) is handled there.

  useEffect(() => { localStorage.setItem("tu_view_mode", viewMode); }, [viewMode]);

  // Keyboard: "/" focuses the search box (skip when an input is focused)
  useEffect(() => {
    if (phase !== "results") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // setNote / setStatus / toggleShortlist / toggleHidden are provided by
  // the useApplicationTracker hook — already destructured above. Local
  // alias kept for the old name "toggleHide" used at call sites.
  const toggleHide = toggleHidden;
  const toggleCompare = (id: string) => {
    setCompareSet(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else if (n.size < 3) n.add(id);
      return n;
    });
  };

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.5]);
  const heroY = useTransform(scrollY, [0, 300], [0, 60]);

  useEffect(() => {
    (async () => {
      // Visibility gate: show every row EXCEPT broken (re-fetch failed
      // multiple times) and verifying (in-flight). Pending rows are the
      // newly-scraped, auto-published-at-confidence-≥0.85 ones still
      // awaiting their first re-fetch verification — they're trustworthy
      // enough to surface, especially because every DetailSheet renders
      // an "Always confirm deadlines and amounts on the official site
      // before applying" disclaimer at the bottom. Hiding 178+ pending
      // rows behind a stricter gate cost us the visible scholarship
      // count (47 visible vs ~225 in the database) without buying the
      // user any safety they don't already have.
      //
      // We DO order so verified/stale rows surface first (highest trust),
      // then pending/null (newer or not-yet-checked).
      const { data } = await supabase
        .from("scholarships")
        .select("*")
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
        // Lifecycle filter — closed-recent + closed-archived rows are
        // hidden from discovery automatically. The DB trigger keeps
        // lifecycle_status fresh on every UPDATE; the daily cron at
        // 03:00 UTC handles time-based transitions (a deadline that
        // passed last night gets flipped today). Direct /scholarships/:id
        // lookups still work for saved-pipeline + shared-brief links.
        .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
        .order("estimated_total_value_usd", { ascending: false });
      if (data) {
        const cleaned = dedupeAndQualityFilter(data as unknown as Scholarship[]);
        setRows(cleaned);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const stored = getStoredProfile();
    if (stored?.nationality) {
      // targetDegree may be a single value (legacy) or comma-separated (new).
      // Split, then normalize legacy "phd" / "master" tokens to canonical
      // values used by scoring.
      const rawLevels = (stored.targetDegree || "")
        .split(/[,/]+/).map(s => s.trim()).filter(Boolean);
      const canonicalize = (lvl: string) => {
        const l = lvl.toLowerCase();
        if (l === "phd") return "PhD";
        if (l.startsWith("master")) return "master\'s";
        if (l === "undergraduate" || l === "bachelor" || l.startsWith("bachelor")) return "undergraduate";
        return lvl;
      };
      setProfile({
        country: stored.nationality || "",
        degrees: rawLevels.length > 0 ? rawLevels.map(canonicalize) : [],
        gpa: stored.gpa || "", gpaScale: "4.0",
        ielts: stored.ieltsScore || "",
        toefl: stored.toeflScore || "",
        sat: stored.satScore || "",
        field: stored.fieldOfInterest || "",
        demographics: Array.isArray(stored.demographics) ? stored.demographics : [],
      });
    }
  }, []);

  useEffect(() => {
    if (phase !== "analyzing") return;
    let i = 0;
    const iv = setInterval(() => { i++; setAnalysisStep(i); if (i >= 5) { clearInterval(iv); setTimeout(() => setPhase("results"), 500); } }, 520);
    return () => clearInterval(iv);
  }, [phase]);

  const [paywallOpen, setPaywallOpen] = useState<null | "shortlist" | "compare" | "strategy">(null);

  const toggleBookmark = (id: string) => {
    // Free-tier limit gate stays here so we don't toggle into a state
    // the user can't have. Members unlimited.
    if (!shortlist.has(id) && !isMember && shortlist.size >= SHORTLIST_FREE_LIMIT) {
      setPaywallOpen("shortlist");
      return;
    }
    toggleShortlist(id);
  };

  const completeWizard = () => {
    const country = wiz.nationality;
    const p: Profile = { country, degrees: wiz.degrees, gpa: wiz.gpa, gpaScale: wiz.gpaScale, ielts: wiz.ielts, toefl: wiz.toefl, sat: wiz.sat, field: wiz.field, demographics: wiz.demographics };
    setProfile(p);
    saveProfile({
      fullName: wiz.fullName, email: wiz.email, nationality: country,
      targetDegree: wiz.degrees.join(", "),
      gpa: wiz.gpa, ieltsScore: wiz.ielts, toeflScore: wiz.toefl, satScore: wiz.sat,
      fieldOfInterest: wiz.field,
      demographics: wiz.demographics,
    });
    setAnalysisStep(0); setPhase("analyzing");
  };

  const resetProfile = () => { setWiz(DEFAULT_WIZARD); setWizardStep(0); setPhase("wizard"); };

  /* Semantic-match hook — fires once per profile change against the
     match-scholarships edge function. Returns Map<scholarship_id,
     similarity>; soft-fails to an empty map if the endpoint isn't
     reachable or no embeddings exist yet. The score blends in via
     scoreScholarship — heuristic + semantic, not either-or. */
  const semantic = useSemanticScholarshipMatch(
    {
      field: profile.field,
      targetCountries: profile.country ? [profile.country] : undefined,
      degree: profile.degrees?.[0] || "",
      nationality: profile.country,
      gpa: profile.gpa,
      ielts: profile.ielts,
      toefl: profile.toefl,
      sat: profile.sat,
    },
    { limit: 80 },
  );

  const ranked = useMemo(() => {
    const hasProfile = profile.country || (profile.degrees && profile.degrees.length > 0);
    const p: Profile = hasProfile ? profile : { country: "", degrees: [], gpa: "", gpaScale: "4.0", ielts: "", toefl: "", sat: "", field: "", demographics: [] };
    return rows.map(r => {
      const sim = semantic.matches.get(r.scholarship_id)?.similarity;
      return scoreScholarship(r, p, sim);
    }).sort((a, b) => {
      const e = { eligible: 0, likely: 1, missing: 2, not_eligible: 3 };
      if (e[a.eligibility] !== e[b.eligibility]) return e[a.eligibility] - e[b.eligibility];
      return b.match - a.match;
    });
  }, [rows, profile, semantic.matches]);

  /* Available host countries + fields, derived from data.
   * Collapse all "Multiple (...)" / "Multiple (Worldwide)" / "Global" /
   * "International" variants into one canonical "Multiple countries" so
   * the dropdown isn't polluted with eight near-identical options. */
  const hostCountries = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      if (!r.host_country) return;
      set.add(canonicalCountry(r.host_country));
    });
    return [...set].sort();
  }, [rows]);

  const fieldsAvailable = useMemo(() => {
    // Field strings come from LLM extractions of scholarship pages, so
    // the raw values are noisy: case drifts ("computer science" vs
    // "Computer Science"), pluralisation ("Social Science" vs "Social
    // Sciences"), separators ("data-science" vs "data science"), and
    // junk values ("any", "open", "various", or 80-char run-on strings
    // like "computer science, electrical engineering, mechanical
    // engineering, and related fields"). Without cleanup the filter
    // dropdown shows 100+ near-duplicate options and the selected
    // filter only matches a fraction of relevant rows.
    //
    // Pipeline:
    //   1. Reject junk patterns + over-long entries (>40 chars usually
    //      = comma-list the LLM crammed into one field)
    //   2. Normalise case + separators + trailing-s for dedup key
    //   3. Title-case the display value so the dropdown reads cleanly
    //   4. Count occurrences and sort by frequency (most common first)
    //      — students see the popular fields up top instead of an
    //      alphabetical list led by "Aerospace Engineering"

    const counts = new Map<string, { display: string; n: number }>();
    rows.forEach(r => r.target_fields?.forEach(f => {
      const raw = (f || "").trim();
      if (!raw || FIELD_JUNK.test(raw)) return;
      // LLM occasionally crams comma-lists into one field — split them.
      const splits = raw.split(/\s*[,/;]\s*/).filter(Boolean);
      const items = splits.length > 1 ? splits : [raw];

      items.forEach(item => {
        item = item.trim();
        if (!item || FIELD_JUNK.test(item)) return;
        if (item.length > 42) return;

        const key = item.toLowerCase()
          .replace(/[-_]+/g, " ")
          .replace(/\s+/g, " ")
          .replace(/s$/, "")
          .replace(/&/g, "and");

        const display = titleCaseField(item.replace(/[-_]+/g, " ").replace(/\s+/g, " "));
        const cur = counts.get(key);
        if (cur) cur.n++;
        else counts.set(key, { display, n: 1 });
      });
    }));

    // Sort by frequency desc, alphabetical tiebreak. Most common fields
    // surface first — matches how users actually scan a dropdown.
    return [...counts.values()]
      .sort((a, b) => b.n - a.n || a.display.localeCompare(b.display))
      .map(v => v.display);
  }, [rows]);

  const filtered = useMemo(() => {
    let list = ranked;
    if (filters.search) {
      // Search now hits the fields a user actually types when looking
      // for a scholarship — name, provider, host country PLUS the
      // semantic surfaces (fields of study, eligible nationalities,
      // best-for tags) that previously returned zero results for
      // intuitive queries like "STEM", "leadership", or "Africa".
      const q = filters.search.toLowerCase();
      const matchesArr = (arr: string[] | null | undefined) =>
        Array.isArray(arr) && arr.some(v => typeof v === "string" && v.toLowerCase().includes(q));
      list = list.filter(s =>
        s.scholarship_name.toLowerCase().includes(q)
        || (s.host_country?.toLowerCase() || "").includes(q)
        || (s.provider_name?.toLowerCase() || "").includes(q)
        || matchesArr(s.target_fields)
        || matchesArr(s.eligible_countries)
        || matchesArr(s.best_for_tags)
        // Searching 'women' / 'first-generation' / etc returns
        // demographic-targeted programs.
        || matchesArr(s.target_demographics)
        // Searching for prose tokens lands on the static editorial
        // fields — 'social impact', 'leadership', 'climate', etc
        // commonly appear in why_this_fits / how_to_win / ideal-
        // candidate without being captured by the structured fields
        // above.
        || (s.why_this_fits?.toLowerCase() || "").includes(q)
        || (s.ideal_candidate_profile?.toLowerCase() || "").includes(q)
        || (s.how_to_win?.toLowerCase() || "").includes(q)
      );
    }
    if (filters.coverage !== "all") {
      // "Partial funding" collapses partial + stipend (also catches
      // "travel" / "research" / any non-fullride non-tuition_only value
      // for legacy rows that wrote different enum names).
      list = list.filter(s => filters.coverage === "partial"
        ? (s.coverage_type !== "full_ride" && s.coverage_type !== "tuition_only")
        : s.coverage_type === filters.coverage);
    }
    if (filters.degree !== "all") {
      // Tolerant degree match: the LLM populates target_degree_level
      // with all kinds of variants ("Master's", "Masters", "MA", "MS",
      // "Master's Degree", "Graduate", "graduate"). Strict equality
      // missed most rows. Normalize both sides into one of three
      // canonical buckets before comparing.
      list = list.filter(s => s.target_degree_level?.some(d => degreeBucket(d) === degreeBucket(filters.degree)));
    }
    if (filters.selectivity !== "all") {
      // "Competitive" (high) intentionally matches both `high` and `very_high`
      // so the filter UI can stay at 3 levels instead of 4.
      list = list.filter(s => filters.selectivity === "high"
        ? (s.selectivity === "high" || s.selectivity === "very_high")
        : s.selectivity === filters.selectivity);
    }
    if (filters.demographic !== "all") {
      // Match against the constrained target_demographics tag set.
      list = list.filter(s => Array.isArray(s.target_demographics)
        && s.target_demographics.includes(filters.demographic));
    }
    if (filters.field !== "all") {
      // Mirror the dedupe pipeline used to build the dropdown: comma-
      // split run-on LLM strings, normalise separators + trailing-s +
      // & vs and. Without this, picking "Engineering" wouldn't match
      // a row whose target_fields contained "Computer Science,
      // Engineering" (single comma-joined entry).
      const norm = (f: string) => f.toLowerCase()
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/&/g, "and")
        .replace(/s$/, "");
      const want = norm(filters.field);
      list = list.filter(s =>
        s.target_fields?.some(f => {
          const splits = f.split(/\s*[,/;]\s*/).filter(Boolean);
          return splits.some(item => norm(item) === want);
        }),
      );
    }
    if (filters.hostCountry !== "all") list = list.filter(s => s.host_country && canonicalCountry(s.host_country) === filters.hostCountry);
    if (filters.onlyEligible) list = list.filter(s => s.eligibility === "eligible" || s.eligibility === "likely");
    if (filters.closingSoon) list = list.filter(s => { const d = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null; return d !== null && d > 0 && d <= 90; });
    if (!showHidden) list = list.filter(s => !hidden.has(s.scholarship_id));
    if (sortBy === "deadline") return [...list].sort((a, b) => { if (!a.application_deadline) return 1; if (!b.application_deadline) return -1; return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime(); });
    if (sortBy === "value") return [...list].sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0));
    if (sortBy === "effort") { const o: Record<string, number> = { low: 0, medium: 1, high: 2 }; return [...list].sort((a, b) => (o[a.effort] ?? 1) - (o[b.effort] ?? 1)); }
    if (sortBy === "selectivity") { const o: Record<string, number> = { low: 0, medium: 1, high: 2, very_high: 3, unknown: 4 }; return [...list].sort((a, b) => (o[a.selectivity] ?? 4) - (o[b.selectivity] ?? 4)); }
    return list;
  }, [ranked, filters, sortBy, hidden, showHidden]);

  const sections = useMemo(() => {
    const top = filtered.filter(s => s.priority === "strong_match");
    const competitive = filtered.filter(s => s.priority === "competitive");
    const stretch = filtered.filter(s => s.priority === "low_priority");
    return { hero: top.slice(0, 1), strong: top.slice(1), competitive, stretch };
  }, [filtered]);

  /* Per-scholarship outcome counts — driven by scholarship_outcomes_bulk
     RPC. Powers the tiny "12 applied · 3 won" pills on cards. Fetched
     once per filtered set via a ref-cache so toggling sort/filters
     doesn't refire the RPC for ids we already know. Pre-migration safe:
     RPC errors are silent and the map stays empty. */
  const outcomesCacheRef = useRef<Map<string, { applied: number; accepted: number; inPipeline: number }>>(new Map());
  const [outcomesMap, setOutcomesMap] = useState<Map<string, { applied: number; accepted: number; inPipeline: number }>>(new Map());
  useEffect(() => {
    const visibleIds = filtered.slice(0, 60).map((s) => s.scholarship_id);
    const need = visibleIds.filter((id) => !outcomesCacheRef.current.has(id));
    if (need.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("scholarship_outcomes_bulk", { p_scholarship_ids: need });
      if (cancelled || error || !Array.isArray(data)) {
        // Cache empty entries for the requested ids so we don't re-query
        // a known-pre-migration RPC on every render.
        for (const id of need) outcomesCacheRef.current.set(id, { applied: 0, accepted: 0, inPipeline: 0 });
        return;
      }
      const seen = new Set<string>();
      for (const row of data as Array<{ scholarship_id: string; applied_count: number; accepted_count: number; in_pipeline_count: number }>) {
        outcomesCacheRef.current.set(row.scholarship_id, {
          applied: Number(row.applied_count ?? 0),
          accepted: Number(row.accepted_count ?? 0),
          inPipeline: Number(row.in_pipeline_count ?? 0),
        });
        seen.add(row.scholarship_id);
      }
      // Any requested ids the RPC didn't return = no rows = zeros.
      for (const id of need) if (!seen.has(id)) outcomesCacheRef.current.set(id, { applied: 0, accepted: 0, inPipeline: 0 });
      setOutcomesMap(new Map(outcomesCacheRef.current));
    })();
    return () => { cancelled = true; };
  }, [filtered]);

  /* My pipeline — count of scholarships per active status */
  const pipeline = useMemo(() => {
    const counts: Record<AppStatus, number> = { researching: 0, drafting: 0, submitted: 0, decision: 0, rejected: 0 };
    Object.values(statusMap).forEach(s => { counts[s] = (counts[s] ?? 0) + 1; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [statusMap]);

  /* Live collections from the ranked list + user profile */
  const liveCollections = useMemo(() => {
    return COLLECTIONS.map(def => {
      const items = ranked.filter(s => def.filter(s, profile) && !hidden.has(s.scholarship_id));
      const sorted = def.sort ? [...items].sort(def.sort) : items;
      return { def, items: sorted };
    }).filter(c => c.items.length >= (c.def.minItems ?? 1));
  }, [ranked, profile, hidden]);

  /* Similar scholarships — Crunchbase/IMDB \"You may also like\" pattern. */
  const similarToOpen = useMemo(() => {
    if (!openDetail) return [];
    return ranked
      .filter(s => s.scholarship_id !== openDetail.scholarship_id && !hidden.has(s.scholarship_id))
      .map(s => {
        let score = 0;
        if (s.host_country && s.host_country === openDetail.host_country) score += 3;
        if (s.selectivity === openDetail.selectivity) score += 2;
        if (s.target_fields && openDetail.target_fields && s.target_fields.some(f => openDetail.target_fields?.includes(f))) score += 2;
        if (s.coverage_type === openDetail.coverage_type) score += 1;
        if (s.target_degree_level && openDetail.target_degree_level && s.target_degree_level.some(d => openDetail.target_degree_level?.includes(d))) score += 1;
        return { s, score };
      })
      .filter(x => x.score >= 2)
      .sort((a, b) => b.score - a.score || b.s.match - a.s.match)
      .slice(0, 3)
      .map(x => x.s);
  }, [openDetail, ranked, hidden]);

  /* Browse-by-country aggregation — Spotify/Zillow-style geographic discovery */
  const byCountry = useMemo(() => {
    const map = new Map<string, { country: string; count: number; totalValue: number; topMatch: number }>();
    ranked.forEach(s => {
      if (!s.host_country || hidden.has(s.scholarship_id)) return;
      const cur = map.get(s.host_country) || { country: s.host_country, count: 0, totalValue: 0, topMatch: 0 };
      cur.count += 1;
      cur.totalValue += s.estimated_total_value_usd ?? 0;
      cur.topMatch = Math.max(cur.topMatch, s.match);
      map.set(s.host_country, cur);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [ranked, hidden]);

  const [openCollection, setOpenCollection] = useState<string | null>(null);
  const activeCollection = liveCollections.find(c => c.def.id === openCollection) ?? null;

  const activeFiltersCount = [filters.search !== "", filters.coverage !== "all", filters.degree !== "all", filters.selectivity !== "all", filters.field !== "all", filters.hostCountry !== "all", filters.demographic !== "all", filters.onlyEligible, filters.closingSoon].filter(Boolean).length;

  const analysisTexts = [
    `Scanning ${rows.length || 200}+ scholarships`,
    `Filtering by nationality${wiz.nationality ? `: ${wiz.nationality}` : ""}`,
    `Matching ${wiz.degrees.length > 0 ? wiz.degrees.join(" / ") : "your degree"} programs${wiz.field ? ` in ${wiz.field}` : ""}`,
    "Evaluating academic thresholds and selectivity",
    "Ranking your best opportunities",
  ];

  const dark = phase === "landing" || phase === "wizard" || phase === "analyzing";
  const totalVerified = rows.length || 200;

  return (
    <div className={`min-h-screen relative transition-colors duration-700 ${dark ? "" : "bg-background"}`}>
      {dark && <NavyBackdrop />}

      <div className="relative z-10">
        {/* Global Navigation everywhere EXCEPT the results phase. In
            results we're in app mode — the website's marketing nav
            competes with the actual product surface. We swap to a
            slim DiscoverAppBar that gives the same essential nav
            (home, account, language, escape-to-other-products) in
            half the height. Same pattern Linear / Notion / Stripe
            Dashboard use. */}
        {phase !== "results" && <Navigation language={language} />}
        {phase === "results" && <DiscoverAppBar language={language} />}

        <AnimatePresence mode="wait">
          {/* ══ LANDING ══ */}
          {phase === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center overflow-hidden">

              <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-4xl mx-auto relative z-10 space-y-9">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}
                  className="inline-flex items-center gap-2.5 bg-primary-foreground/[0.04] border border-primary-foreground/10 backdrop-blur-xl px-4 py-2 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                  </span>
                  <span className="text-primary-foreground/85 text-xs font-semibold tracking-wide">
                    Live scholarship database
                  </span>
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="font-heading text-[clamp(2.75rem,7vw,5.5rem)] font-bold text-primary-foreground leading-[1.02] tracking-[-0.03em]">
                  The scholarships<br />
                  <span className="text-gold">made for you.</span>
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.7 }}
                  className="text-primary-foreground/55 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-light">
                  Answer four questions. We rank every scholarship in our database against your profile and show how each one aligns with you.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7 }}
                  className="flex flex-col items-center gap-4 pt-2">
                  <Button variant="gold" size="lg" className="text-base px-12 py-7 hover:scale-[1.02] transition-transform gap-2.5" onClick={() => setPhase("wizard")}>
                    Find my scholarships
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center justify-center gap-5 text-xs text-primary-foreground/35 font-medium tracking-wide">
                    <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-gold" /> 2 minutes</span>
                    <span className="opacity-50">·</span>
                    <span>No account needed</span>
                    <span className="opacity-50">·</span>
                    <span>Free during beta</span>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ WIZARD ══ */}
          {phase === "wizard" && (
            <motion.div key="wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="relative min-h-[calc(100vh-64px)] flex flex-col">
              <div className="pt-7 px-6 flex items-center justify-between max-w-2xl mx-auto w-full relative z-10">
                <button onClick={() => wizardStep === 0 ? setPhase("landing") : setWizardStep(s => s - 1)} className="text-primary-foreground/40 hover:text-primary-foreground transition-colors p-2 -ml-2">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: WIZARD_STEPS }).map((_, i) => (
                    <div key={i} className="h-1 w-9 rounded-full bg-primary-foreground/10 overflow-hidden">
                      <motion.div className="h-full bg-gold"
                        initial={false}
                        animate={{ width: i < wizardStep ? "100%" : i === wizardStep ? "60%" : "0%" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  ))}
                </div>
                <span className="text-primary-foreground/40 text-xs tabular-nums font-medium tracking-wider">{wizardStep + 1} / {WIZARD_STEPS}</span>
              </div>

              <AnimatePresence mode="wait">
                {wizardStep === 0 && (
                  <motion.div key="ws0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-xl mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 1 · Hello</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">Let's start with you.</h2>
                    <p className="text-primary-foreground/50 mb-12 text-base">Just so we can save your matches.</p>
                    <div className="w-full space-y-5 text-left">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">Your name</label>
                        <Input value={wiz.fullName} onChange={e => setWiz(w => ({ ...w, fullName: e.target.value }))} placeholder="First name (optional)"
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 text-base backdrop-blur-md focus-visible:border-gold/50 focus-visible:bg-primary-foreground/[0.06] transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">Email</label>
                        <Input type="email" value={wiz.email} onChange={e => setWiz(w => ({ ...w, email: e.target.value }))} placeholder="you@email.com"
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 text-base backdrop-blur-md focus-visible:border-gold/50 focus-visible:bg-primary-foreground/[0.06] transition-colors" />
                      </div>
                    </div>
                    <Button variant="gold" size="lg" className="mt-10 px-12 gap-2 text-base" disabled={!wiz.email} onClick={() => setWizardStep(1)}>
                      Continue <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {wizardStep === 1 && (
                  <motion.div key="ws1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-xl mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 2 · Origin</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">Where are you from?</h2>
                    <p className="text-primary-foreground/50 mb-8 text-base max-w-md mx-auto">Your nationality unlocks the right eligibility. Type or pick — every country works.</p>

                    {/* Typeahead — single input that filters the full country
                        list. Click a result or press Enter to accept the typed
                        value. No country is restricted. */}
                    <div className="w-full">
                      <Input
                        value={wiz.nationality}
                        onChange={e => setWiz(w => ({ ...w, nationality: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && wiz.nationality.trim()) setWizardStep(2); }}
                        placeholder="Type your country (any)…"
                        className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30 h-14 text-base backdrop-blur-md focus-visible:border-gold/50"
                      />
                      {(() => {
                        const q = wiz.nationality.trim().toLowerCase();
                        // No "popular" label — there's no such thing as
                        // "popular nationalities" for the question
                        // "where are you from". When the input is empty,
                        // show 0 chips (cleaner) and let the user type.
                        const matches = q
                          ? ALL_COUNTRIES.filter(c => c.v.toLowerCase().includes(q)).slice(0, 12)
                          : [];
                        const exact = ALL_COUNTRIES.find(c => c.v.toLowerCase() === q);
                        return (
                          <div className="mt-4">
                            {q && matches.length > 0 && (
                              <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/35 text-left mb-2">Matches</p>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {matches.map(c => (
                                <button key={c.v} onClick={() => { setWiz(w => ({ ...w, nationality: c.v })); setWizardStep(2); }}
                                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all hover:scale-[1.03] active:scale-95 ${wiz.nationality.toLowerCase() === c.v.toLowerCase() ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] hover:border-primary-foreground/25 backdrop-blur-md"}`}>
                                  <span className="text-xl">{c.f}</span>
                                  <span className="text-[11px] font-medium leading-tight">{c.v}</span>
                                </button>
                              ))}
                            </div>
                            {q && matches.length === 0 && (
                              <p className="text-primary-foreground/45 text-sm mt-3">
                                No exact match — that's fine, your typed entry will be used.
                              </p>
                            )}
                            {wiz.nationality.trim() && (
                              <Button
                                variant="gold"
                                size="lg"
                                className="mt-6 px-12 gap-2"
                                onClick={() => setWizardStep(2)}
                              >
                                {exact ? `Continue as ${exact.v}` : `Continue with "${wiz.nationality.trim()}"`} <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div key="ws2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 3 · Path</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">What will you study?</h2>
                    <p className="text-primary-foreground/50 mb-10 text-base">Pick every level you're considering — multiple is fine.</p>
                    <div className="w-full grid grid-cols-3 gap-4 mb-10">
                      {DEGREES.map((d, i) => {
                        const selected = wiz.degrees.includes(d.v);
                        return (
                          <motion.button key={d.v} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            onClick={() => setWiz(w => ({
                              ...w,
                              degrees: w.degrees.includes(d.v)
                                ? w.degrees.filter(x => x !== d.v)
                                : [...w.degrees, d.v],
                            }))}
                            className={`relative flex flex-col items-center gap-2.5 p-6 rounded-3xl border transition-all hover:scale-[1.03] active:scale-95 ${selected ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] hover:border-primary-foreground/25 backdrop-blur-md"}`}>
                            {selected && (
                              <span className="absolute top-2 right-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-gold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <span className="text-4xl">{d.icon}</span>
                            <span className="font-semibold text-base">{d.l}</span>
                            <span className={`text-xs leading-tight ${selected ? "opacity-70" : "opacity-50"}`}>{d.d}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <AnimatePresence>
                      {wiz.degrees.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="w-full">
                          <p className="text-primary-foreground/50 text-sm mb-4">And your field?</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {FIELDS.map((f, i) => (
                              <motion.button key={f.v} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                onClick={() => setWiz(w => ({ ...w, field: f.v }))}
                                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-xs font-medium transition-all hover:scale-[1.04] whitespace-nowrap ${wiz.field === f.v ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] backdrop-blur-md"}`}>
                                <span>{f.i}</span><span>{f.v.split(" &")[0]}</span>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {wiz.degrees.length > 0 && wiz.field && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-7">
                          <Button variant="gold" size="lg" onClick={() => setWizardStep(3)} className="px-12 gap-2">
                            Continue <ArrowRight className="h-5 w-5" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {wizardStep === 3 && (
                  <motion.div key="ws3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 4 · Stats</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">Your scores.</h2>
                    <p className="text-primary-foreground/50 mb-10 text-base">Leave blank if you don't have them yet.</p>
                    <div className="w-full space-y-6 text-left">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">GPA</label>
                        <div className="flex gap-2">
                          <Input value={wiz.gpa} onChange={e => setWiz(w => ({ ...w, gpa: e.target.value }))} placeholder="e.g. 3.8"
                            className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 flex-1 backdrop-blur-md focus-visible:border-gold/50" />
                          <div className="flex rounded-xl overflow-hidden border border-primary-foreground/15 backdrop-blur-md">
                            {["/4.0", "/5.0", "/100"].map(s => (
                              <button key={s} onClick={() => setWiz(w => ({ ...w, gpaScale: s.slice(1) }))}
                                className={`px-4 text-xs font-semibold transition-colors ${wiz.gpaScale === s.slice(1) ? "bg-gold text-primary" : "bg-primary-foreground/[0.04] text-primary-foreground/60 hover:bg-primary-foreground/[0.08]"}`}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">IELTS</label>
                          <Input value={wiz.ielts} onChange={e => setWiz(w => ({ ...w, ielts: e.target.value }))} placeholder="e.g. 7.0"
                            className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md focus-visible:border-gold/50" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">TOEFL</label>
                          <Input value={wiz.toefl} onChange={e => setWiz(w => ({ ...w, toefl: e.target.value }))} placeholder="e.g. 100"
                            className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md focus-visible:border-gold/50" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">SAT (undergrad applicants)</label>
                        <Input value={wiz.sat} onChange={e => setWiz(w => ({ ...w, sat: e.target.value }))} placeholder="e.g. 1450"
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md focus-visible:border-gold/50" />
                      </div>
                      {/* Optional self-identification — surfaces extra match
                          boost on programs designed for these groups.
                          Multi-select chips; nothing required. */}
                      <div className="space-y-2 pt-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">Eligibility groups (optional)</label>
                        <p className="text-[11px] text-primary-foreground/40 -mt-1">Tap any that apply — surfaces programs designed for you.</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { v: "women", l: "Women" },
                            { v: "first-generation", l: "First-generation" },
                            { v: "low-income", l: "Need-based" },
                            { v: "refugee", l: "Refugee" },
                            { v: "indigenous", l: "Indigenous" },
                            { v: "lgbtq", l: "LGBTQ+" },
                            { v: "underrepresented-minority", l: "Underrepresented" },
                            { v: "disability", l: "Disability" },
                          ].map(d => {
                            const on = wiz.demographics.includes(d.v);
                            return (
                              <button
                                key={d.v}
                                type="button"
                                onClick={() => setWiz(w => ({
                                  ...w,
                                  demographics: on ? w.demographics.filter(x => x !== d.v) : [...w.demographics, d.v],
                                }))}
                                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors backdrop-blur-md ${
                                  on
                                    ? "bg-gold text-primary border border-gold"
                                    : "bg-primary-foreground/[0.04] text-primary-foreground/75 border border-primary-foreground/15 hover:bg-primary-foreground/[0.08]"
                                }`}
                              >
                                {d.l}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button variant="gold" size="lg" className="mt-10 px-12 gap-2 text-base" onClick={completeWizard}>
                      <Sparkles className="h-5 w-5" /> Reveal my matches
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══ ANALYZING ══ */}
          {phase === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
              className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center">
              <div className="max-w-md mx-auto space-y-12 relative z-10">
                <div className="relative inline-flex items-center justify-center mx-auto" style={{ width: 140, height: 140 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-dashed border-gold/30" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-3 rounded-full border border-dashed border-gold/15" />
                  <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-20 w-20 rounded-3xl bg-gradient-gold backdrop-blur flex items-center justify-center">
                    <Sparkles className="h-9 w-9 text-primary" />
                  </motion.div>
                </div>
                <div className="space-y-3">
                  <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight">Reading your profile...</h2>
                  <p className="text-primary-foreground/40 text-sm">This usually takes a few seconds.</p>
                </div>
                <div className="w-full bg-primary-foreground/8 rounded-full h-1 overflow-hidden">
                  <motion.div className="h-full bg-gold"
                    animate={{ width: `${Math.min((analysisStep / 5) * 100, 100)}%` }} transition={{ duration: 0.4 }} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p key={analysisStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="text-primary-foreground/65 text-sm font-mono tracking-wide">
                    {analysisTexts[Math.min(analysisStep, analysisTexts.length - 1)]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ══ RESULTS — distinctive app-shell experience ══ */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
              {/* Trending strip removed — felt tacky against the rest of
                  the navy/gold product chrome. Closest-deadline scholarships
                  still surface via the SavedDeadlineBanner and via the
                  sort-by-deadline option. */}

              {/* ─── Profile context strip — branches based on whether the
                  user has profile data. When profile is filled: chips
                  showing the user's scoring inputs + "Edit" affordance.
                  When empty: a "Build profile" CTA so the user has a
                  one-click path to fit-driven bucketing instead of just
                  browsing the entire DB blind. */}
              {(() => {
                const isProfileFilled = !!(
                  profile.country ||
                  (profile.degrees && profile.degrees.length > 0) ||
                  profile.field ||
                  profile.gpa ||
                  profile.ielts
                );
                // Country flag emoji — null when the user typed something
                // we don't have in ALL_COUNTRIES (e.g. "Other"), in which
                // case the chip falls back to text-only.
                const countryFlag = profile.country
                  ? ALL_COUNTRIES.find(c => c.v.toLowerCase() === profile.country.toLowerCase())?.f ?? null
                  : null;
                const fieldEmoji = profile.field
                  ? FIELDS.find(f => f.v === profile.field)?.i ?? null
                  : null;
                const countryAccent = accentForCountry(profile.country);
                return (
                  <div className="relative bg-canvas-soft/60 border-b border-border/60 overflow-hidden">
                    {/* Brand mark moved to the sticky DiscoverAppBar
                        above — this page strip now focuses solely on
                        the student's identity (profile chips) so the
                        space reads less like "another website header"
                        and more like "your context for this view".
                        Generous py-5 keeps comfortable breathing room
                        between the app bar and the content below. */}
                    <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-5 sm:py-6 flex items-center gap-2 flex-wrap">
                      {/* Profile chips OR call-to-build-profile.
                          Profile chips lean into personal identity:
                          gradient passport-style country chip with a
                          flag, field chip with a domain emoji, and
                          quieter stats. Reads as "the platform sees me"
                          rather than "filter values applied". */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                        {isProfileFilled ? (
                          <>
                            {profile.country && (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${countryAccent} shadow-sm`}>
                                {countryFlag && <span className="text-sm leading-none">{countryFlag}</span>}
                                {profile.country}
                              </span>
                            )}
                            {profile.degrees && profile.degrees.length > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-foreground/85 bg-card border border-border px-2 py-1 rounded-full font-medium">
                                <GraduationCap className="h-3 w-3 text-gold-dark" />
                                {profile.degrees.join(" / ")}
                              </span>
                            )}
                            {profile.field && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-foreground/85 bg-card border border-border px-2 py-1 rounded-full font-medium">
                                {fieldEmoji && <span className="leading-none">{fieldEmoji}</span>}
                                {profile.field}
                              </span>
                            )}
                            {profile.gpa && (
                              <span className="inline-flex items-center text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md font-medium tabular-nums">
                                GPA {profile.gpa}/{profile.gpaScale}
                              </span>
                            )}
                            {profile.ielts && (
                              <span className="inline-flex items-center text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md font-medium tabular-nums">
                                IELTS {profile.ielts}
                              </span>
                            )}
                            <button onClick={resetProfile} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 underline-offset-4 hover:underline ml-1">
                              Edit
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setPhase("wizard")}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark hover:text-foreground transition-colors group"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Build profile to see fit scoring
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Curated collections — preset filter combos for natural
                  search intents, rendered as compact text-pills below the
                  profile strip and above the sticky toolbar. Earlier
                  iteration used a large tile grid + a separate
                  OpportunityMap stat strip, which pushed actual results
                  past the fold and competed with the toolbar count. The
                  pill rail keeps the same intents but stays visually
                  light — text + count, no gradients, no heavy borders. */}
              {!loading && ranked.length > 0 && (
                <CuratedCollections
                  rows={ranked}
                  onApply={(patch) => setFilters(f => ({ ...f, ...patch as Partial<FilterState> }))}
                />
              )}

              {/* Sticky toolbar — search · filters · sort · view-mode · hidden · compare.
                  Sticks below the global Nav (h-16 = 64px) so the filter row is always
                  reachable while scrolling. The navy app title bar + filter-chip context
                  strip above it are intentionally non-sticky — they scroll away once
                  the user starts working. */}
              <div className="sticky top-16 z-30 bg-background/92 backdrop-blur-xl border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.02)]">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 py-3 flex items-center gap-2.5 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input ref={searchInputRef} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search names, providers, fields, tags…   (/ to focus)"
                      className="pl-10 h-10 text-sm rounded-lg" />
                    {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                  </div>

                  <Button variant="outline" size="default" className="lg:hidden gap-1.5 h-10 rounded-lg" onClick={() => setFiltersOpen(true)}>
                    <Filter className="h-4 w-4" />Filters{activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-gold/20 text-gold-dark dark:text-gold border-0 ml-0.5">{activeFiltersCount}</Badge>}
                  </Button>

                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                    <SelectTrigger className="w-[156px] h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">Best match</SelectItem>
                      <SelectItem value="deadline">Deadline first</SelectItem>
                      <SelectItem value="value">Highest value</SelectItem>
                      <SelectItem value="selectivity">Most accessible</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View-mode segmented control — only meaningful in
                      Browse. Shortlist + Pipeline always render as a
                      list regardless of viewMode (the underlying
                      branches at L3193+ ignore it), and Collections
                      render their own tile grid. Showing a clickable-
                      but-no-op toggle in those sections was misleading. */}
                  {appSection === "browse" && (
                    <div className="inline-flex h-10 items-center rounded-lg border border-border bg-card overflow-hidden" role="tablist" aria-label="View mode">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`h-full px-3 text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === "grid" ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        aria-pressed={viewMode === "grid"}
                        title="Grid view"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">Grid</span>
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`h-full px-3 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-border ${viewMode === "list" ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        aria-pressed={viewMode === "list"}
                        title="List view"
                      >
                        <List className="h-3.5 w-3.5" /><span className="hidden sm:inline">List</span>
                      </button>
                    </div>
                  )}

                  {/* Compare button — opens drawer */}
                  {compareSet.size > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      className="h-10 rounded-lg gap-1.5 border-gold/40 text-gold-dark hover:bg-gold/10"
                      onClick={() => setCompareOpen(true)}
                    >
                      <Columns3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Compare</span>
                      <Badge className="h-5 px-1.5 text-[10px] bg-gold text-primary border-0">{compareSet.size}</Badge>
                    </Button>
                  )}

                  {/* Hidden toggle */}
                  {hidden.size > 0 && (
                    <Button
                      variant="ghost"
                      size="default"
                      className="h-10 rounded-lg gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowHidden(v => !v)}
                      title={showHidden ? "Hide hidden" : "Show hidden"}
                    >
                      {showHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{hidden.size} hidden</span>
                    </Button>
                  )}

                  {/* Counts intentionally hidden in Browse — the
                      database is large enough to be useful but not
                      large enough to flex a number. Keep them in the
                      Pipeline + Shortlist columns where the count
                      means "I have N saves to act on" — that's
                      personal-progress, not marketing. */}
                </div>
              </div>

              {/* Results body */}
              <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 sm:py-12">
                <div className="flex gap-8">
                  {/* ─── SIDEBAR — Discover navigation rail ─── */}
                  <aside className="hidden lg:block w-[232px] shrink-0">
                    <div className="sticky top-24 space-y-3.5">
                      <nav className="bg-card border border-border rounded-2xl p-3 shadow-sm">
                        {([
                          // Two surfaces: Browse the database, or
                          // review what you've Saved. The Quick filter
                          // chip rail at the top of the grid replaces
                          // what "Collections" used to do — the two
                          // were doing the same job (preset filter
                          // combos) and the rail entry was visual
                          // duplication. Pipeline removed earlier;
                          // tracking lives on /pipeline.
                          { id: "browse" as AppSection,      label: "Browse",       icon: Layers,        count: 0 },
                          { id: "shortlist" as AppSection,   label: "Shortlist",    icon: BookmarkCheck, count: shortlist.size,  accent: shortlist.size > 0 },
                        ]).map(item => {
                          const Icon = item.icon;
                          const active = appSection === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setAppSection(item.id)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                active
                                  ? "bg-foreground/[0.05] text-foreground font-semibold"
                                  : "text-foreground/65 hover:bg-foreground/[0.025] hover:text-foreground"
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <Icon className={`h-4 w-4 ${active ? "text-gold-dark" : "text-muted-foreground"}`} />
                                {item.label}
                              </span>
                              {item.count > 0 && (
                                <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded font-medium ${
                                  active ? "bg-gold/15 text-gold-dark" : item.accent ? "bg-gold/10 text-gold-dark" : "bg-muted/50 text-muted-foreground"
                                }`}>
                                  {item.count}
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {compareSet.size > 0 && (
                          <>
                            <div className="my-2 mx-2 h-px bg-border/50" />
                            <button
                              onClick={() => setCompareOpen(true)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-gold-dark bg-gold/8 hover:bg-gold/12 transition-colors"
                            >
                              <span className="flex items-center gap-2.5">
                                <Columns3 className="h-4 w-4" />
                                Compare
                              </span>
                              <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded bg-gold/20 font-semibold">{compareSet.size}</span>
                            </button>
                          </>
                        )}

                      </nav>

                      {/* Filters panel */}
                      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" />Refine</h3>
                          {activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-gold/20 text-gold-dark dark:text-gold border-0">{activeFiltersCount}</Badge>}
                        </div>
                        <FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} hostCountries={hostCountries} fieldsAvailable={fieldsAvailable} />
                      </div>

                      {/* Founding membership card — visible always (until user is a member) */}
                      {!isMember && foundingLeft && foundingLeft.left > 0 && (
                        <button
                          onClick={() => navigate("/pricing")}
                          className="block w-full text-left rounded-2xl bg-primary text-primary-foreground p-4 hover:shadow-md transition-shadow relative overflow-hidden group"
                        >
                          <div className="absolute -top-1/3 right-0 w-1/2 h-full rounded-full blur-[60px] opacity-20" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />
                          <div className="relative">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light mb-2">
                              <Sparkles className="h-3 w-3" /> Founding Pro
                            </div>
                            <p className="font-heading font-bold text-sm leading-tight mb-1">Unlock the full database + workshops with our founders.</p>
                            <p className="text-[11px] text-primary-foreground/65 mb-3">Lifetime price lock. Capped at {foundingLeft.cap} members.</p>
                            <div className="h-1.5 rounded-full bg-primary-foreground/15 overflow-hidden mb-2">
                              <div className="h-full bg-gold-light" style={{ width: `${((foundingLeft.cap - foundingLeft.left) / foundingLeft.cap) * 100}%` }} />
                            </div>
                            <p className="text-[11px] text-primary-foreground/80 tabular-nums flex items-center justify-between">
                              <span><span className="font-semibold text-gold-light">{foundingLeft.left}</span> spots left</span>
                              <span className="text-gold-light font-medium">See pricing →</span>
                            </p>
                          </div>
                        </button>
                      )}

                      {isMember && (
                        <div className="rounded-xl border border-gold/30 bg-gold/8 px-3 py-2.5 flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-gold-dark" />
                          <span className="text-[11px] font-semibold text-gold-dark">{subscription.tier === "founding" ? "Founding member" : "Pro member"}</span>
                        </div>
                      )}

                      {/* Local-state indicator — app feel */}
                      <div className="text-[10px] text-muted-foreground/70 px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          {shortlist.size + Object.keys(statusMap).length + Object.keys(notesMap).length} items saved locally
                          {!isMember && shortlist.size >= SHORTLIST_FREE_LIMIT && (
                            <span className="text-warning"> · saves locked</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </aside>

                  <main className="flex-1 min-w-0">
                    {loading ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-card border border-border rounded-3xl animate-pulse" />)}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="border border-dashed border-border rounded-3xl p-12 sm:p-16 text-center bg-muted/10">
                        <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="font-heading font-semibold text-lg text-foreground mb-1.5">Nothing matches these filters</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                          Loosen a filter, or — if you know a scholarship that fits but we're missing it — submit it. Approved submissions land in the database within 72 hours.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                            Clear filters
                          </Button>
                          <Button asChild variant="gold" size="sm" className="gap-1.5">
                            <Link to={language === "ru" ? "/submit/ru" : "/submit"}>
                              <Sparkles className="h-3.5 w-3.5" />
                              Submit a scholarship
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {/* Section header — context for the active workspace section */}
                        {appSection !== "browse" && (
                          <div className="flex items-baseline justify-between pb-5 border-b border-border/60">
                            <div>
                              <p className="text-gold-dark text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">
                                {appSection === "shortlist" ? "Shortlist" : "Collections"}
                              </p>
                              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                                {appSection === "shortlist" ? "Saved scholarships" : "Collections"}
                              </h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                {appSection === "shortlist"
                                  ? "Scholarships you've bookmarked. Save more from any view."
                                  : "Pre-built lists organized by application strategy."}
                              </p>
                            </div>
                            <button onClick={() => setAppSection("browse")} className="text-xs text-muted-foreground hover:text-gold-dark transition-colors">← Back to browse</button>
                          </div>
                        )}

                        {/* Shortlist — filter to bookmarked items, render as list */}
                        {appSection === "shortlist" && (() => {
                          const items = filtered.filter(s => shortlist.has(s.scholarship_id));
                          if (items.length === 0) {
                            return (
                              <div className="border border-dashed border-border rounded-3xl p-14 text-center bg-canvas-soft/40">
                                <BookmarkCheck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                                <h3 className="font-heading font-semibold text-lg text-foreground mb-1.5">
                                  No saved scholarships yet
                                </h3>
                                <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                                  Bookmark any scholarship and it'll appear here.
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setAppSection("browse")}>Back to browse</Button>
                              </div>
                            );
                          }
                          const cp = (s: Scored, i: number) => ({
                            key: s.scholarship_id, s, index: i,
                            onSelect: () => setOpenDetail(s),
                            isBookmarked: shortlist.has(s.scholarship_id),
                            onBookmark: (e: React.MouseEvent) => { e.stopPropagation(); toggleBookmark(s.scholarship_id); },
                            status: statusMap[s.scholarship_id],
                            onStatusChange: (st: AppStatus | null) => setStatus(s.scholarship_id, st),
                            isHidden: hidden.has(s.scholarship_id),
                            onToggleHide: (e: React.MouseEvent) => { e.stopPropagation(); toggleHide(s.scholarship_id); },
                            isComparing: compareSet.has(s.scholarship_id),
                            onToggleCompare: (e: React.MouseEvent) => { e.stopPropagation(); toggleCompare(s.scholarship_id); },
                            outcomes: outcomesMap.get(s.scholarship_id),
                          });
                          // List-mode column header is intentionally label-only.
                          // Sort is driven by the dropdown above the grid —
                          // one source of truth, no broken-feeling chevrons
                          // suggesting click-to-sort that wasn't reliable.
                          return (
                            <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
                              <div className="hidden sm:grid grid-cols-[52px,minmax(0,3fr),minmax(0,1.4fr),minmax(0,0.8fr),auto] items-center gap-4 px-4 py-2.5 border-b border-border bg-canvas-soft/50 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                <span className="text-center">Score</span>
                                <span>Scholarship</span>
                                <span>Award · Deadline</span>
                                <span>Status</span>
                                <span className="text-right pr-2">Actions</span>
                              </div>
                              {items.map((s, i) => <ScholarRow {...cp(s, i)} />)}
                            </div>
                          );
                        })()}

                        {/* Collections — full layout when explicitly visiting that section */}
                        {appSection === "collections" && liveCollections.length > 0 && (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {liveCollections.map((c, i) => {
                              const Icon = c.def.icon;
                              const description = typeof c.def.description === "function" ? c.def.description(profile) : c.def.description;
                              return (
                                <motion.button
                                  key={c.def.id}
                                  initial={{ opacity: 0, y: 14 }}
                                  whileInView={{ opacity: 1, y: 0 }}
                                  viewport={{ once: true, margin: "-30px" }}
                                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.5 }}
                                  onClick={() => setOpenCollection(c.def.id)}
                                  className="group relative text-left bg-card border border-border/70 hover:border-gold/30 hover:shadow-md rounded-2xl p-6 transition-all"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-5">
                                    <div className={`h-11 w-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 ${c.def.accentClass}`}>
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-2xl font-bold tabular-nums text-foreground/40">{c.items.length.toString().padStart(2, "0")}</span>
                                  </div>
                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] mb-1 ${c.def.accentClass}`}>{c.def.kicker}</p>
                                  <h3 className="font-heading font-bold text-lg text-foreground tracking-tight mb-2 leading-tight">{c.def.title}</h3>
                                  <p className="text-sm text-muted-foreground leading-[1.6] mb-5">{description}</p>
                                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors">
                                    View {c.items.length} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}

                        {/* The Browse view used to render a full Collections
                            grid here ("Pre-built lists for different
                            application strategies", 8 editorial-card tiles)
                            plus the sticky sidebar's "Collections" tab —
                            two surfaces for the same data. Removed the
                            in-browse render so Browse is just: spotlight +
                            cards. The Collections tab in the workspace nav
                            still surfaces the full list with the same
                            opening drawer behaviour, so the editorial
                            curation is one click away, not stacked on top
                            of the actual results. */}

                        {appSection === "browse" && (() => {
                          const cardProps = (s: Scored, i: number) => ({
                            key: s.scholarship_id, s, index: i,
                            onSelect: () => setOpenDetail(s),
                            isBookmarked: shortlist.has(s.scholarship_id),
                            onBookmark: (e: React.MouseEvent) => { e.stopPropagation(); toggleBookmark(s.scholarship_id); },
                            status: statusMap[s.scholarship_id],
                            onStatusChange: (st: AppStatus | null) => setStatus(s.scholarship_id, st),
                            isHidden: hidden.has(s.scholarship_id),
                            onToggleHide: (e: React.MouseEvent) => { e.stopPropagation(); toggleHide(s.scholarship_id); },
                            isComparing: compareSet.has(s.scholarship_id),
                            onToggleCompare: (e: React.MouseEvent) => { e.stopPropagation(); toggleCompare(s.scholarship_id); },
                            outcomes: outcomesMap.get(s.scholarship_id),
                          });

                          if (viewMode === "list") {
                            // Header is label-only — sort is driven by the
                            // dropdown above the grid (one source of truth).
                            return (
                              <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
                                <div className="hidden sm:grid grid-cols-[52px,minmax(0,3fr),minmax(0,1.4fr),minmax(0,0.8fr),auto] items-center gap-4 px-4 py-2.5 border-b border-border bg-canvas-soft/50 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  <span className="text-center">Score</span>
                                  <span>Scholarship</span>
                                  <span>Award · Deadline</span>
                                  <span>Status</span>
                                  <span className="text-right pr-2">Actions</span>
                                </div>
                                {filtered.map((s, i) => <ScholarRow {...cardProps(s, i)} />)}
                              </div>
                            );
                          }

                          // Grid view — three sections by priority when the
                          // user has profile signal driving the bucketing.
                          // Without profile signal, every row falls into
                          // sections.stretch with the "Selective" subtitle —
                          // misleading for unprofiled users since we're not
                          // declaring those rows selective, we just don't
                          // know enough about them to bucket. Detect that
                          // case (no rows in strong/competitive) and render
                          // the cards as one undifferentiated grid with a
                          // neutral "All scholarships" header instead.
                          const hasProfileBucketing = sections.strong.length > 0 || sections.competitive.length > 0;
                          if (!hasProfileBucketing && sections.stretch.length > 0) {
                            return (
                              <section>
                                <SectionHeader
                                  kicker="Database"
                                  title="All scholarships"
                                  subtitle="Build your profile (top right) to see which ones fit you best."
                                  accentClass="text-foreground/60"
                                />
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                                  {sections.stretch.map((s, i) => <ScholarCard {...cardProps(s, i)} />)}
                                </div>
                              </section>
                            );
                          }
                          return (
                            <>
                              {/* Section headers reworked in round 6 — earlier
                                  copy ('Within reach' / 'Aim high') made
                                  predictive claims from a thin profile and
                                  set a flat-affect tone for highly-selective
                                  rows. New copy describes WHAT the bucket
                                  is (alignment with profile signals), not
                                  WHETHER the user is likely to win. */}
                              {sections.strong.length > 0 && (
                                <section>
                                  <SectionHeader kicker="Strong fit" title="These align with your profile" subtitle="Your stated nationality, level, and field overlap with the program's audience."
                                    count={sections.strong.length} accentClass="text-gold-dark dark:text-gold" />
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                                    {sections.strong.map((s, i) => <ScholarCard {...cardProps(s, i)} />)}
                                  </div>
                                </section>
                              )}

                              {sections.competitive.length > 0 && (
                                <section>
                                  <SectionHeader kicker="Worth a closer look" title="Selective programs that match your direction" subtitle="Some thresholds are tight — read the requirements before drafting."
                                    count={sections.competitive.length} accentClass="text-primary dark:text-primary-bright" />
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                                    {sections.competitive.map((s, i) => <ScholarCard {...cardProps(s, i)} />)}
                                  </div>
                                </section>
                              )}

                              {sections.stretch.length > 0 && (
                                <section>
                                  <SectionHeader kicker="Flagship programs" title="The rest of the catalog" subtitle="Highly selective on paper. People do win these every year."
                                    count={sections.stretch.length} accentClass="text-muted-foreground" />
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                                    {sections.stretch.map((s, i) => <ScholarCard {...cardProps(s, i)} />)}
                                  </div>
                                </section>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </main>
                </div>
              </div>

              {/* Footer intentionally omitted from the results phase —
                  the user is in app-mode (filters + cards + sheet) and
                  the global website footer competes with that focus.
                  Site nav stays at the top so they can still escape. */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky shortlist FAB */}
        <AnimatePresence>
          {phase === "results" && shortlist.size > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 30, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              onClick={() => setShortlistOpen(true)}
              className="fixed bottom-6 right-6 z-40 bg-gold text-primary font-bold pl-5 pr-4 py-3.5 rounded-2xl shadow-lg hover:scale-[1.03] transition-transform flex items-center gap-3"
            >
              <BookmarkCheck className="h-5 w-5" />
              <div className="text-left">
                <div className="text-sm font-bold leading-none">My shortlist</div>
                <div className="text-[11px] font-medium opacity-70 mt-0.5">{shortlist.size} saved</div>
              </div>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── COMPARE DRAWER — side-by-side comparison of up to 3 scholarships ── */}
        <Sheet open={compareOpen} onOpenChange={setCompareOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[1100px] overflow-y-auto p-0">
            <div className="px-7 py-6 border-b border-border bg-canvas-soft sticky top-0 z-10 backdrop-blur">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
                  <Columns3 className="h-5 w-5 text-gold-dark" /> Compare scholarships · {compareSet.size}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">Side-by-side breakdown. Up to three at a time.</p>
              </SheetHeader>
            </div>

            <div className="p-5">
              {compareSet.size === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Click the <GitCompare className="h-3.5 w-3.5 inline mx-0.5" /> icon on any card to add it here.
                </p>
              ) : (() => {
                const items = ranked.filter(s => compareSet.has(s.scholarship_id));
                /* Pretty-print a row's "min academic requirements" as one
                 * compact line — was four separate rows that were almost
                 * always all em-dashes. Now one line ("GPA ≥ 3.5/4.0 ·
                 * IELTS ≥ 7.0") for whatever's actually populated. */
                const minRequirements = (s: Scored): React.ReactNode => {
                  const parts: string[] = [];
                  if (s.min_gpa != null) parts.push(`GPA ≥ ${s.min_gpa}/${s.gpa_scale ?? 4.0}`);
                  if (s.min_ielts != null) parts.push(`IELTS ≥ ${s.min_ielts}`);
                  if (s.min_toefl != null) parts.push(`TOEFL ≥ ${s.min_toefl}`);
                  if (s.min_sat != null) parts.push(`SAT ≥ ${s.min_sat}`);
                  if (parts.length === 0) return <span className="text-muted-foreground/60">No published threshold</span>;
                  return parts.join(" · ");
                };
                /* Rows are defined with an `isEmpty` predicate so we can
                 * skip rendering rows where every compared scholarship
                 * returns a "—" — that was 60% of the screen real estate
                 * for the typical comparison. */
                const dash = (v: unknown) => !v || (typeof v === "object" && v !== null && "props" in (v as { props?: unknown }) && ((v as { props?: { children?: unknown } }).props?.children === "—"));
                const rows: { label: string; render: (s: Scored) => React.ReactNode; isEmpty?: (s: Scored) => boolean }[] = [
                  { label: "Match score", render: s => <span className="font-bold text-lg tabular-nums text-foreground">{s.match}<span className="text-muted-foreground/60 text-sm font-normal">/100</span></span> },
                  // Tier dropped — overlapped Selectivity. Selectivity is
                  // an objective rating from the scholarship's data; Tier
                  // was a derived label off the same data.
                  { label: "Selectivity", render: s => <SelectivityChip level={s.selectivity} />, isEmpty: s => s.selectivity === "unknown" },
                  { label: "Award", render: s => s.award_amount_text ? s.award_amount_text : (compactAward(s) || COVERAGE_LABEL[s.coverage_type] || "—"), isEmpty: s => !s.award_amount_text && !COVERAGE_LABEL[s.coverage_type] },
                  { label: "Total value", render: s => s.estimated_total_value_usd ? <span className="text-gold-dark font-bold">{fmtValue(s.estimated_total_value_usd)}</span> : "—", isEmpty: s => !s.estimated_total_value_usd },
                  { label: "Deadline", render: s => {
                      const dl = deadlineDisplay(s.application_deadline);
                      return <span className={dl.cls}>{dateOnly(s.application_deadline) || dl.text} {s.application_deadline && <span className="text-muted-foreground/70 text-xs ml-1">({dl.text})</span>}</span>;
                    }
                  },
                  // Single consolidated row for academic minimums — was
                  // four separate rows with almost no signal across them.
                  { label: "Min requirements", render: minRequirements, isEmpty: s => s.min_gpa == null && s.min_ielts == null && s.min_toefl == null && s.min_sat == null },
                  { label: "Eligibility", render: s => isInclusive(s.citizenship_requirements) ? <span className="text-success">Open to all</span> : (s.citizenship_requirements || <span className="text-muted-foreground/60">—</span>), isEmpty: s => !s.citizenship_requirements },
                  { label: "Degree levels", render: s => s.target_degree_level?.map(humanizeDegree).join(", ") || <span className="text-muted-foreground/60">—</span>, isEmpty: s => !s.target_degree_level || s.target_degree_level.length === 0 },
                  { label: "Fields funded", render: s => s.target_fields?.length ? s.target_fields.slice(0, 3).map(humanize).join(", ") + (s.target_fields.length > 3 ? `, +${s.target_fields.length - 3}` : "") : <span className="text-muted-foreground/60">—</span>, isEmpty: s => !s.target_fields || s.target_fields.length === 0 },
                  { label: "Application fee", render: s => s.application_fee_text || <span className="text-muted-foreground/60">—</span>, isEmpty: s => !s.application_fee_text },
                  { label: "Effort level", render: s => s.effort_level ? <span>{humanize(s.effort_level)}</span> : <span className="text-muted-foreground/60">—</span>, isEmpty: s => !s.effort_level },
                  { label: "Essay required", render: s => s.essay_required ? <span className="text-warning">Yes</span> : <span className="text-success">No</span>, isEmpty: s => s.essay_required == null },
                  { label: "Interview", render: s => s.interview_required ? <span className="text-warning">Yes</span> : <span className="text-success">No</span>, isEmpty: s => s.interview_required == null },
                  { label: "Rec letters", render: s => s.recommendation_letters_required ?? <span className="text-muted-foreground/60">—</span>, isEmpty: s => s.recommendation_letters_required == null },
                  { label: "Partner unis", render: s => s.partner_universities?.length ?? <span className="text-muted-foreground/60">—</span>, isEmpty: s => !s.partner_universities || s.partner_universities.length === 0 },
                ];
                /* Hide rows that are empty for ALL compared scholarships.
                 * If even one has data, the row stays so the difference
                 * is visible — the whole point of compare. */
                const visibleRows = rows.filter(r => !r.isEmpty || items.some(s => !r.isEmpty!(s)));
                void dash; // noop reserved for future "all dashes" detection

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground py-3 pr-4 align-top w-[120px] sticky left-0 bg-background z-10">Field</th>
                          {items.map(s => {
                            const cmpAccent = accentForCountry(s.host_country);
                            const cmpFullRide = s.coverage_type === "full_ride";
                            return (
                              <th key={s.scholarship_id} className="text-left p-4 align-top min-w-[260px] border-l border-border/60">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  {/* Country gradient + landmark — same
                                      visual language as the rows/cards.
                                      Replaces the meaningless 2-letter
                                      initial avatar (MO / UO / etc.). */}
                                  <div className={`relative h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-br ${cmpAccent} shrink-0 ${cmpFullRide ? "ring-2 ring-gold/40" : ""}`}>
                                    <CountryArt country={s.host_country} className="absolute inset-0 h-full w-full opacity-50 text-white p-1" />
                                    {cmpFullRide && (
                                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-gold border border-card">
                                        <Award className="h-2.5 w-2.5 text-primary" />
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => toggleCompare(s.scholarship_id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1"
                                    aria-label="Remove from compare"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <h3 className="font-heading font-bold text-base text-foreground tracking-tight leading-tight line-clamp-2 mb-1">
                                  {cleanScholarshipName(s.scholarship_name)}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">{[cleanProvider(s.provider_name), s.host_country && shortCountry(s.host_country)].filter(Boolean).join(" · ")}</p>
                                <div className="flex gap-2 mt-3">
                                  <Button variant="gold" size="sm" className="text-xs h-7 px-3" onClick={() => { setOpenDetail(s); setCompareOpen(false); }}>
                                    Strategy
                                  </Button>
                                  {s.official_url && (
                                    <Button variant="outline" size="sm" className="text-xs h-7 px-2.5" asChild>
                                      <a href={s.official_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((r, i) => (
                          <tr key={i} className="border-t border-border/60">
                            <td className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em] py-3 pr-4 align-top sticky left-0 bg-background z-10">{r.label}</td>
                            {items.map(s => (
                              <td key={s.scholarship_id} className="text-[13px] text-foreground/85 p-4 align-top border-l border-border/60 leading-relaxed">
                                {r.render(s)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex justify-end mt-5 pt-4 border-t border-border/60">
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setCompareSet(new Set()); }}>
                        <X className="h-3 w-3 mr-1" /> Clear all
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </SheetContent>
        </Sheet>

        {/* Shortlist sheet */}
        <Sheet open={shortlistOpen} onOpenChange={setShortlistOpen}>
          <SheetContent side="right" className="w-full sm:w-[460px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-gold" /> Your shortlist · {shortlist.size}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">Saved scholarships you want to apply to.</p>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {ranked.filter(s => shortlist.has(s.scholarship_id)).map(s => {
                const tier = TIER[s.priority];
                const dl = deadlineDisplay(s.application_deadline);
                return (
                  <button key={s.scholarship_id}
                    onClick={() => { setOpenDetail(s); setShortlistOpen(false); }}
                    className="w-full text-left bg-card border border-border rounded-2xl p-3.5 hover:border-gold/40 hover:shadow-md transition-all flex items-start gap-3 group">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tier.grad} flex items-center justify-center text-[13px] font-bold text-white shrink-0 tracking-tight`}>{initials(s.provider_name || s.scholarship_name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-sm text-foreground line-clamp-1">{s.scholarship_name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-bold text-foreground bg-muted px-2 py-0.5 rounded-md tabular-nums">{s.match} match</span>
                        <span className={`text-[11px] font-medium ${dl.cls}`}>· {dl.text}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} className="text-muted-foreground hover:text-destructive p-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </button>
                );
              })}
              {shortlist.size === 0 && (
                <div className="py-8">
                  <p className="text-sm text-muted-foreground text-center mb-1">{language === "ru" ? "Нет сохранённых стипендий." : "No saved scholarships yet."}</p>
                  <p className="text-xs text-muted-foreground/70 text-center">{language === "ru" ? "Тапните на сердечко на любой карточке чтобы сохранить." : "Tap the heart on any card to save it here."}</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── COLLECTION DRAWER — opens when a curated collection is clicked ── */}
        <Sheet open={!!activeCollection} onOpenChange={(o) => !o && setOpenCollection(null)}>
          <SheetContent side="right" className="w-full sm:max-w-[700px] overflow-y-auto p-0 flex flex-col">
            {activeCollection && (() => {
              const Icon = activeCollection.def.icon;
              const description = typeof activeCollection.def.description === "function" ? activeCollection.def.description(profile) : activeCollection.def.description;
              return (
                <>
                  <div className="px-7 py-7 border-b border-border bg-canvas-soft sticky top-0 z-10 backdrop-blur">
                    <div className="flex items-start gap-4">
                      <div className={`h-11 w-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 ${activeCollection.def.accentClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <SheetHeader>
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${activeCollection.def.accentClass} mb-1`}>{activeCollection.def.kicker}</p>
                          <SheetTitle className="font-heading text-2xl tracking-tight leading-tight text-foreground text-left">{activeCollection.def.title}</SheetTitle>
                          <p className="text-sm text-muted-foreground leading-relaxed text-left">{description}</p>
                        </SheetHeader>
                      </div>
                      <span className="text-3xl font-bold tabular-nums text-foreground/30 shrink-0">{activeCollection.items.length.toString().padStart(2, "0")}</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-card">
                    {activeCollection.items.map((s, i) => (
                      <ScholarRow
                        key={s.scholarship_id}
                        s={s}
                        index={i}
                        onSelect={() => { setOpenDetail(s); setOpenCollection(null); }}
                        isBookmarked={shortlist.has(s.scholarship_id)}
                        onBookmark={(e) => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }}
                        status={statusMap[s.scholarship_id]}
                        onStatusChange={(st) => setStatus(s.scholarship_id, st)}
                        isHidden={hidden.has(s.scholarship_id)}
                        onToggleHide={(e) => { e.stopPropagation(); toggleHide(s.scholarship_id); }}
                        isComparing={compareSet.has(s.scholarship_id)}
                        onToggleCompare={(e) => { e.stopPropagation(); toggleCompare(s.scholarship_id); }}
                      />
                    ))}
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>

        {/* ── PAYWALL PROMPT — appears on shortlist limit / strategy lock ── */}
        <Sheet open={!!paywallOpen} onOpenChange={(o) => !o && setPaywallOpen(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
            <div className="relative bg-primary text-primary-foreground px-7 pt-9 pb-7 overflow-hidden">
              <div className="absolute -top-1/3 left-1/4 w-2/3 h-full rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />
              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/30 px-3 py-1 rounded-full mb-5">
                  <Sparkles className="h-3 w-3 text-gold-light" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">Founding Pro</span>
                </div>
                <SheetHeader>
                  <SheetTitle className="font-heading text-2xl text-primary-foreground tracking-tight leading-tight text-left">
                    {paywallOpen === "shortlist" && `Save more than ${SHORTLIST_FREE_LIMIT} scholarships.`}
                    {paywallOpen === "strategy" && "Unlock the full strategy."}
                    {paywallOpen === "compare" && "Compare more than 2 scholarships."}
                  </SheetTitle>
                  <p className="text-primary-foreground/65 text-sm leading-relaxed pt-1 text-left">
                    {paywallOpen === "shortlist" && `You've saved your free ${SHORTLIST_FREE_LIMIT}. Founding Pro members keep an unlimited shortlist plus per-scholarship status tracking and notes.`}
                    {paywallOpen === "strategy" && "Strategy notes — ideal-candidate profile, how-to-win approach, common rejection reasons, weak-candidate warnings — are part of the Founding Pro membership."}
                    {paywallOpen === "compare" && "Compare up to three scholarships side-by-side as a Founding Pro member."}
                  </p>
                </SheetHeader>
              </div>
            </div>
            <div className="px-7 py-6 space-y-5">
              <div className="space-y-2.5 text-sm text-foreground/85">
                {[
                  `Full database — all ${rows.length || 200}+ scholarships with strategy notes, rejection patterns, and how-to-win approaches.`,
                  "Live monthly workshops with our founders — Yale, Schwarzman/Cambridge, Harvard.",
                  "Recordings library — every workshop saved for you.",
                  "Unlimited shortlist + status tracking + notes.",
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-gold-dark shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
              {foundingLeft && foundingLeft.left > 0 && (
                <div className="rounded-xl bg-gold/10 border border-gold/25 p-3 text-xs text-gold-dark text-center">
                  <span className="font-semibold tabular-nums">{foundingLeft.left}</span> founding spots left · price locked for life
                </div>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="gold" size="lg" className="w-full gap-2" onClick={() => { setPaywallOpen(null); navigate("/pricing"); }}>
                  See Founding Pro <ArrowRight className="h-4 w-4" />
                </Button>
                <button onClick={() => setPaywallOpen(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                  Not now
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile filters */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="left" className="w-[300px] overflow-y-auto">
            <SheetHeader><SheetTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filters</SheetTitle></SheetHeader>
            <div className="mt-5"><FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} hostCountries={hostCountries} fieldsAvailable={fieldsAvailable} /></div>
          </SheetContent>
        </Sheet>

        <DetailSheet
          s={openDetail}
          open={!!openDetail}
          onClose={() => setOpenDetail(null)}
          isBookmarked={openDetail ? shortlist.has(openDetail.scholarship_id) : false}
          onBookmark={() => openDetail && toggleBookmark(openDetail.scholarship_id)}
          profile={profile}
          status={openDetail ? statusMap[openDetail.scholarship_id] : undefined}
          onStatusChange={(st) => openDetail && setStatus(openDetail.scholarship_id, st)}
          note={openDetail ? (notesMap[openDetail.scholarship_id] || "") : ""}
          onNoteChange={(n) => openDetail && setNote(openDetail.scholarship_id, n)}
          similar={similarToOpen}
          onSwitchTo={(s) => setOpenDetail(s)}
          isMember={isMember}
          onUnlock={() => setPaywallOpen("strategy")}
          onExpand={() => openDetail && setExpandedDetail(openDetail)}
        />

        <ExpandedScholarshipDialog
          s={expandedDetail}
          profile={profile}
          onClose={() => setExpandedDetail(null)}
          onApply={() => expandedDetail?.official_url && window.open(expandedDetail.official_url, "_blank", "noopener,noreferrer")}
          onSave={() => expandedDetail && toggleBookmark(expandedDetail.scholarship_id)}
          isBookmarked={expandedDetail ? shortlist.has(expandedDetail.scholarship_id) : false}
        />
      </div>
    </div>
  );
};

export default Discover;
