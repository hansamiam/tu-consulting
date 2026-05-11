import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { DiscoverAppBar } from "@/components/discover/DiscoverAppBar";
import { DiscoverEntranceGate } from "@/components/discover/DiscoverEntranceGate";
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
  ArrowRight,
  Award,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  BookmarkCheck,
  Bookmark,
  ChevronLeft,
  Zap,
  Lightbulb,
  X,
  SlidersHorizontal,
  Filter,
  Search,
  Trophy,
  Target,
  Flame,
  Users,
  FileText,
  AlertOctagon,
  UserCheck,
  ShieldAlert,
  MinusCircle,
  HelpCircle,
  LayoutGrid,
  List,
  EyeOff,
  Eye,
  Columns3,
  Circle,
  Gem,
  DollarSign,
  Crown,
  Compass,
  Layers,
  GraduationCap,
  Share2,
  Globe,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStoredProfile, saveProfile } from "@/components/discover/DiscoverProfileGate";
import { track } from "@/lib/analytics";
import { CuratedCollections } from "@/components/discover/CuratedCollections";
import { ScholarshipDeepDive } from "@/components/scholarship/ScholarshipDeepDive";
import { ExpandedScholarshipDialog } from "@/components/discover/ExpandedScholarshipDialog";
// MatchScoreBreakdown import retired round 33 — the per-row hover
// popover that wrapped the MatchGauge was removed; rows convey fit
// via section bucketing + sort order now. Re-import if a future
// surface wants to expose the breakdown.
// HoverCard imports retired round 33 alongside MatchGauge — re-add
// if any future surface wants a hover popover on a row chip.
import { CountryArt } from "@/lib/countryArt";
// FlagPattern import retired round 41. The component was removed
// from render in round 22 (most countries didn't have a clean
// illustrative flag — fallback was visual noise). Import was
// dangling. Component file stays at src/lib/flagPattern.tsx for
// any future surface that wants it.
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
import { daysUntil } from "@/lib/dates";
import { ALL_COUNTRIES } from "@/data/countries";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser, isAdminBypass, consumeAdminUrlFlag } from "@/lib/adminMode";
import { isAggregatorUrl, domainFor } from "@/lib/aggregatorUrls";
import { useSemanticScholarshipMatch } from "@/hooks/useSemanticScholarshipMatch";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { useScholarshipTracking, useTrackView } from "@/hooks/useScholarshipTracking";
import { Lock } from "lucide-react";
import { toast } from "sonner";

const SHORTLIST_FREE_LIMIT = 5;

/* Share a scholarship — uses Web Share API on supporting browsers
 * (mobile, modern Chromium), falls back to clipboard copy with a
 * toast confirmation. The shared URL is the public /scholarships/:id
 * page which renders for SEO + handles direct loads even for
 * non-signed-in users. */
const shareScholarship = async (
  s: { scholarship_id: string; scholarship_name: string; provider_name: string | null },
  language: "en" | "ru" = "en",
) => {
  const url = `${window.location.origin}/scholarships/${s.scholarship_id}`;
  const cleanedName = cleanScholarshipName(s.scholarship_name);
  const cleanedProv = cleanProvider(s.provider_name);
  const title = cleanedProv ? `${cleanedName} — ${cleanedProv}` : cleanedName;
  const ru = language === "ru";
  const navAny = navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> };
  if (navAny.share) {
    try {
      await navAny.share({ title, url });
      return;
    } catch {
      // User aborted the share sheet; fall through to clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success(ru ? "Ссылка скопирована" : "Link copied", { description: cleanedName });
  } catch {
    toast.error(ru ? "Не удалось скопировать — зажмите URL для шеринга" : "Couldn't copy — long-press the URL to share");
  }
};

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
  /* Canonical fields — populated by the canonical-extract edge function
   * pipeline (migration 20260510110000_canonical_scholarship_fields).
   * The frontend reads `canonical_overview ?? why_this_fits ?? blurb`,
   * `canonical_deadline_iso ?? application_deadline`, etc., so existing
   * unmigrated rows keep working while migrated rows show the verified
   * canonical content. canonical_quality_score (0-100) is recomputed by
   * a DB trigger when canonical_* fields change. */
  canonical_overview: string | null;
  canonical_deadline_iso: string | null;
  canonical_funding_text: string | null;
  canonical_funding_usd: number | null;
  canonical_official_url: string | null;
  canonical_quality_score: number | null;
  /* Stable scholarship identity that survives URL changes. The same
   * scholarship listed on two aggregator hubs (or a program page +
   * scholarship page) collapses to one row when canonical_key matches.
   * Populated by the scrape pipeline; null on legacy rows. */
  canonical_key: string | null;
  /* Optional program-specific hero image for the DetailSheet +
   * ExpandedScholarshipDialog. When null we fall back to the
   * country-tinted gradient + landmark silhouette treatment. */
  cover_image_url?: string | null;
  /* When the row first landed in our catalogue. Drives the "NEW" pill
   * shown for scholarships added in the last 7 days. ISO timestamp. */
  created_at?: string | null;
  /* LLM-reported extraction confidence in [0,1]. <0.7 means we extracted
   * from very thin signals — score should be discounted so the row only
   * dominates ranking when no richer alternative competes. */
  confidence?: number | null;
  /* Count of substantive fields populated, 0–18. Maintained server-side
   * by the scholarships_completeness_score trigger. Used as a small
   * scoring tie-breaker (more-populated rows surface ahead of equally-
   * matching but sparser rows) and could drive a UI "verified data"
   * badge later. */
  data_completeness_score?: number | null;
  /* FK to the canonical providers table (added 20260509010000). NULL
   * when the row's provider_name didn't resolve to a known funder. */
  provider_id?: string | null;
  /* Joined trust tier — high/medium/low/unknown. Populated when the
   * fetch SELECTs providers(trust_tier) via the FK. Drives the
   * "Verified funder" pill on cards + detail panels. */
  provider_trust_tier?: "high" | "medium" | "low" | "unknown" | null;
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
  /* Where the student wants to STUDY (vs `country` which is their
   * nationality). Drives the semantic-match endpoint's host-country
   * bias. Empty = no preference; semantic falls back to broad
   * field+degree matching. */
  targetCountries: string[];
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
  /* Engagement signal carried through the score so cards can render a
   * "saved by N students this month" social-proof chip without each
   * card looking up the saveCounts map separately. The scorer already
   * receives the value as engagement_boost input — surfacing it on
   * the row makes the moat visible to users. */
  saveCount30d?: number;
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
type SortBy = "match" | "deadline" | "value" | "effort" | "selectivity" | "trending";
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
// 2026-05-10: dropped "researching" from active statuses per user
// direction "let's just have either drafting or submitted, simpler".
// "researching" is implicit when a row is saved but no status set.
const ACTIVE_STATUSES: AppStatus[] = ["drafting", "submitted"];

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

const scoreScholarship = (s: Scholarship, p: Profile, semanticSimilarity?: number, saveCount30d?: number): Scored => {
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

  // Deadline urgency bonus (close enough to apply, not closed).
  // d === 0 (today) gets the boost — same-day deadline is still
  // applicable and is the *most* urgent kind, not the least.
  if (s.application_deadline) {
    const days = Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days < 60) match += 4;
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

  // Trust calibration — discount the score by extraction confidence and
  // reward data completeness. Without this, a sparse row that happens
  // to embedding-match a profile can pip a fully-populated row that's
  // a slightly better fit. The catalog quality work (anti-fabrication,
  // min-info gate, completeness scoring) only pays off when ranking
  // honors it.
  //
  // confidence shaping: rows with confidence ≥0.85 are unaffected; below
  // 0.85 we shave proportionally, capped at -8. We never zero a row out
  // on confidence alone — the user can still see and decide.
  const conf = typeof s.confidence === "number" ? s.confidence : 0.85;
  if (conf < 0.85) {
    match -= Math.round((0.85 - Math.max(0, conf)) * 16); // up to -13.6 at conf=0
    match = Math.max(match, 0);
  }
  // completeness shaping: max +6 for fully-populated (18/18), 0 baseline
  // at completeness ≤8 ("just-enough" rows). Linear in between.
  const comp = typeof s.data_completeness_score === "number" ? s.data_completeness_score : 8;
  if (comp > 8) {
    match += Math.min(6, Math.round((comp - 8) * 0.6));
  }

  // Engagement boost — mirror of match_scholarships RPC's engagement_boost
  // (20260508010000) on a 100-scale. Saves are the strongest intent signal
  // we capture; logarithmic so a runaway hit doesn't dominate, capped at
  // +4 so semantic / eligibility / threshold matches still rule. Cold rows
  // (no saves yet) contribute 0 — Discover already surfaces NEW pills, so
  // visibility for fresh rows doesn't depend on this boost.
  if (typeof saveCount30d === "number" && saveCount30d > 0) {
    match += Math.min(4, Math.round(Math.log(saveCount30d + 1) * 0.7));
  }

  // Provider trust boost — mirror of the match_scholarships RPC's
  // provider_trust_boost (migration 20260509030000). Rewards rows whose
  // provider has been hand-vetted as an institutional funder (high) or
  // a known organisation (medium). Low / unknown contribute 0. Cap
  // at +3 — provider trust is a credibility nudge, not a thumb on the
  // scale strong enough to outweigh real fit signals. The catalog
  // loader joins providers.trust_tier onto each row at fetch time so
  // this is a cheap field lookup.
  if (s.provider_trust_tier === "high") match += 3;
  else if (s.provider_trust_tier === "medium") match += 1;

  if (eligibility === "likely" && match >= 70) eligibility = "eligible";
  match = Math.max(0, Math.min(100, Math.round(match)));

  const priority: Scored["priority"] =
    eligibility === "not_eligible" ? "low_priority" :
    match >= 75 ? "strong_match" : match >= 55 ? "competitive" : "low_priority";

  return { ...s, match, eligibility, priority, reward, effort, selectivity, fieldMatch: fm, reasons, warnings, saveCount30d: saveCount30d };
};

/* ─── Curated Collections — recommendation rule-set ──────────────────────
   Each collection is computed live from the ranked list and the user's
   profile. Surfaced as a rail above the main results so students can
   triage by intent ("I want sleepers" vs "I want prestigious") rather
   than only by raw match score. */
