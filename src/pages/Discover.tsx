import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
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
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Sparkles, CheckCircle2, AlertTriangle, ExternalLink,
  BookmarkCheck, Bookmark, ChevronLeft, ChevronDown, Zap, RefreshCw,
  Lightbulb, X, SlidersHorizontal, Filter, Search, Trophy,
  Target, Flame, Users, FileText, Languages,
  CreditCard, AlertOctagon, UserCheck, ShieldAlert, MinusCircle, HelpCircle,
  LayoutGrid, List, EyeOff, Eye, Columns3, Circle, MoreHorizontal, GitCompare,
  Gem, DollarSign, Crown, Award, Compass, Layers,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getStoredProfile, saveProfile } from "@/components/discover/DiscoverProfileGate";
import { useAuth } from "@/contexts/AuthContext";
import { useSemanticScholarshipMatch } from "@/hooks/useSemanticScholarshipMatch";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
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
  how_to_win: string | null; what_to_prepare_first: string | null;
  next_step: string | null; risk_note: string | null;
  last_verified_date: string | null;
  data_source: string | null;
  url_check_status: "ok" | "redirect" | "fail" | "no_url" | null;
  url_consecutive_fails: number | null;
  url_resolved_to: string | null;
}

interface Profile {
  country: string; degree: string; gpa: string; gpaScale: string;
  ielts: string; sat: string; field: string; budget: string;
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
  fullName: string; email: string; nationality: string; customNationality: string;
  degree: string; field: string; gpa: string; gpaScale: string; ielts: string; budget: string;
}

interface FilterState {
  search: string; coverage: string; degree: string; effort: string;
  field: string; selectivity: string; hostCountry: string;
  onlyEligible: boolean; closingSoon: boolean; onlyShortlisted: boolean;
}

type Phase = "landing" | "wizard" | "analyzing" | "results";
type SortBy = "match" | "deadline" | "value" | "effort" | "selectivity";
type ViewMode = "grid" | "list" | "timeline";
type AppSection = "browse" | "pipeline" | "shortlist" | "collections";
type AppStatus = "researching" | "drafting" | "submitted" | "decision" | "rejected";

const STATUS_LABEL: Record<AppStatus, string> = {
  researching: "Researching",
  drafting:    "Drafting",
  submitted:   "Submitted",
  decision:    "Awaiting decision",
  rejected:    "Rejected",
};

const STATUS_COLOR: Record<AppStatus, string> = {
  researching: "text-muted-foreground bg-muted/40 border-border",
  drafting:    "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25",
  submitted:   "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  decision:    "text-primary bg-primary/8 border-primary/20",
  rejected:    "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/25",
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

const fieldMatches = (userField: string | null, targets: string[] | null): boolean | null => {
  if (!userField || !targets || targets.length === 0) return null;
  const u = userField.toLowerCase();
  const t = targets.map(x => x.toLowerCase());
  if (t.some(x => x.includes("all fields") || x.includes("any field") || x.includes("open to all"))) return true;
  const synonyms = FIELD_SYNONYMS[u] || [u];
  return t.some(targetField => synonyms.some(syn => targetField.includes(syn) || syn.includes(targetField)));
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
  let match = 50;
  let eligibility: Scored["eligibility"] = "likely";

  // Country / nationality
  if (s.eligible_countries && p.country) {
    const list = s.eligible_countries.map(c => c.toLowerCase());
    const open = list.some(c => c.includes("all countries") || c.includes("all nationalities"));
    const matched = open || list.some(c => c.includes(p.country.toLowerCase()));
    if (matched) { match += 15; reasons.push(open ? "Open to all nationalities" : `Open to ${p.country} nationals`); }
    else { eligibility = "not_eligible"; match -= 40; warnings.push(`Not open to ${p.country} nationals`); }
  }

  // Degree level
  if (s.target_degree_level && p.degree) {
    if (s.target_degree_level.some(d => d.toLowerCase() === p.degree.toLowerCase())) {
      match += 10; reasons.push(`Matches ${p.degree} level`);
    } else { eligibility = "not_eligible"; match -= 25; warnings.push(`Not for ${p.degree} applicants`); }
  }

  // Field of study (NEW)
  const fm = fieldMatches(p.field, s.target_fields);
  if (fm === true)  { match += 10; reasons.push(`Funds ${p.field || "your field"}`); }
  if (fm === false) { match -= 15; warnings.push(`Field mismatch — does not fund ${p.field || "your field"}`); if (eligibility !== "not_eligible") eligibility = "missing"; }

  // GPA
  if (s.min_gpa && p.gpa) {
    const ug = normalizeGpa(parseFloat(p.gpa), parseFloat(p.gpaScale));
    const rg = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
    if (ug >= rg) { match += 15; reasons.push(`GPA meets ${s.min_gpa}/${s.gpa_scale ?? 4.0}`); }
    else if (ug >= rg - 0.3) { match += 5; warnings.push(`GPA borderline (need ${s.min_gpa})`); if (eligibility !== "not_eligible") eligibility = "missing"; }
    else { match -= 20; if (eligibility !== "not_eligible") eligibility = "missing"; warnings.push(`GPA below ${s.min_gpa}/${s.gpa_scale ?? 4.0}`); }
  }

  // IELTS
  if (s.min_ielts && p.ielts) {
    const u = parseFloat(p.ielts);
    if (u >= s.min_ielts) { match += 8; reasons.push(`IELTS ${u} ≥ required ${s.min_ielts}`); }
    else { match -= 10; if (eligibility !== "not_eligible") eligibility = "missing"; warnings.push(`IELTS ${u} below required ${s.min_ielts}`); }
  }

  // Reward / coverage
  const value = s.estimated_total_value_usd ?? 0;
  const reward: Scored["reward"] = value >= 80000 ? "high" : value >= 25000 ? "medium" : "low";
  if (s.coverage_type === "full_ride") match += 12;
  if (p.budget === "low" && reward === "high") { match += 6; reasons.push("High value — fits your funding need"); }

  // Selectivity penalty (very high selectivity = harder to win)
  const selectivity = normalizeSelectivity(s.selectivity_level);
  if (selectivity === "very_high") match -= 6;
  if (selectivity === "high") match -= 3;
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
    if (bonus >= 12) reasons.push("Closely matches your stated field & goals");
    else if (bonus >= 6) reasons.push("Semantically aligned with your field");
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
    description: "Most aligned across academics, field, eligibility, and budget.",
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
const FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧", "Germany": "🇩🇪", "Japan": "🇯🇵", "Canada": "🇨🇦",
  "United States": "🇺🇸", "USA": "🇺🇸", "Australia": "🇦🇺", "Netherlands": "🇳🇱",
  "South Korea": "🇰🇷", "Korea": "🇰🇷", "Singapore": "🇸🇬", "Switzerland": "🇨🇭",
  "Sweden": "🇸🇪", "Poland": "🇵🇱", "Italy": "🇮🇹", "Czech Republic": "🇨🇿",
  "New Zealand": "🇳🇿", "France": "🇫🇷", "Taiwan": "🇹🇼", "Kazakhstan": "🇰🇿",
  "Hungary": "🇭🇺", "Malaysia": "🇲🇾", "Turkey": "🇹🇷", "China": "🇨🇳",
  "India": "🇮🇳", "Indonesia": "🇮🇩", "Estonia": "🇪🇪",
};

const COUNTRIES = [
  { v: "Kazakhstan", f: "🇰🇿" }, { v: "Kyrgyzstan", f: "🇰🇬" },
  { v: "Tajikistan", f: "🇹🇯" }, { v: "Uzbekistan", f: "🇺🇿" },
  { v: "Azerbaijan", f: "🇦🇿" }, { v: "Georgia", f: "🇬🇪" },
  { v: "Russia", f: "🇷🇺" }, { v: "Ukraine", f: "🇺🇦" },
  { v: "Turkey", f: "🇹🇷" }, { v: "China", f: "🇨🇳" },
  { v: "India", f: "🇮🇳" }, { v: "Pakistan", f: "🇵🇰" },
  { v: "Bangladesh", f: "🇧🇩" }, { v: "Nigeria", f: "🇳🇬" },
  { v: "Indonesia", f: "🇮🇩" }, { v: "Vietnam", f: "🇻🇳" },
  { v: "Mongolia", f: "🇲🇳" }, { v: "Nepal", f: "🇳🇵" },
];

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
const dateOnly = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

const WIZARD_STEPS = 4;
const DEFAULT_WIZARD: WizardData = { fullName: "", email: "", nationality: "", customNationality: "", degree: "", field: "", gpa: "", gpaScale: "4.0", ielts: "", budget: "low" };
const DEFAULT_FILTERS: FilterState = { search: "", coverage: "all", degree: "all", effort: "all", field: "all", selectivity: "all", hostCountry: "all", onlyEligible: false, closingSoon: false, onlyShortlisted: false };
const COVERAGE_LABEL: Record<string, string> = { full_ride: "Full ride", tuition_only: "Tuition", stipend: "Stipend" };

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

/* Tier — positive framing only. No "stretch", "long shot", "lower fit". */
const TIER = {
  strong_match: {
    label: "Closely aligned",
    dot: "bg-gold",
    text: "text-gold",
    textLight: "text-gold-dark dark:text-gold",
    grad: "from-gold via-gold-light to-gold",
    border: "border-gold/30",
  },
  competitive: {
    label: "Aligned",
    dot: "bg-primary-bright",
    text: "text-primary-foreground/85",
    textLight: "text-primary dark:text-primary-bright",
    grad: "from-primary via-primary-bright to-primary",
    border: "border-primary/25",
  },
  low_priority: {
    label: "Worth exploring",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    textLight: "text-muted-foreground",
    grad: "from-muted-foreground/40 to-muted-foreground/60",
    border: "border-border",
  },
};

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

/* ─── Animated count-up ──────────────────────────────────────────────── */
const useCountUp = (target: number, duration = 1200, enabled = true) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return val;
};

