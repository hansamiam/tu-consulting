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
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, CheckCircle2, AlertTriangle, ExternalLink,
  BookmarkCheck, Bookmark, ChevronLeft, ChevronDown, Zap, RefreshCw,
  Lightbulb, X, SlidersHorizontal, Filter, Search, Trophy,
  Target, Flame, Layers, Users, Globe2, FileText, Languages,
  CreditCard, AlertOctagon, UserCheck,
} from "lucide-react";
import { getStoredProfile, saveProfile } from "@/components/discover/DiscoverProfileGate";

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

const scoreScholarship = (s: Scholarship, p: Profile): Scored => {
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

  if (eligibility === "likely" && match >= 70) eligibility = "eligible";
  match = Math.max(0, Math.min(100, Math.round(match)));

  const priority: Scored["priority"] =
    eligibility === "not_eligible" ? "low_priority" :
    match >= 75 ? "strong_match" : match >= 55 ? "competitive" : "low_priority";

  return { ...s, match, eligibility, priority, reward, effort, selectivity, fieldMatch: fm, reasons, warnings };
};

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
  very_high: "Highly selective", high: "Selective", medium: "Moderate", low: "Open", unknown: "—",
};

const WIZARD_STEPS = 4;
const DEFAULT_WIZARD: WizardData = { fullName: "", email: "", nationality: "", customNationality: "", degree: "", field: "", gpa: "", gpaScale: "4.0", ielts: "", budget: "low" };
const DEFAULT_FILTERS: FilterState = { search: "", coverage: "all", degree: "all", effort: "all", field: "all", selectivity: "all", hostCountry: "all", onlyEligible: false, closingSoon: false, onlyShortlisted: false };
const COVERAGE_LABEL: Record<string, string> = { full_ride: "Full ride", tuition_only: "Tuition", stipend: "Stipend" };

const fmtValue = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

const deadlineDisplay = (d: string | null) => {
  if (!d) return { text: "Rolling", cls: "text-foreground/40", urgent: false };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: "Closed", cls: "text-foreground/30 line-through", urgent: false };
  if (days <= 30) return { text: `${days} days`, cls: "text-destructive font-semibold", urgent: true };
  if (days <= 90) return { text: `${days} days`, cls: "text-warning font-medium", urgent: true };
  return { text: `${Math.ceil(days / 30)} months`, cls: "text-foreground/60", urgent: false };
};