interface CollectionDef {
  id: string;
  title: string;
  titleRu: string;
  kicker: string;
  kickerRu: string;
  description: string | ((p: Profile) => string);
  descriptionRu: string | ((p: Profile) => string);
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
    titleRu: "Рекомендуем вам",
    kicker: "Top picks",
    kickerRu: "Лучшие совпадения",
    description: "Where your profile lines up best — strongest fits across academics, field, eligibility, and budget.",
    descriptionRu: "Где ваш профиль попадает точнее всего — сильные совпадения по академике, направлению, праву на участие и бюджету.",
    icon: Award,
    accentClass: "text-gold-dark",
    filter: (s) => s.priority === "strong_match",
    sort: (a, b) => b.match - a.match,
    minItems: 1,
  },
  {
    id: "sleepers",
    title: "Sleeper picks",
    titleRu: "Скрытые жемчужины",
    kicker: "Hidden gems",
    kickerRu: "Менее очевидные",
    description: "Solid value, accessible competitiveness — strong odds with a focused application.",
    descriptionRu: "Хорошая сумма, реалистичный конкурс — сильные шансы при сфокусированной заявке.",
    icon: Gem,
    accentClass: "text-primary",
    filter: (s) => s.match >= 60 && (s.selectivity === "low" || s.selectivity === "medium") && (s.estimated_total_value_usd ?? 0) >= 25000,
    sort: (a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0),
    minItems: 2,
  },
  {
    id: "prestigious",
    title: "Household names",
    titleRu: "Имена, которые знают все",
    kicker: "Prestigious",
    kickerRu: "Престижные",
    description: "Globally recognized scholarships that signal heavily on a CV.",
    descriptionRu: "Глобально известные стипендии — сильно работают в CV.",
    icon: Crown,
    accentClass: "text-gold-dark",
    filter: (s) => PRESTIGIOUS_NAMES.test(s.scholarship_name),
    sort: (a, b) => b.match - a.match,
    minItems: 1,
  },
  {
    id: "underrated",
    title: "Underrated full-rides",
    titleRu: "Недооценённые полные стипендии",
    kicker: "Big award, lower bar",
    kickerRu: "Крупные суммы, реалистичный конкурс",
    description: "Full-funding scholarships outside the household name list — quieter but generous.",
    descriptionRu: "Полное финансирование вне списка известных имён — тише, но щедрее.",
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
    titleRu: "Закрываются в этом месяце",
    kicker: "Act now",
    kickerRu: "Действовать сейчас",
    description: "Deadlines within 31 days. Decide and execute or skip cleanly.",
    descriptionRu: "Дедлайны в течение 31 дня. Решайте и подавайте — или пропускайте честно.",
    icon: Flame,
    accentClass: "text-destructive",
    filter: (s) => {
      const d = daysUntil(s.application_deadline);
      // Include today (d === 0) — closes-today is the act-now case.
      return d !== null && d >= 0 && d <= 31;
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
    titleRu: "Самые крупные суммы",
    kicker: "Highest value",
    kickerRu: "Наивысшая ценность",
    description: "Awards over $100K in total funding — life-changing money.",
    descriptionRu: "Стипендии свыше $100K — деньги, которые меняют жизнь.",
    icon: DollarSign,
    accentClass: "text-gold-dark",
    filter: (s) => (s.estimated_total_value_usd ?? 0) >= 100000,
    sort: (a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0),
    minItems: 2,
  },
  {
    id: "for_your_field",
    title: "For your field",
    titleRu: "Для вашего направления",
    kicker: "Field-specific",
    kickerRu: "По направлению",
    description: (p) => `Scholarships explicitly funding ${p.field || "your area of study"}.`,
    descriptionRu: (p) => `Стипендии, явно финансирующие ${p.field || "ваше направление"}.`,
    icon: Target,
    accentClass: "text-primary",
    filter: (s, p) => fieldMatches(p.field, s.target_fields) === true,
    sort: (a, b) => b.match - a.match,
    minItems: 3,
  },
  {
    id: "for_your_country",
    title: "Built for your nationality",
    titleRu: "Под ваше гражданство",
    kicker: "Country-specific",
    kickerRu: "По стране",
    description: (p) => `Programs that explicitly include ${p.country || "your country"} in their eligible list.`,
    descriptionRu: (p) => `Программы, в списке которых явно есть ${p.country || "ваша страна"}.`,
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
  { v: "undergraduate", l: "Bachelor's", icon: "🎓", d: "3–5 year degree" },
  { v: "master's", l: "Master's", icon: "📚", d: "1–2 year graduate" },
  { v: "PhD", l: "PhD", icon: "🔬", d: "Research doctorate" },
];

const FIELDS = [
  { v: "Computer Science & IT", i: "💻" }, { v: "Business & Management", i: "📊" },
  { v: "Engineering", i: "⚙️" }, { v: "Medicine & Health", i: "🏥" },
  { v: "Natural Sciences", i: "🔬" }, { v: "Social Sciences", i: "🌐" },
  { v: "Arts & Humanities", i: "📖" }, { v: "Law", i: "⚖️" },
  // "Undecided" was carrying a sparkle emoji which read as "AI magic"
  // — it's actually the opposite of magic (the user genuinely doesn't
  // know yet). Question mark in a thinking-face frame reads more
  // honestly: "still figuring it out".
  { v: "Undecided", i: "🤔" },
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
/* Country-specific scholarships (Bolashak / Chevening-when-restricted-
 * to-Commonwealth / etc) should surface their FUNDING country on the
 * card band, not a generic "Worldwide" host_country. The user's
 * complaint: "for scholarships that are specific to certain countries
 * put THAT in the country banner like Bolashak for KAZAKHSTAN not
 * some random ass global."
 *
 * Heuristic: if eligible_countries narrows to a single specific
 * country AND host_country is generic (Worldwide / Multiple / null),
 * the eligible country IS the scholarship's identity country. Use it
 * for the banner label, accent color, and silhouette. When host
 * country is itself specific (a US university scholarship), keep
 * host_country since location-of-study is the primary signal. */
const GENERIC_HOSTS = /^(worldwide|global|various|international|multiple|any)/i;
const bannerCountry = (s: { host_country: string | null; eligible_countries: string[] | null }): string | null => {
  const elig = (s.eligible_countries || [])
    .map(c => (c || "").trim())
    .filter(c => c.length > 0 && !GENERIC_HOSTS.test(c));
  const host = (s.host_country || "").trim();
  const hostIsGeneric = !host || GENERIC_HOSTS.test(host);
  if (elig.length === 1 && hostIsGeneric) return elig[0];
  return host || null;
};

/* Regions for the host-country quick filter — multi-country selection
 * users have asked for. The host_country dropdown stays single-select
 * (a country is the most precise filter) but a row of region chips
 * above it lets users pick "Europe" or "Asia-Pacific" in one tap and
 * the filter pipeline OR-matches across the region's countries.
 *
 * The hostCountry FilterState slot encodes a region selection as
 * "region:Europe" — virtual prefix mirrors the women-any demographic
 * pattern used elsewhere. The filter pipeline expands to a country
 * list at evaluation time. Country names use the same canonicalCountry
 * forms the dropdown uses so the predicate matches. */
const REGIONS: Record<string, string[]> = {
  "Europe": [
    "United Kingdom", "Germany", "France", "Netherlands", "Switzerland",
    "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Italy",
    "Spain", "Portugal", "Belgium", "Austria", "Poland", "Czech Republic",
    "Hungary", "Greece", "Iceland", "Estonia", "Latvia", "Lithuania",
  ],
  "Asia-Pacific": [
    "Japan", "South Korea", "Singapore", "Hong Kong", "Australia",
    "New Zealand", "Taiwan", "China", "Malaysia", "Thailand", "Vietnam",
    "Indonesia", "Philippines",
  ],
  "North America": ["United States", "Canada", "Mexico"],
  "MENA": [
    "United Arab Emirates", "Saudi Arabia", "Qatar", "Israel", "Turkey",
    "Egypt", "Jordan", "Morocco",
  ],
};

const dateOnly = (d: string | null) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* "NEW" badge — true when the scholarship landed in our catalogue
 * within the last 7 days. Drives a small gold pill on cards/rows so
 * users notice fresh additions instead of having to hunt for them. */
const NEW_WINDOW_MS = 7 * 86_400_000;
const isNewScholarship = (createdAt: string | null | undefined): boolean => {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < NEW_WINDOW_MS;
};

/* Field-name normalization — drops noise suffixes ("and related fields",
 * "studies"), unifies separators + plurals, and applies a synonym map
 * (cs → computer science, women in stem → stem, etc.). Used by BOTH the
 * dropdown builder (so duplicates collapse into one option) and the
 * filter-match logic (so picking "STEM" matches a row with "Women in
 * STEM" in target_fields). Keep both call sites in lockstep — diverging
 * the normalizers re-introduces the dropdown/match drift the user
 * called out (2026-05-07). */
const FIELD_SYNONYMS_MAP: Record<string, string> = {
  "stem": "stem",
  "science technology engineering and math": "stem",
  "science technology engineering and mathematic": "stem",
  "women in stem": "stem",
  "women in science": "stem",
  "women in technology": "stem",
  "comp sci": "computer science",
  "cs": "computer science",
  "cse": "computer science",
  "ai": "artificial intelligence",
  "ml": "machine learning",
  "ee": "electrical engineering",
  "me": "mechanical engineering",
  "ce": "civil engineering",
  "biz": "business",
  "mba": "business",
  "ir": "international relation",
  "intl relation": "international relation",
  "global affair": "international relation",
  "policy": "public policy",
  "polisci": "political science",
  "poli sci": "political science",
  "med": "medicine",
  "medical": "medicine",
  "healthcare": "public health",
  "global health": "public health",
  "humanitie": "humanity",
  "lit": "literature",
  "english": "literature",
  "creative writing": "literature",
  "fine art": "art",
  "visual art": "art",
};

export const normalizeFieldKey = (raw: string): string => {
  let key = raw.toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&/g, "and")
    // Drop noise suffixes — "development related fields" → "development",
    // "social science studies" → "social science", etc.
    .replace(/\s+(and\s+)?related\s+fields?$/i, "")
    .replace(/\s+studies$/i, "")
    .replace(/\s+(and\s+)?related$/i, "")
    .replace(/\s+fields?$/i, "")
    .replace(/s$/, "")
    .trim();
  if (FIELD_SYNONYMS_MAP[key]) key = FIELD_SYNONYMS_MAP[key];
  return key;
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
    .filter(Boolean)
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

type Lang = "en" | "ru";

const deadlineDisplay = (d: string | null, lang: Lang = "en", deadlineType?: string | null) => {
  // Restrained color scale — red only when truly urgent (≤7d). Past that,
  // we rely on muted tones. The previous palette painted half the
  // database red, which made every card look like an alarm.
  const ru = lang === "ru";
  // No date present — disambiguate against deadline_type. The previous
  // version hardcoded "Rolling" for every NULL date, but most NULL-date
  // rows are actually annual programs whose next-cycle date hasn't been
  // captured yet. Showing "Rolling" was misleading and led the user to
  // think the catalog was full of rolling deadlines.
  if (!d) {
    // 2026-05-10: shortened labels so they fit narrow pill containers
    // without "..." truncation (user flagged "Annual ..." as ugly).
    // Full prose ("Annual cycle" / "Rolling deadline") still appears
    // in wider contexts via deadline_type elsewhere.
    const t = (deadlineType ?? "").toLowerCase();
    if (t === "rolling") {
      return { text: ru ? "Без даты" : "Rolling", cls: "text-foreground/40", urgent: false };
    }
    if (t === "annual" || t === "reopens_annually") {
      return { text: ru ? "Ежегодно" : "Annual", cls: "text-foreground/55", urgent: false };
    }
    if (t === "one-time" || t === "one_time") {
      return { text: ru ? "Разовая" : "One-time", cls: "text-foreground/55", urgent: false };
    }
    return { text: ru ? "TBD" : "TBD", cls: "text-foreground/40", urgent: false };
  }
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0) {
    // Annual programs whose last cycle just closed are still relevant —
    // they reopen next year. Show "Reopens annually" instead of a strikethrough
    // "Closed" label so users don't think the program is dead.
    const t = (deadlineType ?? "").toLowerCase();
    if (t === "annual" || t === "reopens_annually") {
      return { text: ru ? "Ежегодная программа" : "Reopens annually", cls: "text-foreground/55", urgent: false };
    }
    if (t === "rolling") {
      return { text: ru ? "Без дедлайна" : "Rolling", cls: "text-foreground/55", urgent: false };
    }
    return { text: ru ? "Закрыто" : "Closed", cls: "text-foreground/30 line-through", urgent: false };
  }
  if (days <= 7)  return { text: ru ? `${days}д осталось` : `${days}d left`, cls: "text-destructive font-semibold", urgent: true };
  if (days <= 30) return { text: ru ? `${days}д осталось` : `${days}d left`, cls: "text-amber-700 dark:text-amber-400 font-medium", urgent: true };
  if (days <= 90) return { text: ru ? `${days}д осталось` : `${days}d left`, cls: "text-foreground/60", urgent: false };
  return { text: ru ? `${Math.ceil(days / 30)}мес` : `${Math.ceil(days / 30)}mo`, cls: "text-foreground/40", urgent: false };
};

/* Tier labels — positive, concrete, exciting. No "stretch", "long shot",
 * "lower fit", "real shot", "safety", "more routes", "worth a scan". */
const TIER = {
  strong_match: {
    label: "Strong fit",
    dot: "bg-gold",
    text: "text-gold",
    textLight: "text-gold-dark",
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

/* Tag — typed chip primitive used by ScholarRow + ScholarCard so the
 * visual language is consistent across both surfaces. Variants encode
 * intent (country, full-ride, demographic, outcome) so chip colors
 * don't drift over time as we add new ones inline. The country variant
 * accepts the country gradient string at render time since the
 * gradient is per-row. The "prestige" variant was retired with the
 * matching chip on the country band. */
type TagVariant = "country" | "full-ride" | "demographic" | "outcome";
const Tag = ({
  variant,
  children,
  icon,
  countryGradient,
  title,
  className = "",
}: {
  variant: TagVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  countryGradient?: string;
  title?: string;
  className?: string;
}) => {
  const base = "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded shrink-0";
  const variantCls = (() => {
    switch (variant) {
      case "country":
        return `text-white bg-gradient-to-r ${countryGradient ?? "from-foreground/40 to-foreground/60"}`;
      case "full-ride":
        return "bg-gold/15 text-gold-dark border border-gold/30";
      case "demographic":
        return "bg-gold/15 text-gold-dark border border-gold/25";
      case "outcome":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 tabular-nums";
    }
  })();
  return (
    <span className={`${base} ${variantCls} ${className}`} title={title}>
      {icon}
      {children}
    </span>
  );
};

/* MatchGauge retired round 33 — the wifi-bar visual was unclear and
 * crowded the chip row. Match info now lives in section bucketing
 * (grid view) + sort order (list view) + the detail-sheet match
 * breakdown. No per-row chip needed. */

// domainFor + isAggregatorUrl moved to src/lib/aggregatorUrls.ts in
// round 41 so ScholarshipDetail (the public SEO page) and any future
// surface can reuse the same hostname list. Imported above.

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

/** Build a 1-2 sentence natural-sounding summary from structured row
 *  data. Used as the fallback editorial line on every grid tile when
 *  the soft `why_this_fits` field hasn't been enriched yet — guarantees
 *  every tile reads as a program description, not as an empty box or
 *  a chained tag list. The helper picks the most informative facts
 *  (coverage, degree, field, demographic, country, provider) and
 *  weaves them into a real sentence. */
/* Generate a tight one-line description for cards that lack an
 * editorial why_this_fits line. The card chrome (country band, provider
 * row, deadline meta) already carries name/provider/country/deadline,
 * so this string is JUST what the program FUNDS — not a regurgitation
 * of the surrounding facts.
 *
 * Pre-redesign this returned a two-sentence "A full-ride master's
 * program in computer science hosted in United States. Funded by MIT,
 * it specifically supports women in stem applicants" — long, templated,
 * and duplicating chrome that's already on the card. Now: max ~14
 * words, no provider repeat, no "hosted in" repeat, demographic folded
 * into the lead clause when present. */
function buildScholarshipBlurb(input: {
  name: string;
  provider: string | null;
  country: string | null;
  coverage: string | null | undefined;
  levels: string[] | null;
  fields: string[] | null;
  demographic: string | undefined;
  isFullRide: boolean;
  /** New 2026-05-10 — let prestige signals sharpen the auto-blurb so
   *  cards aren't all reading "Funds study in X". When a row has high
   *  selectivity OR partner universities, that gets folded into the
   *  lead clause: "Highly selective master's in X" instead of
   *  "Master's program in X". */
  selectivity?: string | null;
  partnerUniCount?: number;
}): string | null {
  const { coverage, levels, fields, demographic, isFullRide, selectivity, partnerUniCount } = input;
  const isHighlySelective =
    selectivity === "very_high" || selectivity === "high" || (partnerUniCount && partnerUniCount >= 5);
  const prestigeAdj = isHighlySelective ? "Highly selective " : "";

  // Funding shape — short, sentence-ready phrase. Drop the indefinite
  // article; we'll prefix it where appropriate so phrases like "Funds"
  // / "Stipend for" / "Full ride" can lead naturally.
  const funding = (() => {
    if (isFullRide) return "Full ride";
    if (coverage === "tuition_only") return "Tuition";
    if (coverage === "stipend") return "Stipend";
    if (coverage === "partial") return "Partial funding";
    if (coverage === "travel") return "Travel grant";
    return null;
  })();

  // Degree — pick a single canonical bucket. Multi-level rows collapse
  // to the highest-priority label rather than spelling out every level
  // (the detail sheet has the full list).
  const degree = (() => {
    if (!levels || levels.length === 0) return null;
    const seen = new Set<string>();
    for (const raw of levels) {
      const k = (raw ?? "").toLowerCase();
      if (k.includes("phd") || k.includes("doctor")) seen.add("PhD");
      else if (k.includes("postdoc")) seen.add("postdoctoral");
      else if (k.includes("master")) seen.add("master's");
      else if (k.includes("bachelor") || k.includes("undergrad")) seen.add("bachelor's");
    }
    // Priority order — pick the most senior level present so a row
    // that funds multiple levels reads as the more substantive bucket.
    for (const tier of ["PhD", "postdoctoral", "master's", "bachelor's"] as const) {
      if (seen.has(tier)) return tier;
    }
    return null;
  })();

  // Field — single primary field. Title-cased on the way out so the
  // phrase reads as a proper noun ("Computer Science") rather than the
  // mid-sentence lowercase ("computer science") used by the old build.
  const field = (() => {
    if (!fields || fields.length === 0) return null;
    const first = fields.find((f) => f && f.trim());
    return first ? first.trim() : null;
  })();

  const demo = demographic ? humanizeDemographic(demographic) : null;

  // Compose. Order of preference (read-aloud optimised):
  //   1. Demographic-targeted: "Funds women in STEM at the master's level."
  //   2. Full ride: "Full ride for a master's in computer science."
  //   3. Funding shape + degree + field: "Tuition for a bachelor's in business."
  //   4. Funding shape + field: "Stipend program in environmental sciences."
  //   5. Degree + field: "Master's program in physics."
  //   6. Field only: "Funds graduate study in computer science."
  if (demo && degree) {
    return `${prestigeAdj}${prestigeAdj ? "" : "Funds "}${demo.toLowerCase()} at the ${degree} level${field ? ` in ${field.toLowerCase()}` : ""}.`;
  }
  if (demo) {
    return `${prestigeAdj}${prestigeAdj ? "" : "Funds "}${demo.toLowerCase()} applicants${field ? ` in ${field.toLowerCase()}` : ""}.`;
  }
  if (funding === "Full ride" && degree) {
    return `${prestigeAdj}full-ride ${degree}${field ? ` in ${field.toLowerCase()}` : ""}.`.replace(/^h/, "H");
  }
  if (funding && degree) {
    return `${prestigeAdj}${funding.toLowerCase()} for a ${degree}${field ? ` in ${field.toLowerCase()}` : ""}.`.replace(/^./, c => c.toUpperCase());
  }
  if (funding && field) {
    return `${prestigeAdj}${funding.toLowerCase()} program in ${field.toLowerCase()}.`.replace(/^./, c => c.toUpperCase());
  }
  if (degree && field) {
    return `${prestigeAdj}${degree} program in ${field.toLowerCase()}.`.replace(/^./, c => c.toUpperCase());
  }
  // The lone-field bottom of the funnel — return null when the only
  // thing we can say is the most-generic "Funds study in X" template.
  // Better to render no blurb than another card that reads identical
  // to the dozen above it. Pre-fix every sparse row produced "Funds
  // study in [field]" and the database read like a wall of identical
  // Mad Libs. The QuickFactsStrip + facts grid carry the load when
  // there's no editorial line worth showing.
  return null;
}

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
  // Canonical-pipeline signals — a row that's been verified against the
  // institution's own page beats one that hasn't, period. Without these
  // weights, dedup could prefer a thin scrape over a canonically-verified
  // record on the same canonical_key. Each canonical_* field present is
  // worth a clear tie-break point; canonical_quality_score (0-100, set
  // by the canonical-extract trigger) maps to up to +5 so a 100-quality
  // canonical row beats every signal except a genuine "verified" status.
  if (s.canonical_overview) n += 2;
  if (s.canonical_deadline_iso) n += 1;
  if (s.canonical_funding_text || s.canonical_funding_usd) n += 1;
  if (s.canonical_official_url) n += 1;
  if (typeof s.canonical_quality_score === "number" && s.canonical_quality_score > 0) {
    n += Math.min(5, Math.round(s.canonical_quality_score / 20));
  }
  // data_completeness_score is the broader 0-18 fingerprint kept fresh
  // by the scholarships_completeness_score trigger. Worth up to +4 so
  // it nudges dedup toward the more-fleshed-out variant when canonical
  // signals are absent on both sides.
  if (typeof s.data_completeness_score === "number" && s.data_completeness_score > 0) {
    n += Math.min(4, Math.round(s.data_completeness_score / 4));
  }
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
const ScholarRow = ({ s, onSelect, isBookmarked, onBookmark, status, onStatusChange, isHidden, onToggleHide, isComparing, onToggleCompare, index = 0, outcomes, lang = "en" }: {
  s: Scored; onSelect: () => void;
  isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
  status: AppStatus | undefined; onStatusChange: (s: AppStatus | null) => void;
  isHidden: boolean; onToggleHide: (e: React.MouseEvent) => void;
  isComparing: boolean; onToggleCompare: (e: React.MouseEvent) => void;
  index?: number;
  /** Per-scholarship member outcome counts. Renders a tiny "X applied
   *  · Y won" pill in the row header when applied >= 3. */
  outcomes?: { applied: number; accepted: number; inPipeline: number };
  lang?: Lang;
}) => {
  const ru = lang === "ru";
  const dl = deadlineDisplay(s.application_deadline, lang, s.deadline_type);
  const hasRealScore = s.match > 0 && (s.reasons.length > 0 || s.warnings.length > 0);
  const isFullRide = s.coverage_type === "full_ride";
  const bannerCtry = bannerCountry(s);
  const accent = accentForCountry(bannerCtry);
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

      <div className="flex-1 grid grid-cols-[minmax(0,1fr),auto] sm:grid-cols-[minmax(0,1fr),170px,128px] items-center gap-4 px-4 py-3 min-h-[68px] min-w-0">
        {/* Country-art circle badge retired (round 21). It carried country
            identity (already conveyed by the left accent stripe + the
            country chip below) and doubled as the MatchScoreBreakdown
            hover trigger — but the score-as-circle visual implied a
            numeric verdict we explicitly don't surface. Replaced by an
            inline 3-bar MatchGauge near the title. The gauge stays the
            hover trigger so the per-criteria breakdown is still one
            hover away for users who want it. */}

        {/* Name + provider + country chip — title clamps to 2 lines so
            long names like "Wien International Scholarship Program
            (WISP) at Brandeis University" stop chopping mid-word.
            Provider line stays single-line truncate (it's the
            secondary fact). */}
        {/* Round-35 row redesign. Previous layout had a chip row
            (country, full-ride, demographic, prestigious, outcomes,
            +1 etc.) that rendered with wildly different chip counts
            per row, making row heights and visual rhythm inconsistent.
            New layout: title (1-2 lines) + a single subtitle line
            ("Country · Provider"). No chips. The Award/Deadline column
            already carries the "Full ride" signal in gold; demographic
            and prestige info still drive scoring and surface inside
            the detail sheet. Uniform geometry across every row. */}
        <div className="min-w-0">
          {isNewScholarship(s.created_at) && (
            <div className="mb-1">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30 px-1.5 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {ru ? "Новое" : "New"}
              </span>
            </div>
          )}
          <h3
            className="font-heading font-semibold text-[15px] text-foreground tracking-tight group-hover:text-gold-dark transition-colors leading-tight"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } as React.CSSProperties}
          >
            {cleanScholarshipName(s.scholarship_name)}
          </h3>
          {/* Subtitle: Country · Provider, plain text, single-line
              truncate. ProviderAvatar still renders as a small icon
              before the text when there's an actual provider; nothing
              when not. Country always renders if present, even when
              provider is missing — so rows with one but not the other
              still look uniform. */}
          {(() => {
            const p = cleanProvider(s.provider_name);
            const countryLabel = bannerCtry ? shortCountry(bannerCtry) : null;
            if (!p && !countryLabel) return null;
            return (
              <div className="flex items-center gap-1.5 mt-1 min-w-0 text-xs text-muted-foreground">
                {p && <ProviderAvatar url={s.official_url || s.source_url} providerName={p} size={14} />}
                <p className="truncate min-w-0 leading-snug">
                  {countryLabel && <span className="font-medium text-foreground/80">{countryLabel}</span>}
                  {countryLabel && p && <span className="text-muted-foreground/40 mx-1.5">·</span>}
                  {p}
                </p>
                {/* Sparse-data hint mirrors the card variant — surfaces
                    when the row was extracted from a thin provider page
                    so users gut-check on the official site rather than
                    trusting near-empty data. */}
                {(typeof s.data_completeness_score === "number" && s.data_completeness_score > 0 && s.data_completeness_score < 6) && (
                  <span
                    className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/80 text-[10px] font-medium shrink-0"
                    title={ru ? "Данные неполные — уточните на сайте провайдера" : "Sparse data — verify on the provider's official site"}
                  >
                    {ru ? "уточнить" : "verify"}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Mobile award + deadline (desktop has its own column). */}
          <div className="sm:hidden flex items-center justify-between gap-2 mt-1 text-[12px] min-w-0">
            {award ? (
              <span className={`inline-flex items-center gap-1 font-semibold min-w-0 truncate ${isFullRide ? "text-gold-dark" : "text-foreground"}`}>
                {isFullRide && <Award className="h-3 w-3 shrink-0" />}
                <span className="truncate">{award}</span>
              </span>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
            <span className={`tabular-nums font-medium leading-tight whitespace-nowrap shrink-0 ${dl.cls}`}>
              {dl.text}
            </span>
          </div>
        </div>

        {/* Award + Deadline (desktop only) — vertical stack in a fixed
            170px column so geometry stays stable no matter the row
            content. Award reads as the headline number; the deadline
            sits beneath as smaller, color-toned countdown / "Rolling".
            Was a single horizontal line with " · " separator that
            overflowed for long awards or wide deadline text and
            pushed "Rolling" into the margins. Status column removed
            entirely from browse: status is a Workspace concept and
            had no meaningful render here for unbookmarked rows. */}
        <div className="hidden sm:flex flex-col items-end justify-center gap-0.5 min-w-0 text-right">
          <span
            className={`text-[13px] font-semibold leading-tight truncate max-w-full ${isFullRide ? "text-gold-dark" : "text-foreground"}`}
            title={award ?? undefined}
          >
            {isFullRide && <Award className="inline h-3 w-3 mr-1 -mt-0.5" />}
            {award ?? "—"}
          </span>
          <span className={`text-[11px] tabular-nums font-medium leading-tight whitespace-nowrap ${dl.cls}`}>
            {dl.text}
          </span>
        </div>

        {/* Actions — three clear affordances always rendered, in a
            fixed-width column (128px) so every row's geometry lines
            up with the header AND with every other row. Open-link
            button falls back gracefully so it's never absent: prefers
            official_url (non-aggregator) → source_url (non-aggregator)
            → disabled spacer with tooltip. That last state preserves
            column width; previously the button vanished entirely on
            aggregator-derived rows, jittering the row width. */}
        <div className="flex items-center justify-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Save — heart-bookmark, always visible. Gold when saved. */}
          <button
            onClick={onBookmark}
            aria-label={isBookmarked ? (ru ? "Удалить из сохранённых" : "Remove from saved") : (ru ? "Сохранить в шортлист" : "Save to your pipeline")}
            title={isBookmarked ? (ru ? "Сохранено · нажмите, чтобы удалить" : "Saved · click to remove") : (ru ? "Сохранить" : "Save")}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
              isBookmarked
                ? "text-gold-dark bg-gold/10 hover:bg-gold/15"
                : "text-muted-foreground hover:text-gold-dark hover:bg-muted/60"
            }`}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>

          {/* Open external link — desktop only. Three states share the
              same slot so the column width never moves:
              1. official_url + non-aggregator → "Open official
                 application page" (preferred)
              2. source_url + non-aggregator   → "View source page"
                 (fallback — at least lets the user verify on the
                 page we extracted from)
              3. Neither, or only aggregator URLs → disabled spacer
                 with tooltip explaining why. */}
          {(() => {
            const officialUsable = s.official_url && !isAggregatorUrl(s.official_url);
            const sourceUsable   = s.source_url && !isAggregatorUrl(s.source_url);
            const href = officialUsable ? s.official_url : sourceUsable ? s.source_url : null;
            const label = officialUsable
              ? (ru ? "Открыть официальную страницу заявки" : "Open official application page")
              : sourceUsable
                ? (ru ? "Посмотреть исходную страницу" : "View source page")
                : (ru ? "Прямой ссылки нет — откройте детали" : "No direct link — open details for the apply path");
            if (!href) {
              return (
                <span
                  aria-label={label}
                  title={label}
                  className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground/30 cursor-help"
                >
                  <ExternalLink className="h-4 w-4" />
                </span>
              );
            }
            return (
              <a
                href={href!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className={`hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
                  officialUsable
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            );
          })()}

          {/* Share — replaces the old "Not relevant — hide" dropdown
              which was rarely used and added cognitive load to every
              row. Native Web Share API on supporting browsers, falls
              back to clipboard copy with a toast confirmation. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              shareScholarship(s, lang);
            }}
            aria-label={ru ? "Поделиться стипендией" : "Share this scholarship"}
            title={ru ? "Поделиться" : "Share"}
            className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// See MemoScholarCard's comparator note — same rationale for the
// list-view row. ScholarRow renders dense rows with tracker hooks,
// hover transitions, and per-row IntersectionObserver via framer-
// motion; without memoization a single status change on row N
// re-rendered every visible row.
const MemoScholarRow = memo(ScholarRow, (prev, next) => (
  prev.s === next.s
  && prev.isBookmarked === next.isBookmarked
  && prev.status === next.status
  && prev.isHidden === next.isHidden
  && prev.isComparing === next.isComparing
  && prev.outcomes === next.outcomes
  && prev.lang === next.lang
  && prev.index === next.index
));

/* ─── Scholarship card — dense, product-grade, scannable in a 3-col grid ── */
const ScholarCard = ({ s, onSelect, isBookmarked, onBookmark, status, onStatusChange, isHidden, onToggleHide, isComparing, onToggleCompare, index = 0, outcomes, lang = "en" }: {
  s: Scored; onSelect: () => void;
  isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
  status: AppStatus | undefined; onStatusChange: (s: AppStatus | null) => void;
  isHidden: boolean; onToggleHide: (e: React.MouseEvent) => void;
  isComparing: boolean; onToggleCompare: (e: React.MouseEvent) => void;
  index?: number;
  /** Per-scholarship member outcome counts (compounding trust signal). */
  outcomes?: { applied: number; accepted: number; inPipeline: number };
  lang?: Lang;
}) => {
  const ru = lang === "ru";
  const tier = TIER[s.priority];
  const dl = deadlineDisplay(s.application_deadline, lang, s.deadline_type);
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

  // Banner country: prefer the funding/origin country when the
  // scholarship is restricted to a single nationality and host_country
  // is generic (Worldwide/Multiple). See bannerCountry() definition.
  const bannerCtry = bannerCountry(s);
  const accent = accentForCountry(bannerCtry);

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
      {/* Country band — 2026-05-10 reworked from a region-coloured
          gradient strip to a premium minimal treatment per user
          direction ("strip the color gradient, play with country name +
          silhouette + flag, Steve-Jobs-mind 2026 minimal"). Now: cream
          surface, country flag emoji, country name in editorial
          uppercase, silhouette as a faint engraving anchored right.
          A thin gold hairline at the bottom marks the band's edge.
          The card surface still has personality — silhouette + flag
          carry country identity — without the color overhead that was
          fighting the rest of the UI. */}
      <div className="relative bg-canvas-soft px-4 min-h-12 py-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/85 overflow-hidden border-b border-gold/15">
        {/* Silhouette as a faint engraving — anchored at right-third,
            lower opacity (0.18) since it no longer needs to fight a
            color gradient. Reads as letterhead-style watermarking. */}
        <CountryArt country={bannerCtry} className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-[72px] flex items-center justify-end opacity-[0.18] text-foreground pointer-events-none" />
        <span className="relative flex items-center gap-2 min-w-0 flex-1 pr-[88px]">
          {bannerCtry && (() => {
            const flag = ALL_COUNTRIES.find(c => c.v.toLowerCase() === bannerCtry.toLowerCase())?.f;
            return (
              <>
                {flag && <span className="text-[13px] leading-none shrink-0" aria-hidden>{flag}</span>}
                <span className="shrink-0 text-foreground">{shortCountry(bannerCtry, { tight: true })}</span>
              </>
            );
          })()}
          {/* Chip priority on the band — full-ride moved OUT 2026-05-10
              (now lives as a ticker tag in the card's action row so the
              band stays visually clean and the silhouette has room to
              breathe). One demographic chip allowed inline if there's
              no full-ride; otherwise the band is just country. */}
          {(() => {
            const secondary: React.ReactNode[] = [];
            if (s.target_demographics && s.target_demographics.length > 0) {
              secondary.push(
                // Drop the max-w-[40%] cap: with the tight country
                // alias above ("UK" instead of "United Kingdom") there's
                // plenty of room for the demographic word, and the cap
                // was producing chopped chips ("Need-bas…").
                // whitespace-nowrap keeps the chip on one line; the
                // outer min-w-0 + flex-1 still prevents overflow.
                <span key="dm" className="inline-flex items-center gap-1 text-gold-dark shrink-0 whitespace-nowrap">
                  {humanizeDemographic(s.target_demographics[0])}
                </span>,
              );
            }
            return secondary.length > 0 ? (
              <>
                <span className="text-muted-foreground/50 shrink-0">·</span>
                {secondary[0]}
              </>
            ) : null;
          })()}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* Title + provider. Title gets 3 lines (was 2 — too much truncation
            on long names like "MEXT Japanese Government Scholarship -..."
            in the screenshot). Provider truncates on a single line below. */}
        <div className="min-w-0">
          {/* NEW pill — first 7 days after a scholarship lands in the
              catalogue. Helps users notice fresh additions without
              having to manually compare against last visit. */}
          {isNewScholarship(s.created_at) && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30 px-1.5 py-0.5 rounded mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {ru ? "Новое" : "New"}
            </span>
          )}
          <h3 className="font-heading text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground group-hover:text-gold-dark transition-colors mb-1 break-words">
            {cleanScholarshipName(s.scholarship_name)}
          </h3>
          {(() => {
            const p = cleanProvider(s.provider_name);
            if (!p) return null;
            return (
              <div className="flex items-center gap-1.5 min-w-0">
                <ProviderAvatar url={s.official_url || s.source_url} providerName={p} size={16} />
                <p className="text-[11px] text-muted-foreground/85 line-clamp-2 leading-snug">
                  {p}
                </p>
                {/* Verified-funder dot — surfaces hand-vetted high-trust
                    providers (institutional funders like Rhodes Trust,
                    Fulbright, DAAD, etc.). The dot is intentionally
                    subtle: visible only on close read, doesn't draw the
                    eye away from the title, but converts a row from
                    "anonymous catalog entry" → "this is a known funder"
                    for the readers who scan for the signal. */}
                {s.provider_trust_tier === "high" && (
                  <span
                    className="inline-flex items-center justify-center shrink-0 h-3.5 w-3.5 rounded-full bg-gold/15 text-gold-dark"
                    title={ru ? "Проверенный фонд" : "Verified funder"}
                    aria-label={ru ? "Проверенный фонд" : "Verified funder"}
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  </span>
                )}
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

        {/* Summary — one tight line for the auto-blurb fallback, up to
            three lines for a real editorial `why_this_fits` (those are
            usually meatier per-row insight). The auto-blurb no longer
            duplicates country / provider chrome that already sits in
            the card surround, so a single line carries it. */}
        {(() => {
          // Canonical hierarchy 2026-05-10: prefer the institution-
          // verified canonical_overview, then the per-user why_this_fits,
          // then the auto-generated fallback blurb. The canonical
          // pipeline (migration 20260510110000 + canonical-extract
          // edge function) populates canonical_overview from the
          // official program page so it's the most authoritative line.
          const blurb = s.canonical_overview || why || buildScholarshipBlurb({
            name: cleanScholarshipName(s.scholarship_name),
            provider: cleanProvider(s.provider_name),
            country: s.host_country,
            coverage: s.coverage_type,
            levels: s.target_degree_level,
            fields: s.target_fields,
            demographic: s.target_demographics?.[0],
            isFullRide,
            selectivity: s.selectivity_level,
            partnerUniCount: s.partner_universities?.length,
          });
          if (!blurb) return <div className="flex-1" aria-hidden />;
          return (
            <p className={`text-[12px] leading-relaxed flex-1 ${why ? "line-clamp-3 text-foreground/70 italic" : "line-clamp-2 text-foreground/65"}`}>
              {blurb.replace(/\.+$/, "")}.
            </p>
          );
        })()}

        {/* Footer meta — deadline + field. Compact, scannable. Verified
            badge moved to top strip so this row stays focused on
            decision facts. The "Pro insight" pill renders here when
            the row has Pro-tier strategy fields populated and the
            user is on free — quiet, no animation, always inline. */}
        <div className="flex items-center gap-2 text-[11px] min-w-0">
          <span className={`tabular-nums font-medium shrink-0 ${dl.cls}`}>{dl.text}</span>
          {(() => {
            const fld = displayField(s.target_fields);
            if (!fld) return null;
            return (
              <>
                <span className="text-muted-foreground/30 shrink-0">·</span>
                <span className="text-muted-foreground truncate min-w-0">{fld}</span>
              </>
            );
          })()}
          {/* Thin-data hint — when the row was extracted from a sparse
              provider page (low completeness score), surface a quiet
              "verify on official site" note so users don't trust the
              card as fully fleshed-out. Better than presenting a
              barely-populated row as if it were complete. The badge
              is intentionally muted so it doesn't deter clicks — the
              row is still useful, just needs verification. */}
          {(typeof s.data_completeness_score === "number" && s.data_completeness_score > 0 && s.data_completeness_score < 6) && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/80 text-[10px] font-medium ml-auto"
              title={ru ? "Данные неполные — уточните на сайте провайдера" : "Sparse data — verify on the provider's official site"}
            >
              <Circle className="h-2 w-2 opacity-50" />
              {ru ? "уточнить" : "verify"}
            </span>
          )}
          {outcomes && outcomes.applied >= 3 ? (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-semibold tracking-wide tabular-nums ml-auto"
              title={outcomes.accepted > 0 ? `${outcomes.applied} TopUni members applied · ${outcomes.accepted} received offers` : `${outcomes.applied} TopUni members have applied`}
            >
              {outcomes.applied}{outcomes.accepted > 0 ? `·${outcomes.accepted}w` : ""}
            </span>
          ) : (s.saveCount30d ?? 0) >= 5 && (
            // Saved-this-month engagement signal — compounding social-
            // proof. Surfaces only when applied count is missing or
            // low so the two signals don't fight for the same slot.
            // Threshold of 5 keeps it above noise for a small but
            // active catalogue (most rows will have 0); the bookmark
            // glyph differentiates it from the "applied" emerald
            // chip above so the reader doesn't confuse the two.
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gold/10 text-gold-dark ring-1 ring-gold/25 text-[10px] font-semibold tracking-wide tabular-nums ml-auto"
              title={ru
                ? `${s.saveCount30d} студентов сохранили в этом месяце`
                : `${s.saveCount30d} students saved this month`}
            >
              <Bookmark className="h-2.5 w-2.5" />
              {s.saveCount30d}
            </span>
          )}
          {/* Score chip + visible /100 retired — match score still
              drives ranking + the strong/aligned/stretch bucketing
              but the numeric value isn't quoted to students. The
              breakdown lives on the DetailSheet for users who want
              the per-criteria why. */}
        </div>

        {/* Full-ride badge only — status badges retired from Discover
            cards 2026-05-10 ("status should only appear in Workspace,
            not in the Discover database"). Status now lives on the
            Workspace PipelineCard exclusively. */}
        {isFullRide && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-dark bg-gold/10 ring-1 ring-gold/30 px-1.5 py-0.5 rounded">
              <Award className="h-2.5 w-2.5" />
              {ru ? "Полное" : "Full ride"}
            </span>
          </div>
        )}

        {/* Action row — clean now: just bookmark + share. The full-ride
            pill moved up to share the row with the status chip. */}
        <div className="flex items-center justify-end gap-1 mt-auto pt-2.5 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onBookmark}
            aria-label={isBookmarked ? (ru ? "Удалить из сохранённых" : "Remove from saved") : (ru ? "Сохранить" : "Save")}
            title={isBookmarked ? (ru ? "В шортлисте" : "Saved") : (ru ? "Сохранить" : "Save")}
            className={`p-1.5 rounded-md transition-all ${
              isBookmarked
                ? "text-gold-dark bg-gold/10 hover:bg-gold/15"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {isBookmarked
              ? <BookmarkCheck className="h-4 w-4" />
              : <Bookmark className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); shareScholarship(s, lang); }}
            aria-label={ru ? "Поделиться стипендией" : "Share this scholarship"}
            title={ru ? "Поделиться" : "Share"}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};

/* ScholarCard is React.memo'd with a custom comparator. Without it,
 * every parent re-render (filter change, hover, status update on a
 * different card) cascades a full re-render across every visible
 * card — framer-motion in each card re-evaluates whileInView
 * intersection state, the markdown helpers re-run, and the grid
 * stutters on scroll. The cardProps factory creates NEW closures
 * for onSelect/onBookmark/onToggleHide/onToggleCompare every
 * render, so the default shallow memo wouldn't skip anything;
 * here we explicitly compare only the data props and ignore the
 * function refs (the closures still reach the live state via
 * React's setter API, so calling a stale ref is safe). */
const MemoScholarCard = memo(ScholarCard, (prev, next) => (
  prev.s === next.s
  && prev.isBookmarked === next.isBookmarked
  && prev.status === next.status
  && prev.isHidden === next.isHidden
  && prev.isComparing === next.isComparing
  && prev.outcomes === next.outcomes
  && prev.lang === next.lang
  && prev.index === next.index
));

/* ─── Filters Panel ──────────────────────────────────────────────────── */
const FiltersPanel = ({ filters, setFilters, activeCount, hostCountries, fieldsAvailable, lang = "en" }: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  activeCount: number;
  hostCountries: string[];
  fieldsAvailable: string[];
  lang?: Lang;
}) => {
  const ru = lang === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  // Round-11 redesign: pill chips for the 3 short-list segmented filters
  // (Coverage / Degree / Competitiveness) — they're 4 options each so the
  // chips stay scannable. Eligibility-group (10 options) is now a Select;
  // it dominated the panel before. Strip rings off inactive chips so the
  // panel reads premium-quiet rather than crowded-busy. Increased the
  // section gap from 4 → 6 — more breathing room is the whole point.
  // Competitiveness filter retired — gatekeeping students with
  // "this is too competitive for you, don't bother" runs against the
  // product's open-doors thesis. Selectivity still drives ranking +
  // lights up a "Prestigious" tag on cards for the very-selective
  // programs, but it's no longer something the user filters AGAINST.
  const segmented: { label: string; key: keyof FilterState; opts: { v: string; l: string }[] }[] = [
    { label: t("Coverage", "Финансирование"), key: "coverage", opts: [
      { v: "all", l: t("All", "Все") },
      { v: "full_ride", l: t("Full ride", "Полное") },
      { v: "tuition_only", l: t("Tuition only", "Только обучение") },
      { v: "partial", l: t("Partial", "Частичное") },
    ] },
    { label: t("Degree", "Уровень"), key: "degree", opts: [
      { v: "all", l: t("All", "Все") },
      { v: "undergraduate", l: t("Bachelor's", "Бакалавриат") },
      { v: "master's", l: t("Master's", "Магистратура") },
      { v: "PhD", l: "PhD" },
    ] },
  ];
  const demographicOpts = [
    { v: "all", l: t("All applicants", "Все") },
    { v: "women", l: t("Women", "Женщины") },
    { v: "underrepresented-stem", l: t("Women in STEM", "Женщины в STEM") },
    { v: "first-generation", l: t("First-generation", "Первое поколение") },
    { v: "low-income", l: t("Need-based", "По доходу") },
    { v: "refugee", l: t("Refugees", "Беженцы") },
    { v: "indigenous", l: t("Indigenous", "Коренные народы") },
    { v: "lgbtq", l: "LGBTQ+" },
    { v: "underrepresented-minority", l: t("Underrepresented", "Недопредставленные") },
    { v: "disability", l: t("Disability", "Инвалидность") },
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
                      ? "bg-gold/15 text-gold-dark font-semibold"
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("Eligibility", "Категория")}</p>
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("Field", "Направление")}</p>
            <Select value={filters.field} onValueChange={v => setFilters(f => ({ ...f, field: v }))}>
              <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All fields", "Все направления")}</SelectItem>
                {fieldsAvailable.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {hostCountries.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("Host country", "Страна обучения")}</p>
            {/* Region chips — one-tap multi-country selection. Active
                state shows the gold pill; clicking again clears.
                Single-country selections via the Select below clear
                the region pill (the hostCountry slot can hold either
                a region:X virtual or a single country, not both). */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.keys(REGIONS).map(r => {
                const v = `region:${r}`;
                const active = filters.hostCountry === v;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFilters(f => ({ ...f, hostCountry: active ? "all" : v }))}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                      active
                        ? "bg-gold/15 text-gold-dark border border-gold/30"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent"
                    }`}
                  >
                    {t(r, r === "Europe" ? "Европа" : r === "Asia-Pacific" ? "Азия-ТО" : r === "North America" ? "Сев. Америка" : r)}
                  </button>
                );
              })}
            </div>
            <Select value={filters.hostCountry.startsWith("region:") ? "all" : filters.hostCountry} onValueChange={v => setFilters(f => ({ ...f, hostCountry: v }))}>
              <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All countries", "Все страны")}</SelectItem>
                {hostCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator className="!my-5" />
      <div className="space-y-3">
        {([
          { id: "oe", label: t("Eligible only",      "Только подходящие"),       key: "onlyEligible"    as keyof FilterState },
          { id: "cs", label: t("Closing in 90 days", "Закрываются за 90 дней"),   key: "closingSoon"     as keyof FilterState },
        ] as const).map((row) => (
          <div key={row.id} className="flex items-center justify-between">
            <Label htmlFor={row.id} className="text-[13px] cursor-pointer text-foreground/75 font-normal">{row.label}</Label>
            <Switch id={row.id} checked={filters[row.key] as boolean} onCheckedChange={v => setFilters(f => ({ ...f, [row.key]: v }))} />
          </div>
        ))}
      </div>
      {/* Saved-search controls were retired from the Discover filter
          panel — the section was tall enough that it pushed real
          filters off the visible viewport on small heights. The
          underlying saved_searches table + daily-digest cron stay so a
          future entry point (Workspace, account settings) can resurface
          the feature without bloating the filter panel. */}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-muted-foreground hover:text-foreground" onClick={() => setFilters(DEFAULT_FILTERS)}>
          <X className="h-3 w-3 mr-1.5" /> {t("Clear all filters", "Сбросить все фильтры")}
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
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark, profile, status, onStatusChange, note, onNoteChange, similar, onSwitchTo, isMember, onUnlock, onExpand, lang = "en" }: {
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
  lang?: Lang;
}) => {
  const ru = lang === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  // Hook is unconditional — must run on every render even when s is null
  // (Rules of Hooks). The track call is only fired with a real id later.
  const trackEvent = useScholarshipTracking();
  // Fire a 'viewed' event on detail-sheet open. Hook handles the 60s
  // dedup so re-renders don't inflate counts.
  useTrackView(s?.scholarship_id, "detail-sheet");
  if (!s) return null;
  const dl = deadlineDisplay(s.application_deadline, lang, s.deadline_type);
  const [dc1, dc2] = dialColors(s.priority);
  /* Why-it-fits text. Falls back to scoring reasons ONLY when at
   * least one of them is a meaty insight (not a generic "Matches X
   * level" auto-reason). Without this filter the card surfaces
   * "Matches undergraduate level." as the editorial line for
   * thousands of rows — looks half-baked. */
  const meatyReasons = s.reasons.filter(r => !/^Matches \w+( level)?$/i.test(r) && !/^Open to /.test(r) && !/^Touches your field/i.test(r));
  const why = s.why_this_fits || (meatyReasons.length > 0 ? meatyReasons.slice(0, 2).join(". ") : null);

  // Build profile-vs-requirement checklist. Labels + details run through
  // t() so the Russian sheet doesn't half-render in English (round 97
  // translation pass — user flagged "more info in discover" still EN).
  const reqs: { label: string; status: "met"|"miss"|"near"|"unknown"|"info"; detail: string }[] = [];
  if (s.min_gpa != null) {
    if (profile.gpa) {
      const ug = normalizeGpa(parseFloat(profile.gpa), parseFloat(profile.gpaScale));
      const rg = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
      const status = ug >= rg ? "met" : ug >= rg - 0.3 ? "near" : "miss";
      reqs.push({ label: `GPA ≥ ${s.min_gpa}/${s.gpa_scale ?? 4.0}`, status, detail: `${t("Yours", "Ваш")}: ${profile.gpa}/${profile.gpaScale} (≈ ${ug.toFixed(2)}/4.0)` });
    } else { reqs.push({ label: `GPA ≥ ${s.min_gpa}/${s.gpa_scale ?? 4.0}`, status: "unknown", detail: t("Add your GPA to check", "Добавьте GPA, чтобы проверить") }); }
  }
  if (s.min_ielts != null) {
    if (profile.ielts) {
      const u = parseFloat(profile.ielts);
      reqs.push({ label: `IELTS ≥ ${s.min_ielts}`, status: u >= s.min_ielts ? "met" : "miss", detail: `${t("Yours", "Ваш")}: ${u}` });
    } else { reqs.push({ label: `IELTS ≥ ${s.min_ielts}`, status: "unknown", detail: t("Add your IELTS to check", "Добавьте IELTS, чтобы проверить") }); }
  }
  if (s.min_toefl != null) {
    if (profile.toefl) {
      const u = parseFloat(profile.toefl);
      reqs.push({ label: `TOEFL ≥ ${s.min_toefl}`, status: u >= s.min_toefl ? "met" : "miss", detail: `${t("Yours", "Ваш")}: ${u}` });
    } else { reqs.push({ label: `TOEFL ≥ ${s.min_toefl}`, status: "unknown", detail: t("Add your TOEFL to check", "Добавьте TOEFL, чтобы проверить") }); }
  }
  if (s.min_sat != null) {
    if (profile.sat) {
      const u = parseFloat(profile.sat);
      const status = u >= s.min_sat ? "met" : u >= s.min_sat - 80 ? "near" : "miss";
      reqs.push({ label: `SAT ≥ ${s.min_sat}`, status, detail: `${t("Yours", "Ваш")}: ${u}` });
    } else { reqs.push({ label: `SAT ≥ ${s.min_sat}`, status: "unknown", detail: t("Add your SAT to check", "Добавьте SAT, чтобы проверить") }); }
  }
  if (s.target_degree_level && profile.degrees && profile.degrees.length > 0) {
    // Bucket-tolerant match — see degreeBucket comment in the scoring
    // function. Without this the Requirements row showed "miss" for
    // a Master's applicant against a scholarship listing "Graduate".
    const targetBuckets = s.target_degree_level.map(d => degreeBucket(d)).filter(Boolean);
    const ok = profile.degrees.some(pd => targetBuckets.includes(degreeBucket(pd)));
    const status = targetBuckets.length === 0 ? "unknown" : ok ? "met" : "miss";
    reqs.push({ label: `${t("Degree level", "Уровень")}: ${s.target_degree_level.map(humanizeDegree).join(", ")}`, status, detail: `${t("Your level", "Ваш уровень")}: ${profile.degrees.map(humanizeDegree).join(" / ")}` });
  }
  if (s.target_fields && s.target_fields.length > 0 && profile.field) {
    const fm = fieldMatches(profile.field, s.target_fields);
    reqs.push({ label: t("Field of study", "Направление"), status: fm === true ? "met" : fm === false ? "miss" : "unknown", detail: `${t("Funds", "Финансирует")}: ${s.target_fields.slice(0, 4).map(humanize).join(", ")}${s.target_fields.length > 4 ? "..." : ""}` });
  }
  // Nationality / citizenship — show ONE row, not two. Prefer the
  // structured eligible_countries check (alias-aware, computes met/miss
  // against the user's country). Fall back to citizenship_requirements
  // text only when no structured list exists. Previously both rendered
  // and overlapped — same fact twice.
  const hasStructuredCountries = !!(s.eligible_countries && s.eligible_countries.length > 0);
  if (hasStructuredCountries && profile.country) {
    const list = s.eligible_countries!.map(c => c.toLowerCase());
    const open = list.some(c => c.includes("all") || c.includes("any"));
    const ok = open || matchesNationality(profile.country, s.eligible_countries!);
    reqs.push({
      label: open ? t("Open to all nationalities", "Открыто всем странам") : t("Nationality eligibility", "Гражданство"),
      status: ok ? "met" : "miss",
      detail: open ? "" : (ok ? t(`${profile.country} listed`, `${profile.country} в списке`) : t(`${profile.country} not in eligible list`, `${profile.country} нет в списке`)),
    });
  } else if (s.citizenship_requirements && !isInclusive(s.citizenship_requirements)) {
    reqs.push({ label: t("Citizenship rule", "Правило гражданства"), status: "info", detail: s.citizenship_requirements });
  }
  if (s.language_requirements) reqs.push({ label: t("Language", "Язык"), status: "info", detail: s.language_requirements });

  const days = daysUntil(s.application_deadline);
  const deadlineDate = dateOnly(s.application_deadline);

  // Last verified
  const verifiedDate = (s as Scholarship & { last_verified_date?: string }).last_verified_date;
  const verifiedDays = verifiedDate ? Math.floor((Date.now() - new Date(verifiedDate).getTime()) / 86400000) : null;
  const isStale = verifiedDays !== null && verifiedDays > 60;

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[min(99vw,1400px)] overflow-y-auto p-0 flex flex-col text-[14px] sm:text-base">
        {/* ── POSTCARD HERO — country gradient + gothic-arch campus pattern
              + country landmark layered as a poster the student "flips
              over" when they open the sheet. Sells the dream of being
              there before any data hits the page. When a program-
              specific cover_image_url has been enriched in, we render
              that as the hero instead and overlay a dark gradient so
              the country chip stays legible. */}
        {/* Hero band — was h-20 sm:h-44 (a 176px desktop banner that
            felt heavy without a cover image filled in). Now h-14 sm:h-24
            so the country accent reads as a slim accent strip rather
            than a tall, mostly-empty box. The country chip moves
            into the header subtitle below; no need to render it inside
            the band. When cover_image_url is enriched in (round-26
            cron output), the band switches back to a taller treatment
            so the photo has room to breathe. */}
        {(() => {
          const dsAccent = accentForCountry(s.host_country);
          const cover = s.cover_image_url || null;
          const heroH = cover ? "h-32 sm:h-44" : "h-14 sm:h-24";
          return (
            <div className={`relative ${heroH} overflow-hidden bg-gradient-to-r ${dsAccent} shrink-0`}>
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <CountryArt country={s.host_country} className="absolute right-4 inset-y-0 h-full opacity-40 pointer-events-none" />
              )}
              <span className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
            </div>
          );
        })()}
        {/* ── HEADER (premium editorial — drops the gold-ambient + linear
              navy wash overlays from the previous build; both stacked on
              top of the canvas-soft bg and read as fussy at sheet scale.
              User feedback: "right panel pull up aesthetic UI just still
              not satisfied revamp improve do whatever you need to do
              still ugly." Now: clean canvas-soft surface, precise
              typography, generous spacing, single visual focal point. */}
        <div className="bg-canvas-soft px-6 sm:px-7 pt-4 sm:pt-5 pb-4 sm:pb-5 shrink-0 border-b border-border">
          <SheetHeader className="space-y-3">
            {/* Competitive/selectivity chip retired from the detail
                sheet header 2026-05-10 per user direction "lets get
                rid of the competitive bar thing for now". The data
                still backs scoring + bucketing in the grid; just not
                surfaced here. The "New" pill stays since it's a
                time-bound discovery signal, not competitiveness. */}
            {isNewScholarship(s.created_at) && (
              <div>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30 px-1.5 py-0.5 rounded">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {ru ? "Новое" : "New"}
                </span>
              </div>
            )}

            <SheetTitle className="text-foreground font-heading text-[26px] sm:text-[30px] leading-[1.1] tracking-[-0.02em] text-left">
              {cleanScholarshipName(s.scholarship_name)}
            </SheetTitle>
            <p className="text-muted-foreground text-sm text-left -mt-1">
              {[cleanProvider(s.provider_name), s.host_country && shortCountry(s.host_country)].filter(Boolean).join(" · ")}
            </p>

            {/* Eligibility framing reworked in round 6 — earlier copy
                ('You qualify on paper' / 'Near miss' / 'Doesn't fit')
                over-claimed certainty from a thin profile. Show only
                the FACTUAL gaps when there are clear ones; otherwise
                say nothing. */}
            {s.eligibility === "missing" && s.warnings.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {t("Watch", "Обратите внимание")}: {s.warnings.slice(0, 1)[0]}
              </p>
            )}
            {s.eligibility === "not_eligible" && s.warnings.length > 0 && (
              <p className="text-destructive/85 text-xs">
                {s.warnings.slice(0, 1)[0]}
              </p>
            )}
          </SheetHeader>

          {/* Key facts — clean 3-up grid (was an inline · separated line
              that crowded long values). Each cell stacks its label
              uppercase-eyebrow / value-bold-large for editorial weight.
              Total cell only renders when distinct from the Award
              compact label (round-22 dedup logic preserved). */}
          {(() => {
            const compact = compactAward(s) ?? COVERAGE_LABEL[s.coverage_type] ?? "—";
            const totalDistinct = (() => {
              if (!s.estimated_total_value_usd) return null;
              const total = fmtValue(s.estimated_total_value_usd);
              if (compact.replace(/\s/g, "") === total.replace(/\s/g, "")) return null;
              return total;
            })();
            return (
              <div className={`mt-5 grid ${totalDistinct ? "grid-cols-3" : "grid-cols-2"} gap-px rounded-xl bg-border/60 ring-1 ring-border/60 overflow-hidden`}>
                <div className="bg-canvas-soft px-3.5 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85 mb-0.5">
                    {t("Award", "Финансирование")}
                  </p>
                  <p className="font-heading font-bold text-foreground text-[15px] tabular-nums leading-tight truncate">
                    {compact}
                  </p>
                </div>
                <div className="bg-canvas-soft px-3.5 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85 mb-0.5">
                    {t("Deadline", "Дедлайн")}
                  </p>
                  <p className={`font-heading font-bold text-[15px] tabular-nums leading-tight truncate ${dl.cls}`}>
                    {dl.text}
                  </p>
                  {deadlineDate && (
                    <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">{deadlineDate}</p>
                  )}
                </div>
                {totalDistinct && (
                  <div className="bg-canvas-soft px-3.5 py-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85 mb-0.5">
                      {t("Total", "Итого")}
                    </p>
                    <p className="font-heading font-bold text-gold-dark text-[15px] tabular-nums leading-tight truncate">
                      ≈ {totalDistinct}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          {s.award_amount_text && s.award_amount_text.length > 16 && (
            <p className="text-[12px] text-muted-foreground/85 leading-snug mt-2">{s.award_amount_text}</p>
          )}

          {/* Header CTAs — Apply (gold), Bookmark, and an escape hatch
              to the dedicated /scholarships/:id full-page view for
              users who want a more elaborate read instead of the
              side-sheet experience. The Apply click is tracked via
              the scholarship-tracking hook so we can chart click-
              through-to-apply per scholarship. */}
          {/* Apply CTA. Three states:
               1. Official URL present + not from a known aggregator →
                  gold CTA, takes the user to the real provider page.
               2. URL present but from an aggregator domain (round 32) →
                  show "Verify with provider" so we don't pretend the
                  aggregator is the official source. Same destination,
                  honest framing.
               3. URL missing → "No official link" disabled. */}
          <div className="relative flex items-center gap-2 mt-4">
            {(() => {
              const aggregator = isAggregatorUrl(s.official_url);
              if (!s.official_url) {
                return (
                  <Button variant="gold" size="sm" disabled className="flex-1 h-9">
                    <span>{t("No official link", "Нет ссылки")}</span>
                  </Button>
                );
              }
              if (aggregator) {
                return (
                  <Button variant="outline" size="sm" asChild className="flex-1 h-9 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/5">
                    <a
                      href={s.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent(s.scholarship_id, "clicked", "discover-detail-apply-aggregator")}
                    >
                      {t("Open aggregator listing", "Открыть агрегатор")} <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </a>
                  </Button>
                );
              }
              return (
                <Button variant="gold" size="sm" asChild className="flex-1 h-9">
                  <a
                    href={s.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent(s.scholarship_id, "clicked", "discover-detail-apply")}
                  >
                    {t("Apply on official site", "Подать на официальном сайте")} <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </Button>
              );
            })()}
            <Button variant="outline" size="sm" className="h-9" onClick={onBookmark}>
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-gold-dark" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          </div>
          {isAggregatorUrl(s.official_url) && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 leading-snug flex items-start gap-1.5">
              <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
              {t(
                "This link points to a third-party aggregator, not the official provider. Verify the program directly on the provider's site before applying.",
                "Эта ссылка ведёт на сторонний агрегатор, а не на официальный сайт программы. Подтвердите детали на сайте провайдера перед подачей.",
              )}
            </p>
          )}
          {/* The "Personalized strategy" middle-of-header CTA was
              removed — the Strategy → button now lives in the tab
              strip below as the natural place to look for it (where
              the old Strategy tab used to be). One CTA per affordance,
              no duplication. */}

          {/* URL health warning — surfaces the URL freshness checker's
              verdict. 3+ consecutive fails = link probably moved.
              Nothing renders for healthy or never-checked URLs. */}
          {s.official_url && (s.url_consecutive_fails ?? 0) >= 3 && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {t(
                  `Our weekly link-checker has failed to reach this URL ${s.url_consecutive_fails}+ times. The provider may have moved the page — verify before applying.`,
                  `Наш еженедельный чекер не смог открыть эту ссылку ${s.url_consecutive_fails}+ раз. Возможно, провайдер перенёс страницу — проверьте перед подачей.`,
                )}
              </span>
            </div>
          )}
          {s.url_check_status === "redirect" && s.url_resolved_to && s.url_resolved_to !== s.official_url && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
              {t("Note: this URL now redirects to", "Примечание: ссылка теперь ведёт на")} <code className="font-mono text-foreground/80">{s.url_resolved_to.slice(0, 80)}</code>
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
        {/* Tabs reduced to TWO (was three: Overview / Requirements /
            Strategy). The Strategy tab and the "Personalized strategy"
            CTA both opened the same deep-dive content — the user called
            out the overlap ("the personalized strategy to open the more
            detailed view and the strategy tab overlap in idea"). The
            side sheet is now scan-mode (Overview = facts, Requirements
            = checklist) and the focused dialog is the single home for
            strategy depth. Cleaner mental model + the dialog has the
            screen real estate the long-form strategy fields need. */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <div className="px-7 pt-5 border-b border-border bg-background sticky top-0 z-10 overflow-x-auto scrollbar-hide">
            <TabsList className="bg-transparent p-0 h-auto gap-5 sm:gap-7 w-max sm:w-full justify-start rounded-none -mb-px">
              {([
                { v: "overview",     label: t("Overview",     "Обзор") },
                { v: "requirements", label: t("Requirements", "Требования") },
              ] as const).map((tab) => (
                <TabsTrigger
                  key={tab.v}
                  value={tab.v}
                  className="data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:shadow-none border-b-2 border-transparent text-muted-foreground hover:text-foreground rounded-none px-0 pb-3 pt-0 text-sm font-medium bg-transparent"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
              {/* Strategy — Pro/membership gating dropped 2026-05-10
                  per user direction "we are dropping pro, it's
                  members only". Authenticated users always get the
                  full strategy panel; the paywall flow stays in the
                  codebase but isn't reachable from this tab. */}
              <button
                type="button"
                onClick={() => onExpand()}
                className="inline-flex items-center gap-1.5 border-b-2 border-transparent text-muted-foreground hover:text-foreground rounded-none px-0 pb-3 pt-0 text-sm font-medium bg-transparent transition-colors"
              >
                {t("Strategy", "Стратегия")}
              </button>
            </TabsList>
          </div>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="px-5 sm:px-7 py-3 sm:py-4 space-y-3 sm:space-y-4 m-0 focus-visible:outline-none">
            {/* Overview = ABOUT THE SCHOLARSHIP. Eligibility, citizenship,
                language, profile-vs-requirements signals — all of that
                lives in Requirements. The generic blurb fallback was
                producing surface-level filler ("Funds need-based at the
                master's level") so it's gone too — only render an
                editorial line when the LLM actually wrote one. */}
            {s.why_this_fits && s.why_this_fits.trim().length > 30 && (
              <p className="text-[15px] leading-relaxed text-foreground/85">
                {s.why_this_fits.replace(/\.+$/, "")}.
              </p>
            )}

            {s.ideal_candidate_profile && s.ideal_candidate_profile.trim().length > 30 && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  {t("Ideal candidate", "Идеальный кандидат")}
                </p>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {s.ideal_candidate_profile.length > 500
                    ? s.ideal_candidate_profile.slice(0, 480).trimEnd() + "…"
                    : s.ideal_candidate_profile}
                </p>
              </div>
            )}

            {/* Combined tag rail — fields the program funds, best-for tags,
                and duration as a labelled chip. No section headers; the
                chips read on their own. Replaces three separate stacked
                blocks (Funds / Best for / Duration in a white square),
                each of which advertised a single fact behind a verbose
                uppercase label. */}
            {(() => {
              const fieldChips: { kind: "field" | "tag" | "duration"; label: string }[] = [];

              (s.target_fields ?? []).forEach(raw => {
                if (!raw) return;
                const splits = raw.split(/\s*[,/;]\s*/).filter(Boolean);
                const items = splits.length > 1 ? splits : [raw];
                items.forEach(item => {
                  item = item.trim();
                  if (!item || FIELD_JUNK.test(item) || item.length > 42) return;
                  const titled = titleCaseField(item.replace(/[-_]+/g, " ").replace(/\s+/g, " "));
                  if (!fieldChips.some(c => c.kind === "field" && c.label.toLowerCase() === titled.toLowerCase())) {
                    fieldChips.push({ kind: "field", label: titled });
                  }
                });
              });

              (s.best_for_tags ?? []).forEach(tg => {
                const labeled = humanize(tg);
                if (!fieldChips.some(c => c.label.toLowerCase() === labeled.toLowerCase())) {
                  fieldChips.push({ kind: "tag", label: labeled });
                }
              });

              if (s.duration_text && s.duration_text.trim().length > 0) {
                fieldChips.push({ kind: "duration", label: s.duration_text.trim() });
              }

              if (fieldChips.length === 0) return null;
              // 2026-05-10: pill colours unified to a single neutral
              // cream tone per user direction "im also still seeing
              // tags in different colors... fix it". Pre-fix tag /
              // duration / field used three different bg/border
              // shades, plus partner universities used a primary tint
              // — visually noisy. Now all chips read as one uniform
              // family.
              return (
                <div className="flex flex-wrap gap-1.5">
                  {fieldChips.slice(0, 14).map((c, i) => (
                    <span
                      key={`${c.kind}-${i}-${c.label}`}
                      className="text-xs text-foreground/80 bg-muted/50 border border-border/70 px-2.5 py-1 rounded-md font-medium"
                    >
                      {c.label}
                    </span>
                  ))}
                  {fieldChips.length > 14 && (
                    <span className="text-xs text-muted-foreground self-center">+{fieldChips.length - 14}</span>
                  )}
                </div>
              );
            })()}

            {Array.isArray(s.partner_universities) && s.partner_universities.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  {t("Partner universities", "Партнёрские университеты")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {s.partner_universities.slice(0, 12).map((u, i) => (
                    <span key={i} className="text-xs text-foreground/80 bg-muted/50 border border-border/70 px-2.5 py-1 rounded-md font-medium">{u}</span>
                  ))}
                  {s.partner_universities.length > 12 && (
                    <span className="text-xs text-muted-foreground self-center">+{s.partner_universities.length - 12} {t("more", "ещё")}</span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* REQUIREMENTS — eligibility, citizenship, profile-vs-thresholds,
              application demands. All things "what does this need from
              me" live here so Overview stays a clean program description. */}
          <TabsContent value="requirements" className="px-5 sm:px-7 py-3 sm:py-4 space-y-4 m-0 focus-visible:outline-none">
            {/* Eligibility narrative + language as a single flowing paragraph.
                Headers stripped — at this point in the panel, the user is
                inside the "Requirements" tab, so labelling each paragraph
                "Eligibility (from program)" / "Language" was redundant
                signage. */}
            {(s.eligibility_requirements && s.eligibility_requirements.trim().length > 30) || s.language_requirements ? (
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3.5 space-y-2">
                {s.eligibility_requirements && s.eligibility_requirements.trim().length > 30 && (
                  <p className="text-sm text-foreground/85 leading-relaxed">
                    {s.eligibility_requirements.length > 600
                      ? s.eligibility_requirements.slice(0, 580).trimEnd() + "…"
                      : s.eligibility_requirements}
                  </p>
                )}
                {s.language_requirements && (
                  <p className="text-sm text-foreground/75 leading-relaxed">
                    <span className="text-muted-foreground">{t("Language", "Язык")}: </span>
                    {s.language_requirements}
                  </p>
                )}
              </div>
            ) : null}

            {/* Canonical structured requirements — only renders when
                the canonical-extract pipeline has populated this row.
                Reads as a clean checklist of citizenship / level /
                field / GPA / language / age constraints, distinct
                from the freeform eligibility prose above. */}
            {(() => {
              const cr = (s as { canonical_requirements?: {
                citizenship?: string[]; levels?: string[]; fields?: string[];
                min_gpa?: number | null; min_ielts?: number | null;
                min_toefl?: number | null; min_sat?: number | null;
                age_max?: number | null; other?: string[];
              } | null }).canonical_requirements;
              if (!cr || typeof cr !== "object") return null;
              const rows: { label: string; value: string }[] = [];
              if (Array.isArray(cr.citizenship) && cr.citizenship.length > 0) {
                rows.push({ label: t("Citizenship", "Гражданство"), value: cr.citizenship.slice(0, 6).join(", ") + (cr.citizenship.length > 6 ? ` +${cr.citizenship.length - 6}` : "") });
              }
              if (Array.isArray(cr.levels) && cr.levels.length > 0) {
                rows.push({ label: t("Levels", "Уровни"), value: cr.levels.join(", ") });
              }
              if (Array.isArray(cr.fields) && cr.fields.length > 0 && cr.fields.length <= 8) {
                rows.push({ label: t("Fields", "Направления"), value: cr.fields.join(", ") });
              }
              if (cr.min_gpa != null && cr.min_gpa > 0) {
                rows.push({ label: t("Min GPA", "Мин. GPA"), value: String(cr.min_gpa) });
              }
              if (cr.min_ielts != null && cr.min_ielts > 0) {
                rows.push({ label: "IELTS", value: String(cr.min_ielts) });
              }
              if (cr.min_toefl != null && cr.min_toefl > 0) {
                rows.push({ label: "TOEFL", value: String(cr.min_toefl) });
              }
              if (cr.min_sat != null && cr.min_sat > 0) {
                rows.push({ label: "SAT", value: String(cr.min_sat) });
              }
              if (cr.age_max != null && cr.age_max > 0) {
                rows.push({ label: t("Max age", "Макс. возраст"), value: String(cr.age_max) });
              }
              if (rows.length === 0 && (!cr.other || cr.other.length === 0)) return null;
              return (
                <div className="rounded-2xl border border-gold/25 bg-gold/[0.04] px-4 py-3.5 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gold-dark font-bold">
                    {t("Verified requirements", "Подтверждённые требования")}
                  </p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {rows.map((r) => (
                      <div key={r.label} className="flex items-baseline gap-2 text-sm">
                        <dt className="text-muted-foreground shrink-0 text-[11px] uppercase tracking-wide">{r.label}</dt>
                        <dd className="text-foreground/85 font-medium truncate">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {Array.isArray(cr.other) && cr.other.length > 0 && (
                    <ul className="pt-1 space-y-1 text-sm text-foreground/80">
                      {cr.other.slice(0, 4).map((o, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-gold-dark mt-1.5 shrink-0">·</span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

            {/* Application-demand chips — render inline at the top of
                the reqs panel, no header. Same chip-rail pattern as
                Overview so the visual language stays consistent. */}
            {(s.essay_required || s.interview_required || (s.recommendation_letters_required ?? 0) > 0) && (
              <div className="flex flex-wrap gap-2">
                {s.essay_required && <span className="inline-flex items-center gap-1.5 text-xs bg-warning/10 text-warning border border-warning/20 px-2.5 py-1 rounded-full"><FileText className="h-3 w-3" />{t("Essay required", "Требуется эссе")}</span>}
                {s.interview_required && <span className="inline-flex items-center gap-1.5 text-xs bg-warning/10 text-warning border border-warning/20 px-2.5 py-1 rounded-full"><Users className="h-3 w-3" />{t("Interview", "Интервью")}</span>}
                {(s.recommendation_letters_required ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-warning/10 text-warning border border-warning/20 px-2.5 py-1 rounded-full">
                    <FileText className="h-3 w-3" />{s.recommendation_letters_required} {ru ? "реком. писем" : `rec letter${(s.recommendation_letters_required ?? 0) > 1 ? "s" : ""}`}
                  </span>
                )}
              </div>
            )}

            {reqs.length > 0 ? (
              <div className="bg-muted/30 rounded-2xl px-4 py-1">
                {reqs.map((r, i) => <ReqRow key={i} {...r} />)}
              </div>
            ) : (
              !s.eligibility_requirements && (
                <p className="text-sm text-muted-foreground">{t("No specific requirements recorded for this scholarship.", "Конкретные требования по этой стипендии не записаны.")}</p>
              )
            )}

            {s.warnings.length > 0 && (
              <div className="rounded-2xl border border-warning/25 bg-warning/[0.04] px-4 py-3.5 space-y-1.5">
                {s.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm leading-relaxed text-warning">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{w}
                  </div>
                ))}
              </div>
            )}

            {s.required_documents && s.required_documents.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">{t("Documents", "Документы")}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
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
                    <p className={`font-semibold text-sm ${days <= 30 ? "text-destructive" : "text-warning"}`}>{days} {t("days until deadline", "дней до дедлайна")}</p>
                    <p className="text-xs text-muted-foreground">{deadlineDate}</p>
                  </div>
                </div>
              </div>
            )}
            {(() => {
              // "Cycle" row removed — deadline_type is already encoded in
              // the dl.text suffix on the Deadline row ("(Reopens annually)",
              // "(Rolling)", etc.), so listing it twice was overlap.
              const rows = [
                [t("Deadline", "Дедлайн"), deadlineDate ? `${deadlineDate} (${dl.text})` : (dl.text || "TBD")],
                [t("Platform", "Платформа"), s.application_platform],
                [t("Application fee", "Стоимость подачи"), s.application_fee_text],
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
                  <p className="text-sm font-semibold text-warning">{t("Separate application required", "Нужна отдельная заявка")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      "You're not auto-considered when admitted — you must apply separately.",
                      "При поступлении вас не рассмотрят автоматически — нужно подать отдельную заявку.",
                    )}
                  </p>
                </div>
              </div>
            )}
            {s.partner_universities && s.partner_universities.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" /> {t("Partner universities", "Университеты-партнёры")} · {s.partner_universities.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {s.partner_universities.slice(0, 18).map((u, i) => (
                    <span key={i} className="text-xs bg-muted/60 border border-border px-2.5 py-1 rounded-md text-foreground/80">{u}</span>
                  ))}
                  {s.partner_universities.length > 18 && (
                    <span className="text-xs text-muted-foreground self-center">+{s.partner_universities.length - 18} {t("more", "ещё")}</span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* STRATEGY tab content removed — depth lives in
              ExpandedScholarshipDialog. The history is in commit
              c6a074f if a future build wants to re-extract the
              previous Ideal Candidate / How to Win / Strategy Notes
              markup. Marker block kept so jumping by anchor in this
              file lines up with the block-comment landmarks. */}

          {/* APPLY */}
        </Tabs>

        {/* ── SIMILAR SCHOLARSHIPS — Crunchbase/IMDB pattern: keep users moving ── */}
        {similar.length > 0 && (
          <div className="px-7 py-6 border-t border-border bg-canvas-soft/50">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-3">{t("If you like this, also look at", "Если нравится это, посмотрите ещё")}</p>
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
            <div className="px-7 py-2.5 border-t border-border/60 bg-canvas-soft/50 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[10px] text-muted-foreground/70">
                {t("Verify on the official site before applying.", "Проверьте на официальном сайте перед подачей.")}
              </span>
              <a
                href={`mailto:hello@topuni.com?subject=${encodeURIComponent("Inaccurate scholarship data: " + s.scholarship_name)}&body=${encodeURIComponent("ID: " + s.scholarship_id + "\n\nWhat's wrong:\n")}`}
                className="text-[10px] text-muted-foreground/70 hover:text-foreground underline underline-offset-4 shrink-0"
              >
                {t("Report inaccuracy", "Сообщить о неточности")}
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
      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
    </div>
  </Reveal>
);

/* ─── Free-tier paywall surfaces ────────────────────────────────────────
 * Two flavours: PaywallRow (matches the list-view row geometry so the
 * locked-rows pitch flows visually with the table); PaywallCard (full-
 * width tile for grid view). Both link to /pricing and explain how
 * many more programs Membership unlocks. They render only when the
 * gate is active — the parent has already done the visibility check.
 */
/* Russian noun forms for "scholarship": 1 → стипендия, 2-4 → стипендии,
 * 5+ → стипендий. Plus the genitive "more scholarships" reads as "ещё
 * стипендий". This helper picks the right form. */
const ruScholarshipPlural = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "стипендия";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "стипендии";
  return "стипендий";
};

const PaywallRow = ({ lockedCount, lang = "en" }: { lockedCount: number; lang?: Lang }) => {
  const ru = lang === "ru";
  return (
    <Link
      to={ru ? "/pricing/ru" : "/pricing"}
      className="block border-t border-gold/30 bg-gradient-to-r from-gold/8 via-gold/4 to-gold/8 hover:from-gold/12 hover:to-gold/12 transition-colors px-4 py-5 sm:py-6"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-gold-dark to-gold shadow-sm shrink-0">
          <Crown className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-[15px] text-foreground leading-tight">
            {ru
              ? `Ещё ${lockedCount} ${ruScholarshipPlural(lockedCount)} с подпиской`
              : `${lockedCount} more ${lockedCount === 1 ? "scholarship" : "scholarships"} with Membership`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {ru
              ? "Бесплатный доступ — первые 5 стипендий. Подписка открывает всю базу, AI-стратегию, отслеживание дедлайнов и больше."
              : "Free covers your first 5 picks. Membership unlocks the full database, AI strategy, deadline tracking, and more."}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-gold-dark shrink-0" />
      </div>
    </Link>
  );
};

const PaywallCard = ({ lockedCount, className = "", lang = "en" }: { lockedCount: number; className?: string; lang?: Lang }) => {
  const ru = lang === "ru";
  return (
    <Link
      to={ru ? "/pricing/ru" : "/pricing"}
      className={`block rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent hover:border-gold/55 hover:from-gold/15 transition-all p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-gold-dark to-gold shadow-sm shrink-0">
          <Crown className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-base sm:text-lg text-foreground leading-tight">
            {ru
              ? `Ещё ${lockedCount} ${ruScholarshipPlural(lockedCount)} с подпиской`
              : `${lockedCount} more ${lockedCount === 1 ? "scholarship" : "scholarships"} with Membership`}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">
            {ru
              ? "Бесплатно вы видите первые 5 — этого достаточно, чтобы оценить базу. Подписка открывает каждую программу, AI-разбор стратегии, отслеживание дедлайнов и работу с рекомендателями."
              : "Free covers your first 5 picks so you can sample the database. Membership unlocks every program, the AI strategy deep dive, deadline tracking, and recommender follow-ups."}
          </p>
          <span className="inline-flex items-center gap-1.5 mt-3 text-xs sm:text-sm font-semibold text-gold-dark">
            {ru ? "Тарифы" : "See pricing"}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

/* ─── Main ───────────────────────────────────────────────────────────── */
interface Props { language?: "en" | "ru" }

const Discover = ({ language = "en" }: Props) => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  // is_active = (active|trialing paid sub with period valid) OR
  // earned_trial_active. is_founding_member is the lifetime perk.
  // Bare tier check (the previous form) treated canceled-pro users
  // as members until the DB tier column was backfilled, leaking
  // premium access.
  const isMember = subscription.is_active || subscription.is_founding_member;

  /* Translation helper. The Discover surface used to render almost
   * entirely in English regardless of route — only the top nav strip
   * was Russian-aware. This `t(en, ru)` helper returns the right
   * string per language and is threaded through every visible label,
   * CTA, section header, and empty-state copy. Internal helpers
   * (deadlineDisplay, ScholarRow, ScholarCard) accept a `lang` arg /
   * prop so the same translation flows into row-level text too. */
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);

  /* Free-tier scholarship gate. Free users see a generous-but-finite
   * preview window (FREE_VISIBLE_LIMIT rows). Past that, a paywall
   * card explains how many more are unlocked with Membership. Members
   * + admins see all rows. The admin path lets the founder keep
   * iterating on the free experience without paying himself; toggle
   * via ?admin=1 in the URL or by being signed in with an ADMIN_EMAIL. */
  const FREE_VISIBLE_LIMIT = 5;
  // Run once per mount: ?admin=1 / ?admin=0 in the URL flips the
  // localStorage flag so the user can opt the device into admin mode
  // without code changes.
  useEffect(() => { consumeAdminUrlFlag(); }, []);
  const adminBypass = isAdminUser(user) || isAdminBypass();
  const gateActive = !isMember && !adminBypass;
  const [foundingLeft, setFoundingLeft] = useState<{ left: number; cap: number } | null>(null);

  /* Temporary "beta" banner — surfaces honesty about the data quality
   * while the verification + enrichment pipelines are still catching
   * up. Dismissal persists per-device via localStorage so we don't
   * nag returning users. Pull it once we hit ~95% verification on the
   * core regions; the localStorage key won't be re-keyed so anyone
   * who dismissed it stays dismissed. */
  const [betaDismissed, setBetaDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("topuni_discover_beta_dismissed") === "1"; }
    catch { return false; }
  });
  const dismissBeta = () => {
    setBetaDismissed(true);
    try { window.localStorage.setItem("topuni_discover_beta_dismissed", "1"); }
    catch { /* private mode — fine, just won't persist */ }
  };

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
  /* Save-count map keyed by scholarship_id. Pulled once on mount alongside
   * the scholarships fetch and re-derived in scoreScholarship via the
   * engagement boost. Empty Map until the fetch resolves — scoring
   * still works (the boost is optional). */
  const [saveCounts, setSaveCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  /* Catalog-fetch error state — when the supabase fetch itself
   * fails (network drop, RLS misconfig, cold-start race), we used
   * to show the empty-results state ("Nothing matches these
   * filters") which misled users into thinking their filters
   * were too tight. Now: an explicit retry banner that fires a
   * fresh fetch on click. Refreshes when fetchKey bumps. */
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const retryCatalog = () => { setCatalogError(null); setLoading(true); setFetchKey(k => k + 1); };
  const [profile, setProfile] = useState<Profile>({ country: "", degrees: [], gpa: "", gpaScale: "4.0", ielts: "", toefl: "", sat: "", field: "", demographics: [], targetCountries: [] });
  // Round-28 IA: /discover always lands you in the database. Previously
  // we showed a big "answer 4 questions" landing wall that forked users
  // out to /topuni-ai — TopUni AI and Discover felt like two products.
  // Now the database is the front surface; the inline "Build my profile"
  // CTA in the results header (seen pre-profile) is the funnel into
  // TopUni AI. Wizard remains reachable as a quick-filter alternative.
  const [phase, setPhase] = useState<Phase>("results");

  /* Auth-driven sort auto-transition. AuthContext pulls the user's
   * student_profile from the DB into localStorage on sign-in. Once
   * that completes, "match" is the right default sort instead of the
   * pre-profile "deadline". 250ms debounce so we don't beat
   * AuthContext's pullProfileFromDb round-trip. */
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      const stored = getStoredProfile();
      if (!stored?.nationality) return;
      setSortBy((cur) => (cur === "deadline" ? "match" : cur));
    }, 250);
    return () => clearTimeout(timer);
  }, [user]);
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
  const [filters, setFilters] = useState<FilterState>(() => {
    // When the user clicks a saved-search alert from Pipeline, that page
    // stashes the filter blob in sessionStorage before navigating here.
    // Hydrate from it on mount so we land directly on the matching set.
    // Single-shot: clear after consuming so a regular page refresh
    // doesn't re-apply stale filters.
    try {
      const raw = sessionStorage.getItem("topuni_apply_saved_filters");
      if (raw) {
        sessionStorage.removeItem("topuni_apply_saved_filters");
        const parsed = JSON.parse(raw) as Partial<FilterState>;
        return { ...DEFAULT_FILTERS, ...parsed };
      }
    } catch {
      // Cross-origin / private mode / corrupt JSON — fall through.
    }
    return DEFAULT_FILTERS;
  });
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

  /* Section pagination — initial render caps each priority section at
   * SECTION_PAGE_SIZE cards. Members with deep matches (hundreds of
   * strong/competitive/stretch rows) used to pay the full render cost
   * on first paint, blocking interactivity for 1-2s on mid-range
   * mobile. The Set tracks which section keys the user has expanded
   * via "Show more"; expanded sections render their full content. */
  const SECTION_PAGE_SIZE = 24;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const toggleSectionExpanded = (key: string) => {
    setExpandedSections(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };
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
    /* SessionStorage catalog cache — sub-150ms second-paint for
     * repeat visits in the same session. The catalog is large (5K+
     * rows ≈ 5-7MB compressed over the wire), and the data is mostly
     * stable hour-to-hour: deadlines update via cron once a day,
     * verification flips infrequently, save counts refresh nightly.
     * A 5-minute TTL hits the sweet spot — covers tab-switching and
     * back-button navigation without serving genuinely stale data.
     *
     * On a cache hit we:
     *   1. Render from cache immediately (no spinner).
     *   2. Kick off a fresh fetch in the background (stale-while-
     *      revalidate). When the fresh fetch resolves, we update the
     *      rows with whatever changed since the cache was written.
     *
     * On a cache miss / expired cache → normal fetch path. */
    const CATALOG_CACHE_KEY = "topuni_discover_catalog_cache_v1";
    const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
    let usedCache = false;
    try {
      const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as {
          ts: number;
          rows: Scholarship[];
          saves: Array<[string, number]>;
        };
        if (cached && typeof cached.ts === "number" && Date.now() - cached.ts < CATALOG_CACHE_TTL_MS && Array.isArray(cached.rows)) {
          setRows(cached.rows);
          setSaveCounts(new Map(cached.saves ?? []));
          setLoading(false);
          usedCache = true;
        }
      }
    } catch { /* corrupt cache — fall through to network */ }

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
      //
      // Parallel-fetch the engagement signal (save_count_30d per row).
      // It feeds scoreScholarship's engagement_boost, mirroring the
      // match_scholarships RPC's compounding moat. Cheap query; one
      // round-trip vs. the catalog fetch.
      const [scholarshipsRes, statsRes, providersRes] = await Promise.all([
        supabase
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
          .order("estimated_total_value_usd", { ascending: false }),
        supabase
          .from("scholarship_stats")
          .select("scholarship_id, save_count_30d")
          .gt("save_count_30d", 0),
        // Join the providers trust tier in a separate cheap query — far
        // fewer providers than scholarships, so this is a small fetch
        // we map back onto each row by provider_id. Drives the
        // "Verified funder" pill on cards + the trust badge in detail.
        supabase
          .from("providers")
          .select("provider_id, trust_tier")
          .neq("trust_tier", "unknown"),
      ]);
      // Explicit network/RLS error path — pre-fix a failed fetch
      // left rows=[] and the UI rendered the "no matches" empty
      // state, which misleads users into adjusting filters that
      // had nothing to do with the actual failure.
      if (scholarshipsRes.error || !scholarshipsRes.data) {
        if (!usedCache) {
          setCatalogError(scholarshipsRes.error?.message ?? "Failed to load catalog");
          setLoading(false);
        }
        // When the cache hydrated already, we silently keep the
        // cached rows visible — better stale than blank.
        return;
      }
      if (scholarshipsRes.data) {
        // Clear any prior error since we just got a successful response.
        setCatalogError(null);
        const trustMap = new Map<string, "high" | "medium" | "low" | "unknown">();
        for (const p of (providersRes.data ?? []) as { provider_id: string; trust_tier: "high"|"medium"|"low"|"unknown" }[]) {
          trustMap.set(p.provider_id, p.trust_tier);
        }
        // 2026-05-10: canonical-first promotion. The canonical-extract
        // edge function pipeline (migration 20260510110000) populates
        // canonical_deadline_iso / canonical_funding_text /
        // canonical_funding_usd / canonical_official_url on rows where
        // it could verify against the institution's own page. Here we
        // promote those values into the legacy fields so every existing
        // consumer (card render, sheet, list row, compare, scoring,
        // sorting) reads canonical-first WITHOUT requiring per-site
        // call-by-call edits. Original canonical_* columns are kept
        // intact on the row in case we want to render "canonical
        // verified" badges later.
        const enriched = (scholarshipsRes.data as unknown as Scholarship[]).map(s => ({
          ...s,
          provider_trust_tier: s.provider_id ? trustMap.get(s.provider_id) ?? null : null,
          application_deadline: s.canonical_deadline_iso ?? s.application_deadline,
          award_amount_text:    s.canonical_funding_text ?? s.award_amount_text,
          estimated_total_value_usd: s.canonical_funding_usd ?? s.estimated_total_value_usd,
          official_url:         s.canonical_official_url ?? s.official_url,
        }));
        const cleaned = dedupeAndQualityFilter(enriched);
        setRows(cleaned);
        // Persist the cleaned/promoted rows + saves into the
        // session cache. Subsequent visits in this session render
        // from cache (sub-150ms second paint) while the network
        // round-trip happens in the background.
        try {
          const savesEntries: Array<[string, number]> = [];
          if (statsRes.data) {
            for (const r of statsRes.data as { scholarship_id: string; save_count_30d: number | null }[]) {
              if (typeof r.save_count_30d === "number" && r.save_count_30d > 0) {
                savesEntries.push([r.scholarship_id, r.save_count_30d]);
              }
            }
          }
          sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({
            ts: Date.now(), rows: cleaned, saves: savesEntries,
          }));
        } catch { /* quota / private mode — non-fatal */ }
      }
      if (statsRes.data) {
        const m = new Map<string, number>();
        for (const r of statsRes.data as { scholarship_id: string; save_count_30d: number | null }[]) {
          if (typeof r.save_count_30d === "number" && r.save_count_30d > 0) {
            m.set(r.scholarship_id, r.save_count_30d);
          }
        }
        setSaveCounts(m);
      }
      // Only flip loading off if we didn't already render from cache.
      // When usedCache=true, loading was already false; preserving
      // that prevents a flash of the loading state when the network
      // fetch resolves milliseconds after the cache hydrate.
      if (!usedCache) setLoading(false);
    })();
    // fetchKey lets the retry banner trigger a fresh fetch by bumping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  useEffect(() => {
    // Hydrate from localStorage on mount AND any time the user changes
    // (sign-in fires AuthContext.runPostSignInDrain → pullProfileFromDb
    // → saveProfile → LS write). Without re-running on auth change,
    // Discover sat with the empty pre-signin profile until full refresh.
    // Also subscribes to the cross-tab `storage` event so a profile
    // update in another tab (TopUni AI wizard, profile editor) flows
    // through here too.
    const apply = () => {
      const stored = getStoredProfile();
      if (!stored?.nationality) return;
      const rawLevels = (stored.targetDegree || "")
        .split(/[,/]+/).map(s => s.trim()).filter(Boolean);
      const canonicalize = (lvl: string) => {
        const l = lvl.toLowerCase();
        if (l === "phd") return "PhD";
        if (l.startsWith("master")) return "master's";
        if (l === "undergraduate" || l === "bachelor" || l.startsWith("bachelor")) return "undergraduate";
        return lvl;
      };
      setProfile({
        country: stored.nationality || "",
        degrees: rawLevels.length > 0 ? rawLevels.map(canonicalize) : [],
        gpa: stored.gpa || "", gpaScale: stored.gpaScale || "4.0",
        ielts: stored.ieltsScore || "",
        toefl: stored.toeflScore || "",
        sat: stored.satScore || "",
        field: stored.fieldOfInterest || "",
        demographics: Array.isArray(stored.demographics) ? stored.demographics : [],
        targetCountries: Array.isArray(stored.targetCountries) ? stored.targetCountries : [],
      });
    };
    apply();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "topuni_discover_profile") apply();
    };
    const onSelf = () => apply();
    window.addEventListener("storage", onStorage);
    window.addEventListener("tu:profile", onSelf);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tu:profile", onSelf);
    };
  }, [user?.id]);

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
    // Preserve any targetCountries from a prior TopUni AI brief — the
    // wizard itself doesn't ask "where do you want to study", so when
    // a user came in via TopUni AI then opened the Edit affordance,
    // their target-country preferences shouldn't be wiped just because
    // they're tweaking a different field.
    const existingTargetCountries = getStoredProfile()?.targetCountries ?? [];
    const p: Profile = { country, degrees: wiz.degrees, gpa: wiz.gpa, gpaScale: wiz.gpaScale, ielts: wiz.ielts, toefl: wiz.toefl, sat: wiz.sat, field: wiz.field, demographics: wiz.demographics, targetCountries: existingTargetCountries };
    setProfile(p);
    saveProfile({
      fullName: wiz.fullName, email: wiz.email, nationality: country,
      targetDegree: wiz.degrees.join(", "),
      gpa: wiz.gpa, ieltsScore: wiz.ielts, toeflScore: wiz.toefl, satScore: wiz.sat,
      fieldOfInterest: wiz.field,
      demographics: wiz.demographics,
      targetCountries: existingTargetCountries,
    });
    setAnalysisStep(0); setPhase("analyzing");
  };

  /* "Edit profile" handler — routes to TopUni AI, the canonical
   * onboarding/profile-builder. The Discover wizard used to be a
   * second onboarding surface, but the product position is that
   * TopUni AI IS the onboarding (the brief flow captures profile
   * + intent in one experience, then feeds Discover via the same
   * stored DiscoverProfile). Cuts the parallel wizard maintenance
   * burden and keeps profile edits unified across surfaces. */
  const resetProfile = () => {
    navigate(language === "ru" ? "/topuni-ai/ru" : "/topuni-ai");
  };

  /* Semantic-match hook — fires once per profile change against the
     match-scholarships edge function. Returns Map<scholarship_id,
     similarity>; soft-fails to an empty map if the endpoint isn't
     reachable or no embeddings exist yet. The score blends in via
     scoreScholarship — heuristic + semantic, not either-or.
     Round 30 fix: targetCountries was being filled with nationality
     ("Kazakh student → bias matches toward Kazakhstan programs"),
     which inverts what an applicant looking abroad actually wants.
     Now uses profile.targetCountries (where they want to STUDY) and
     falls back to undefined when unset, letting semantic do broad
     field+degree matching without a wrong country prior. */
  const semantic = useSemanticScholarshipMatch(
    {
      field: profile.field,
      targetCountries: profile.targetCountries.length > 0 ? profile.targetCountries : undefined,
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
      const saves = saveCounts.get(r.scholarship_id);
      return scoreScholarship(r, p, sim, saves);
    }).sort((a, b) => {
      const e = { eligible: 0, likely: 1, missing: 2, not_eligible: 3 };
      if (e[a.eligibility] !== e[b.eligibility]) return e[a.eligibility] - e[b.eligibility];
      return b.match - a.match;
    });
  }, [rows, profile, semantic.matches, saveCounts]);

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

        const key = normalizeFieldKey(item);
        // Skip empty post-normalization keys (e.g. raw was just "fields").
        if (!key || key.length < 2) return;

        const display = titleCaseField(key);
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

  /* Precomputed lowercase search index per scholarship_id → one merged
   * blob covering every field search hits (name, provider, country,
   * fields, eligible countries, best-for tags, demographics, prose
   * editorial fields). Built ONCE per `ranked` change instead of
   * re-lowercasing 7-10 strings × N rows × every keystroke. On a 5K-
   * row catalog the keystroke loop drops from ~45ms (visibly janky on
   * mobile) to a single .includes() per row.
   *
   * Cache by scholarship_id so re-ranking (which changes the ranked
   * array order/shape but not the row content) doesn't have to
   * recompute every blob. The Map persists across renders. */
  const searchBlobCacheRef = useRef<Map<string, string>>(new Map());
  const searchIndex = useMemo(() => {
    const cache = searchBlobCacheRef.current;
    const out = new Map<string, string>();
    for (const s of ranked) {
      const cached = cache.get(s.scholarship_id);
      if (cached) { out.set(s.scholarship_id, cached); continue; }
      const parts: string[] = [
        s.scholarship_name,
        s.host_country ?? "",
        s.provider_name ?? "",
        ...(s.target_fields ?? []),
        ...(s.eligible_countries ?? []),
        ...(s.best_for_tags ?? []),
        ...(s.target_demographics ?? []),
        s.why_this_fits ?? "",
        s.ideal_candidate_profile ?? "",
        s.how_to_win ?? "",
      ];
      const blob = parts.join(" ").toLowerCase();
      cache.set(s.scholarship_id, blob);
      out.set(s.scholarship_id, blob);
    }
    return out;
  }, [ranked]);

  /* Deferred search query — typing in the input updates filters.search
   * synchronously (so the input feels responsive), but the heavy
   * filtering pass below reads `deferredSearch` which lags by one
   * frame under load. React keeps the UI thread free during the
   * lag so each keystroke renders the input state immediately
   * while the result list catches up. Critical UX win on slower
   * mobile devices. */
  const deferredSearch = useDeferredValue(filters.search);

  const filteredAll = useMemo(() => {
    let list = ranked;
    if (deferredSearch) {
      // Single .includes() per row against the precomputed blob —
      // O(rows) vs the old O(rows × fields × toLowerCase). The
      // semantic coverage stays identical: name, provider, country,
      // fields, demographics, prose editorial — every surface a
      // user might intuitively type.
      const q = deferredSearch.toLowerCase();
      list = list.filter(s => searchIndex.get(s.scholarship_id)?.includes(q));
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
      // Virtual chip-level values that expand to OR-matches:
      // - "women-any" → women + underrepresented-stem (full women cohort)
      // - "refugee-any" → refugee + displaced (full displaced cohort)
      const wanted = filters.demographic === "women-any"
        ? ["women", "underrepresented-stem"]
        : filters.demographic === "refugee-any"
          ? ["refugee", "displaced"]
          : [filters.demographic];
      list = list.filter(s => Array.isArray(s.target_demographics)
        && wanted.some(d => s.target_demographics!.includes(d)));
    }
    if (filters.field !== "all") {
      // Use the SAME normalizeFieldKey() the dropdown builder uses so
      // selecting "STEM" matches a row whose target_fields contains
      // "Women in STEM" or "Science, Technology, Engineering and Math".
      // Pre-fix the inline norm here only handled separators + plurals;
      // it didn't apply the synonym map or strip "related fields", so
      // the dropdown would offer a consolidated "STEM" option but
      // selecting it filtered against a stricter key and returned 0
      // matches.
      const want = normalizeFieldKey(filters.field);
      list = list.filter(s =>
        s.target_fields?.some(f => {
          const splits = f.split(/\s*[,/;]\s*/).filter(Boolean);
          return splits.some(item => normalizeFieldKey(item) === want);
        }),
      );
    }
    if (filters.hostCountry !== "all") {
      // Region selections encode as "region:Europe" etc. Expand to the
      // OR-list of countries before filtering. Single-country values
      // pass through unchanged.
      if (filters.hostCountry.startsWith("region:")) {
        const regionName = filters.hostCountry.slice(7);
        const countries = REGIONS[regionName] || [];
        if (countries.length > 0) {
          list = list.filter(s => s.host_country && countries.includes(canonicalCountry(s.host_country)));
        }
      } else {
        list = list.filter(s => s.host_country && canonicalCountry(s.host_country) === filters.hostCountry);
      }
    }
    if (filters.onlyEligible) list = list.filter(s => s.eligibility === "eligible" || s.eligibility === "likely");
    if (filters.closingSoon) list = list.filter(s => { const d = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null; return d !== null && d > 0 && d <= 90; });
    if (!showHidden) list = list.filter(s => !hidden.has(s.scholarship_id));
    if (sortBy === "deadline") {
      // Three-bucket sort: (1) upcoming live deadlines, ascending = closest
      // first; (2) annual reopening rows whose last cycle passed (still
      // relevant, no fixed next date yet); (3) genuinely closed one-time
      // rows at the very bottom. Without this, the smallest-timestamp
      // sort surfaced the most-recently-closed rows on top — looked like
      // every top result was dead.
      const now = Date.now();
      const bucket = (s: Scored): number => {
        const t = s.application_deadline ? new Date(s.application_deadline).getTime() : null;
        const dt = (s.deadline_type ?? "").toLowerCase();
        if (t !== null && t >= now) return 0;
        if (dt === "annual" || dt === "reopens_annually" || dt === "rolling") return 1;
        if (t === null) return 1;
        return 2;
      };
      return [...list].sort((a, b) => {
        const ba = bucket(a); const bb = bucket(b);
        if (ba !== bb) return ba - bb;
        const aT = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const bT = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
        return aT - bT;
      });
    }
    if (sortBy === "value") return [...list].sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0));
    if (sortBy === "effort") { const o: Record<string, number> = { low: 0, medium: 1, high: 2 }; return [...list].sort((a, b) => (o[a.effort] ?? 1) - (o[b.effort] ?? 1)); }
    if (sortBy === "selectivity") { const o: Record<string, number> = { low: 0, medium: 1, high: 2, very_high: 3, unknown: 4 }; return [...list].sort((a, b) => (o[a.selectivity] ?? 4) - (o[b.selectivity] ?? 4)); }
    // "Trending" — sort by 30-day save activity DESC. Surfaces what
    // the catalogue community is acting on right now, even if it
    // doesn't match the user's profile perfectly. Deadline tie-break
    // pulls urgent rows up within the same save bucket so a row
    // saved 12 times closing in 5 days beats one saved 12 times with
    // a far-out deadline. Rows with no engagement signal fall to the
    // bottom; match score then orders within them so the tail still
    // reads as ranked, not random.
    if (sortBy === "trending") {
      return [...list].sort((a, b) => {
        const sa = a.saveCount30d ?? 0;
        const sb = b.saveCount30d ?? 0;
        if (sa !== sb) return sb - sa;
        // Same save count → urgent deadlines first, then match score.
        const aT = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const bT = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
        if (aT !== bT) return aT - bT;
        return b.match - a.match;
      });
    }
    return list;
    // Deps split: deferredSearch (the lagged query) + the rest of the
    // filter shape. The whole `filters` object would re-trigger this
    // memo synchronously on every keystroke, defeating the deferred
    // value. By depending on the deferred value explicitly, the heavy
    // filtering pass only runs when React decides there's spare time
    // to update the result list — the input itself updates immediately
    // on filters.search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, deferredSearch, filters.coverage, filters.degree, filters.selectivity, filters.demographic, filters.field, filters.hostCountry, filters.onlyEligible, filters.closingSoon, sortBy, hidden, showHidden]);

  /* Free-tier gating — slice the filtered list to FREE_VISIBLE_LIMIT
   * for users who aren't paid + aren't admin. Everything downstream
   * (sections bucketing, card/list render, outcome RPC fetches) reads
   * `filtered`, so a single slice here propagates. The paywall card
   * is rendered separately at the end of the list/grid below, using
   * `filteredAll.length - filtered.length` as the locked count. */
  const filtered = useMemo(
    () => (gateActive ? filteredAll.slice(0, FREE_VISIBLE_LIMIT) : filteredAll),
    [filteredAll, gateActive]
  );
  const lockedCount = filteredAll.length - filtered.length;

  /* Compounding-data signal: zero-result search telemetry. When a
   * student types a non-trivial query that returns 0 matches, we
   * log the (anonymised) query so the team can review missed-demand
   * scholarships and prioritise adding them. Debounced 800ms after
   * the LAST keystroke + only when the catalog has actually loaded
   * — we don't want to fire during the initial-load empty state.
   * Per-query dedup via a Ref so toggling unrelated filters with
   * the same query doesn't double-fire. */
  const zeroResultLastQueryRef = useRef<string>("");
  useEffect(() => {
    const q = deferredSearch.trim();
    // Only log meaningful queries (>= 3 chars filters out single-letter
    // typos and the empty state). filteredAll === 0 means the search
    // returned nothing AFTER all filters applied — capture that as
    // genuine missed demand. rows.length === 0 means catalog hasn't
    // loaded yet; ignore.
    if (q.length < 3 || rows.length === 0) return;
    if (filteredAll.length > 0) return;
    if (q === zeroResultLastQueryRef.current) return;
    const handle = window.setTimeout(() => {
      zeroResultLastQueryRef.current = q;
      void track("discover_search_zero_results", {
        query: q.slice(0, 120),
        active_filters: {
          coverage: filters.coverage,
          degree: filters.degree,
          field: filters.field,
          host_country: filters.hostCountry,
          demographic: filters.demographic,
          only_eligible: filters.onlyEligible,
          closing_soon: filters.closingSoon,
        },
      });
    }, 800);
    return () => window.clearTimeout(handle);
  }, [deferredSearch, filteredAll.length, rows.length, filters.coverage, filters.degree, filters.field, filters.hostCountry, filters.demographic, filters.onlyEligible, filters.closingSoon]);

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

  const analysisTexts = ru ? [
    `Сканируем ${rows.length || 200}+ стипендий`,
    `Фильтруем по гражданству${wiz.nationality ? `: ${wiz.nationality}` : ""}`,
    `Подбираем программы ${wiz.degrees.length > 0 ? wiz.degrees.join(" / ") : "вашего уровня"}${wiz.field ? ` в направлении ${wiz.field}` : ""}`,
    "Оцениваем академические пороги и селективность",
    "Ранжируем лучшие возможности",
  ] : [
    `Scanning ${rows.length || 200}+ scholarships`,
    `Filtering by nationality${wiz.nationality ? `: ${wiz.nationality}` : ""}`,
    `Matching ${wiz.degrees.length > 0 ? wiz.degrees.join(" / ") : "your degree"} programs${wiz.field ? ` in ${wiz.field}` : ""}`,
    "Evaluating academic thresholds and selectivity",
    "Ranking your best opportunities",
  ];

  const dark = phase === "wizard" || phase === "analyzing";
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
        {phase !== "results" && (
          /* Use overlay nav variant on the dark phases (landing /
             wizard / analyzing) so the navy hero gradient extends
             through the nav strip. Without this, in dark mode the
             nav's own surface tint clashed with the navy hero
             behind it — same color family, no clear separation. */
          <Navigation language={language} variant={dark ? "overlay" : "default"} />
        )}
        {phase === "results" && <DiscoverAppBar language={language} />}

        {/* Round-42: navy gate-opening entrance plays once per session
            when the user first lands on /discover. Sits OUTSIDE the
            phase-conditional layouts so it appears regardless of
            entry path. Fades itself out after ~1.4s. */}
        <DiscoverEntranceGate />

        <AnimatePresence mode="wait">
          {/* Round-28 IA: landing phase removed. /discover lands users
              directly in the database (results phase). The pre-profile
              "Build my profile" CTA inside the results header is the
              funnel into TopUni AI, so the AI flow and the database
              are one seamless surface — not two products with a wall
              between them. The inline wizard remains as a quick-filter
              alternative when users open it explicitly. */}

          {/* ══ WIZARD ══ */}
          {phase === "wizard" && (
            <motion.div key="wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="relative min-h-[calc(100vh-64px)] flex flex-col">
              <div className="pt-7 px-6 flex items-center justify-between max-w-2xl mx-auto w-full relative z-10">
                <button onClick={() => wizardStep === 0 ? setPhase("results") : setWizardStep(s => s - 1)} className="text-primary-foreground/40 hover:text-primary-foreground transition-colors p-2 -ml-2">
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
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">{t("Step 1 · Hello", "Шаг 1 · Знакомство")}</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">{t("Let's start with you.", "Начнём с вас.")}</h2>
                    <p className="text-primary-foreground/50 mb-12 text-base">{t("Just so we can save your matches.", "Чтобы мы могли сохранить ваши совпадения.")}</p>
                    <div className="w-full space-y-5 text-left">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">{t("Your name", "Ваше имя")}</label>
                        <Input value={wiz.fullName} onChange={e => setWiz(w => ({ ...w, fullName: e.target.value }))} placeholder={t("First name (optional)", "Имя (необязательно)")}
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 text-base backdrop-blur-md focus-visible:border-gold/50 focus-visible:bg-primary-foreground/[0.06] transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">{t("Email", "Email")}</label>
                        <Input type="email" value={wiz.email} onChange={e => setWiz(w => ({ ...w, email: e.target.value }))} placeholder="you@email.com"
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 text-base backdrop-blur-md focus-visible:border-gold/50 focus-visible:bg-primary-foreground/[0.06] transition-colors" />
                      </div>
                    </div>
                    <Button variant="gold" size="lg" className="mt-10 px-12 gap-2 text-base" disabled={!wiz.email} onClick={() => setWizardStep(1)}>
                      {t("Continue", "Дальше")} <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {wizardStep === 1 && (
                  <motion.div key="ws1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-xl mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">{t("Step 2 · Origin", "Шаг 2 · Откуда")}</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">{t("Where are you from?", "Откуда вы?")}</h2>
                    <p className="text-primary-foreground/50 mb-8 text-base max-w-md mx-auto">{t("Your nationality unlocks the right eligibility. Type or pick — every country works.", "Ваше гражданство открывает нужные критерии. Введите или выберите — подойдёт любая страна.")}</p>

                    {/* Typeahead — single input that filters the full country
                        list. Click a result or press Enter to accept the typed
                        value. No country is restricted. */}
                    <div className="w-full">
                      <Input
                        value={wiz.nationality}
                        onChange={e => setWiz(w => ({ ...w, nationality: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && wiz.nationality.trim()) setWizardStep(2); }}
                        placeholder={t("Type your country (any)…", "Введите вашу страну (любую)…")}
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
                              <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/35 text-left mb-2">{t("Matches", "Совпадения")}</p>
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
                                {t("No exact match — that's fine, your typed entry will be used.", "Точного совпадения нет — ничего страшного, мы используем введённое значение.")}
                              </p>
                            )}
                            {wiz.nationality.trim() && (
                              <Button
                                variant="gold"
                                size="lg"
                                className="mt-6 px-12 gap-2"
                                onClick={() => setWizardStep(2)}
                              >
                                {exact ? t(`Continue as ${exact.v}`, `Дальше как ${exact.v}`) : t(`Continue with "${wiz.nationality.trim()}"`, `Дальше с «${wiz.nationality.trim()}»`)} <ArrowRight className="h-4 w-4" />
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
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">{t("Step 3 · Path", "Шаг 3 · Направление")}</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">{t("What will you study?", "Что будете изучать?")}</h2>
                    <p className="text-primary-foreground/50 mb-10 text-base">{t("Pick every level you're considering — multiple is fine.", "Отметьте все уровни, которые рассматриваете — можно несколько.")}</p>
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
                          <p className="text-primary-foreground/50 text-sm mb-4">{t("And your field?", "И ваше направление?")}</p>
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
                            {t("Continue", "Дальше")} <ArrowRight className="h-5 w-5" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {wizardStep === 3 && (
                  <motion.div key="ws3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">{t("Step 4 · Stats", "Шаг 4 · Баллы")}</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">{t("Your scores.", "Ваши результаты.")}</h2>
                    <p className="text-primary-foreground/50 mb-10 text-base">{t("Leave blank if you don't have them yet.", "Оставьте пустым, если ещё не сдавали.")}</p>
                    <div className="w-full space-y-6 text-left">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">GPA</label>
                        <div className="flex gap-2">
                          <Input value={wiz.gpa} onChange={e => setWiz(w => ({ ...w, gpa: e.target.value }))} placeholder={t("e.g. 3.8", "напр. 3.8")}
                            className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 flex-1 backdrop-blur-md focus-visible:border-gold/50" />
                          <div className="flex rounded-xl overflow-hidden border border-primary-foreground/15 backdrop-blur-md">
                            {/* Parity with TopUni AI wizard 2026-05-10 — 10.0
                                added so Continental EU students (Netherlands,
                                Italy, Spain) put in their actual number rather
                                than mentally converting. */}
                            {["/4.0", "/5.0", "/10.0", "/100"].map(s => (
                              <button key={s} onClick={() => setWiz(w => ({ ...w, gpaScale: s.slice(1) }))}
                                className={`px-3 text-xs font-semibold transition-colors ${wiz.gpaScale === s.slice(1) ? "bg-gold text-primary" : "bg-primary-foreground/[0.04] text-primary-foreground/60 hover:bg-primary-foreground/[0.08]"}`}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">IELTS</label>
                          <Input value={wiz.ielts} onChange={e => setWiz(w => ({ ...w, ielts: e.target.value }))} placeholder={t("e.g. 7.0", "напр. 7.0")}
                            className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md focus-visible:border-gold/50" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">TOEFL</label>
                          <Input value={wiz.toefl} onChange={e => setWiz(w => ({ ...w, toefl: e.target.value }))} placeholder={t("e.g. 100", "напр. 100")}
                            className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md focus-visible:border-gold/50" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">{t("SAT (undergrad applicants)", "SAT (для бакалавриата)")}</label>
                        <Input value={wiz.sat} onChange={e => setWiz(w => ({ ...w, sat: e.target.value }))} placeholder={t("e.g. 1450", "напр. 1450")}
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md focus-visible:border-gold/50" />
                      </div>
                      {/* Optional self-identification — surfaces extra match
                          boost on programs designed for these groups.
                          Multi-select chips; nothing required. */}
                      <div className="space-y-2 pt-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">{t("Eligibility groups (optional)", "Категории (необязательно)")}</label>
                        <p className="text-[11px] text-primary-foreground/40 -mt-1">{t("Tap any that apply — surfaces programs designed for you.", "Отметьте подходящее — откроем программы, созданные специально для вас.")}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { v: "women", l: t("Women", "Женщины") },
                            { v: "first-generation", l: t("First-generation", "Первое поколение") },
                            { v: "low-income", l: t("Need-based", "По доходу") },
                            { v: "refugee", l: t("Refugee", "Беженцы") },
                            { v: "indigenous", l: t("Indigenous", "Коренные народы") },
                            { v: "lgbtq", l: "LGBTQ+" },
                            { v: "underrepresented-minority", l: t("Underrepresented", "Недопредставленные") },
                            { v: "disability", l: t("Disability", "Инвалидность") },
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
                      {t("Reveal my matches", "Показать совпадения")}
                      <ArrowRight className="h-5 w-5" />
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
                    <Compass className="h-9 w-9 text-primary" />
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
              {/* Beta banner — slim, gold-bordered, dismissible. Tells
                  users honestly that we're still verifying + adding
                  programs, so they don't bounce when a search returns
                  fewer rows than they expected. */}
              {!betaDismissed && (
                <div className="bg-gold/10 border-b border-gold/30">
                  <div className="max-w-7xl mx-auto px-5 sm:px-8 py-2 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.18em] bg-gold-dark text-primary shrink-0">
                      {t("Beta", "Бета")}
                    </span>
                    <p className="text-[12px] sm:text-[13px] text-foreground/80 leading-snug flex-1 min-w-0">
                      {t(
                        "We're still verifying programs and expanding the database daily. Always confirm details on the official site before applying.",
                        "Мы пока проверяем программы и расширяем базу. Всегда подтверждайте детали на официальном сайте перед подачей."
                      )}
                    </p>
                    <button
                      onClick={dismissBeta}
                      aria-label={t("Dismiss beta notice", "Закрыть уведомление о бете")}
                      className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded text-foreground/50 hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Trending strip removed — felt tacky against the rest of
                  the navy/gold product chrome. Closest-deadline scholarships
                  still surface via the SavedDeadlineBanner and via the
                  sort-by-deadline option. */}

              {/* ─── Profile context strip — leads with the user's identity
                  (country flag + level + field) so the page reads as
                  "your scholarships, tailored to you" rather than a
                  database results page. The previous build had three
                  big counters (matches / closing 30d / $X total value)
                  which read as marketing more than a personalised
                  dashboard; replaced with a soft "tailored to" framing
                  that pulls the same chips the wizard collects. Pre-
                  profile state keeps a single CTA to build the profile
                  — the catalogue scale signal lives in the toolbar
                  result-count below. */}
              {(() => {
                const isProfileFilled = !!(
                  profile.country ||
                  (profile.degrees && profile.degrees.length > 0) ||
                  profile.field ||
                  profile.gpa ||
                  profile.ielts
                );
                const countryFlag = profile.country
                  ? ALL_COUNTRIES.find(c => c.v.toLowerCase() === profile.country.toLowerCase())?.f ?? null
                  : null;
                const fieldEmoji = profile.field
                  ? FIELDS.find(f => f.v === profile.field)?.i ?? null
                  : null;
                const countryAccent = accentForCountry(profile.country);
                const targetCountryChips = (profile.targetCountries ?? []).slice(0, 3);
                return (
                  <div className="relative bg-canvas-soft/60 border-b border-border/60 overflow-hidden">
                    <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-4 sm:py-5">
                      {isProfileFilled ? (
                        (() => {
                          // First-name greeting when we have it; falls back
                          // to a generic "your profile" framing when the
                          // user signed in with email-only / Google.
                          const stored = getStoredProfile();
                          const firstName = stored?.fullName?.trim().split(/\s+/)[0] || "";
                          // Profile completeness — number of meaty signals
                          // populated. Used to drive the "Strengthen profile"
                          // nudge so users with thin profiles see a clear
                          // path to better matches.
                          const filled = [
                            !!profile.country,
                            (profile.degrees?.length ?? 0) > 0,
                            !!profile.field,
                            (profile.targetCountries?.length ?? 0) > 0,
                            !!profile.gpa,
                            !!(profile.ielts || profile.toefl),
                            (profile.demographics?.length ?? 0) > 0,
                          ].filter(Boolean).length;
                          const total = 7;
                          const pct = Math.round((filled / total) * 100);
                          return (
                            <div className="flex items-start gap-4 flex-wrap">
                              {/* Identity panel — bigger, warmer. Reads
                                  "Hi {name} — your scholarship feed" so
                                  the surface feels personal rather than
                                  a generic filter strip. */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-bold">
                                    {t("Built for you", "Подобрано для вас")}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground tabular-nums">{pct}% {t("complete", "заполнено")}</span>
                                </div>
                                <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight mt-0.5">
                                  {firstName
                                    ? t(`Hey ${firstName} — your scholarship feed`, `Привет, ${firstName} — ваша лента стипендий`)
                                    : t("Your scholarship feed", "Ваша лента стипендий")}
                                </h2>
                                <div className="flex items-center gap-1.5 flex-wrap mt-2 min-w-0">
                                  {profile.country && (
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${countryAccent}`}>
                                      {countryFlag && <span className="text-[12px] leading-none">{countryFlag}</span>}
                                      {profile.country}
                                    </span>
                                  )}
                                  {profile.degrees && profile.degrees.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/85 bg-card border border-border/70 px-2.5 py-1 rounded-full font-medium">
                                      <GraduationCap className="h-3 w-3 text-gold-dark" />
                                      {profile.degrees.join(" / ")}
                                    </span>
                                  )}
                                  {profile.field && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/85 bg-card border border-border/70 px-2.5 py-1 rounded-full font-medium">
                                      {fieldEmoji && <span className="leading-none">{fieldEmoji}</span>}
                                      {profile.field}
                                    </span>
                                  )}
                                  {targetCountryChips.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/85 bg-card border border-border/70 px-2.5 py-1 rounded-full font-medium">
                                      <Globe className="h-3 w-3 text-gold-dark" />
                                      {targetCountryChips.join(" · ")}
                                      {(profile.targetCountries?.length ?? 0) > 3 && (
                                        <span className="text-muted-foreground/70">+{profile.targetCountries.length - 3}</span>
                                      )}
                                    </span>
                                  )}
                                  {profile.gpa && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/70 bg-muted/60 border border-border/60 px-2.5 py-1 rounded-full font-medium">
                                      GPA {profile.gpa}{profile.gpaScale && profile.gpaScale !== "4.0" ? `/${profile.gpaScale}` : ""}
                                    </span>
                                  )}
                                  {(profile.ielts || profile.toefl) && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/70 bg-muted/60 border border-border/60 px-2.5 py-1 rounded-full font-medium">
                                      {profile.ielts ? `IELTS ${profile.ielts}` : `TOEFL ${profile.toefl}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={resetProfile}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:text-foreground bg-card border border-border/70 hover:border-gold/40 px-3 py-2 rounded-lg transition-all whitespace-nowrap shrink-0"
                              >
                                {pct < 70
                                  ? t("Strengthen profile", "Улучшить профиль")
                                  : t("Edit profile", "Изменить профиль")}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        // Pre-profile: a single CTA back to the wizard.
                        // Drop the counters — the toolbar below already
                        // shows a result count, so two scales of "X
                        // scholarships" was redundant.
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-gold-dark font-semibold mb-0.5">
                              {t("Personalised view", "Персональный вид")}
                            </p>
                            <p className="text-sm text-foreground/85 leading-snug">
                              {t(
                                "Add your country, level, and field — we'll rank these scholarships against your profile.",
                                "Укажите страну, уровень и направление — мы отсортируем стипендии по вашему профилю.",
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate(language === "ru" ? "/topuni-ai/ru" : "/topuni-ai")}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gold-dark hover:text-foreground transition-colors group whitespace-nowrap"
                          >
                            {t("Build my profile", "Заполнить профиль")}
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      )}
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
                  lang={language}
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
                    <Input ref={searchInputRef} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder={t("Search names, providers, fields, tags…   (/ to focus)", "Поиск по названию, организации, направлению, тегам…   (/ — фокус)")}
                      className="pl-10 h-10 text-sm rounded-lg" />
                    {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} aria-label={t("Clear search", "Очистить поиск")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                  </div>

                  {/* Result count — small tabular feedback that the
                      filter / search / sort produced something. Pre-
                      fix the user typed a query and had to count rows
                      themselves. The count reflects filteredAll (the
                      full filtered set) so members see total matches
                      not just the paginated visible window. Free
                      users see "X / Y" — visible vs total — so the
                      paywall framing is honest. */}
                  {!loading && ranked.length > 0 && (
                    <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums shrink-0 px-2">
                      {gateActive && lockedCount > 0 ? (
                        <>
                          <span className="font-semibold text-foreground">{filtered.length}</span>
                          <span className="text-muted-foreground/60">/</span>
                          <span>{filteredAll.length}</span>
                          <span className="ml-1">{t("results", "результатов")}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-foreground">{filteredAll.length}</span>
                          <span className="ml-1">{filteredAll.length === 1 ? t("result", "результат") : t("results", "результатов")}</span>
                        </>
                      )}
                    </div>
                  )}

                  <Button variant="outline" size="default" className="lg:hidden gap-1.5 h-10 rounded-lg" onClick={() => setFiltersOpen(true)}>
                    <Filter className="h-4 w-4" />{t("Filters", "Фильтры")}{activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-gold/20 text-gold-dark border-0 ml-0.5">{activeFiltersCount}</Badge>}
                  </Button>

                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                    <SelectTrigger className="w-[156px] h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">{t("Best match", "Лучшее совпадение")}</SelectItem>
                      <SelectItem value="deadline">{t("Deadline first", "Сначала по дедлайну")}</SelectItem>
                      <SelectItem value="value">{t("Highest value", "Наибольшая сумма")}</SelectItem>
                      {/* "Trending" — orders by save_count_30d DESC.
                          Surfaces what other students are acting on
                          right now. Compounds: more saves → higher
                          rank under this sort → more visibility →
                          more saves. The chip on cards already shows
                          the count, so users can see the raw signal
                          driving the order. */}
                      <SelectItem value="trending">{t("Trending now", "Сейчас в тренде")}</SelectItem>
                      {/* "Most accessible" sort retired — selectivity
                          metadata is incomplete on most rows so the
                          sort produced near-random ordering. */}
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
                        title={t("Grid view", "Сетка")}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("Grid", "Сетка")}</span>
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`h-full px-3 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-border ${viewMode === "list" ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        aria-pressed={viewMode === "list"}
                        title={t("List view", "Список")}
                      >
                        <List className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("List", "Список")}</span>
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
                      <span className="hidden sm:inline">{t("Compare", "Сравнить")}</span>
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
                      title={showHidden ? t("Hide hidden", "Скрыть") : t("Show hidden", "Показать скрытые")}
                    >
                      {showHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{hidden.size} {t("hidden", "скрыто")}</span>
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
                    {/* Sticky offset = nav (64px) + toolbar (~64px py-3 +
                        h-10) + 12px breathing room. Pre-fix the sidebar
                        was top-24 (96px) so it slid under the toolbar
                        on scroll and the "Browse" / "Saved" labels got
                        clipped behind the search bar (user-reported). */}
                    <div className="sticky top-36 space-y-3.5">
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
                          { id: "browse" as AppSection,      label: t("Browse", "Каталог"),       icon: Layers,        count: 0 },
                          { id: "shortlist" as AppSection,   label: t("Shortlist", "Шортлист"),   icon: BookmarkCheck, count: shortlist.size,  accent: shortlist.size > 0 },
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
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-gold-dark bg-gold/10 hover:bg-gold/15 transition-colors"
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
                          {activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-gold/20 text-gold-dark border-0">{activeFiltersCount}</Badge>}
                        </div>
                        <FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} hostCountries={hostCountries} fieldsAvailable={fieldsAvailable} lang={language} />
                      </div>

                      {/* Sidebar membership card — visible to anyone not yet
                          a member. Quick-panel surface uses "Membership"
                          (plainer, matches the footer + paywall row labels)
                          rather than "TopUni Pro" — that name still belongs
                          on the deeper paywall sheet headers where the user
                          is being sold the product, not the sidebar nudge.
                          Founding-cohort scarcity drives conversion via the
                          "founding rate" callout below. */}
                      {!isMember && foundingLeft && foundingLeft.left > 0 && (
                        <button
                          onClick={() => navigate(ru ? "/pricing/ru" : "/pricing")}
                          className="block w-full text-left rounded-2xl bg-primary text-primary-foreground p-4 hover:shadow-md transition-shadow relative overflow-hidden group"
                        >
                          <div className="absolute -top-1/3 right-0 w-1/2 h-full rounded-full blur-[60px] opacity-20" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />
                          <div className="relative">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light mb-2">
                              <Crown className="h-3 w-3" /> {t("Membership", "Членство")}
                            </div>
                            <p className="font-heading font-bold text-sm leading-tight mb-1">
                              {t("Unlock the full database + workshops with our founders.", "Полная база + воркшопы с основателями.")}
                            </p>
                            <p className="text-[11px] text-primary-foreground/65 mb-3">
                              {t(
                                `Founding rate — lifetime price lock. Capped at ${foundingLeft.cap} members.`,
                                `Цена для основателей — закреплена пожизненно. Лимит: ${foundingLeft.cap} мест.`,
                              )}
                            </p>
                            <div className="h-1.5 rounded-full bg-primary-foreground/15 overflow-hidden mb-2">
                              <div className="h-full bg-gold-light" style={{ width: `${((foundingLeft.cap - foundingLeft.left) / foundingLeft.cap) * 100}%` }} />
                            </div>
                            <p className="text-[11px] text-primary-foreground/80 tabular-nums flex items-center justify-between">
                              <span><span className="font-semibold text-gold-light">{foundingLeft.left}</span> {t("spots left", "мест осталось")}</span>
                              <span className="text-gold-light font-medium">{t("See pricing →", "Цены →")}</span>
                            </p>
                          </div>
                        </button>
                      )}

                      {isMember && (
                        <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 flex items-center gap-2">
                          <Crown className="h-3.5 w-3.5 text-gold-dark" />
                          <span className="text-[11px] font-semibold text-gold-dark">
                            {subscription.tier === "founding"
                              ? t("Early access", "Ранний доступ")
                              : t("Member", "Участник")}
                          </span>
                        </div>
                      )}

                      {/* Refer-a-friend chip — engagement-gated. Only
                          renders once the user has saved or tracked at
                          least one scholarship, so anon visitors aren't
                          asked to refer something they haven't engaged
                          with. Subtle, single quiet line; clicks land
                          on /refer. */}
                      {(shortlist.size > 0 || Object.keys(statusMap).length > 0) && (
                        <Link
                          to="/refer"
                          className="block rounded-xl border border-border bg-card/40 hover:bg-card hover:border-gold/30 px-3 py-2.5 transition-colors group"
                        >
                          <p className="text-[11px] text-foreground/75 leading-snug">
                            {t("Liking TopUni so far?", "Нравится TopUni?")}{" "}
                            <span className="text-gold-dark font-medium group-hover:underline underline-offset-4">
                              {t("Refer a friend → free month", "Пригласите друга → месяц бесплатно")}
                            </span>
                          </p>
                        </Link>
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
                    {/* Catalog-fetch error banner. Shown above whatever
                        else renders so users can see the failure cause
                        + retry without losing scroll position. When the
                        cache hydrated, cached rows still render below
                        and this banner sits at the top as an advisory. */}
                    {catalogError && (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] px-5 py-4 mb-4 flex items-start gap-3">
                        <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-destructive">
                            {t("Couldn't load the catalog", "Не удалось загрузить базу")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {t(
                              "Check your connection or try again. If this keeps happening, email team@topuniconsulting.com.",
                              "Проверьте соединение или попробуйте снова. Если повторяется, напишите team@topuniconsulting.com.",
                            )}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={retryCatalog} className="gap-1.5 shrink-0">
                          <RefreshCw className="h-3.5 w-3.5" />
                          {t("Retry", "Повторить")}
                        </Button>
                      </div>
                    )}
                    {loading && !catalogError ? (
                      // Card-shaped skeletons that mirror the real card
                      // geometry — country band, title stub, blurb lines,
                      // footer chips, action row — so the layout doesn't
                      // shift when actual cards land. Stagger animation
                      // delays so the pulse feels like a wave, not a flash.
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {[0,1,2,3,4,5,6,7,8].map(i => (
                          <div
                            key={i}
                            className="rounded-xl bg-card border border-border overflow-hidden animate-pulse"
                            style={{ animationDelay: `${i * 70}ms`, animationDuration: "1.4s" }}
                          >
                            <div className="bg-canvas-soft h-12 border-b border-gold/15 flex items-center px-4 gap-2">
                              <div className="h-2 w-16 rounded-full bg-foreground/10" />
                            </div>
                            <div className="p-4 flex flex-col gap-3">
                              <div className="space-y-2">
                                <div className="h-3 rounded-full bg-foreground/10 w-[88%]" />
                                <div className="h-3 rounded-full bg-foreground/10 w-[60%]" />
                                <div className="h-2 rounded-full bg-foreground/[0.06] w-[40%] mt-2" />
                              </div>
                              <div className="h-5 w-20 rounded-md bg-foreground/[0.08]" />
                              <div className="space-y-1.5">
                                <div className="h-2 rounded-full bg-foreground/[0.06] w-full" />
                                <div className="h-2 rounded-full bg-foreground/[0.06] w-[78%]" />
                              </div>
                              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                <div className="h-2 w-12 rounded-full bg-foreground/[0.06]" />
                                <div className="h-2 w-1 rounded-full bg-foreground/[0.04]" />
                                <div className="h-2 w-20 rounded-full bg-foreground/[0.06]" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="border border-dashed border-border rounded-3xl p-12 sm:p-16 text-center bg-muted/10">
                        <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="font-heading font-semibold text-lg text-foreground mb-1.5">
                          {t("Nothing matches these filters", "Ничего не подходит под эти фильтры")}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                          {t(
                            "Loosen a filter, or — if you know a scholarship that fits but we're missing it — submit it. Approved submissions land in the database within 72 hours.",
                            "Ослабьте фильтр или — если знаете стипендию, которой у нас нет — предложите её. Одобренные попадают в базу в течение 72 часов.",
                          )}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                            {t("Clear filters", "Сбросить фильтры")}
                          </Button>
                          <Button asChild variant="gold" size="sm" className="gap-1.5">
                            <Link to={language === "ru" ? "/submit/ru" : "/submit"}>
                              {t("Submit a scholarship", "Предложить стипендию")}
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
                                {appSection === "shortlist"
                                  ? t("Saved", "Сохранено")
                                  : t("Collections", "Коллекции")}
                              </p>
                              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                                {appSection === "shortlist"
                                  ? t("Saved scholarships", "Сохранённые стипендии")
                                  : t("Collections", "Коллекции")}
                              </h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                {appSection === "shortlist"
                                  ? t("Scholarships you've bookmarked. Save more from any view.", "Стипендии, которые вы сохранили. Можно добавлять из любого вида.")
                                  : t("Pre-built lists organized by application strategy.", "Готовые подборки по стратегии подачи.")}
                              </p>
                            </div>
                            <button onClick={() => setAppSection("browse")} className="text-xs text-muted-foreground hover:text-gold-dark transition-colors">
                              {t("← Back to browse", "← К каталогу")}
                            </button>
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
                                  {t("No saved scholarships yet", "Пока нет сохранённых стипендий")}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                                  {t("Bookmark any scholarship and it'll appear here.", "Сохраните любую стипендию — она появится здесь.")}
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setAppSection("browse")}>
                                  {t("Back to browse", "К каталогу")}
                                </Button>
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
                            lang: language,
                          });
                          // List-mode column header is intentionally label-only.
                          // Sort is driven by the dropdown above the grid —
                          // one source of truth, no broken-feeling chevrons
                          // suggesting click-to-sort that wasn't reliable.
                          return (
                            <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
                              <div className="hidden sm:grid grid-cols-[minmax(0,1fr),170px,128px] items-center gap-4 px-4 py-2.5 border-b border-border bg-canvas-soft/50 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                <span>{t("Scholarship", "Стипендия")}</span>
                                <span className="text-right">{t("Award · Deadline", "Сумма · Дедлайн")}</span>
                                <span className="text-right pr-1">{t("Actions", "Действия")}</span>
                              </div>
                              {items.map((s, i) => <MemoScholarRow {...cp(s, i)} />)}
                            </div>
                          );
                        })()}

                        {/* Collections — full layout when explicitly visiting that section */}
                        {appSection === "collections" && liveCollections.length > 0 && (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {liveCollections.map((c, i) => {
                              const Icon = c.def.icon;
                              const descRaw = ru ? c.def.descriptionRu : c.def.description;
                              const description = typeof descRaw === "function" ? descRaw(profile) : descRaw;
                              const title = ru ? c.def.titleRu : c.def.title;
                              const kicker = ru ? c.def.kickerRu : c.def.kicker;
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
                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] mb-1 ${c.def.accentClass}`}>{kicker}</p>
                                  <h3 className="font-heading font-bold text-lg text-foreground tracking-tight mb-2 leading-tight">{title}</h3>
                                  <p className="text-sm text-muted-foreground leading-[1.6] mb-5">{description}</p>
                                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors">
                                    {t(`View ${c.items.length}`, `Смотреть ${c.items.length}`)} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
                            lang: language,
                          });

                          if (viewMode === "list") {
                            // Header is label-only — sort is driven by the
                            // dropdown above the grid (one source of truth).
                            // Same pagination model as the grid view —
                            // SECTION_PAGE_SIZE rows initial, "Show more"
                            // toggles expansion. List view shares the
                            // expandedSections map under the "list" key.
                            const expanded = expandedSections.has("list");
                            const visible = expanded ? filtered : filtered.slice(0, SECTION_PAGE_SIZE);
                            const hiddenCount = filtered.length - visible.length;
                            return (
                              <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
                                <div className="hidden sm:grid grid-cols-[minmax(0,1fr),170px,128px] items-center gap-4 px-4 py-2.5 border-b border-border bg-canvas-soft/50 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  <span>Scholarship</span>
                                  <span className="text-right">Award · Deadline</span>
                                  <span className="text-right pr-1">Actions</span>
                                </div>
                                {visible.map((s, i) => <MemoScholarRow {...cardProps(s, i)} />)}
                                {(hiddenCount > 0 || expanded) && filtered.length > SECTION_PAGE_SIZE && (
                                  <button
                                    type="button"
                                    onClick={() => toggleSectionExpanded("list")}
                                    className="w-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-gold-dark transition-colors border-t border-border bg-canvas-soft/30 hover:bg-gold/5"
                                  >
                                    {expanded
                                      ? t("Show less", "Свернуть")
                                      : t(`Show all (+${hiddenCount})`, `Все (+${hiddenCount})`)}
                                  </button>
                                )}
                                {lockedCount > 0 && <PaywallRow lockedCount={lockedCount} lang={language} />}
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
                          // Per-section pagination helper. Renders the first
                          // SECTION_PAGE_SIZE cards by default; "Show more"
                          // expands the section to show the rest. Section
                          // identity is keyed (strong/competitive/stretch/
                          // "all") so user-expanded state survives re-ranking.
                          const renderSectionGrid = (key: string, items: typeof sections.strong) => {
                            const expanded = expandedSections.has(key);
                            const visible = expanded ? items : items.slice(0, SECTION_PAGE_SIZE);
                            const hidden = items.length - visible.length;
                            return (
                              <>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                                  {visible.map((s, i) => <MemoScholarCard {...cardProps(s, i)} />)}
                                </div>
                                {(hidden > 0 || expanded) && items.length > SECTION_PAGE_SIZE && (
                                  <button
                                    type="button"
                                    onClick={() => toggleSectionExpanded(key)}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-gold-dark transition-colors px-3 py-2 rounded-md border border-dashed border-border/60 hover:border-gold/40"
                                  >
                                    {expanded
                                      ? t("Show less", "Свернуть")
                                      : t(`Show all (+${hidden})`, `Все (+${hidden})`)}
                                  </button>
                                )}
                              </>
                            );
                          };

                          if (!hasProfileBucketing && sections.stretch.length > 0) {
                            return (
                              <section>
                                <SectionHeader
                                  kicker={t("Database", "База")}
                                  title={t("All scholarships", "Все стипендии")}
                                  subtitle={t("Build your profile (top right) to see which ones fit you best.", "Заполните профиль (вверху справа), чтобы увидеть, какие подходят лучше.")}
                                  accentClass="text-foreground/60"
                                />
                                {renderSectionGrid("all", sections.stretch)}
                                {lockedCount > 0 && <PaywallCard lockedCount={lockedCount} className="mt-4" lang={language} />}
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
                                  <SectionHeader
                                    kicker={t("Strong fit", "Хорошее совпадение")}
                                    title={t("These align with your profile", "Эти подходят вашему профилю")}
                                    subtitle={t("Your stated nationality, level, and field overlap with the program's audience.", "Ваши гражданство, уровень и направление совпадают с целевой аудиторией программы.")}
                                    count={sections.strong.length} accentClass="text-gold-dark" />
                                  {renderSectionGrid("strong", sections.strong)}
                                </section>
                              )}

                              {sections.competitive.length > 0 && (
                                <section>
                                  <SectionHeader
                                    kicker={t("Worth a closer look", "Стоит присмотреться")}
                                    title={t("Selective programs that match your direction", "Селективные программы по вашему направлению")}
                                    subtitle={t("Some thresholds are tight — read the requirements before drafting.", "Некоторые пороги жёсткие — прочитайте требования до подачи.")}
                                    count={sections.competitive.length} accentClass="text-primary dark:text-primary-bright" />
                                  {renderSectionGrid("competitive", sections.competitive)}
                                </section>
                              )}

                              {sections.stretch.length > 0 && (
                                <section>
                                  <SectionHeader
                                    kicker={t("Flagship programs", "Флагманские программы")}
                                    title={t("The rest of the catalog", "Остальной каталог")}
                                    subtitle={t("Highly selective on paper. People do win these every year.", "Очень селективные на бумаге. Каждый год кто-то их выигрывает.")}
                                    count={sections.stretch.length} accentClass="text-muted-foreground" />
                                  {renderSectionGrid("stretch", sections.stretch)}
                                </section>
                              )}

                              {lockedCount > 0 && <PaywallCard lockedCount={lockedCount} className="mt-2" lang={language} />}
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

        {/* Floating shortlist FAB retired — the right-rail Shortlist tab
            already surfaces this in a more discoverable place, and the
            FAB was duplicating the entry point. */}

        {/* ── COMPARE DRAWER — side-by-side comparison of up to 3 scholarships ── */}
        <Sheet open={compareOpen} onOpenChange={setCompareOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[1100px] overflow-y-auto p-0">
            <div className="px-7 py-6 border-b border-border bg-canvas-soft sticky top-0 z-10 backdrop-blur">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
                  <Columns3 className="h-5 w-5 text-gold-dark" /> {t("Compare scholarships", "Сравнить стипендии")} · {compareSet.size}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">{t("Side-by-side breakdown. Up to three at a time.", "Сравнение бок о бок. До трёх за раз.")}</p>
              </SheetHeader>
            </div>

            <div className="p-5">
              {compareSet.size === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {t("Compare returns soon as a list-view feature.", "Сравнение скоро вернётся в виде списка.")}
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
                  // Match score row retired — fit drives ranking under the
                  // hood, but quoting a /100 number to students reads as a
                  // probability claim on a thin profile.
                  // Tier dropped — overlapped Selectivity. Selectivity is
                  // an objective rating from the scholarship's data; Tier
                  // was a derived label off the same data.
                  { label: "Selectivity", render: s => <SelectivityChip level={s.selectivity} />, isEmpty: s => s.selectivity === "unknown" },
                  { label: "Award", render: s => s.award_amount_text ? s.award_amount_text : (compactAward(s) || COVERAGE_LABEL[s.coverage_type] || "—"), isEmpty: s => !s.award_amount_text && !COVERAGE_LABEL[s.coverage_type] },
                  { label: "Total value", render: s => s.estimated_total_value_usd ? <span className="text-gold-dark font-bold">{fmtValue(s.estimated_total_value_usd)}</span> : "—", isEmpty: s => !s.estimated_total_value_usd },
                  { label: "Deadline", render: s => {
                      const dl = deadlineDisplay(s.application_deadline, "en", s.deadline_type);
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
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{[cleanProvider(s.provider_name), s.host_country && shortCountry(s.host_country)].filter(Boolean).join(" · ")}</p>
                                <div className="flex gap-2 mt-3">
                                  <Button variant="gold" size="sm" className="text-xs h-7 px-3" onClick={() => { setOpenDetail(s); setCompareOpen(false); }}>
                                    Strategy
                                  </Button>
                                  {s.official_url && !isAggregatorUrl(s.official_url) && (
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
                const dl = deadlineDisplay(s.application_deadline, "en", s.deadline_type);
                return (
                  <button key={s.scholarship_id}
                    onClick={() => { setOpenDetail(s); setShortlistOpen(false); }}
                    className="w-full text-left bg-card border border-border rounded-2xl p-3.5 hover:border-gold/40 hover:shadow-md transition-all flex items-start gap-3 group">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tier.grad} flex items-center justify-center text-[13px] font-bold text-white shrink-0 tracking-tight`}>{initials(s.provider_name || s.scholarship_name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-sm text-foreground line-clamp-1">{s.scholarship_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug mt-0.5">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[11px] font-medium ${dl.cls}`}>{dl.text}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} aria-label={t("Remove from shortlist", "Убрать из шортлиста")} className="text-muted-foreground hover:text-destructive p-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
              const descRaw = ru ? activeCollection.def.descriptionRu : activeCollection.def.description;
              const description = typeof descRaw === "function" ? descRaw(profile) : descRaw;
              const title = ru ? activeCollection.def.titleRu : activeCollection.def.title;
              const kicker = ru ? activeCollection.def.kickerRu : activeCollection.def.kicker;
              return (
                <>
                  <div className="px-7 py-7 border-b border-border bg-canvas-soft sticky top-0 z-10 backdrop-blur">
                    <div className="flex items-start gap-4">
                      <div className={`h-11 w-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 ${activeCollection.def.accentClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <SheetHeader>
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${activeCollection.def.accentClass} mb-1`}>{kicker}</p>
                          <SheetTitle className="font-heading text-2xl tracking-tight leading-tight text-foreground text-left">{title}</SheetTitle>
                          <p className="text-sm text-muted-foreground leading-relaxed text-left">{description}</p>
                        </SheetHeader>
                      </div>
                      <span className="text-3xl font-bold tabular-nums text-foreground/30 shrink-0">{activeCollection.items.length.toString().padStart(2, "0")}</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-card">
                    {activeCollection.items.map((s, i) => (
                      <MemoScholarRow
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
                        lang={language}
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
                  <Crown className="h-3 w-3 text-gold-light" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">TopUni Pro</span>
                </div>
                <SheetHeader>
                  <SheetTitle className="font-heading text-2xl text-primary-foreground tracking-tight leading-tight text-left">
                    {paywallOpen === "shortlist" && t(
                      `Save more than ${SHORTLIST_FREE_LIMIT} scholarships.`,
                      `Сохраняйте больше ${SHORTLIST_FREE_LIMIT} стипендий.`,
                    )}
                    {paywallOpen === "strategy" && t("Unlock the full strategy.", "Откройте полную стратегию.")}
                    {paywallOpen === "compare" && t("Compare more than 2 scholarships.", "Сравнивайте больше 2 стипендий.")}
                  </SheetTitle>
                  <p className="text-primary-foreground/65 text-sm leading-relaxed pt-1 text-left">
                    {paywallOpen === "shortlist" && t(
                      `You've saved your free ${SHORTLIST_FREE_LIMIT}. Pro members get unlimited saves plus per-scholarship status tracking and notes.`,
                      `Вы использовали бесплатные ${SHORTLIST_FREE_LIMIT} сохранений. Pro-членство — без лимита, плюс статусы и заметки по каждой стипендии.`,
                    )}
                    {paywallOpen === "strategy" && t(
                      "Strategy notes — ideal-candidate profile, how-to-win approach, common rejection reasons, weak-candidate warnings — are part of TopUni Pro.",
                      "Стратегические заметки — портрет идеального кандидата, как выиграть, типичные причины отказа и кому не стоит подавать — входят в TopUni Pro.",
                    )}
                    {paywallOpen === "compare" && t(
                      "Compare up to three scholarships side-by-side with TopUni Pro.",
                      "Сравнивайте до трёх стипендий рядом — с TopUni Pro.",
                    )}
                  </p>
                </SheetHeader>
              </div>
            </div>
            <div className="px-7 py-6 space-y-5">
              <div className="space-y-2.5 text-sm text-foreground/85">
                {[
                  t(
                    `Full database — all ${rows.length || 200}+ scholarships with strategy notes, rejection patterns, and how-to-win approaches.`,
                    `Полная база — все ${rows.length || 200}+ стипендий со стратегическими заметками, причинами отказов и подходами к победе.`,
                  ),
                  t(
                    "Live monthly workshops with our founders — Yale, Cambridge & Tsinghua, Harvard.",
                    "Ежемесячные воркшопы с основателями — Yale, Cambridge & Tsinghua, Harvard.",
                  ),
                  t("Recordings library — every workshop saved for you.", "Библиотека записей — каждый воркшоп сохранён."),
                  t("Unlimited shortlist + status tracking + notes.", "Без лимита: сохранения, статусы, заметки."),
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-gold-dark shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
              {foundingLeft && foundingLeft.left > 0 && (
                <div className="rounded-xl bg-gold/10 border border-gold/25 p-3 text-xs text-gold-dark text-center">
                  <span className="font-semibold tabular-nums">{foundingLeft.left}</span>{" "}
                  {t("early-access spots left · price locked for life", "мест раннего доступа · цена закреплена пожизненно")}
                </div>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="gold" size="lg" className="w-full gap-2" onClick={() => { setPaywallOpen(null); navigate(ru ? "/pricing/ru" : "/pricing"); }}>
                  {t("See TopUni Pro", "Смотреть TopUni Pro")} <ArrowRight className="h-4 w-4" />
                </Button>
                <button onClick={() => setPaywallOpen(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                  {t("Not now", "Не сейчас")}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile filters */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="left" className="w-[300px] overflow-y-auto">
            <SheetHeader><SheetTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />{t("Filters", "Фильтры")}</SheetTitle></SheetHeader>
            <div className="mt-5"><FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} hostCountries={hostCountries} fieldsAvailable={fieldsAvailable} lang={language} /></div>
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
          lang={language}
        />

        <ExpandedScholarshipDialog
          s={expandedDetail}
          profile={profile}
          onClose={() => setExpandedDetail(null)}
          onApply={() => expandedDetail?.official_url && window.open(expandedDetail.official_url, "_blank", "noopener,noreferrer")}
          onSave={() => expandedDetail && toggleBookmark(expandedDetail.scholarship_id)}
          isBookmarked={expandedDetail ? shortlist.has(expandedDetail.scholarship_id) : false}
          lang={language}
        />
      </div>
    </div>
  );
};

export default Discover;
