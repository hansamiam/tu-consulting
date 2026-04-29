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
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, CheckCircle2, AlertTriangle, ExternalLink,
  BookmarkCheck, Bookmark, ChevronLeft, ChevronRight, Zap, RefreshCw,
  Star, Lightbulb, X, SlidersHorizontal, Filter, Search, Trophy,
  Target, Flame, Globe2, TrendingUp, Layers,
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
  citizenship_requirements: string | null; application_deadline: string | null;
  deadline_type: string | null; required_documents: string[] | null;
  essay_required: boolean | null; recommendation_letters_required: number | null;
  interview_required: boolean | null; separate_application_required: boolean | null;
  selectivity_level: string | null; effort_level: string | null; effort_reason: string | null;
  ideal_candidate_profile: string | null; common_rejection_reasons: string | null;
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
  reasons: string[];
}

interface WizardData {
  fullName: string; email: string; nationality: string; customNationality: string;
  degree: string; field: string; gpa: string; gpaScale: string; ielts: string; budget: string;
}

interface FilterState {
  search: string; coverage: string; degree: string; effort: string;
  onlyEligible: boolean; closingSoon: boolean; onlyShortlisted: boolean;
}

type Phase = "landing" | "wizard" | "analyzing" | "results";
type SortBy = "match" | "deadline" | "value" | "effort";

/* ─── Scoring ────────────────────────────────────────────────────────── */
const normalizeGpa = (gpa: number, scale: number) => {
  if (!gpa || !scale) return 0;
  if (scale <= 5.5) return (gpa / scale) * 4.0;
  return (gpa / 100) * 4.0;
};

const scoreScholarship = (s: Scholarship, p: Profile): Scored => {
  const reasons: string[] = [];
  let match = 50;
  let eligibility: Scored["eligibility"] = "likely";
  if (s.eligible_countries && p.country) {
    const list = s.eligible_countries.map(c => c.toLowerCase());
    const open = list.some(c => c.includes("all countries") || c.includes("all nationalities"));
    const matched = open || list.some(c => c.includes(p.country.toLowerCase()));
    if (matched) { match += 15; reasons.push(`Open to ${p.country} nationals`); }
    else { eligibility = "not_eligible"; match -= 40; reasons.push(`Not open to ${p.country} nationals`); }
  }
  if (s.target_degree_level && p.degree) {
    if (s.target_degree_level.some(d => d.toLowerCase() === p.degree.toLowerCase())) {
      match += 10; reasons.push(`Matches ${p.degree} level`);
    } else { eligibility = "not_eligible"; match -= 25; }
  }
  if (s.min_gpa && p.gpa) {
    const ug = normalizeGpa(parseFloat(p.gpa), parseFloat(p.gpaScale));
    const rg = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
    if (ug >= rg) { match += 15; reasons.push(`GPA meets ${s.min_gpa}/${s.gpa_scale ?? 4.0}`); }
    else if (ug >= rg - 0.3) { match += 5; reasons.push("GPA borderline"); if (eligibility !== "not_eligible") eligibility = "missing"; }
    else { match -= 20; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`GPA below ${s.min_gpa}/${s.gpa_scale ?? 4.0}`); }
  }
  if (s.min_ielts && p.ielts) {
    const u = parseFloat(p.ielts);
    if (u >= s.min_ielts) { match += 8; reasons.push(`IELTS ${u} ≥ required ${s.min_ielts}`); }
    else { match -= 10; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`IELTS ${u} below required ${s.min_ielts}`); }
  }
  const value = s.estimated_total_value_usd ?? 0;
  const reward: Scored["reward"] = value >= 80000 ? "high" : value >= 25000 ? "medium" : "low";
  if (s.coverage_type === "full_ride") match += 12;
  if (p.budget === "low" && reward === "high") { match += 6; reasons.push("High value — fits your funding need"); }
  const effort: Scored["effort"] = (s.effort_level as Scored["effort"]) ?? "medium";
  if (s.application_deadline) {
    const days = Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000);
    if (days > 0 && days < 60) match += 4;
  }
  if (eligibility === "likely" && match >= 70) eligibility = "eligible";
  match = Math.max(0, Math.min(100, Math.round(match)));
  const priority: Scored["priority"] =
    eligibility === "not_eligible" ? "low_priority" :
    match >= 75 ? "strong_match" : match >= 55 ? "competitive" : "low_priority";
  return { ...s, match, eligibility, priority, reward, effort, reasons };
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

const WIZARD_STEPS = 4;
const DEFAULT_WIZARD: WizardData = { fullName: "", email: "", nationality: "", customNationality: "", degree: "", field: "", gpa: "", gpaScale: "4.0", ielts: "", budget: "low" };
const DEFAULT_FILTERS: FilterState = { search: "", coverage: "all", degree: "all", effort: "all", onlyEligible: false, closingSoon: false, onlyShortlisted: false };
const COVERAGE_LABEL: Record<string, string> = { full_ride: "Full ride", tuition_only: "Tuition", stipend: "Stipend" };

const fmtValue = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

const deadlineDisplay = (d: string | null) => {
  if (!d) return { text: "Rolling", cls: "text-muted-foreground" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: "Closed", cls: "text-muted-foreground line-through" };
  if (days <= 30) return { text: `${days}d left`, cls: "text-red-500 font-bold" };
  if (days <= 90) return { text: `${days}d left`, cls: "text-amber-500 font-semibold" };
  return { text: `${Math.ceil(days / 30)} mo.`, cls: "text-muted-foreground" };
};