/* Tier — strict navy/gold palette */
const TIER = {
  strong_match: {
    label: "Strong match",
    dot: "bg-gold",
    text: "text-gold",
    textLight: "text-gold-dark dark:text-gold",
    grad: "from-gold via-gold-light to-gold",
    border: "border-gold/30",
  },
  competitive: {
    label: "Competitive",
    dot: "bg-primary-bright",
    text: "text-primary-foreground/85",
    textLight: "text-primary dark:text-primary-bright",
    grad: "from-primary via-primary-bright to-primary",
    border: "border-primary/25",
  },
  low_priority: {
    label: "Lower fit",
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

/* ─── Featured card (cinematic top pick) ─────────────────────────────── */
const FeaturedCard = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored; onSelect: () => void; isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
}) => {
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const [dc1, dc2] = dialColors(s.priority);
  const why = s.why_this_fits || s.reasons.slice(0, 2).join(" · ") || "";

  return (
    <Tilt intensity={2}>
      <motion.div
        initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl cursor-pointer group shadow-lg hover:shadow-xl transition-shadow"
        onClick={onSelect}
      >
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-primary to-navy-deep" />
        <span className="absolute -right-12 -top-12 text-[300px] opacity-[0.05] select-none pointer-events-none leading-none">{flag}</span>

        {/* Subtle gold wash */}
        <div className="absolute -top-1/3 left-1/4 w-1/2 h-2/3 rounded-full blur-[120px] opacity-25" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />

        <div className="relative px-7 py-9 sm:px-10 sm:py-11">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 backdrop-blur px-3.5 py-1.5 rounded-full">
              <Trophy className="h-3.5 w-3.5 text-gold" />
              <span className="text-gold text-[11px] font-semibold uppercase tracking-[0.18em]">Top match for you</span>
            </div>
            <button onClick={onBookmark} className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 backdrop-blur p-2.5 rounded-xl transition-colors">
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4 text-primary-foreground/70" />}
            </button>
          </div>

          <div className="grid sm:grid-cols-[auto,1fr] gap-7 items-center">
            <div className="relative shrink-0">
              <MatchDial value={s.match} size={148} stroke={8} gradId={`feat-${s.scholarship_id}`} color1={dc1} color2={dc2} delay={0.2} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-primary-foreground tabular-nums leading-none tracking-tight">{s.match}</span>
                <span className="text-primary-foreground/40 text-[10px] font-semibold uppercase tracking-[0.2em] mt-2">match</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-3xl">{flag}</span>
                <SelectivityChip level={s.selectivity} dark />
                {s.partner_universities && s.partner_universities.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-primary-foreground/70 font-medium">
                    <Users className="h-3 w-3" /> {s.partner_universities.length} partner unis
                  </span>
                )}
              </div>
              <h3 className="font-heading font-bold text-3xl sm:text-[34px] text-primary-foreground leading-[1.08] tracking-tight mb-2">{s.scholarship_name}</h3>
              <p className="text-primary-foreground/55 text-base mb-6">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>

              <div className="flex flex-wrap items-center gap-x-7 gap-y-3 mb-5">
                <div>
                  <div className="text-primary-foreground/40 text-[10px] font-semibold uppercase tracking-[0.18em] mb-1">Award</div>
                  <div className="text-primary-foreground text-[15px] font-semibold">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</div>
                </div>
                <div className="h-9 w-px bg-primary-foreground/15" />
                <div>
                  <div className="text-primary-foreground/40 text-[10px] font-semibold uppercase tracking-[0.18em] mb-1">Deadline</div>
                  <div className={`text-[15px] font-semibold ${dl.urgent ? "text-gold-light" : "text-primary-foreground/80"}`}>{dl.text}</div>
                </div>
                {s.estimated_total_value_usd ? (
                  <>
                    <div className="h-9 w-px bg-primary-foreground/15" />
                    <div>
                      <div className="text-gold/70 text-[10px] font-semibold uppercase tracking-[0.18em] mb-1">Total value</div>
                      <div className="text-gold-light text-[15px] font-bold">{fmtValue(s.estimated_total_value_usd)}</div>
                    </div>
                  </>
                ) : null}
              </div>

              {s.target_fields && s.target_fields.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {s.target_fields.slice(0, 4).map((f, i) => (
                    <span key={i} className="text-[11px] text-primary-foreground/65 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-md">{f}</span>
                  ))}
                  {s.target_fields.length > 4 && <span className="text-[11px] text-primary-foreground/40">+{s.target_fields.length - 4}</span>}
                </div>
              )}

              {why && (
                <p className="text-primary-foreground/75 text-[15px] leading-relaxed mb-7 max-w-2xl">
                  <span className="text-gold font-medium">Why this fits</span> · {why}
                </p>
              )}

              <Button variant="gold" size="lg" className="gap-2" onClick={e => { e.stopPropagation(); onSelect(); }}>
                Open application strategy <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </Tilt>
  );
};