/* ─── 3D tilt wrapper (subtle) ───────────────────────────────────────── */
const Tilt = ({ children, className = "", intensity = 3 }: { children: React.ReactNode; className?: string; intensity?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 24 });
  const sy = useSpring(y, { stiffness: 220, damping: 24 });
  const rotX = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 1200 }}
      className={className}>
      {children}
    </motion.div>
  );
};

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

/* ─── Featured card — compact editorial poster, gold accent only ─────── */
const FeaturedCard = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored; onSelect: () => void; isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
}) => {
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const why = s.why_this_fits || s.reasons.slice(0, 2).join(". ") || "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onClick={onSelect}
      className="relative overflow-hidden rounded-2xl cursor-pointer group bg-card border border-border hover:border-gold/40 hover:shadow-md transition-all"
    >
      {/* Thin gold accent strip on the left */}
      <div className="absolute left-0 inset-y-0 w-[2px] bg-gradient-to-b from-gold-light via-gold-dark to-gold-light" />

      <div className="px-6 py-6 sm:px-8 sm:py-7 grid sm:grid-cols-[auto,1fr] gap-x-7 gap-y-5 items-center">
        {/* Match score — refined, not gigantic */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-2.5 shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-4xl sm:text-5xl font-bold tabular-nums leading-none tracking-[-0.03em] text-foreground">{s.match}</span>
            <span className="text-xs text-muted-foreground/70 tabular-nums">/100</span>
          </div>
          <div className="flex sm:flex-col items-baseline sm:items-start gap-2 sm:gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-gold/10 border border-gold/25 px-2 py-0.5 rounded-full">
              <Trophy className="h-2.5 w-2.5 text-gold-dark" />
              <span className="text-gold-dark text-[10px] font-semibold uppercase tracking-[0.18em]">Top match</span>
            </div>
            <SelectivityChip level={s.selectivity} />
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-2">
            <span className="text-xl">{flag}</span>
            <p className="text-xs text-muted-foreground truncate">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
          </div>

          <h3 className="font-heading font-bold text-xl sm:text-2xl text-foreground leading-[1.15] tracking-[-0.02em] mb-3">{s.scholarship_name}</h3>

          {/* Inline facts row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-sm">
            <div>
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.18em] mr-2">Award</span>
              <span className="text-foreground font-semibold">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</span>
            </div>
            <span className="text-muted-foreground/40">·</span>
            <div>
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.18em] mr-2">Deadline</span>
              <span className={`font-semibold ${dl.cls}`}>{dl.text}</span>
            </div>
            {s.estimated_total_value_usd ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <div>
                  <span className="text-gold-dark text-[10px] font-semibold uppercase tracking-[0.18em] mr-2">Value</span>
                  <span className="text-gold-dark font-bold">{fmtValue(s.estimated_total_value_usd)}</span>
                </div>
              </>
            ) : null}
          </div>

          {/* Why this fits */}
          {why && (
            <p className="text-foreground/75 text-sm leading-[1.6] italic font-light line-clamp-2 mb-4">
              "{why.replace(/\.+$/, "")}."
            </p>
          )}

          {/* CTA row */}
          <div className="flex items-center gap-2 mt-1">
            <Button variant="gold" size="sm" className="gap-1.5 h-9" onClick={e => { e.stopPropagation(); onSelect(); }}>
              Open strategy <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <button onClick={onBookmark} className="text-muted-foreground hover:text-gold-dark transition-colors p-2 -m-2" aria-label={isBookmarked ? "Remove from shortlist" : "Save to shortlist"}>
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-gold-dark" /> : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
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
        {(["researching","drafting","submitted","decision","rejected"] as AppStatus[]).map(s => (
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

/* ─── List row (compact, scannable, table-like) ──────────────────────── */
const ScholarRow = ({ s, onSelect, isBookmarked, onBookmark, status, onStatusChange, isHidden, onToggleHide, isComparing, onToggleCompare, index = 0 }: {
  s: Scored; onSelect: () => void;
  isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
  status: AppStatus | undefined; onStatusChange: (s: AppStatus | null) => void;
  isHidden: boolean; onToggleHide: (e: React.MouseEvent) => void;
  isComparing: boolean; onToggleCompare: (e: React.MouseEvent) => void;
  index?: number;
}) => {
  const tier = TIER[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.018, 0.36), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onSelect}
      className={`group grid grid-cols-[44px,minmax(0,1fr),auto] sm:grid-cols-[44px,minmax(0,2fr),minmax(0,1.2fr),minmax(0,1fr),auto] items-center gap-4 px-4 py-3.5 border-b border-border/60 hover:bg-canvas-soft/60 cursor-pointer transition-colors ${isHidden ? "opacity-40" : ""}`}
    >
      {/* Match score */}
      <div className="flex flex-col items-center">
        <span className="font-heading text-lg font-bold tabular-nums leading-none text-foreground">{s.match}</span>
        <span className={`mt-1 h-1 w-1 rounded-full ${tier.dot}`} />
      </div>

      {/* Name + provider */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{flag}</span>
          <h3 className="font-heading font-semibold text-[15px] text-foreground truncate tracking-tight">{s.scholarship_name}</h3>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
      </div>

      {/* Award + deadline (desktop only) */}
      <div className="hidden sm:block min-w-0">
        <p className="text-sm text-foreground truncate">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</p>
        <p className={`text-xs mt-0.5 ${dl.cls}`}>{dl.text}</p>
      </div>

      {/* Status (desktop only) */}
      <div className="hidden sm:flex items-center justify-start">
        <StatusBadge status={status} onChange={onStatusChange} dense />
      </div>

      {/* Actions — bookmark stays always-visible (it's a stateful affordance);
          compare + more reveal on hover. Premium-tool pattern. */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleCompare}
          aria-label="Add to compare"
          title="Add to compare"
          className={`p-2 rounded-md transition-all ${isComparing ? "text-gold-dark bg-gold/10 opacity-100" : "text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
        >
          <GitCompare className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onBookmark}
          aria-label={isBookmarked ? "Remove from shortlist" : "Save to shortlist"}
          className={`p-2 rounded-md transition-all ${isBookmarked ? "text-gold-dark hover:bg-muted/60 opacity-100" : "text-muted-foreground hover:text-gold-dark hover:bg-muted/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
        >
          {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-gold-dark" /> : <Bookmark className="h-3.5 w-3.5" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }} className="text-xs">
              <FileText className="h-3 w-3 mr-2" /> Open strategy
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
    </motion.div>
  );
};

/* ─── Scholarship card — dense, product-grade, scannable in a 3-col grid ── */
const ScholarCard = ({ s, onSelect, isBookmarked, onBookmark, status, onStatusChange, isHidden, onToggleHide, isComparing, onToggleCompare, index = 0 }: {
  s: Scored; onSelect: () => void;
  isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
  status: AppStatus | undefined; onStatusChange: (s: AppStatus | null) => void;
  isHidden: boolean; onToggleHide: (e: React.MouseEvent) => void;
  isComparing: boolean; onToggleCompare: (e: React.MouseEvent) => void;
  index?: number;
}) => {
  const tier = TIER[s.priority];
  const dl = deadlineDisplay(s.application_deadline);
  const why = s.why_this_fits || s.reasons.slice(0, 2).join(". ");
  const award = s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—";

  // Provider initials for the avatar — same hash-to-hue pattern as
  // ScholarshipCard for visual consistency across the product.
  const provider = s.provider_name || s.scholarship_name;
  const initials = (() => {
    const parts = provider.trim().split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  })();
  const hue = (() => { let h = 0; for (let i = 0; i < provider.length; i++) h = (h * 31 + provider.charCodeAt(i)) >>> 0; return h % 360; })();

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={`group relative rounded-xl bg-card border hover:shadow-md transition-all cursor-pointer h-full flex flex-col ${isComparing ? "border-gold ring-2 ring-gold/20" : "border-border hover:border-foreground/20"} ${isHidden ? "opacity-50" : ""}`}
    >
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Header: avatar + headline + match score */}
        <div className="flex items-start gap-2.5">
          <div
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-[10px] text-white tracking-tight shadow-sm ring-1 ring-black/5"
            style={{ background: `linear-gradient(135deg, hsl(${hue}, 55%, 45%), hsl(${(hue + 35) % 360}, 60%, 38%))` }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-[13.5px] font-semibold leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-gold-dark transition-colors">
              {s.scholarship_name}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {[s.provider_name, s.host_country].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="shrink-0 flex items-baseline gap-0.5 -mt-0.5">
            <span className="text-lg font-bold tabular-nums leading-none text-foreground">{s.match}</span>
            <span className="text-[9px] text-muted-foreground/70">/100</span>
          </div>
        </div>

        {/* Award + tier in one line — denser */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate min-w-0">{award}</span>
          <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tier.textLight}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
            {tier.label}
          </span>
        </div>

        {/* Deadline + field — meta line */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className={`tabular-nums ${dl.cls}`}>{dl.text}</span>
          {s.target_fields && s.target_fields.length > 0 && s.target_fields[0].toLowerCase() !== "any" && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-muted-foreground truncate">{s.target_fields[0]}</span>
            </>
          )}
        </div>

        {/* Why it fits — single line, light */}
        {why && (
          <p className="text-[12px] text-foreground/65 leading-snug line-clamp-2 flex-1">
            {why.replace(/\.+$/, "")}.
          </p>
        )}

        {/* Status (only when set — otherwise we skip the row entirely) */}
        {status && (
          <div onClick={(e) => e.stopPropagation()}>
            <StatusBadge status={status} onChange={onStatusChange} />
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
          <span className="text-[12px] font-semibold text-muted-foreground group-hover:text-gold-dark transition-colors flex items-center gap-1">
            Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onToggleCompare}
              aria-label={isComparing ? "Remove from compare" : "Add to compare"}
              title={isComparing ? "Remove from compare" : "Add to compare"}
              className={`p-1.5 rounded-md transition-colors ${isComparing ? "text-gold-dark bg-gold/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <GitCompare className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onBookmark}
              aria-label={isBookmarked ? "Remove from shortlist" : "Save to shortlist"}
              className="p-1.5 rounded-md text-muted-foreground hover:text-gold-dark hover:bg-muted/60 transition-colors"
            >
              {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-gold-dark" /> : <Bookmark className="h-3.5 w-3.5" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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

/* ─── Timeline view — group by deadline urgency, dense compact rows ──── */
const TimelineView = ({ items, onSelect, openDetail, ...common }: {
  items: Scored[];
  onSelect: (s: Scored) => void;
  openDetail: Scored | null;
  shortlist: Set<string>;
  toggleBookmark: (id: string) => void;
  statusMap: Record<string, AppStatus>;
  setStatus: (id: string, s: AppStatus | null) => void;
  hidden: Set<string>;
  toggleHide: (id: string) => void;
  compareSet: Set<string>;
  toggleCompare: (id: string) => void;
}) => {
  const groups = useMemo(() => {
    const buckets: { label: string; subtitle: string; cls: string; items: Scored[] }[] = [
      { label: "This week",       subtitle: "Closing in seven days. Decide and act.",         cls: "text-destructive",  items: [] },
      { label: "This month",      subtitle: "Closing in the next 31 days.",                   cls: "text-rose-600",     items: [] },
      { label: "Next 90 days",    subtitle: "Plenty of runway to prepare a strong application.", cls: "text-warning",   items: [] },
      { label: "Later this year", subtitle: "On the radar — start research now.",              cls: "text-foreground/60",items: [] },
      { label: "Rolling / undated", subtitle: "Apply whenever you're ready.",                  cls: "text-muted-foreground", items: [] },
    ];
    items.forEach(s => {
      const d = daysUntil(s.application_deadline);
      if (d === null) buckets[4].items.push(s);
      else if (d <= 0) return; // closed — skip from timeline
      else if (d <= 7) buckets[0].items.push(s);
      else if (d <= 31) buckets[1].items.push(s);
      else if (d <= 90) buckets[2].items.push(s);
      else if (d <= 365) buckets[3].items.push(s);
      else buckets[4].items.push(s);
    });
    // Sort each bucket by deadline ascending (rolling/undated stays in input order)
    buckets.slice(0, 4).forEach(b => b.items.sort((a, b) => {
      if (!a.application_deadline) return 1;
      if (!b.application_deadline) return -1;
      return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime();
    }));
    return buckets.filter(b => b.items.length > 0);
  }, [items]);

  if (groups.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-3xl p-16 text-center bg-muted/10">
        <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading font-semibold text-lg text-foreground mb-1.5">Nothing on the calendar</h3>
        <p className="text-sm text-muted-foreground">No deadlines match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map(g => (
        <section key={g.label}>
          <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-border/60">
            <div>
              <h2 className={`font-heading text-xl font-bold tracking-tight ${g.cls}`}>{g.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{g.subtitle}</p>
            </div>
            <span className="text-2xl font-bold text-foreground/30 tabular-nums">{g.items.length.toString().padStart(2, "0")}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
            {g.items.map((s, i) => {
              const isBookmarked = common.shortlist.has(s.scholarship_id);
              const isHidden = common.hidden.has(s.scholarship_id);
              const isComparing = common.compareSet.has(s.scholarship_id);
              const status = common.statusMap[s.scholarship_id];
              return (
                <ScholarRow
                  key={s.scholarship_id}
                  s={s}
                  index={i}
                  onSelect={() => onSelect(s)}
                  isBookmarked={isBookmarked}
                  onBookmark={(e) => { e.stopPropagation(); common.toggleBookmark(s.scholarship_id); }}
                  status={status}
                  onStatusChange={(st) => common.setStatus(s.scholarship_id, st)}
                  isHidden={isHidden}
                  onToggleHide={(e) => { e.stopPropagation(); common.toggleHide(s.scholarship_id); }}
                  isComparing={isComparing}
                  onToggleCompare={(e) => { e.stopPropagation(); common.toggleCompare(s.scholarship_id); }}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
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
  const sections: { label: string; key: keyof FilterState; opts: { v: string; l: string }[] }[] = [
    { label: "Coverage", key: "coverage", opts: [{ v: "all", l: "All types" }, { v: "full_ride", l: "Full ride" }, { v: "tuition_only", l: "Tuition" }, { v: "stipend", l: "Stipend" }] },
    { label: "Degree",   key: "degree",   opts: [{ v: "all", l: "All levels" }, { v: "undergraduate", l: "Bachelor\'s" }, { v: "master\'s", l: "Master\'s" }, { v: "PhD", l: "PhD" }] },
    { label: "Competitiveness", key: "selectivity", opts: [{ v: "all", l: "Any level" }, { v: "low", l: "Accessible" }, { v: "medium", l: "Moderate" }, { v: "high", l: "Competitive" }, { v: "very_high", l: "Highly competitive" }] },
    // Effort filter removed for now — effort still surfaces on the detail card.
  ];
  return (
    <div className="space-y-6">
      {sections.map(section => (
        <div key={section.label}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">{section.label}</p>
          <div className="space-y-1">
            {section.opts.map(o => (
              <button key={o.v} onClick={() => setFilters(f => ({ ...f, [section.key]: o.v }))}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${(filters[section.key] as string) === o.v ? "bg-gold/15 text-gold-dark dark:text-gold font-semibold" : "text-foreground/65 hover:bg-foreground/[0.03]"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Field filter — built from data */}
      {fieldsAvailable.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">Field</p>
          <Select value={filters.field} onValueChange={v => setFilters(f => ({ ...f, field: v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fields</SelectItem>
              {fieldsAvailable.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Host country filter */}
      {hostCountries.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">Host country</p>
          <Select value={filters.hostCountry} onValueChange={v => setFilters(f => ({ ...f, hostCountry: v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {hostCountries.map(c => <SelectItem key={c} value={c}>{FLAGS[c] || "🌍"} {c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />
      <div className="space-y-3.5">
        {([
          { id: "oe", label: "Eligible only",         key: "onlyEligible"    as keyof FilterState },
          { id: "cs", label: "Closing in 90 days",    key: "closingSoon"     as keyof FilterState },
          { id: "sl", label: "My shortlist",          key: "onlyShortlisted" as keyof FilterState },
        ] as const).map(t => (
          <div key={t.id} className="flex items-center justify-between">
            <Label htmlFor={t.id} className="text-sm cursor-pointer text-foreground/75 font-normal">{t.label}</Label>
            <Switch id={t.id} checked={filters[t.key] as boolean} onCheckedChange={v => setFilters(f => ({ ...f, [t.key]: v }))} />
          </div>
        ))}
      </div>
      {activeCount > 0 && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setFilters(DEFAULT_FILTERS)}>
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
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark, profile, status, onStatusChange, note, onNoteChange, similar, onSwitchTo, isMember, onUnlock }: {
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
}) => {
  if (!s) return null;
  const tier = TIER[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const [dc1, dc2] = dialColors(s.priority);
  const why = s.why_this_fits || s.reasons.slice(0, 2).join(". ");

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
  if (s.min_toefl != null) reqs.push({ label: `TOEFL ≥ ${s.min_toefl}`, status: "unknown", detail: "We don't track TOEFL yet" });
  if (s.min_sat != null) reqs.push({ label: `SAT ≥ ${s.min_sat}`, status: "unknown", detail: "Add your SAT to check" });
  if (s.target_degree_level && profile.degree) {
    const ok = s.target_degree_level.some(d => d.toLowerCase() === profile.degree.toLowerCase());
    reqs.push({ label: `Degree level: ${s.target_degree_level.join(", ")}`, status: ok ? "met" : "miss", detail: `Your level: ${profile.degree}` });
  }
  if (s.target_fields && s.target_fields.length > 0 && profile.field) {
    const fm = fieldMatches(profile.field, s.target_fields);
    reqs.push({ label: `Field of study`, status: fm === true ? "met" : fm === false ? "miss" : "unknown", detail: `Funds: ${s.target_fields.slice(0, 4).join(", ")}${s.target_fields.length > 4 ? "..." : ""}` });
  }
  if (s.eligible_countries && profile.country) {
    const list = s.eligible_countries.map(c => c.toLowerCase());
    const open = list.some(c => c.includes("all") || c.includes("any"));
    const ok = open || list.some(c => c.includes(profile.country.toLowerCase()));
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
      <SheetContent side="right" className="w-full sm:w-[640px] overflow-y-auto p-0 flex flex-col">
        {/* ── HEADER (cream, editorial — no thick navy block) ── */}
        <div className="relative bg-canvas-soft px-7 pt-7 pb-6 overflow-hidden shrink-0 border-b border-border">
          {/* Soft top wash so the header has navy presence without a slab */}
          <div className="absolute inset-x-0 top-0 h-24 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(180deg, hsl(var(--primary) / 0.06) 0%, transparent 100%)" }} />
          {/* Subtle gold ambient */}
          <div className="absolute -top-1/3 right-0 w-1/2 h-full rounded-full blur-[120px] opacity-[0.10] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />

          <SheetHeader className="relative space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark">{tier.label}</p>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <SelectivityChip level={s.selectivity} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {s.eligibility === "eligible" ? "✓ You qualify on paper" : s.eligibility === "missing" ? "Near miss — close to threshold" : s.eligibility === "not_eligible" ? "Doesn't fit your profile" : "Likely fit"}
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-3xl font-bold tabular-nums leading-none text-foreground">{s.match}</span>
                <span className="text-xs text-muted-foreground/60">/100</span>
              </div>
            </div>

            <SheetTitle className="text-foreground font-heading text-[26px] leading-[1.12] tracking-[-0.02em] pt-1 text-left">{s.scholarship_name}</SheetTitle>
            <p className="text-muted-foreground text-sm text-left">
              <span className="mr-1.5">{flag}</span>{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}
            </p>
          </SheetHeader>

          {/* Key facts row — cream tiles */}
          <div className="relative grid grid-cols-3 gap-2 mt-5">
            <div className="bg-card border border-border rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">Award</div>
              <div className="text-foreground text-xs font-semibold leading-tight line-clamp-2">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</div>
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

          {/* Header CTAs */}
          <div className="relative flex items-center gap-2 mt-4">
            <Button variant="gold" size="sm" asChild className="flex-1 h-9" disabled={!s.official_url}>
              {s.official_url ? (
                <a href={s.official_url} target="_blank" rel="noopener noreferrer">
                  Apply on official site <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              ) : <span>No official link</span>}
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={onBookmark}>
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-gold-dark" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          </div>

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

          {/* Application status + notes — application-software pattern */}
          <div className="relative mt-4 flex flex-col gap-3 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">My status</p>
                <StatusBadge status={status} onChange={onStatusChange} />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Saved locally
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">My notes</p>
              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={3}
                placeholder="Essay ideas, recommender contacts, research links…"
                className="w-full text-sm text-foreground/90 bg-background border border-border/70 rounded-lg p-3 leading-relaxed resize-none focus:outline-none focus:border-gold/40 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <div className="px-7 pt-5 border-b border-border bg-background sticky top-0 z-10">
            <TabsList className="bg-transparent p-0 h-auto gap-7 w-full justify-start rounded-none -mb-px">
              {(["overview","requirements","strategy","apply"] as const).map(v => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:shadow-none border-b-2 border-transparent text-muted-foreground hover:text-foreground rounded-none px-0 pb-3 pt-0 text-sm font-medium capitalize bg-transparent"
                >
                  {v}
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

            {s.target_fields && s.target_fields.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Funds</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.target_fields.map((f, i) => (
                    <span key={i} className="text-xs text-foreground/75 bg-muted/60 border border-border px-2.5 py-1 rounded-md">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {s.best_for_tags && s.best_for_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Best for</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.best_for_tags.map((t, i) => (
                    <span key={i} className="text-xs bg-gold/10 text-gold-dark dark:text-gold border border-gold/20 px-2.5 py-1 rounded-full font-medium">{t}</span>
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
          </TabsContent>

          {/* STRATEGY */}
          <TabsContent value="strategy" className="px-7 py-6 space-y-5 m-0 focus-visible:outline-none relative">
            {/* First strategy block — preview, free for everyone (creates desire) */}
            {s.what_to_prepare_first && (
              <div className="border-l-2 border-l-gold bg-muted/30 rounded-r-2xl px-5 py-4">
                <p className="text-[10px] font-semibold text-foreground mb-1 uppercase tracking-[0.16em]">Start here</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{s.what_to_prepare_first}</p>
              </div>
            )}

            {/* Members-only content (or unlocked if isMember) */}
            {isMember ? (
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
            )}
          </TabsContent>

          {/* APPLY */}
          <TabsContent value="apply" className="px-7 py-6 space-y-5 m-0 focus-visible:outline-none">
            {/* Deadline urgency banner */}
            {days !== null && days > 0 && days <= 90 && (
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

            <div className="bg-muted/40 rounded-2xl px-4 py-1">
              {[
                ["Deadline", deadlineDate ? `${deadlineDate} (${dl.text})` : "Rolling"],
                ["Cycle", s.deadline_type ? s.deadline_type.charAt(0).toUpperCase() + s.deadline_type.slice(1) : null],
                ["Platform", s.application_platform],
                ["Application fee", s.application_fee_text],
              ].filter(([, v]) => v).map(([label, val], i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right">{val}</span>
                </div>
              ))}
            </div>

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
        </Tabs>

        {/* ── SIMILAR SCHOLARSHIPS — Crunchbase/IMDB pattern: keep users moving ── */}
        {similar.length > 0 && (
          <div className="px-7 py-6 border-t border-border bg-canvas-soft/50">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-3">If you like this, also look at</p>
            <div className="space-y-1.5">
              {similar.map(sim => {
                const flag = FLAGS[sim.host_country || ""] ?? "🌍";
                return (
                  <button
                    key={sim.scholarship_id}
                    onClick={() => onSwitchTo(sim)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border/60 hover:border-gold/30 hover:shadow-sm transition-all text-left group"
                  >
                    <span className="text-xl shrink-0">{flag}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-gold-dark transition-colors">{sim.scholarship_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[sim.provider_name, sim.host_country].filter(Boolean).join(" · ")}
                        <span className="mx-1.5 text-muted-foreground/40">·</span>
                        <span className="font-semibold text-foreground/70 tabular-nums">{sim.match}% match</span>
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
          const src = (s as Scholarship).data_source ?? "hand_curated";
          const isCurated = src === "hand_curated";
          const sourceLabel =
            isCurated ? "Curated" :
            src === "manus_ai_2026_05_03" ? "External research · May 2026" :
            "External research";
          return (
            <div className="px-7 py-4 border-t border-border bg-muted/20 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldAlert className={`h-3.5 w-3.5 ${isStale ? "text-warning" : "text-success"}`} />
                  <span>
                    {verifiedDate ? <>Verified {dateOnly(verifiedDate)} {isStale && <span className="text-warning">· may be stale</span>}</> : "Verification date unknown"}
                  </span>
                </div>
                <a
                  href={`mailto:hello@topuni.com?subject=${encodeURIComponent("Inaccurate scholarship data: " + s.scholarship_name)}&body=${encodeURIComponent("ID: " + s.scholarship_id + "\n\nWhat's wrong:\n")}`}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Report inaccuracy
                </a>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-medium uppercase tracking-[0.12em] ${
                  isCurated
                    ? "border-success/30 text-success bg-success/5"
                    : "border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-500/5"
                }`}>
                  Source: {sourceLabel}
                </span>
                {!isCurated && (
                  <span className="text-muted-foreground/80">
                    Verify deadlines and amounts on the official site before applying.
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
};

/* ─── Inline animated stat ───────────────────────────────────────────── */
const InlineStat = ({ label, value, color = "text-foreground", isMoney = false, delay = 0, icon: Icon }: {
  label: string; value: number; color?: string; isMoney?: boolean; delay?: number; icon: React.ComponentType<{ className?: string }>;
}) => {
  const animated = useCountUp(value, 1300);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-3">
      <Icon className={`h-4 w-4 ${color} opacity-70`} />
      <div>
        <div className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${color} tracking-tight`}>{isMoney ? fmtValue(animated) : animated}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-1.5">{label}</div>
      </div>
    </motion.div>
  );
};

/* ─── Section header ─────────────────────────────────────────────────── */
const SectionHeader = ({ kicker, title, subtitle, count, accentClass }: {
  kicker: string; title: string; subtitle: string; count: number; accentClass: string;
}) => (
  <Reveal className="flex items-end justify-between gap-4 mb-4 pb-3 border-b border-border/60">
    <div className="min-w-0">
      <div className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${accentClass} mb-1.5`}>
        <span className={`h-1.5 w-1.5 rounded-full ${accentClass.replace("text-", "bg-")}`} />
        {kicker}
        <span className="text-muted-foreground/60 font-normal tracking-normal normal-case ml-1">· {count}</span>
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
  const [profile, setProfile] = useState<Profile>({ country: "", degree: "", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" });
  const [phase, setPhase] = useState<Phase>(() => getStoredProfile()?.nationality ? "results" : "landing");
  const [wizardStep, setWizardStep] = useState(0);
  const [wiz, setWiz] = useState<WizardData>(DEFAULT_WIZARD);
  const [openDetail, setOpenDetail] = useState<Scored | null>(null);
  /* Application tracker — offline-first hook that mirrors localStorage
     and (when authed) syncs to Postgres `application_tracker`. Replaces
     the four separate useState + useEffect blobs that lived here. */
  const tracker = useApplicationTracker();
  const { shortlist, hidden, statusMap, notesMap, setStatus, setNote, toggleShortlist, toggleHidden } = tracker;
  const [analysisStep, setAnalysisStep] = useState(0);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortBy>("match");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  // Logic-Pro-grade app state, persisted in localStorage. Default to list —
  // serious databases lead with dense rows, not marketing card grids.
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem("tu_view_mode") as ViewMode) || "list");
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
      const { data } = await supabase.from("scholarships").select("*").order("estimated_total_value_usd", { ascending: false });
      if (data) setRows(data as unknown as Scholarship[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const stored = getStoredProfile();
    if (stored?.nationality) {
      setProfile({
        country: stored.nationality || "",
        degree: stored.targetDegree === "phd" ? "PhD" : stored.targetDegree === "master" ? "master\'s" : stored.targetDegree || "undergraduate",
        gpa: stored.gpa || "", gpaScale: "4.0", ielts: stored.ieltsScore || "",
        sat: "", field: stored.fieldOfInterest || "",
        budget: stored.budgetRange?.startsWith("0") || stored.budgetRange?.startsWith("5000") ? "low" : "medium",
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
    const country = wiz.nationality === "other" ? wiz.customNationality : wiz.nationality;
    const p: Profile = { country, degree: wiz.degree, gpa: wiz.gpa, gpaScale: wiz.gpaScale, ielts: wiz.ielts, sat: "", field: wiz.field, budget: wiz.budget };
    setProfile(p);
    saveProfile({ fullName: wiz.fullName, email: wiz.email, nationality: country, targetDegree: wiz.degree, gpa: wiz.gpa, ieltsScore: wiz.ielts, budgetRange: wiz.budget === "low" ? "0-5000" : "15000+", fieldOfInterest: wiz.field });
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
      degree: profile.degree,
      nationality: profile.country,
      gpa: profile.gpa,
      ielts: profile.ielts,
    },
    { limit: 80 },
  );

  const ranked = useMemo(() => {
    const p = profile.country || profile.degree ? profile : { country: "", degree: "master\'s", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" };
    return rows.map(r => {
      const sim = semantic.matches.get(r.scholarship_id)?.similarity;
      return scoreScholarship(r, p, sim);
    }).sort((a, b) => {
      const e = { eligible: 0, likely: 1, missing: 2, not_eligible: 3 };
      if (e[a.eligibility] !== e[b.eligibility]) return e[a.eligibility] - e[b.eligibility];
      return b.match - a.match;
    });
  }, [rows, profile, semantic.matches]);

  /* Available host countries + fields, derived from data */
  const hostCountries = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.host_country) set.add(r.host_country); });
    return [...set].sort();
  }, [rows]);

  const fieldsAvailable = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.target_fields?.forEach(f => set.add(f)));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = ranked;
    if (filters.search) { const q = filters.search.toLowerCase(); list = list.filter(s => s.scholarship_name.toLowerCase().includes(q) || (s.host_country?.toLowerCase() || "").includes(q) || (s.provider_name?.toLowerCase() || "").includes(q)); }
    if (filters.coverage !== "all") list = list.filter(s => s.coverage_type === filters.coverage);
    if (filters.degree !== "all") list = list.filter(s => s.target_degree_level?.some(d => d.toLowerCase() === filters.degree.toLowerCase()));
    if (filters.effort !== "all") list = list.filter(s => s.effort === filters.effort);
    if (filters.selectivity !== "all") list = list.filter(s => s.selectivity === filters.selectivity);
    if (filters.field !== "all") list = list.filter(s => s.target_fields?.includes(filters.field));
    if (filters.hostCountry !== "all") list = list.filter(s => s.host_country === filters.hostCountry);
    if (filters.onlyEligible) list = list.filter(s => s.eligibility === "eligible" || s.eligibility === "likely");
    if (filters.closingSoon) list = list.filter(s => { const d = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null; return d !== null && d > 0 && d <= 90; });
    if (filters.onlyShortlisted) list = list.filter(s => shortlist.has(s.scholarship_id));
    if (!showHidden) list = list.filter(s => !hidden.has(s.scholarship_id));
    if (sortBy === "deadline") return [...list].sort((a, b) => { if (!a.application_deadline) return 1; if (!b.application_deadline) return -1; return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime(); });
    if (sortBy === "value") return [...list].sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0));
    if (sortBy === "effort") { const o: Record<string, number> = { low: 0, medium: 1, high: 2 }; return [...list].sort((a, b) => (o[a.effort] ?? 1) - (o[b.effort] ?? 1)); }
    if (sortBy === "selectivity") { const o: Record<string, number> = { low: 0, medium: 1, high: 2, very_high: 3, unknown: 4 }; return [...list].sort((a, b) => (o[a.selectivity] ?? 4) - (o[b.selectivity] ?? 4)); }
    return list;
  }, [ranked, filters, sortBy, shortlist, hidden, showHidden]);

  const sections = useMemo(() => {
    const top = filtered.filter(s => s.priority === "strong_match");
    const competitive = filtered.filter(s => s.priority === "competitive");
    const stretch = filtered.filter(s => s.priority === "low_priority");
    return { hero: top.slice(0, 1), strong: top.slice(1), competitive, stretch };
  }, [filtered]);

  const stats = useMemo(() => ({
    strong: ranked.filter(s => s.priority === "strong_match").length,
    competitive: ranked.filter(s => s.priority === "competitive").length,
    closing: ranked.filter(s => { const d = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null; return d !== null && d > 0 && d <= 60; }).length,
    totalValue: ranked.filter(s => s.priority !== "low_priority").reduce((sum, s) => sum + (s.estimated_total_value_usd ?? 0), 0),
  }), [ranked]);

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

  const activeFiltersCount = [filters.search !== "", filters.coverage !== "all", filters.degree !== "all", filters.effort !== "all", filters.selectivity !== "all", filters.field !== "all", filters.hostCountry !== "all", filters.onlyEligible, filters.closingSoon, filters.onlyShortlisted].filter(Boolean).length;

  const analysisTexts = [
    `Scanning ${rows.length || 200}+ verified scholarships`,
    `Filtering by nationality${wiz.nationality ? `: ${wiz.nationality}` : ""}`,
    `Matching ${wiz.degree || "your degree"} programs${wiz.field ? ` in ${wiz.field}` : ""}`,
    "Evaluating academic thresholds and selectivity",
    "Ranking your best opportunities",
  ];

  const dark = phase === "landing" || phase === "wizard" || phase === "analyzing";
  const totalVerified = rows.length || 200;

  return (
    <div className={`min-h-screen relative transition-colors duration-700 ${dark ? "" : "bg-background"}`}>
      {dark && <NavyBackdrop />}

      <div className="relative z-10">
        <Navigation language={language} />

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
                    <span className="text-gold">{totalVerified}</span> verified scholarships · live database
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

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.7 }}
                  className="absolute bottom-[-180px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-primary-foreground/30">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">Scroll</span>
                  <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
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
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 2 · Origin</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">Where are you from?</h2>
                    <p className="text-primary-foreground/50 mb-10 text-base max-w-md mx-auto">Your nationality determines eligibility for most scholarships.</p>
                    <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {COUNTRIES.map((c, i) => (
                        <motion.button key={c.v} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025, duration: 0.4 }}
                          onClick={() => { setWiz(w => ({ ...w, nationality: c.v })); setWizardStep(2); }}
                          className={`group flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border transition-all hover:scale-[1.04] active:scale-95 ${wiz.nationality === c.v ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] hover:border-primary-foreground/25 backdrop-blur-md"}`}>
                          <span className="text-2xl">{c.f}</span>
                          <span className="text-xs font-medium leading-tight">{c.v}</span>
                        </motion.button>
                      ))}
                      <button onClick={() => setWiz(w => ({ ...w, nationality: "other" }))}
                        className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border transition-all hover:scale-[1.04] ${wiz.nationality === "other" ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] hover:border-primary-foreground/25 backdrop-blur-md"}`}>
                        <span className="text-2xl">🌍</span>
                        <span className="text-xs font-medium">Other</span>
                      </button>
                    </div>
                    {wiz.nationality === "other" && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 w-full max-w-md mx-auto space-y-3">
                        <Input value={wiz.customNationality} onChange={e => setWiz(w => ({ ...w, customNationality: e.target.value }))} placeholder="Type your country..."
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md" />
                        <Button variant="gold" onClick={() => setWizardStep(2)} disabled={!wiz.customNationality} className="w-full gap-2">Continue <ArrowRight className="h-4 w-4" /></Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div key="ws2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <p className="text-gold text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 3 · Path</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-primary-foreground mb-4 tracking-[-0.02em] leading-[1.05]">What will you study?</h2>
                    <p className="text-primary-foreground/50 mb-10 text-base">Pick the level you're applying for.</p>
                    <div className="w-full grid grid-cols-3 gap-4 mb-10">
                      {DEGREES.map((d, i) => (
                        <motion.button key={d.v} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                          onClick={() => setWiz(w => ({ ...w, degree: d.v }))}
                          className={`flex flex-col items-center gap-2.5 p-6 rounded-3xl border transition-all hover:scale-[1.03] active:scale-95 ${wiz.degree === d.v ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] hover:border-primary-foreground/25 backdrop-blur-md"}`}>
                          <span className="text-4xl">{d.icon}</span>
                          <span className="font-semibold text-base">{d.l}</span>
                          <span className={`text-xs leading-tight ${wiz.degree === d.v ? "opacity-70" : "opacity-50"}`}>{d.d}</span>
                        </motion.button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {wiz.degree && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="w-full">
                          <p className="text-primary-foreground/50 text-sm mb-4">And your field?</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {FIELDS.map((f, i) => (
                              <motion.button key={f.v} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                onClick={() => setWiz(w => ({ ...w, field: f.v }))}
                                className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-xs font-medium transition-all hover:scale-[1.04] ${wiz.field === f.v ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] backdrop-blur-md"}`}>
                                <span>{f.i}</span><span>{f.v.split(" &")[0]}</span>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {wiz.degree && wiz.field && (
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
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">IELTS score (optional)</label>
                        <Input value={wiz.ielts} onChange={e => setWiz(w => ({ ...w, ielts: e.target.value }))} placeholder="e.g. 7.0"
                          className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/25 h-12 backdrop-blur-md focus-visible:border-gold/50" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/45">Funding situation</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ v: "low", l: "Need full funding", d: "Can't self-fund tuition" }, { v: "medium", l: "Can cover some", d: "Partial support is OK" }].map(b => (
                            <button key={b.v} onClick={() => setWiz(w => ({ ...w, budget: b.v }))}
                              className={`flex flex-col items-start gap-1 p-4 rounded-2xl border text-left transition-all ${wiz.budget === b.v ? "bg-gold text-primary border-gold" : "bg-primary-foreground/[0.03] border-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/[0.07] backdrop-blur-md"}`}>
                              <span className="text-sm font-semibold">{b.l}</span>
                              <span className={`text-xs ${wiz.budget === b.v ? "opacity-70" : "opacity-50"}`}>{b.d}</span>
                            </button>
                          ))}
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
              {/* ─── App title bar — restrained navy strip, single-line wordmark ─── */}
              <div className="relative bg-primary text-primary-foreground border-b border-primary/30">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 h-12 flex items-center gap-5">
                  <p className="font-heading font-semibold text-[15px] text-primary-foreground tracking-tight">
                    Discover
                  </p>
                  <span className="hidden sm:inline text-[11px] text-primary-foreground/40 tabular-nums">
                    {rows.length} scholarships
                  </span>
                  <div className="flex-1" />
                  {wiz.fullName && (
                    <span className="hidden sm:inline text-[11px] text-primary-foreground/55">{wiz.fullName}</span>
                  )}
                </div>
              </div>

              {/* ─── Filter context strip — Linear/Notion pattern ─── */}
              <div className="relative bg-canvas-soft border-b border-border/70">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-baseline gap-3 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground shrink-0">Filtered by</span>
                  {[profile.country, profile.degree, profile.field, profile.gpa ? `GPA ${profile.gpa}/${profile.gpaScale}` : null, profile.ielts ? `IELTS ${profile.ielts}` : null].filter(Boolean).map(chip => (
                    <span key={chip} className="text-xs text-foreground/75 bg-card border border-border px-2.5 py-1 rounded-md font-medium">{chip}</span>
                  ))}
                  <button onClick={resetProfile} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 underline-offset-4 hover:underline">
                    Edit
                  </button>
                  <div className="flex-1" />
                  {!loading && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      <span className="text-foreground font-semibold">{filtered.length}</span> of {ranked.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Sticky toolbar — search · filters · sort · view-mode · hidden · compare */}
              <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 py-3 flex items-center gap-2.5 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input ref={searchInputRef} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search scholarships, providers, countries…  (press / to focus)"
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
                      <SelectItem value="effort">Easiest first</SelectItem>
                      <SelectItem value="selectivity">Most accessible</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View-mode segmented control */}
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
                    <button
                      onClick={() => setViewMode("timeline")}
                      className={`h-full px-3 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-border ${viewMode === "timeline" ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      aria-pressed={viewMode === "timeline"}
                      title="Timeline view"
                    >
                      <Flame className="h-3.5 w-3.5" /><span className="hidden sm:inline">Deadlines</span>
                    </button>
                  </div>

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

                  <span className="text-xs text-muted-foreground hidden md:inline ml-auto tabular-nums">{filtered.length} of {ranked.length}</span>
                </div>
              </div>

              {/* Results body */}
              <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 sm:py-12">
                <div className="flex gap-8">
                  {/* ─── WORKSPACE SIDEBAR — app navigation rail ─── */}
                  <aside className="hidden lg:block w-[232px] shrink-0">
                    <div className="sticky top-24 space-y-3.5">
                      {/* Workspace nav */}
                      <nav className="bg-card border border-border rounded-2xl p-3 shadow-sm">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-2.5 px-2 mt-1">Workspace</p>
                        {([
                          { id: "browse" as AppSection,      label: "Browse",       icon: Layers,        count: ranked.length },
                          { id: "pipeline" as AppSection,    label: "My pipeline",  icon: Zap,           count: pipeline.total, accent: pipeline.total > 0 },
                          { id: "shortlist" as AppSection,   label: "Shortlist",    icon: BookmarkCheck, count: shortlist.size,  accent: shortlist.size > 0 },
                          { id: "collections" as AppSection, label: "Collections",  icon: Sparkles,      count: liveCollections.length },
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

                        <div className="my-2 mx-2 h-px bg-border/50" />
                        <button
                          onClick={resetProfile}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/65 hover:bg-foreground/[0.025] hover:text-foreground transition-colors"
                        >
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          Profile
                        </button>
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
                      <div className="border border-dashed border-border rounded-3xl p-16 text-center bg-muted/10">
                        <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="font-heading font-semibold text-lg text-foreground mb-1.5">No scholarships match</h3>
                        <p className="text-sm text-muted-foreground mb-5">Try adjusting your filters</p>
                        <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {/* Section header — context for the active workspace section */}
                        {appSection !== "browse" && (
                          <div className="flex items-baseline justify-between pb-5 border-b border-border/60">
                            <div>
                              <p className="text-gold-dark text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">
                                {appSection === "pipeline" ? "Workspace · Pipeline" : appSection === "shortlist" ? "Workspace · Shortlist" : "Workspace · Collections"}
                              </p>
                              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                                {appSection === "pipeline" ? "Applications in progress" : appSection === "shortlist" ? "Saved scholarships" : "Curated collections"}
                              </h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                {appSection === "pipeline" ? "Scholarships you've moved into your pipeline. Status updates from here sync everywhere." :
                                 appSection === "shortlist" ? "Scholarships you've bookmarked. Save more from any view." :
                                 "Pre-built lists organized by application strategy."}
                              </p>
                            </div>
                            <button onClick={() => setAppSection("browse")} className="text-xs text-muted-foreground hover:text-gold-dark transition-colors">← Back to browse</button>
                          </div>
                        )}

                        {/* Pipeline / Shortlist — filter to those items, render as list */}
                        {(appSection === "pipeline" || appSection === "shortlist") && (() => {
                          const items = filtered.filter(s =>
                            appSection === "pipeline" ? !!statusMap[s.scholarship_id] : shortlist.has(s.scholarship_id)
                          );
                          if (items.length === 0) {
                            return (
                              <div className="border border-dashed border-border rounded-3xl p-14 text-center bg-canvas-soft/40">
                                {appSection === "pipeline" ? <Zap className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" /> : <BookmarkCheck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />}
                                <h3 className="font-heading font-semibold text-lg text-foreground mb-1.5">
                                  {appSection === "pipeline" ? "Nothing in your pipeline yet" : "No saved scholarships yet"}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                                  {appSection === "pipeline" ? "Set a status on any scholarship and it'll show up here for tracking." : "Bookmark any scholarship and it'll appear here."}
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
                          });
                          return (
                            <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
                              <div className="hidden sm:grid grid-cols-[44px,minmax(0,2fr),minmax(0,1.2fr),minmax(0,1fr),auto] items-center gap-4 px-4 py-2.5 border-b border-border bg-canvas-soft/50 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                <span className="text-center">
                                  <button onClick={() => setSortBy("match")} className={`transition-colors ${sortBy === "match" ? "text-foreground" : "hover:text-foreground"}`}>Score{sortBy === "match" && <span className="ml-1 text-gold-dark">↓</span>}</button>
                                </span>
                                <span>Scholarship</span>
                                <span>
                                  <button onClick={() => setSortBy("deadline")} className={`transition-colors ${sortBy === "deadline" ? "text-foreground" : "hover:text-foreground"}`}>Award · Deadline{sortBy === "deadline" && <span className="ml-1 text-gold-dark">↓</span>}</button>
                                </span>
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

                        {/* BROWSE — default render with collections rail + featured + sections */}
                        {appSection === "browse" && viewMode === "grid" && liveCollections.length > 0 && (
                          <section>
                            <Reveal y={20}>
                              <div className="flex items-baseline justify-between mb-5">
                                <div>
                                  <p className="text-gold-dark text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">Curated collections</p>
                                  <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">Pre-built lists for different application strategies</h2>
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums">{liveCollections.length} collections</span>
                              </div>
                            </Reveal>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                                    className="group relative text-left bg-card border border-border/70 hover:border-gold/30 hover:shadow-md rounded-2xl p-5 transition-all"
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                      <div className={`h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 ${c.def.accentClass}`}>
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <span className="text-2xl font-bold tabular-nums text-foreground/40">{c.items.length.toString().padStart(2, "0")}</span>
                                    </div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] mb-1 ${c.def.accentClass}`}>{c.def.kicker}</p>
                                    <h3 className="font-heading font-bold text-base text-foreground tracking-tight mb-1.5 leading-tight">{c.def.title}</h3>
                                    <p className="text-xs text-muted-foreground leading-[1.55] line-clamp-2 mb-4">{description}</p>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-gold-dark transition-colors">
                                      View {c.items.length} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </section>
                        )}

                        {/* Editor's spotlight — single line, no marketing card */}
                        {appSection === "browse" && viewMode === "grid" && sections.hero.length > 0 && (
                          <button
                            onClick={() => setOpenDetail(sections.hero[0])}
                            className="group w-full flex items-baseline justify-between gap-4 py-3 border-y border-border/60 hover:border-gold/40 transition-colors text-left"
                          >
                            <div className="flex items-baseline gap-3 min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark shrink-0">Top match</span>
                              <span className="font-heading font-semibold text-foreground truncate group-hover:text-gold-dark transition-colors">{sections.hero[0].scholarship_name}</span>
                              <span className="hidden sm:inline text-xs text-muted-foreground truncate">{sections.hero[0].provider_name}</span>
                            </div>
                            <span className="flex items-baseline gap-2 shrink-0">
                              <span className="font-bold tabular-nums text-foreground">{sections.hero[0].match}</span>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-gold-dark group-hover:translate-x-0.5 transition-all" />
                            </span>
                          </button>
                        )}

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
                          });

                          if (viewMode === "list") {
                            const sortBtn = (label: string, key: SortBy) => {
                              const active = sortBy === key;
                              return (
                                <button
                                  onClick={() => setSortBy(key)}
                                  className={`text-left transition-colors ${active ? "text-foreground" : "hover:text-foreground"}`}
                                >
                                  {label}{active && <span className="ml-1 text-gold-dark">↓</span>}
                                </button>
                              );
                            };
                            return (
                              <div className="bg-card border border-border/70 rounded-2xl overflow-hidden">
                                {/* Sortable column headers (desktop) */}
                                <div className="hidden sm:grid grid-cols-[44px,minmax(0,2fr),minmax(0,1.2fr),minmax(0,1fr),auto] items-center gap-4 px-4 py-2.5 border-b border-border bg-canvas-soft/50 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  <span className="text-center">{sortBtn("Score", "match")}</span>
                                  <span>Scholarship</span>
                                  <span>{sortBtn("Award · Deadline", "deadline")}</span>
                                  <span>Status</span>
                                  <span className="text-right pr-2">Actions</span>
                                </div>
                                {filtered.map((s, i) => <ScholarRow {...cardProps(s, i)} />)}
                              </div>
                            );
                          }

                          if (viewMode === "timeline") {
                            return (
                              <TimelineView
                                items={filtered}
                                onSelect={(s) => setOpenDetail(s)}
                                openDetail={openDetail}
                                shortlist={shortlist}
                                toggleBookmark={toggleBookmark}
                                statusMap={statusMap}
                                setStatus={setStatus}
                                hidden={hidden}
                                toggleHide={toggleHide}
                                compareSet={compareSet}
                                toggleCompare={toggleCompare}
                              />
                            );
                          }

                          // Grid view — keep sectioned rendering (Featured + Strong + Competitive + Stretch)
                          return (
                            <>
                              {sections.strong.length > 0 && (
                                <section>
                                  <SectionHeader kicker="Closely aligned" title="Strongest fits with your profile" subtitle="These hit on multiple dimensions — academics, field, eligibility, and budget."
                                    count={sections.strong.length} accentClass="text-gold-dark dark:text-gold" />
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                                    {sections.strong.map((s, i) => <ScholarCard {...cardProps(s, i)} />)}
                                  </div>
                                </section>
                              )}

                              {sections.competitive.length > 0 && (
                                <section>
                                  <SectionHeader kicker="Aligned" title="Competitive matches" subtitle="A strong, well-targeted application makes these very achievable."
                                    count={sections.competitive.length} accentClass="text-primary dark:text-primary-bright" />
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                                    {sections.competitive.map((s, i) => <ScholarCard {...cardProps(s, i)} />)}
                                  </div>
                                </section>
                              )}

                              {sections.stretch.length > 0 && (
                                <section>
                                  <SectionHeader kicker="Worth exploring" title="More to consider" subtitle="Selective fits worth a quick scan — review the requirements and decide."
                                    count={sections.stretch.length} accentClass="text-muted-foreground" />
                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr opacity-90">
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

              <Footer language={language} />
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
                const rows: { label: string; render: (s: Scored) => React.ReactNode }[] = [
                  { label: "Match", render: s => <span className="font-bold text-lg tabular-nums text-foreground">{s.match}<span className="text-muted-foreground/60 text-sm font-normal">/100</span></span> },
                  { label: "Tier", render: s => {
                      const t = TIER[s.priority];
                      return <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${t.textLight}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />{t.label}
                      </span>;
                    }
                  },
                  { label: "Selectivity", render: s => <SelectivityChip level={s.selectivity} /> },
                  { label: "Award", render: s => s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—" },
                  { label: "Total value", render: s => s.estimated_total_value_usd ? <span className="text-gold-dark font-bold">{fmtValue(s.estimated_total_value_usd)}</span> : "—" },
                  { label: "Deadline", render: s => {
                      const dl = deadlineDisplay(s.application_deadline);
                      return <span className={dl.cls}>{dateOnly(s.application_deadline) || dl.text} {s.application_deadline && <span className="text-muted-foreground/70 text-xs ml-1">({dl.text})</span>}</span>;
                    }
                  },
                  { label: "Min GPA", render: s => s.min_gpa != null ? `≥ ${s.min_gpa}/${s.gpa_scale ?? 4.0}` : <span className="text-muted-foreground/60">—</span> },
                  { label: "Min IELTS", render: s => s.min_ielts != null ? `≥ ${s.min_ielts}` : <span className="text-muted-foreground/60">—</span> },
                  { label: "Min TOEFL", render: s => s.min_toefl != null ? `≥ ${s.min_toefl}` : <span className="text-muted-foreground/60">—</span> },
                  { label: "Min SAT", render: s => s.min_sat != null ? `≥ ${s.min_sat}` : <span className="text-muted-foreground/60">—</span> },
                  { label: "Eligibility", render: s => isInclusive(s.citizenship_requirements) ? <span className="text-success">Open to all</span> : (s.citizenship_requirements || <span className="text-muted-foreground/60">—</span>) },
                  { label: "Degree levels", render: s => s.target_degree_level?.join(", ") || <span className="text-muted-foreground/60">—</span> },
                  { label: "Fields funded", render: s => s.target_fields?.length ? s.target_fields.slice(0, 3).join(", ") + (s.target_fields.length > 3 ? `, +${s.target_fields.length - 3}` : "") : <span className="text-muted-foreground/60">—</span> },
                  { label: "Application fee", render: s => s.application_fee_text || <span className="text-muted-foreground/60">—</span> },
                  { label: "Effort level", render: s => s.effort_level ? <span className="capitalize">{s.effort_level}</span> : <span className="text-muted-foreground/60">—</span> },
                  { label: "Essay required", render: s => s.essay_required ? <span className="text-warning">Yes</span> : <span className="text-success">No</span> },
                  { label: "Interview", render: s => s.interview_required ? <span className="text-warning">Yes</span> : <span className="text-success">No</span> },
                  { label: "Rec letters", render: s => s.recommendation_letters_required ?? <span className="text-muted-foreground/60">—</span> },
                  { label: "Partner unis", render: s => s.partner_universities?.length ?? <span className="text-muted-foreground/60">—</span> },
                ];

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground py-3 pr-4 align-top w-[120px] sticky left-0 bg-background z-10">Field</th>
                          {items.map(s => {
                            const flag = FLAGS[s.host_country || ""] ?? "🌍";
                            return (
                              <th key={s.scholarship_id} className="text-left p-4 align-top min-w-[260px] border-l border-border/60">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <span className="text-2xl shrink-0">{flag}</span>
                                  <button
                                    onClick={() => toggleCompare(s.scholarship_id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1"
                                    aria-label="Remove from compare"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <h3 className="font-heading font-bold text-base text-foreground tracking-tight leading-tight line-clamp-2 mb-1">
                                  {s.scholarship_name}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
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
                        {rows.map((r, i) => (
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
                const flag = FLAGS[s.host_country || ""] ?? "🌍";
                const dl = deadlineDisplay(s.application_deadline);
                return (
                  <button key={s.scholarship_id}
                    onClick={() => { setOpenDetail(s); setShortlistOpen(false); }}
                    className="w-full text-left bg-card border border-border rounded-2xl p-3.5 hover:border-gold/40 hover:shadow-md transition-all flex items-start gap-3 group">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tier.grad} flex items-center justify-center text-xl shrink-0`}>{flag}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-sm text-foreground line-clamp-1">{s.scholarship_name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-bold text-foreground bg-muted px-2 py-0.5 rounded-md tabular-nums">{s.match}% match</span>
                        <span className={`text-[11px] font-medium ${dl.cls}`}>· {dl.text}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        />
      </div>
    </div>
  );
};

export default Discover;