const TIER_STYLE = {
  strong_match: { grad: "from-emerald-500 via-teal-500 to-cyan-600", glow: "shadow-emerald-500/30", label: "Strong match", ring: "ring-emerald-400/40" },
  competitive:  { grad: "from-amber-500 via-orange-500 to-rose-500", glow: "shadow-amber-500/25",   label: "Competitive",   ring: "ring-amber-400/40"   },
  low_priority: { grad: "from-slate-500 via-slate-600 to-slate-700",  glow: "shadow-slate-500/15",   label: "Lower fit",      ring: "ring-slate-400/30"   },
};

/* ─── Animated count-up ──────────────────────────────────────────────── */
const useCountUp = (target: number, duration = 1100, enabled = true) => {
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

/* ─── 3D tilt wrapper ────────────────────────────────────────────────── */
const Tilt = ({ children, className = "", intensity = 6 }: { children: React.ReactNode; className?: string; intensity?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 22 });
  const sy = useSpring(y, { stiffness: 300, damping: 22 });
  const rotX = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── Aurora background ──────────────────────────────────────────────── */
const Aurora = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0" style={{ background: "hsl(210 70% 12%)" }} />
    <motion.div
      className="absolute -top-1/3 -left-1/4 w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-40"
      style={{ background: "radial-gradient(circle, hsl(42 90% 55%) 0%, transparent 60%)" }}
      animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0] }}
      transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full blur-[140px] opacity-35"
      style={{ background: "radial-gradient(circle, hsl(180 70% 50%) 0%, transparent 60%)" }}
      animate={{ x: [0, -50, 30, 0], y: [0, 40, -30, 0] }}
      transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/3 left-1/3 w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-25"
      style={{ background: "radial-gradient(circle, hsl(280 80% 60%) 0%, transparent 60%)" }}
      animate={{ x: [0, 40, -40, 0], y: [0, -30, 30, 0] }}
      transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
  </div>
);