/* ─── Standard scholarship card ──────────────────────────────────────── */
const ScholarCard = ({ s, onSelect, isBookmarked, onBookmark, index = 0 }: {
  s: Scored; onSelect: () => void; isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void; index?: number;
}) => {
  const tier = TIER[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const [dc1, dc2] = dialColors(s.priority);
  const why = s.why_this_fits || s.reasons.slice(0, 2).join(". ");

  return (
    <Tilt intensity={2}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden border border-border bg-card hover:border-gold/30 hover:shadow-md transition-all cursor-pointer group h-full"
        onClick={onSelect}
      >
        <div className={`h-[3px] bg-gradient-to-r ${tier.grad}`} />

        <div className="px-6 py-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className={`relative shrink-0 ${tier.textLight}`}>
              <MatchDial value={s.match} size={62} stroke={5} gradId={`d-${s.scholarship_id}`} color1={dc1} color2={dc2} delay={0.1} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-foreground tabular-nums leading-none">{s.match}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xl">{flag}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${tier.textLight}`}>{tier.label}</span>
              </div>
              <h3 className="font-heading font-bold text-base leading-snug text-foreground line-clamp-2 tracking-tight">{s.scholarship_name}</h3>
              <p className="text-xs text-muted-foreground mt-1 truncate">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={onBookmark} className="bg-muted/60 hover:bg-muted p-2 rounded-xl transition-colors shrink-0">
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>

          {/* Inline facts */}
          <div className="flex items-center justify-between gap-3 py-3.5 border-y border-border/60 mb-4">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">Award</div>
              <div className="text-sm font-semibold text-foreground truncate">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">Deadline</div>
              <div className={`text-sm ${dl.cls}`}>{dl.text}</div>
            </div>
          </div>

          {/* Selectivity + partner unis row */}
          <div className="flex items-center justify-between gap-3 mb-4 text-xs">
            <SelectivityChip level={s.selectivity} />
            {s.partner_universities && s.partner_universities.length > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> {s.partner_universities.length} unis
              </span>
            )}
          </div>

          {/* Field tags */}
          {s.target_fields && s.target_fields.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {s.target_fields.slice(0, 3).map((f, i) => (
                <span key={i} className="text-[11px] text-foreground/60 bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md">{f}</span>
              ))}
              {s.target_fields.length > 3 && <span className="text-[11px] text-muted-foreground self-center">+{s.target_fields.length - 3}</span>}
            </div>
          )}

          {/* Total value chip */}
          {s.estimated_total_value_usd && s.estimated_total_value_usd >= 5000 ? (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark dark:text-gold bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-full">
                <Sparkles className="h-3 w-3" /> {fmtValue(s.estimated_total_value_usd)} total value
              </span>
            </div>
          ) : null}

          {/* Why this fits — uses DB text when available */}
          {why && (
            <div className="mb-5 text-xs text-foreground/75 leading-relaxed line-clamp-3">
              <span className="font-semibold text-gold-dark dark:text-gold">Why this fits</span>
              <span className="text-muted-foreground"> · </span>
              {why}
            </div>
          )}

          {/* Warnings */}
          {s.warnings.length > 0 && s.eligibility !== "not_eligible" && (
            <div className="mb-4 text-xs text-warning flex items-start gap-1.5 leading-relaxed">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span className="line-clamp-2">{s.warnings[0]}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <button className="text-sm font-semibold text-foreground hover:text-gold-dark transition-colors flex items-center gap-1.5 group/cta" onClick={e => { e.stopPropagation(); onSelect(); }}>
              View strategy
              <ArrowRight className="h-3.5 w-3.5 group-hover/cta:translate-x-0.5 transition-transform" />
            </button>
            {s.official_url && (
              <a href={s.official_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                 className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Official <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </Tilt>
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
    { label: "Selectivity", key: "selectivity", opts: [{ v: "all", l: "Any selectivity" }, { v: "low", l: "Open / accessible" }, { v: "medium", l: "Moderate" }, { v: "high", l: "Selective" }, { v: "very_high", l: "Highly selective" }] },
    { label: "Effort", key: "effort", opts: [{ v: "all", l: "Any effort" }, { v: "low", l: "Quick to apply" }, { v: "medium", l: "Medium" }, { v: "high", l: "Heavy lift" }] },
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

/* ─── Detail Sheet ───────────────────────────────────────────────────── */
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark }: {
  s: Scored | null; open: boolean; onClose: () => void;
  isBookmarked: boolean; onBookmark: () => void;
}) => {
  if (!s) return null;
  const tier = TIER[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const [dc1, dc2] = dialColors(s.priority);
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto p-0">
        {/* Header */}
        <div className="relative bg-primary px-7 pt-8 pb-7 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-deep to-primary" />
          <div className="absolute -top-1/3 left-1/4 w-2/3 h-full rounded-full blur-[100px] opacity-20" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />
          <span className="absolute -right-6 -top-6 text-[200px] opacity-[0.06] select-none pointer-events-none leading-none">{flag}</span>
          <SheetHeader className="relative space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <MatchDial value={s.match} size={70} stroke={5} gradId={`sh-${s.scholarship_id}`} color1={dc1} color2={dc2} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-primary-foreground tabular-nums">{s.match}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{tier.label}</p>
                  </div>
                  <p className="text-primary-foreground/40 text-xs mt-1">
                    {s.eligibility === "eligible" ? "✓ You qualify on paper" : s.eligibility === "missing" ? "Near miss — close to threshold" : s.eligibility === "not_eligible" ? "Doesn't fit your profile" : "Likely fit"}
                  </p>
                </div>
              </div>
              <span className="text-3xl">{flag}</span>
            </div>
            <SheetTitle className="text-primary-foreground font-heading text-2xl leading-tight tracking-tight pt-1 text-left">{s.scholarship_name}</SheetTitle>
            <p className="text-primary-foreground/55 text-sm text-left">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
          </SheetHeader>
        </div>

        <div className="px-7 py-6 space-y-6 text-sm">
          {/* Why this fits — DB-authored when present */}
          {s.why_this_fits && (
            <section className="bg-gold/5 border border-gold/20 rounded-2xl p-5">
              <h4 className="text-xs font-semibold text-gold-dark dark:text-gold mb-2 flex items-center gap-2 uppercase tracking-[0.14em]">
                <Sparkles className="h-3.5 w-3.5" /> Why this fits you
              </h4>
              <p className="text-sm text-foreground/85 leading-relaxed">{s.why_this_fits}</p>
            </section>
          )}

          {/* Match reasons + warnings */}
          {(s.reasons.length > 0 || s.warnings.length > 0) && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Profile match</h4>
              <div className="space-y-2">
                {s.reasons.map((r, i) => (
                  <div key={`r${i}`} className="flex items-start gap-2 text-sm leading-relaxed text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />{r}
                  </div>
                ))}
                {s.warnings.map((w, i) => (
                  <div key={`w${i}`} className="flex items-start gap-2 text-sm leading-relaxed text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{w}
                  </div>
                ))}
              </div>
            </section>
          )}

          <Separator />

          {/* Requirements */}
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Requirements</h4>
            <div className="bg-muted/40 rounded-2xl p-4 space-y-2.5 text-sm">
              {s.application_deadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className={`font-semibold ${dl.cls}`}>
                    {new Date(s.application_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    <span className="ml-1.5 font-normal opacity-70">({dl.text})</span>
                  </span>
                </div>
              )}
              {s.deadline_type && <div className="flex justify-between"><span className="text-muted-foreground">Deadline type</span><span className="font-medium capitalize">{s.deadline_type}</span></div>}
              {s.min_gpa != null && <div className="flex justify-between"><span className="text-muted-foreground">Min GPA</span><span className="font-semibold">≥ {s.min_gpa}/{s.gpa_scale ?? 4.0}</span></div>}
              {s.min_ielts != null && <div className="flex justify-between"><span className="text-muted-foreground">Min IELTS</span><span className="font-semibold">≥ {s.min_ielts}</span></div>}
              {s.min_toefl != null && <div className="flex justify-between"><span className="text-muted-foreground">Min TOEFL</span><span className="font-semibold">≥ {s.min_toefl}</span></div>}
              {s.min_sat != null && <div className="flex justify-between"><span className="text-muted-foreground">Min SAT</span><span className="font-semibold">≥ {s.min_sat}</span></div>}
              {s.language_requirements && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" />Language</span>
                  <span className="font-medium text-right">{s.language_requirements}</span>
                </div>
              )}
              {s.citizenship_requirements && <div className="flex flex-col gap-0.5"><span className="text-muted-foreground">Citizenship</span><span className="font-medium">{s.citizenship_requirements}</span></div>}
              {s.target_fields && s.target_fields.length > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Fields funded</span>
                  <span className="font-medium text-right">{s.target_fields.join(", ")}</span>
                </div>
              )}
            </div>
          </section>

          {/* Application logistics */}
          {(s.application_platform || s.application_fee_text || s.required_documents) && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Application</h4>
              <div className="bg-muted/40 rounded-2xl p-4 space-y-2.5 text-sm">
                {s.application_platform && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Platform</span>
                    <span className="font-medium text-right">{s.application_platform}</span>
                  </div>
                )}
                {s.application_fee_text && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />Fee</span>
                    <span className="font-medium text-right">{s.application_fee_text}</span>
                  </div>
                )}
                {s.separate_application_required && (
                  <div className="flex items-center gap-2 text-warning text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" />Separate application required (not auto-considered)
                  </div>
                )}
                {s.required_documents && s.required_documents.length > 0 && (
                  <div>
                    <div className="text-muted-foreground mb-1.5">Required documents</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {s.required_documents.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/80">
                          <div className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />{d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                  {s.essay_required && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-warning" />Essay required</span>}
                  {s.interview_required && <span>Interview required</span>}
                  {(s.recommendation_letters_required ?? 0) > 0 && <span>{s.recommendation_letters_required} recommendation letter{(s.recommendation_letters_required ?? 0) > 1 ? "s" : ""}</span>}
                </div>
              </div>
            </section>
          )}

          {/* Ideal candidate */}
          {s.ideal_candidate_profile && (
            <section className="bg-primary/[0.03] border border-primary/15 rounded-2xl p-5">
              <h4 className="text-xs font-semibold text-primary dark:text-primary-bright mb-2 flex items-center gap-2 uppercase tracking-[0.14em]">
                <UserCheck className="h-3.5 w-3.5" /> Ideal candidate
              </h4>
              <p className="text-sm text-foreground/85 leading-relaxed">{s.ideal_candidate_profile}</p>
            </section>
          )}

          {/* Common rejection reasons */}
          {s.common_rejection_reasons && (
            <section className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
              <h4 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-2 uppercase tracking-[0.14em]">
                <AlertOctagon className="h-3.5 w-3.5" /> Why people get rejected
              </h4>
              <p className="text-sm text-foreground/85 leading-relaxed">{s.common_rejection_reasons}</p>
            </section>
          )}

          {/* Weak candidate warning */}
          {s.weak_candidate_warning && (
            <section className="border-l-2 border-warning bg-warning/5 rounded-r-2xl px-5 py-4">
              <p className="text-xs font-semibold text-warning mb-1 uppercase tracking-[0.14em]">Don't apply if...</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{s.weak_candidate_warning}</p>
            </section>
          )}

          {/* How to win */}
          {s.how_to_win && (
            <section className="bg-gold/5 border border-gold/20 rounded-2xl p-5">
              <h4 className="text-xs font-semibold text-gold-dark dark:text-gold mb-2 flex items-center gap-2 uppercase tracking-[0.14em]">
                <Lightbulb className="h-3.5 w-3.5" /> How to win
              </h4>
              <p className="text-sm text-foreground/85 leading-relaxed">{s.how_to_win}</p>
            </section>
          )}

          {/* Strategy notes */}
          {s.strategy_notes && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Strategy</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{s.strategy_notes}</p>
            </section>
          )}

          {/* Start here */}
          {s.what_to_prepare_first && (
            <section className="border-l-2 border-l-gold bg-muted/30 rounded-r-2xl px-5 py-4">
              <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-[0.14em]">Start here</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{s.what_to_prepare_first}</p>
            </section>
          )}

          {/* Risk note */}
          {s.risk_note && (
            <section className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
              <p className="text-sm font-semibold text-destructive mb-1 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Watch out</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{s.risk_note}</p>
            </section>
          )}

          {/* Partner universities */}
          {s.partner_universities && s.partner_universities.length > 0 && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> Partner universities · {s.partner_universities.length}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {s.partner_universities.slice(0, 12).map((u, i) => (
                  <span key={i} className="text-xs bg-muted/60 border border-border px-2.5 py-1 rounded-md text-foreground/80">{u}</span>
                ))}
                {s.partner_universities.length > 12 && (
                  <span className="text-xs text-muted-foreground self-center">+{s.partner_universities.length - 12} more</span>
                )}
              </div>
            </section>
          )}

          {/* Best for tags */}
          {s.best_for_tags && s.best_for_tags.length > 0 && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Best for</h4>
              <div className="flex flex-wrap gap-1.5">
                {s.best_for_tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-gold/10 text-gold-dark dark:text-gold border border-gold/20 px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Prep CTA */}
          {(s.min_ielts || s.min_sat) && (
            <div className="bg-muted/40 border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-foreground/80">Need to hit those scores?</p>
              <Button size="sm" variant="outline" asChild className="shrink-0">
                <Link to="/prep">Open Prep <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
              </Button>
            </div>
          )}

          <div className="flex gap-2 pb-3">
            <Button variant="outline" size="default" className="flex-1" onClick={onBookmark}>
              {isBookmarked ? <><BookmarkCheck className="h-4 w-4 mr-2 text-gold" />Saved</> : <><Bookmark className="h-4 w-4 mr-2" />Save to shortlist</>}
            </Button>
            {s.official_url && (
              <Button size="default" asChild className="flex-1">
                <a href={s.official_url} target="_blank" rel="noopener noreferrer">
                  Official page <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ─── Inline animated stat ───────────────────────────────────────────── */
const InlineStat = ({ label, value, color = "text-primary-foreground", isMoney = false, delay = 0, icon: Icon }: {
  label: string; value: number; color?: string; isMoney?: boolean; delay?: number; icon: React.ComponentType<{ className?: string }>;
}) => {
  const animated = useCountUp(value, 1300);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-3">
      <Icon className={`h-4 w-4 ${color} opacity-60`} />
      <div>
        <div className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${color} tracking-tight`}>{isMoney ? fmtValue(animated) : animated}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/40 mt-1.5">{label}</div>
      </div>
    </motion.div>
  );
};

/* ─── Section header ─────────────────────────────────────────────────── */
const SectionHeader = ({ kicker, title, subtitle, count, accentClass }: {
  kicker: string; title: string; subtitle: string; count: number; accentClass: string;
}) => (
  <Reveal className="flex items-end justify-between gap-4 mb-7 pb-4 border-b border-border/60">
    <div>
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${accentClass} mb-3`}>
        <span className={`h-1.5 w-1.5 rounded-full ${accentClass.replace("text-", "bg-")}`} />
        {kicker}
      </div>
      <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground leading-tight tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
    </div>
    <span className="text-2xl font-bold text-foreground/30 tabular-nums whitespace-nowrap">{count.toString().padStart(2, "0")}</span>
  </Reveal>
);

/* ─── Main ───────────────────────────────────────────────────────────── */
interface Props { language?: "en" | "ru" }

const Discover = ({ language = "en" }: Props) => {
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({ country: "", degree: "", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" });
  const [phase, setPhase] = useState<Phase>(() => getStoredProfile()?.nationality ? "results" : "landing");
  const [wizardStep, setWizardStep] = useState(0);
  const [wiz, setWiz] = useState<WizardData>(DEFAULT_WIZARD);
  const [openDetail, setOpenDetail] = useState<Scored | null>(null);
  const [shortlist, setShortlist] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("tu_shortlist") || "[]")); }
    catch { return new Set(); }
  });
  const [analysisStep, setAnalysisStep] = useState(0);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortBy>("match");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);

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

  const toggleBookmark = (id: string) => {
    setShortlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("tu_shortlist", JSON.stringify([...next]));
      return next;
    });
  };

  const completeWizard = () => {
    const country = wiz.nationality === "other" ? wiz.customNationality : wiz.nationality;
    const p: Profile = { country, degree: wiz.degree, gpa: wiz.gpa, gpaScale: wiz.gpaScale, ielts: wiz.ielts, sat: "", field: wiz.field, budget: wiz.budget };
    setProfile(p);
    saveProfile({ fullName: wiz.fullName, email: wiz.email, nationality: country, targetDegree: wiz.degree, gpa: wiz.gpa, ieltsScore: wiz.ielts, budgetRange: wiz.budget === "low" ? "0-5000" : "15000+", fieldOfInterest: wiz.field });
    setAnalysisStep(0); setPhase("analyzing");
  };

  const resetProfile = () => { setWiz(DEFAULT_WIZARD); setWizardStep(0); setPhase("wizard"); };

  const ranked = useMemo(() => {
    const p = profile.country || profile.degree ? profile : { country: "", degree: "master\'s", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" };
    return rows.map(r => scoreScholarship(r, p)).sort((a, b) => {
      const e = { eligible: 0, likely: 1, missing: 2, not_eligible: 3 };
      if (e[a.eligibility] !== e[b.eligibility]) return e[a.eligibility] - e[b.eligibility];
      return b.match - a.match;
    });
  }, [rows, profile]);

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
    if (sortBy === "deadline") return [...list].sort((a, b) => { if (!a.application_deadline) return 1; if (!b.application_deadline) return -1; return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime(); });
    if (sortBy === "value") return [...list].sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0));
    if (sortBy === "effort") { const o: Record<string, number> = { low: 0, medium: 1, high: 2 }; return [...list].sort((a, b) => (o[a.effort] ?? 1) - (o[b.effort] ?? 1)); }
    if (sortBy === "selectivity") { const o: Record<string, number> = { low: 0, medium: 1, high: 2, very_high: 3, unknown: 4 }; return [...list].sort((a, b) => (o[a.selectivity] ?? 4) - (o[b.selectivity] ?? 4)); }
    return list;
  }, [ranked, filters, sortBy, shortlist]);

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

  const activeFiltersCount = [filters.search !== "", filters.coverage !== "all", filters.degree !== "all", filters.effort !== "all", filters.selectivity !== "all", filters.field !== "all", filters.hostCountry !== "all", filters.onlyEligible, filters.closingSoon, filters.onlyShortlisted].filter(Boolean).length;

  const analysisTexts = [
    `Scanning ${rows.length || 75} verified scholarships`,
    `Filtering by nationality${wiz.nationality ? `: ${wiz.nationality}` : ""}`,
    `Matching ${wiz.degree || "your degree"} programs${wiz.field ? ` in ${wiz.field}` : ""}`,
    "Evaluating academic thresholds and selectivity",
    "Ranking your best opportunities",
  ];

  const dark = phase === "landing" || phase === "wizard" || phase === "analyzing";
  const totalVerified = rows.length || 75;

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
                  Answer four questions. We rank every scholarship in our database against your profile and tell you exactly where you have a real shot.
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

          {/* ══ RESULTS ══ */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
              {/* ── Hero briefing (navy) ── */}
              <section className="relative bg-primary pt-12 pb-14 sm:pt-20 sm:pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-primary to-navy-deep" />
                <div className="absolute -top-1/3 left-1/4 w-[40vw] h-[40vw] rounded-full blur-[140px] opacity-15" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 70%)" }} />
                <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "32px 32px" }} />

                <div className="max-w-7xl mx-auto px-6 sm:px-8 relative">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                    {wiz.fullName && <p className="text-gold text-sm font-semibold tracking-[0.06em] mb-4 uppercase">Welcome back, {wiz.fullName}</p>}
                    <h1 className="font-heading text-[clamp(2.25rem,5.5vw,4.5rem)] font-bold text-primary-foreground leading-[1.05] tracking-[-0.025em] max-w-4xl">
                      {loading ? "Loading your matches..." : (
                        <>
                          You have <span className="text-gold tabular-nums">{stats.strong + stats.competitive}</span> real opportunities.
                        </>
                      )}
                    </h1>
                    <p className="text-primary-foreground/55 text-lg sm:text-xl max-w-2xl mt-5 leading-relaxed font-light">
                      Based on your profile, we ranked all <span className="text-primary-foreground font-medium tabular-nums">{rows.length}</span> scholarships in our database. Here's where you have a real shot.
                    </p>

                    <div className="flex flex-wrap gap-2 mt-7">
                      {[profile.country, profile.degree, profile.field, profile.gpa ? `GPA ${profile.gpa}/${profile.gpaScale}` : null, profile.ielts ? `IELTS ${profile.ielts}` : null].filter(Boolean).map(chip => (
                        <span key={chip} className="text-xs bg-primary-foreground/[0.05] text-primary-foreground/70 border border-primary-foreground/12 backdrop-blur-md px-3 py-1.5 rounded-full font-medium">{chip}</span>
                      ))}
                      <button onClick={resetProfile} className="text-xs text-primary-foreground/35 hover:text-gold transition-colors flex items-center gap-1.5 px-2.5 py-1.5 font-medium">
                        <RefreshCw className="h-3 w-3" /> Update profile
                      </button>
                    </div>
                  </motion.div>

                  {!loading && (
                    <Reveal delay={0.15} y={28} className="mt-12 pt-10 border-t border-primary-foreground/8">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-7">
                        <InlineStat label="Strong matches" value={stats.strong} color="text-gold" icon={Trophy} delay={0.05} />
                        <InlineStat label="Worth a shot" value={stats.competitive} color="text-primary-foreground" icon={Target} delay={0.1} />
                        <InlineStat label="Closing soon" value={stats.closing} color="text-primary-foreground" icon={Flame} delay={0.15} />
                        <InlineStat label="Funding pool" value={stats.totalValue} color="text-gold" icon={Sparkles} isMoney delay={0.2} />
                      </div>
                    </Reveal>
                  )}

                  {!loading && ranked.length > 0 && (
                    <Reveal delay={0.3} className="mt-10 pt-8 border-t border-primary-foreground/8">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-primary-foreground/35 text-[10px] uppercase tracking-[0.22em] mb-1 font-semibold">Match landscape</p>
                          <p className="text-primary-foreground/60 text-xs">Each bar is one scholarship · click to view</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-[11px] text-primary-foreground/40 font-medium">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" />Strong</span>
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-bright" />Competitive</span>
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-foreground/30" />Lower</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-[2px] h-20 overflow-hidden rounded-2xl bg-primary-foreground/[0.025] p-2">
                        {ranked.map((s, i) => (
                          <motion.div
                            key={s.scholarship_id}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${Math.max(s.match, 8)}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.012, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex-1 min-w-[3px] rounded-t cursor-pointer transition-all opacity-80 hover:opacity-100 hover:scale-y-110 origin-bottom ${
                              s.priority === "strong_match" ? "bg-gradient-to-t from-gold-dark to-gold-light" :
                              s.priority === "competitive" ? "bg-gradient-to-t from-primary-bright/80 to-primary-bright" :
                              "bg-gradient-to-t from-primary-foreground/20 to-primary-foreground/35"
                            }`}
                            onClick={() => setOpenDetail(s)}
                            title={`${s.scholarship_name} — ${s.match}%`}
                          />
                        ))}
                      </div>
                    </Reveal>
                  )}
                </div>
              </section>

              {/* Sticky toolbar */}
              <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 py-3.5 flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search scholarships, providers, countries..."
                      className="pl-10 h-11 text-sm rounded-xl" />
                    {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <Button variant="outline" size="default" className="lg:hidden gap-1.5 h-11 rounded-xl" onClick={() => setFiltersOpen(true)}>
                    <Filter className="h-4 w-4" />Filters{activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-gold/20 text-gold-dark dark:text-gold border-0 ml-0.5">{activeFiltersCount}</Badge>}
                  </Button>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                    <SelectTrigger className="w-[170px] h-11 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">Best match</SelectItem>
                      <SelectItem value="deadline">Deadline first</SelectItem>
                      <SelectItem value="value">Highest value</SelectItem>
                      <SelectItem value="effort">Easiest first</SelectItem>
                      <SelectItem value="selectivity">Least selective</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground hidden sm:inline ml-auto tabular-nums">{filtered.length} of {ranked.length}</span>
                </div>
              </div>

              {/* Results body */}
              <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-16">
                <div className="flex gap-10">
                  <aside className="hidden lg:block w-[230px] shrink-0">
                    <div className="sticky top-24 bg-card border border-border rounded-3xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" />Refine</h3>
                        {activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-gold/20 text-gold-dark dark:text-gold border-0">{activeFiltersCount}</Badge>}
                      </div>
                      <FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} hostCountries={hostCountries} fieldsAvailable={fieldsAvailable} />
                    </div>
                  </aside>

                  <main className="flex-1 min-w-0">
                    {loading ? (
                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
                      <div className="space-y-16">
                        {sections.hero.length > 0 && (
                          <section>
                            <Reveal y={20}>
                              <p className="text-gold-dark dark:text-gold text-[11px] font-semibold uppercase tracking-[0.22em] mb-4 flex items-center gap-2">
                                <span className="h-px w-6 bg-gold" /> Top match for you
                              </p>
                            </Reveal>
                            <FeaturedCard
                              s={sections.hero[0]}
                              onSelect={() => setOpenDetail(sections.hero[0])}
                              isBookmarked={shortlist.has(sections.hero[0].scholarship_id)}
                              onBookmark={e => { e.stopPropagation(); toggleBookmark(sections.hero[0].scholarship_id); }}
                            />
                          </section>
                        )}

                        {sections.strong.length > 0 && (
                          <section>
                            <SectionHeader kicker="Strong matches" title="Where you have a real shot" subtitle="High alignment with your profile and goals."
                              count={sections.strong.length} accentClass="text-gold-dark dark:text-gold" />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-fr">
                              {sections.strong.map((s, i) => (
                                <ScholarCard key={s.scholarship_id} s={s} index={i}
                                  onSelect={() => setOpenDetail(s)}
                                  isBookmarked={shortlist.has(s.scholarship_id)}
                                  onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                              ))}
                            </div>
                          </section>
                        )}

                        {sections.competitive.length > 0 && (
                          <section>
                            <SectionHeader kicker="Competitive" title="Worth a shot" subtitle="Achievable with a strong, well-targeted application."
                              count={sections.competitive.length} accentClass="text-primary dark:text-primary-bright" />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-fr">
                              {sections.competitive.map((s, i) => (
                                <ScholarCard key={s.scholarship_id} s={s} index={i}
                                  onSelect={() => setOpenDetail(s)}
                                  isBookmarked={shortlist.has(s.scholarship_id)}
                                  onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                              ))}
                            </div>
                          </section>
                        )}

                        {sections.stretch.length > 0 && (
                          <section>
                            <SectionHeader kicker="Stretch" title="Long shots" subtitle="Lower fit — apply only if you have bandwidth."
                              count={sections.stretch.length} accentClass="text-muted-foreground" />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-fr opacity-90">
                              {sections.stretch.map((s, i) => (
                                <ScholarCard key={s.scholarship_id} s={s} index={i}
                                  onSelect={() => setOpenDetail(s)}
                                  isBookmarked={shortlist.has(s.scholarship_id)}
                                  onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                              ))}
                            </div>
                          </section>
                        )}
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
                <p className="text-sm text-muted-foreground text-center py-12">No saved scholarships yet.</p>
              )}
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

        <DetailSheet s={openDetail} open={!!openDetail} onClose={() => setOpenDetail(null)}
          isBookmarked={openDetail ? shortlist.has(openDetail.scholarship_id) : false}
          onBookmark={() => openDetail && toggleBookmark(openDetail.scholarship_id)} />
      </div>
    </div>
  );
};

export default Discover;