/* ─── Floating mock cards (landing decoration) ───────────────────────── */
const FloatingCards = () => {
  const cards = [
    { flag: "🇬🇧", title: "Chevening", val: "$80K", tier: "strong_match" as const, x: "8%", y: "18%", rot: -8, delay: 0 },
    { flag: "🇩🇪", title: "DAAD", val: "$45K", tier: "strong_match" as const, x: "82%", y: "14%", rot: 6, delay: 0.4 },
    { flag: "🇯🇵", title: "MEXT", val: "Full ride", tier: "competitive" as const, x: "6%", y: "70%", rot: 5, delay: 0.8 },
    { flag: "🇨🇦", title: "Vanier", val: "$150K", tier: "strong_match" as const, x: "84%", y: "66%", rot: -7, delay: 1.2 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {cards.map((c, i) => {
        const tier = TIER_STYLE[c.tier];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40, rotate: c.rot }}
            animate={{ opacity: 1, y: [0, -12, 0], rotate: c.rot }}
            transition={{ opacity: { delay: c.delay, duration: 0.6 }, y: { duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: c.delay }, rotate: { delay: c.delay, duration: 0.6 } }}
            className="absolute w-44"
            style={{ left: c.x, top: c.y }}
          >
            <div className={`bg-gradient-to-br ${tier.grad} rounded-2xl p-3 shadow-2xl ${tier.glow} backdrop-blur-sm border border-white/10`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{c.flag}</span>
                <span className="text-white/80 text-[9px] font-bold uppercase tracking-widest">{tier.label}</span>
              </div>
              <p className="text-white font-heading font-bold text-sm leading-tight">{c.title}</p>
              <p className="text-white/70 text-xs mt-0.5">{c.val}</p>
              <div className="mt-2 h-1 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-white/80" style={{ width: c.tier === "strong_match" ? "88%" : "62%" }} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ─── Animated radial match dial ─────────────────────────────────────── */
const MatchDial = ({ value, size = 88, stroke = 7, gradId, color1, color2 }: { value: number; size?: number; stroke?: number; gradId: string; color1: string; color2: string }) => {
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
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={`url(#${gradId})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * value) / 100 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
};

/* ─── Cinematic featured card ────────────────────────────────────────── */
const FeaturedCard = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored; onSelect: () => void; isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
}) => {
  const tier = TIER_STYLE[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const posReasons = s.reasons.filter(r => !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not open") && !r.toLowerCase().includes("borderline"));

  return (
    <Tilt intensity={4} className="col-span-full">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tier.grad} p-px shadow-2xl ${tier.glow} cursor-pointer group`}
        onClick={onSelect}
      >
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${tier.grad} opacity-10`} />
          <span className="absolute -right-8 -top-8 text-[280px] opacity-[0.06] select-none pointer-events-none leading-none">{flag}</span>

          <div className="relative grid sm:grid-cols-[auto,1fr,auto] gap-6 items-center">
            {/* Match dial */}
            <div className="relative flex items-center justify-center">
              <MatchDial value={s.match} size={120} stroke={9} gradId={`feat-${s.scholarship_id}`} color1="#34d399" color2="#06b6d4" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white tabular-nums leading-none">{s.match}</span>
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest mt-1">match</span>
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 bg-white/10 border border-white/15 px-2 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur">
                  <Trophy className="h-3 w-3 text-amber-400" /> Top pick for you
                </span>
                <span className="text-2xl">{flag}</span>
              </div>
              <h3 className="font-heading font-bold text-2xl sm:text-3xl text-white leading-tight">{s.scholarship_name}</h3>
              <p className="text-white/60 text-sm mt-1.5">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Award</p>
                  <p className="text-xs font-bold text-white leading-tight line-clamp-2">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</p>
                </div>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Deadline</p>
                  <p className={`text-xs font-bold leading-tight ${dl.cls.replace("text-muted-foreground", "text-white/60")}`}>{dl.text}</p>
                </div>
                {s.estimated_total_value_usd ? (
                  <div className="bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-400/25 rounded-xl p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-amber-300/80 mb-0.5">Value</p>
                    <p className="text-xs font-black text-amber-200 leading-tight">{fmtValue(s.estimated_total_value_usd)}</p>
                  </div>
                ) : <div />}
              </div>

              {posReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {posReasons.slice(0, 3).map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex sm:flex-col gap-2 sm:items-end shrink-0">
              <button onClick={onBookmark} className="bg-white/5 hover:bg-white/15 border border-white/10 backdrop-blur p-2.5 rounded-xl transition-colors">
                {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-amber-400" /> : <Bookmark className="h-4 w-4 text-white/80" />}
              </button>
              <Button variant="gold" size="sm" className="text-xs gap-1.5 shadow-lg" onClick={e => { e.stopPropagation(); onSelect(); }}>
                Open strategy <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </Tilt>
  );
};

/* ─── Standard scholarship card ──────────────────────────────────────── */
const ScholarCard = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored; onSelect: () => void; isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
}) => {
  const tier = TIER_STYLE[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const posReasons = s.reasons.filter(r => !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not open") && !r.toLowerCase().includes("borderline"));
  const dialColors = s.priority === "strong_match" ? ["#34d399", "#06b6d4"] : s.priority === "competitive" ? ["#fbbf24", "#f97316"] : ["#94a3b8", "#64748b"];

  return (
    <Tilt intensity={5}>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-xl transition-all cursor-pointer group h-full ${tier.glow}`}
        onClick={onSelect}
      >
        {/* Gradient accent band */}
        <div className={`h-1.5 bg-gradient-to-r ${tier.grad}`} />

        <div className="p-5 relative">
          {/* Ghost flag */}
          <span className="absolute right-2 -top-2 text-7xl opacity-[0.04] select-none pointer-events-none leading-none">{flag}</span>

          <div className="flex items-start gap-4 mb-4 relative">
            <div className="relative shrink-0">
              <MatchDial value={s.match} size={68} stroke={6} gradId={`d-${s.scholarship_id}`} color1={dialColors[0]} color2={dialColors[1]} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-foreground tabular-nums leading-none">{s.match}</span>
                <span className="text-muted-foreground text-[8px] font-bold uppercase tracking-widest mt-0.5">match</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-lg">{flag}</span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${
                  s.priority === "strong_match" ? "text-emerald-600 dark:text-emerald-400" :
                  s.priority === "competitive" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                }`}>{tier.label}</span>
              </div>
              <h3 className="font-heading font-bold text-[15px] leading-snug text-foreground line-clamp-2">{s.scholarship_name}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={onBookmark} className="bg-muted hover:bg-muted/70 p-1.5 rounded-lg transition-colors shrink-0">
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-muted/40 rounded-lg p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Award</p>
              <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Deadline</p>
              <p className={`text-xs font-bold leading-tight ${dl.cls}`}>{dl.text}</p>
              {s.application_deadline && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.application_deadline).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
              )}
            </div>
          </div>

          {s.estimated_total_value_usd ? (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <Sparkles className="h-3 w-3" /> {fmtValue(s.estimated_total_value_usd)} total value
              </span>
            </div>
          ) : null}

          {posReasons.slice(0, 2).length > 0 && (
            <div className="space-y-1 mb-4">
              {posReasons.slice(0, 2).map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />{r}
                </div>
              ))}
            </div>
          )}

          {s.eligibility === "missing" && (
            <div className="mb-3 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
              {s.reasons.find(r => r.toLowerCase().includes("below") || r.toLowerCase().includes("borderline")) || "Missing one requirement"}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 text-xs h-8" onClick={e => { e.stopPropagation(); onSelect(); }}>
              Strategy & details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
            {s.official_url && (
              <Button size="sm" variant="outline" asChild className="text-xs h-8 px-2.5" onClick={e => e.stopPropagation()}>
                <a href={s.official_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </Tilt>
  );
};

/* ─── Filters Panel ──────────────────────────────────────────────────── */
const FiltersPanel = ({ filters, setFilters, activeCount }: {
  filters: FilterState; setFilters: React.Dispatch<React.SetStateAction<FilterState>>; activeCount: number;
}) => (
  <div className="space-y-5">
    {[
      { label: "Coverage", key: "coverage" as keyof FilterState, opts: [{ v: "all", l: "All types" }, { v: "full_ride", l: "Full ride" }, { v: "tuition_only", l: "Tuition" }, { v: "stipend", l: "Stipend" }] },
      { label: "Degree", key: "degree" as keyof FilterState, opts: [{ v: "all", l: "All levels" }, { v: "undergraduate", l: "Bachelor\'s" }, { v: "master\'s", l: "Master\'s" }, { v: "PhD", l: "PhD" }] },
      { label: "Effort", key: "effort" as keyof FilterState, opts: [{ v: "all", l: "Any effort" }, { v: "low", l: "Quick to apply" }, { v: "medium", l: "Medium" }, { v: "high", l: "Competitive" }] },
    ].map(section => (
      <div key={section.label}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{section.label}</p>
        <div className="space-y-0.5">
          {section.opts.map(o => (
            <button key={o.v} onClick={() => setFilters(f => ({ ...f, [section.key]: o.v }))}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${(filters[section.key] as string) === o.v ? "bg-accent/15 text-accent font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
    ))}
    <Separator />
    <div className="space-y-3">
      {([
        { id: "oe", label: "Eligible only", key: "onlyEligible" as keyof FilterState },
        { id: "cs", label: "Closing in 90 days", key: "closingSoon" as keyof FilterState },
        { id: "sl", label: "My shortlist", key: "onlyShortlisted" as keyof FilterState },
      ] as const).map(t => (
        <div key={t.id} className="flex items-center justify-between">
          <Label htmlFor={t.id} className="text-sm cursor-pointer text-foreground/80">{t.label}</Label>
          <Switch id={t.id} checked={filters[t.key] as boolean} onCheckedChange={v => setFilters(f => ({ ...f, [t.key]: v }))} />
        </div>
      ))}
    </div>
    {activeCount > 0 && (
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setFilters(DEFAULT_FILTERS)}>
        <X className="h-3 w-3 mr-1" /> Clear all
      </Button>
    )}
  </div>
);

/* ─── Detail Sheet ───────────────────────────────────────────────────── */
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark }: {
  s: Scored | null; open: boolean; onClose: () => void;
  isBookmarked: boolean; onBookmark: () => void;
}) => {
  if (!s) return null;
  const tier = TIER_STYLE[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto p-0">
        <div className={`bg-gradient-to-br ${tier.grad} px-6 pt-7 pb-6 relative overflow-hidden`}>
          <span className="absolute right-3 top-0 text-9xl opacity-[0.1] select-none pointer-events-none leading-none">{flag}</span>
          <SheetHeader className="relative">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MatchDial value={s.match} size={68} stroke={6} gradId={`sh-${s.scholarship_id}`} color1="#ffffff" color2="rgba(255,255,255,0.6)" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-white">{s.match}</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider">{tier.label}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">{s.eligibility === "eligible" ? "✓ You qualify" : s.eligibility === "missing" ? "Near miss" : s.eligibility === "not_eligible" ? "Out of scope" : "Likely fit"}</p>
                </div>
              </div>
              <span className="text-4xl">{flag}</span>
            </div>
            <SheetTitle className="text-white font-heading text-xl leading-snug">{s.scholarship_name}</SheetTitle>
            <p className="text-white/60 text-sm mt-1">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          {s.reasons.length > 0 && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Why you matched</h4>
              <div className="space-y-1.5">
                {s.reasons.map((r, i) => {
                  const pos = !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not open") && !r.toLowerCase().includes("borderline");
                  return (
                    <div key={i} className={`flex items-start gap-2 text-xs ${pos ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {pos ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />}
                      {r}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <Separator />
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Requirements</h4>
            <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-xs">
              {s.application_deadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className={`font-semibold ${dl.cls}`}>
                    {new Date(s.application_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    <span className="ml-1.5 font-normal opacity-70">({dl.text})</span>
                  </span>
                </div>
              )}
              {s.min_gpa != null && <div className="flex justify-between"><span className="text-muted-foreground">Min GPA</span><span className="font-semibold">≥ {s.min_gpa}/{s.gpa_scale ?? 4.0}</span></div>}
              {s.min_ielts != null && <div className="flex justify-between"><span className="text-muted-foreground">Min IELTS</span><span className="font-semibold">≥ {s.min_ielts}</span></div>}
              {s.min_toefl != null && <div className="flex justify-between"><span className="text-muted-foreground">Min TOEFL</span><span className="font-semibold">≥ {s.min_toefl}</span></div>}
              {s.min_sat != null && <div className="flex justify-between"><span className="text-muted-foreground">Min SAT</span><span className="font-semibold">≥ {s.min_sat}</span></div>}
              {s.citizenship_requirements && <div className="flex flex-col gap-0.5"><span className="text-muted-foreground">Citizenship</span><span className="font-medium">{s.citizenship_requirements}</span></div>}
            </div>
          </section>
          {s.required_documents && s.required_documents.length > 0 && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Documents needed</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {s.required_documents.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />{d}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {s.essay_required && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" />Essay</span>}
                {s.interview_required && <span>Interview required</span>}
                {(s.recommendation_letters_required ?? 0) > 0 && <span>{s.recommendation_letters_required} rec letter{(s.recommendation_letters_required ?? 0) > 1 ? "s" : ""}</span>}
              </div>
            </section>
          )}
          {s.how_to_win && (
            <section className="bg-accent/5 border border-accent/15 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-accent mb-2 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Application approach</h4>
              <p className="text-xs text-foreground/85 leading-relaxed">{s.how_to_win}</p>
            </section>
          )}
          {s.strategy_notes && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Strategy</h4>
              <p className="text-xs text-foreground/80 leading-relaxed">{s.strategy_notes}</p>
            </section>
          )}
          {s.what_to_prepare_first && (
            <section className="border-l-2 border-l-accent bg-muted/20 rounded-r-xl px-4 py-3">
              <p className="text-xs font-semibold text-foreground mb-1">Start here</p>
              <p className="text-xs text-foreground/80">{s.what_to_prepare_first}</p>
            </section>
          )}
          {s.risk_note && (
            <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Watch out</p>
              <p className="text-xs text-foreground/80">{s.risk_note}</p>
            </section>
          )}
          {(s.min_ielts || s.min_sat) && (
            <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-foreground/80">Need to hit those scores?</p>
              <Button size="sm" variant="outline" asChild className="shrink-0 text-xs h-7">
                <Link to="/prep">Open Prep <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          )}
          <div className="flex gap-2 pb-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onBookmark}>
              {isBookmarked ? <><BookmarkCheck className="h-4 w-4 mr-1.5 text-accent" />Saved</> : <><Bookmark className="h-4 w-4 mr-1.5" />Save to shortlist</>}
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

/* ─── Animated stat tile ─────────────────────────────────────────────── */
const StatTile = ({ label, value, color, icon: Icon, suffix = "", isMoney = false, delay = 0 }: {
  label: string; value: number; color: string; icon: React.ComponentType<{ className?: string }>; suffix?: string; isMoney?: boolean; delay?: number;
}) => {
  const animated = useCountUp(value, 1100);
  const display = isMoney ? fmtValue(animated) : `${animated}${suffix}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 ${color}`}
    >
      <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at top right, currentColor 0%, transparent 60%)" }} />
      <div className="relative flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-2xl font-black tabular-nums leading-none">{display}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">{label}</div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Section header ─────────────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title, subtitle, count, accentClass }: {
  icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; count: number; accentClass: string;
}) => (
  <div className="flex items-end justify-between mb-4 mt-2">
    <div className="flex items-center gap-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accentClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="font-heading font-bold text-xl text-foreground leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <span className="text-sm font-bold text-muted-foreground tabular-nums">{count}</span>
  </div>
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
    const iv = setInterval(() => { i++; setAnalysisStep(i); if (i >= 5) { clearInterval(iv); setTimeout(() => setPhase("results"), 400); } }, 450);
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

  const filtered = useMemo(() => {
    let list = ranked;
    if (filters.search) { const q = filters.search.toLowerCase(); list = list.filter(s => s.scholarship_name.toLowerCase().includes(q) || (s.host_country?.toLowerCase() || "").includes(q) || (s.provider_name?.toLowerCase() || "").includes(q)); }
    if (filters.coverage !== "all") list = list.filter(s => s.coverage_type === filters.coverage);
    if (filters.degree !== "all") list = list.filter(s => s.target_degree_level?.some(d => d.toLowerCase() === filters.degree.toLowerCase()));
    if (filters.effort !== "all") list = list.filter(s => s.effort === filters.effort);
    if (filters.onlyEligible) list = list.filter(s => s.eligibility === "eligible" || s.eligibility === "likely");
    if (filters.closingSoon) list = list.filter(s => { const d = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null; return d !== null && d > 0 && d <= 90; });
    if (filters.onlyShortlisted) list = list.filter(s => shortlist.has(s.scholarship_id));
    if (sortBy === "deadline") return [...list].sort((a, b) => { if (!a.application_deadline) return 1; if (!b.application_deadline) return -1; return new Date(a.application_deadline).getTime() - new Date(b.application_deadline).getTime(); });
    if (sortBy === "value") return [...list].sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0));
    if (sortBy === "effort") { const o: Record<string, number> = { low: 0, medium: 1, high: 2 }; return [...list].sort((a, b) => (o[a.effort] ?? 1) - (o[b.effort] ?? 1)); }
    return list;
  }, [ranked, filters, sortBy, shortlist]);

  /* Group filtered into sections */
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

  const activeFiltersCount = [filters.search !== "", filters.coverage !== "all", filters.degree !== "all", filters.effort !== "all", filters.onlyEligible, filters.closingSoon, filters.onlyShortlisted].filter(Boolean).length;

  const analysisTexts = [
    `Scanning ${rows.length || 42} verified scholarships...`,
    `Filtering by nationality${wiz.nationality ? `: ${wiz.nationality}` : ""}...`,
    `Matching ${wiz.degree || "your degree"} programs...`,
    "Evaluating academic thresholds...",
    "Ranking your best opportunities...",
  ];

  const dark = phase === "landing" || phase === "wizard" || phase === "analyzing";
  const totalVerified = rows.length || 75;
  const totalValueAll = rows.reduce((s, r) => s + (r.estimated_total_value_usd ?? 0), 0);

  return (
    <div className={`min-h-screen relative transition-colors duration-700 ${dark ? "" : "bg-background"}`}>
      {dark && <Aurora />}

      <div className="relative z-10">
        <Navigation language={language} />

        <AnimatePresence mode="wait">
          {/* ══ LANDING ══ */}
          {phase === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5 }}
              className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
              <FloatingCards />

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }} className="max-w-3xl mx-auto space-y-8 relative z-10">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05, duration: 0.6 }}
                  className="inline-flex items-center gap-2 bg-white/5 border border-white/15 backdrop-blur px-4 py-2 rounded-full text-white/80 text-xs font-semibold uppercase tracking-widest">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-gold">{totalVerified}</span> verified scholarships · <span className="text-emerald-300">live</span>
                </motion.div>

                <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.02] tracking-tight">
                  Find scholarships<br />
                  <span className="bg-gradient-to-r from-gold via-amber-300 to-gold bg-clip-text text-transparent" style={{ backgroundSize: "200% 100%", animation: "shimmer 6s linear infinite" }}>
                    made for you.
                  </span>
                </h1>

                <p className="text-white/55 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
                  Answer 4 questions. We match your profile against every scholarship in our database and surface where you have a real shot.
                </p>

                <div className="flex flex-col items-center gap-4">
                  <Button variant="gold" size="lg" className="text-base px-12 py-7 hover:scale-105 transition-transform gap-2 shadow-2xl shadow-gold/40 relative overflow-hidden group" onClick={() => setPhase("wizard")}>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    <Sparkles className="h-5 w-5" /> Find my scholarships <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <div className="flex items-center justify-center gap-5 text-xs text-white/35">
                    <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-gold" /> 2 min</span>
                    <span>·</span>
                    <span>No account</span>
                    <span>·</span>
                    <span>Free</span>
                  </div>
                </div>

                {/* Live stats strip */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
                  className="grid grid-cols-3 gap-3 max-w-2xl mx-auto pt-8">
                  {[
                    { k: "Active funding", v: totalValueAll ? fmtValue(totalValueAll) : "$50M+", icon: TrendingUp },
                    { k: "Countries", v: "26", icon: Globe2 },
                    { k: "Match accuracy", v: "94%", icon: Target },
                  ].map((s, i) => (
                    <motion.div key={s.k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1 }}
                      className="bg-white/5 backdrop-blur border border-white/10 rounded-xl px-4 py-3">
                      <s.icon className="h-4 w-4 text-gold mb-1.5 mx-auto" />
                      <div className="text-white font-bold text-lg tabular-nums">{s.v}</div>
                      <div className="text-white/40 text-[10px] uppercase tracking-widest">{s.k}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ WIZARD ══ */}
          {phase === "wizard" && (
            <motion.div key="wizard" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4 }}
              className="relative min-h-[calc(100vh-64px)] flex flex-col">
              <div className="pt-6 px-6 flex items-center justify-between max-w-2xl mx-auto w-full relative z-10">
                <button onClick={() => wizardStep === 0 ? setPhase("landing") : setWizardStep(s => s - 1)} className="text-white/40 hover:text-white/80 transition-colors p-1">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-2">{Array.from({ length: WIZARD_STEPS }).map((_, i) => (<motion.div key={i} animate={{ width: i <= wizardStep ? 32 : 32 }} className={`h-1.5 rounded-full transition-all duration-500 ${i < wizardStep ? "bg-gold" : i === wizardStep ? "bg-gold/60 shadow-lg shadow-gold/50" : "bg-white/15"}`} />))}</div>
                <span className="text-white/40 text-xs tabular-nums">{wizardStep + 1}/{WIZARD_STEPS}</span>
              </div>
              <AnimatePresence mode="wait">
                {wizardStep === 0 && (
                  <motion.div key="ws0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">Let\'s get started</h2>
                    <p className="text-white/50 mb-10">Your results stay on your device.</p>
                    <div className="w-full space-y-4 text-left">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/50">Your name</label>
                        <Input value={wiz.fullName} onChange={e => setWiz(w => ({ ...w, fullName: e.target.value }))} placeholder="First name (optional)"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 text-base backdrop-blur" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/50">Email *</label>
                        <Input type="email" value={wiz.email} onChange={e => setWiz(w => ({ ...w, email: e.target.value }))} placeholder="you@email.com"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 text-base backdrop-blur" />
                      </div>
                    </div>
                    <Button variant="gold" size="lg" className="mt-8 px-12 gap-2 text-base shadow-xl shadow-gold/30" disabled={!wiz.email} onClick={() => setWizardStep(1)}>
                      Continue <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}
                {wizardStep === 1 && (
                  <motion.div key="ws1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">Where are you from?</h2>
                    <p className="text-white/50 mb-8">Your nationality determines eligibility for most scholarships.</p>
                    <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {COUNTRIES.map((c, i) => (
                        <motion.button key={c.v} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                          onClick={() => { setWiz(w => ({ ...w, nationality: c.v })); setWizardStep(2); }}
                          className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-105 active:scale-95 ${wiz.nationality === c.v ? "bg-gold text-primary border-gold shadow-xl shadow-gold/30" : "bg-white/8 border-white/15 text-white hover:bg-white/15 backdrop-blur"}`}>
                          <span className="text-2xl">{c.f}</span><span className="text-xs leading-tight">{c.v}</span>
                        </motion.button>
                      ))}
                      <button onClick={() => setWiz(w => ({ ...w, nationality: "other" }))}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-105 ${wiz.nationality === "other" ? "bg-gold text-primary border-gold" : "bg-white/8 border-white/15 text-white hover:bg-white/15 backdrop-blur"}`}>
                        <span className="text-2xl">🌍</span><span className="text-xs">Other</span>
                      </button>
                    </div>
                    {wiz.nationality === "other" && (
                      <div className="mt-4 w-full space-y-3">
                        <Input value={wiz.customNationality} onChange={e => setWiz(w => ({ ...w, customNationality: e.target.value }))} placeholder="Type your country..."
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-11 backdrop-blur" />
                        <Button variant="gold" onClick={() => setWizardStep(2)} disabled={!wiz.customNationality} className="w-full gap-2">Continue <ArrowRight className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </motion.div>
                )}
                {wizardStep === 2 && (
                  <motion.div key="ws2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">What will you study?</h2>
                    <p className="text-white/50 mb-8">Pick the degree level you\'re applying for.</p>
                    <div className="w-full grid grid-cols-3 gap-3 mb-8">
                      {DEGREES.map(d => (
                        <button key={d.v} onClick={() => setWiz(w => ({ ...w, degree: d.v }))}
                          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border font-medium transition-all hover:scale-105 active:scale-95 ${wiz.degree === d.v ? "bg-gold text-primary border-gold shadow-xl shadow-gold/30" : "bg-white/8 border-white/15 text-white hover:bg-white/15 backdrop-blur"}`}>
                          <span className="text-3xl">{d.icon}</span>
                          <span className="font-semibold text-sm">{d.l}</span>
                          <span className="text-[11px] opacity-60 leading-tight">{d.d}</span>
                        </button>
                      ))}
                    </div>
                    {wiz.degree && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                        <p className="text-white/50 text-sm mb-4">And your field of study?</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {FIELDS.map(f => (
                            <button key={f.v} onClick={() => setWiz(w => ({ ...w, field: f.v }))}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all hover:scale-105 ${wiz.field === f.v ? "bg-gold text-primary border-gold" : "bg-white/8 border-white/15 text-white hover:bg-white/15 backdrop-blur"}`}>
                              <span>{f.i}</span><span>{f.v.split(" &")[0]}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {wiz.degree && wiz.field && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                        <Button variant="gold" size="lg" onClick={() => setWizardStep(3)} className="px-12 gap-2 shadow-xl shadow-gold/30">Continue <ArrowRight className="h-5 w-5" /></Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
                {wizardStep === 3 && (
                  <motion.div key="ws3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto w-full text-center relative z-10">
                    <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">Your scores</h2>
                    <p className="text-white/50 mb-8">Leave blank if you don\'t have them yet.</p>
                    <div className="w-full space-y-5 text-left">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/50">GPA</label>
                        <div className="flex gap-2">
                          <Input value={wiz.gpa} onChange={e => setWiz(w => ({ ...w, gpa: e.target.value }))} placeholder="e.g. 3.8"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 flex-1 backdrop-blur" />
                          <div className="flex rounded-lg overflow-hidden border border-white/20 backdrop-blur">
                            {["/4.0", "/5.0", "/100"].map(s => (
                              <button key={s} onClick={() => setWiz(w => ({ ...w, gpaScale: s.slice(1) }))}
                                className={`px-3 text-xs font-medium transition-colors ${wiz.gpaScale === s.slice(1) ? "bg-gold text-primary" : "bg-white/8 text-white/60 hover:bg-white/15"}`}>{s}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/50">IELTS score (optional)</label>
                        <Input value={wiz.ielts} onChange={e => setWiz(w => ({ ...w, ielts: e.target.value }))} placeholder="e.g. 7.0"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 backdrop-blur" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/50">Funding situation</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ v: "low", l: "Need full funding", d: "Can\'t self-fund tuition" }, { v: "medium", l: "Can cover some", d: "Partial support is OK" }].map(b => (
                            <button key={b.v} onClick={() => setWiz(w => ({ ...w, budget: b.v }))}
                              className={`flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all ${wiz.budget === b.v ? "bg-gold text-primary border-gold" : "bg-white/8 border-white/15 text-white hover:bg-white/15 backdrop-blur"}`}>
                              <span className="text-sm font-semibold">{b.l}</span>
                              <span className="text-[11px] opacity-60">{b.d}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button variant="gold" size="lg" className="mt-10 px-12 gap-2 text-base shadow-2xl shadow-gold/40" onClick={completeWizard}>
                      <Zap className="h-5 w-5" /> Show my scholarships
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══ ANALYZING ══ */}
          {phase === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center">
              <div className="max-w-md mx-auto space-y-10 relative z-10">
                <div className="relative inline-flex items-center justify-center mx-auto">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-dashed border-gold/30" style={{ width: 120, height: 120 }} />
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-gold/20 to-amber-400/10 border border-gold/40 backdrop-blur flex items-center justify-center shadow-2xl shadow-gold/30">
                    <Sparkles className="h-10 w-10 text-gold" />
                  </div>
                </div>
                <h2 className="font-heading text-4xl font-bold text-white">Matching your profile...</h2>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-gold via-amber-300 to-gold rounded-full" animate={{ width: `${Math.min((analysisStep / 5) * 100, 100)}%` }} transition={{ duration: 0.4 }} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p key={analysisStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-white/60 text-base font-mono">
                    {analysisTexts[Math.min(analysisStep, analysisTexts.length - 1)]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ══ RESULTS ══ */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {/* ── Stats header ── */}
              <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-10 sm:py-12 overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute -top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-25" style={{ background: "radial-gradient(circle, hsl(42 90% 55%) 0%, transparent 60%)" }} />
                  <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, hsl(180 70% 50%) 0%, transparent 60%)" }} />
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div>
                      {wiz.fullName && <p className="text-gold/80 text-sm font-medium mb-2 tracking-wide">Welcome back, {wiz.fullName} 👋</p>}
                      <h1 className="font-heading text-3xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight">
                        {loading ? "Loading your matches..." : (
                          <>
                            <span className="tabular-nums">{rows.length}</span> scholarships<br />
                            <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                              {stats.strong} are strong matches.
                            </span>
                          </>
                        )}
                      </h1>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {[profile.country, profile.degree, profile.gpa ? `GPA ${profile.gpa}/${profile.gpaScale}` : null, profile.ielts ? `IELTS ${profile.ielts}` : null].filter(Boolean).map(chip => (
                          <span key={chip} className="text-xs bg-white/8 text-white/75 border border-white/15 backdrop-blur px-3 py-1 rounded-full">{chip}</span>
                        ))}
                        <button onClick={resetProfile} className="text-xs text-white/40 hover:text-gold transition-colors flex items-center gap-1 px-2">
                          <RefreshCw className="h-3 w-3" /> Update profile
                        </button>
                      </div>
                    </div>

                    {!loading && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:max-w-2xl">
                        <StatTile label="Strong" value={stats.strong} color="text-emerald-300" icon={Trophy} delay={0.05} />
                        <StatTile label="Competitive" value={stats.competitive} color="text-amber-300" icon={Target} delay={0.1} />
                        <StatTile label="Closing" value={stats.closing} color="text-rose-300" icon={Flame} suffix="" delay={0.15} />
                        <StatTile label="Total pool" value={stats.totalValue} color="text-gold" icon={Sparkles} isMoney delay={0.2} />
                      </div>
                    )}
                  </div>

                  {/* Match landscape */}
                  {!loading && ranked.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-7">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/40 text-[10px] uppercase tracking-widest">Match landscape · click any bar</p>
                        <div className="flex items-center gap-3 text-[10px] text-white/40">
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-400" />Strong</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" />Competitive</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-400/40" />Lower</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-[2px] h-16 overflow-hidden rounded-xl bg-white/5 p-1">
                        {ranked.map((s, i) => (
                          <motion.div
                            key={s.scholarship_id}
                            initial={{ height: 0 }} animate={{ height: `${Math.max(s.match, 8)}%` }}
                            transition={{ delay: i * 0.012, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex-1 min-w-[3px] rounded-t-sm cursor-pointer transition-all opacity-75 hover:opacity-100 hover:scale-y-110 origin-bottom ${
                              s.priority === "strong_match" ? "bg-gradient-to-t from-emerald-500 to-emerald-300" :
                              s.priority === "competitive" ? "bg-gradient-to-t from-amber-500 to-amber-300" :
                              "bg-gradient-to-t from-slate-500/60 to-slate-400/40"
                            }`}
                            onClick={() => setOpenDetail(s)}
                            title={`${s.scholarship_name} — ${s.match}% match`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </section>

              {/* ── Main layout ── */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
                <div className="flex gap-6">
                  {/* Sidebar (desktop) */}
                  <aside className="hidden lg:block w-[210px] shrink-0">
                    <div className="sticky top-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5"><SlidersHorizontal className="h-4 w-4 text-accent" />Filters</h3>
                        {activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-accent/20 text-accent border-0">{activeFiltersCount}</Badge>}
                      </div>
                      <FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} />
                    </div>
                  </aside>

                  {/* Content */}
                  <main className="flex-1 min-w-0">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 mb-5 flex-wrap">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search by name, country, provider..."
                          className="pl-9 h-10 text-sm" />
                        {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                      </div>
                      <Button variant="outline" size="sm" className="lg:hidden gap-1.5 h-10" onClick={() => setFiltersOpen(true)}>
                        <Filter className="h-4 w-4" />Filters{activeFiltersCount > 0 && <Badge className="h-4 px-1 text-[10px] bg-accent/20 text-accent border-0 ml-0.5">{activeFiltersCount}</Badge>}
                      </Button>
                      <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                        <SelectTrigger className="w-[150px] h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="match">Best match</SelectItem>
                          <SelectItem value="deadline">Deadline first</SelectItem>
                          <SelectItem value="value">Highest value</SelectItem>
                          <SelectItem value="effort">Easiest first</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{filtered.length} of {ranked.length}</span>
                    </div>

                    {/* Card sections */}
                    {loading ? (
                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="h-72 bg-card border border-border rounded-2xl animate-pulse" />)}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="border border-dashed border-border rounded-2xl p-14 text-center bg-muted/10">
                        <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <h3 className="font-heading font-semibold text-foreground mb-1">No scholarships match</h3>
                        <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
                        <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        {/* Hero featured */}
                        {sections.hero.length > 0 && (
                          <div className="grid grid-cols-1 gap-4">
                            <FeaturedCard
                              s={sections.hero[0]}
                              onSelect={() => setOpenDetail(sections.hero[0])}
                              isBookmarked={shortlist.has(sections.hero[0].scholarship_id)}
                              onBookmark={e => { e.stopPropagation(); toggleBookmark(sections.hero[0].scholarship_id); }}
                            />
                          </div>
                        )}

                        {/* Strong matches */}
                        {sections.strong.length > 0 && (
                          <div>
                            <SectionHeader icon={Trophy} title="Strong matches" subtitle="Highest probability of acceptance"
                              count={sections.strong.length} accentClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25" />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                              {sections.strong.map(s => (
                                <ScholarCard key={s.scholarship_id} s={s}
                                  onSelect={() => setOpenDetail(s)}
                                  isBookmarked={shortlist.has(s.scholarship_id)}
                                  onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Competitive */}
                        {sections.competitive.length > 0 && (
                          <div>
                            <SectionHeader icon={Target} title="Worth a shot" subtitle="Competitive but achievable with a strong app"
                              count={sections.competitive.length} accentClass="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25" />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                              {sections.competitive.map(s => (
                                <ScholarCard key={s.scholarship_id} s={s}
                                  onSelect={() => setOpenDetail(s)}
                                  isBookmarked={shortlist.has(s.scholarship_id)}
                                  onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stretch */}
                        {sections.stretch.length > 0 && (
                          <div>
                            <SectionHeader icon={Layers} title="Stretch & lower-fit" subtitle="Long shots — only apply if you have bandwidth"
                              count={sections.stretch.length} accentClass="bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25" />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr opacity-90">
                              {sections.stretch.map(s => (
                                <ScholarCard key={s.scholarship_id} s={s}
                                  onSelect={() => setOpenDetail(s)}
                                  isBookmarked={shortlist.has(s.scholarship_id)}
                                  onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                              ))}
                            </div>
                          </div>
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

        {/* Sticky shortlist FAB (results phase only) */}
        {phase === "results" && shortlist.size > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={() => setShortlistOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-gradient-to-br from-amber-400 to-gold text-primary font-bold px-5 py-3.5 rounded-2xl shadow-2xl shadow-gold/40 hover:scale-105 transition-transform flex items-center gap-2.5"
          >
            <BookmarkCheck className="h-5 w-5" />
            <div className="text-left">
              <div className="text-sm font-bold leading-none">My shortlist</div>
              <div className="text-[10px] font-medium opacity-70 mt-0.5">{shortlist.size} saved</div>
            </div>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}

        {/* Shortlist sheet */}
        <Sheet open={shortlistOpen} onOpenChange={setShortlistOpen}>
          <SheetContent side="right" className="w-full sm:w-[440px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-gold" /> Your shortlist · {shortlist.size}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">Saved scholarships you want to apply to.</p>
            </SheetHeader>
            <div className="mt-5 space-y-2.5">
              {ranked.filter(s => shortlist.has(s.scholarship_id)).map(s => {
                const tier = TIER_STYLE[s.priority];
                const flag = FLAGS[s.host_country || ""] ?? "🌍";
                const dl = deadlineDisplay(s.application_deadline);
                return (
                  <button key={s.scholarship_id}
                    onClick={() => { setOpenDetail(s); setShortlistOpen(false); }}
                    className="w-full text-left bg-card border border-border rounded-xl p-3 hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tier.grad} flex items-center justify-center text-lg shrink-0`}>{flag}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-sm text-foreground line-clamp-1">{s.scholarship_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{s.match}%</span>
                        <span className={`text-[10px] ${dl.cls}`}>{dl.text}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} className="text-muted-foreground hover:text-destructive p-1">
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
          <SheetContent side="left" className="w-[280px] overflow-y-auto">
            <SheetHeader><SheetTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filters</SheetTitle></SheetHeader>
            <div className="mt-4"><FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} /></div>
          </SheetContent>
        </Sheet>

        <DetailSheet s={openDetail} open={!!openDetail} onClose={() => setOpenDetail(null)}
          isBookmarked={openDetail ? shortlist.has(openDetail.scholarship_id) : false}
          onBookmark={() => openDetail && toggleBookmark(openDetail.scholarship_id)} />
      </div>

      {/* Shimmer keyframes for hero gradient */}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
};

export default Discover;
