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
  Target, Flame, Layers,
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
  if (!d) return { text: "Rolling", cls: "text-foreground/40" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: "Closed", cls: "text-foreground/30 line-through" };
  if (days <= 30) return { text: `${days} days`, cls: "text-rose-500" };
  if (days <= 90) return { text: `${days} days`, cls: "text-amber-500" };
  return { text: `${Math.ceil(days / 30)} months`, cls: "text-foreground/50" };
};

/* Tier signals — minimal palette: emerald (strong), gold/amber (competitive), neutral (lower) */
const TIER = {
  strong_match: { label: "Strong match", dot: "bg-emerald-400", text: "text-emerald-300", textLight: "text-emerald-600 dark:text-emerald-400", grad: "from-emerald-400 via-teal-400 to-cyan-400", glow: "shadow-emerald-500/20" },
  competitive:  { label: "Competitive",  dot: "bg-amber-400",   text: "text-amber-300",   textLight: "text-amber-600 dark:text-amber-400",   grad: "from-amber-300 via-amber-400 to-orange-400",  glow: "shadow-amber-500/20"  },
  low_priority: { label: "Lower fit",    dot: "bg-zinc-400",    text: "text-zinc-300",    textLight: "text-zinc-500 dark:text-zinc-400",     grad: "from-zinc-400 via-zinc-500 to-zinc-600",      glow: "shadow-zinc-500/10"   },
};

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
const Tilt = ({ children, className = "", intensity = 4 }: { children: React.ReactNode; className?: string; intensity?: number }) => {
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
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 1200 }}
      className={className}>
      {children}
    </motion.div>
  );
};

/* ─── Aurora background (refined: deeper, smoother) ──────────────────── */
const Aurora = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, hsl(220 50% 11%) 0%, hsl(222 60% 6%) 100%)" }} />
    <motion.div
      className="absolute -top-[30%] -left-[15%] w-[70vw] h-[70vw] rounded-full blur-[140px] opacity-[0.35]"
      style={{ background: "radial-gradient(circle, hsl(42 90% 55%) 0%, transparent 70%)" }}
      animate={{ x: [0, 50, -20, 0], y: [0, -30, 20, 0] }}
      transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-[20%] -right-[15%] w-[65vw] h-[65vw] rounded-full blur-[160px] opacity-[0.28]"
      style={{ background: "radial-gradient(circle, hsl(200 80% 50%) 0%, transparent 70%)" }}
      animate={{ x: [0, -40, 20, 0], y: [0, 30, -20, 0] }}
      transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-[30%] left-[35%] w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-[0.18]"
      style={{ background: "radial-gradient(circle, hsl(280 70% 60%) 0%, transparent 70%)" }}
      animate={{ x: [0, 30, -30, 0], y: [0, -20, 25, 0] }}
      transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "28px 28px" }} />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
  </div>
);

/* ─── Floating orbs (minimal medals) ─────────────────────────────────── */
const FloatingOrbs = () => {
  const orbs = [
    { flag: "🇬🇧", score: 92, x: "9%",  y: "22%", delay: 0,    rot: -6 },
    { flag: "🇩🇪", score: 87, x: "82%", y: "18%", delay: 0.3,  rot:  5 },
    { flag: "🇯🇵", score: 78, x: "7%",  y: "68%", delay: 0.6,  rot:  4 },
    { flag: "🇨🇦", score: 95, x: "85%", y: "64%", delay: 0.9,  rot: -5 },
    { flag: "🇰🇷", score: 81, x: "16%", y: "44%", delay: 1.2,  rot:  8 },
    { flag: "🇸🇬", score: 89, x: "78%", y: "42%", delay: 1.5,  rot: -4 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6, rotate: o.rot }}
          animate={{ opacity: 0.92, scale: 1, y: [0, -10, 0], rotate: o.rot }}
          transition={{
            opacity: { delay: o.delay, duration: 1 },
            scale:   { delay: o.delay, duration: 1, ease: [0.16, 1, 0.3, 1] },
            rotate:  { delay: o.delay, duration: 1 },
            y:       { duration: 7 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: o.delay },
          }}
          className="absolute"
          style={{ left: o.x, top: o.y }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-white/0 blur-xl" />
            <div className="relative h-16 w-16 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-2xl">
              <span className="text-2xl leading-none">{o.flag}</span>
              <span className="text-[9px] font-bold text-white/70 mt-0.5 tabular-nums tracking-wider">{o.score}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ─── Animated radial match dial ─────────────────────────────────────── */
const MatchDial = ({ value, size = 88, stroke = 6, gradId, color1, color2, delay = 0 }: {
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

/* ─── Cinematic featured card ────────────────────────────────────────── */
const FeaturedCard = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored; onSelect: () => void; isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
}) => {
  const tier = TIER[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  const posReasons = s.reasons.filter(r => !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not open") && !r.toLowerCase().includes("borderline"));

  return (
    <Tilt intensity={3}>
      <motion.div
        initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden rounded-[28px] cursor-pointer group shadow-2xl ${tier.glow}`}
        onClick={onSelect}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className={`absolute inset-0 bg-gradient-to-br ${tier.grad} opacity-[0.08]`} />
        <span className="absolute -right-12 -top-12 text-[340px] opacity-[0.04] select-none pointer-events-none leading-none">{flag}</span>

        {/* Subtle aurora wash */}
        <div className="absolute -top-1/2 left-1/4 w-1/2 h-full rounded-full blur-[100px] opacity-30" style={{ background: "radial-gradient(circle, hsl(42 80% 60%) 0%, transparent 60%)" }} />

        {/* Content */}
        <div className="relative px-7 py-9 sm:px-10 sm:py-11">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full">
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-white/90 text-xs font-semibold tracking-wide">Top match for you</span>
            </div>
            <button onClick={onBookmark} className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 backdrop-blur-md p-2.5 rounded-xl transition-colors">
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-amber-300" /> : <Bookmark className="h-4 w-4 text-white/80" />}
            </button>
          </div>

          <div className="grid sm:grid-cols-[auto,1fr] gap-7 items-center">
            {/* Match dial */}
            <div className="relative shrink-0">
              <MatchDial value={s.match} size={148} stroke={8} gradId={`feat-${s.scholarship_id}`} color1="#34d399" color2="#22d3ee" delay={0.2} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-white tabular-nums leading-none tracking-tight">{s.match}</span>
                <span className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.2em] mt-2">match</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-3xl">{flag}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${tier.dot}`} />
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${tier.text}`}>{tier.label}</span>
                </div>
              </div>
              <h3 className="font-heading font-bold text-3xl sm:text-[34px] text-white leading-[1.1] tracking-tight mb-2">{s.scholarship_name}</h3>
              <p className="text-white/55 text-base mb-6">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>

              {/* Key facts row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6">
                <div>
                  <div className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.18em] mb-1">Award</div>
                  <div className="text-white text-base font-semibold">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</div>
                </div>
                <div className="h-9 w-px bg-white/10" />
                <div>
                  <div className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.18em] mb-1">Deadline</div>
                  <div className={`text-base font-semibold ${dl.cls.replace("text-foreground/40", "text-white/70").replace("text-foreground/30", "text-white/40").replace("text-foreground/50", "text-white/70")}`}>{dl.text}</div>
                </div>
                {s.estimated_total_value_usd ? (
                  <>
                    <div className="h-9 w-px bg-white/10" />
                    <div>
                      <div className="text-amber-300/70 text-[10px] font-semibold uppercase tracking-[0.18em] mb-1">Total value</div>
                      <div className="text-amber-200 text-base font-bold">{fmtValue(s.estimated_total_value_usd)}</div>
                    </div>
                  </>
                ) : null}
              </div>

              {posReasons.length > 0 && (
                <p className="text-white/75 text-[15px] leading-relaxed mb-7 max-w-xl">
                  <span className="text-emerald-300 font-medium">Why this fits</span> · {posReasons.slice(0, 2).join(" · ")}
                </p>
              )}

              <Button variant="gold" size="lg" className="gap-2 shadow-xl shadow-amber-500/30" onClick={e => { e.stopPropagation(); onSelect(); }}>
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
  const posReasons = s.reasons.filter(r => !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not open") && !r.toLowerCase().includes("borderline"));
  const dialColors = s.priority === "strong_match" ? ["#34d399", "#22d3ee"] : s.priority === "competitive" ? ["#fbbf24", "#fb923c"] : ["#a1a1aa", "#71717a"];

  return (
    <Tilt intensity={3}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden border border-border/70 bg-card hover:border-border transition-all cursor-pointer group h-full hover:shadow-xl"
        onClick={onSelect}
      >
        {/* Top accent line */}
        <div className={`h-[3px] bg-gradient-to-r ${tier.grad} opacity-90`} />

        <div className="px-6 py-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className={`relative shrink-0 ${tier.textLight}`}>
              <MatchDial value={s.match} size={62} stroke={5} gradId={`d-${s.scholarship_id}`} color1={dialColors[0]} color2={dialColors[1]} delay={0.1} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-foreground tabular-nums leading-none">{s.match}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{flag}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${tier.textLight}`}>{tier.label}</span>
              </div>
              <h3 className="font-heading font-bold text-base leading-snug text-foreground line-clamp-2 tracking-tight">{s.scholarship_name}</h3>
              <p className="text-xs text-muted-foreground mt-1 truncate">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={onBookmark} className="bg-muted/60 hover:bg-muted p-2 rounded-xl transition-colors shrink-0">
              {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-amber-500" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>

          {/* Inline key facts */}
          <div className="flex items-center justify-between gap-3 py-3.5 border-y border-border/60 mb-4">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">Award</div>
              <div className="text-sm font-semibold text-foreground truncate">{s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">Deadline</div>
              <div className={`text-sm font-semibold ${dl.cls}`}>{dl.text}</div>
            </div>
          </div>

          {/* Total value chip (only when meaningful) */}
          {s.estimated_total_value_usd && s.estimated_total_value_usd >= 5000 ? (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <Sparkles className="h-3 w-3" /> {fmtValue(s.estimated_total_value_usd)} total value
              </span>
            </div>
          ) : null}

          {/* Why it fits */}
          {posReasons.slice(0, 2).length > 0 && (
            <div className="space-y-1.5 mb-5">
              {posReasons.slice(0, 2).map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {/* Near-miss */}
          {s.eligibility === "missing" && (
            <div className="mb-4 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5 leading-relaxed">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span>{s.reasons.find(r => r.toLowerCase().includes("below") || r.toLowerCase().includes("borderline")) || "Missing one requirement"}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <button className="text-sm font-semibold text-foreground hover:text-amber-600 transition-colors flex items-center gap-1.5 group/cta" onClick={e => { e.stopPropagation(); onSelect(); }}>
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
const FiltersPanel = ({ filters, setFilters, activeCount }: {
  filters: FilterState; setFilters: React.Dispatch<React.SetStateAction<FilterState>>; activeCount: number;
}) => (
  <div className="space-y-6">
    {[
      { label: "Coverage", key: "coverage" as keyof FilterState, opts: [{ v: "all", l: "All types" }, { v: "full_ride", l: "Full ride" }, { v: "tuition_only", l: "Tuition" }, { v: "stipend", l: "Stipend" }] },
      { label: "Degree",   key: "degree"   as keyof FilterState, opts: [{ v: "all", l: "All levels" }, { v: "undergraduate", l: "Bachelor\'s" }, { v: "master\'s", l: "Master\'s" }, { v: "PhD", l: "PhD" }] },
      { label: "Effort",   key: "effort"   as keyof FilterState, opts: [{ v: "all", l: "Any effort" }, { v: "low", l: "Quick to apply" }, { v: "medium", l: "Medium" }, { v: "high", l: "Competitive" }] },
    ].map(section => (
      <div key={section.label}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">{section.label}</p>
        <div className="space-y-1">
          {section.opts.map(o => (
            <button key={o.v} onClick={() => setFilters(f => ({ ...f, [section.key]: o.v }))}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${(filters[section.key] as string) === o.v ? "bg-foreground/[0.05] text-foreground font-semibold" : "text-foreground/65 hover:bg-foreground/[0.03]"}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
    ))}
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

/* ─── Detail Sheet ───────────────────────────────────────────────────── */
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark }: {
  s: Scored | null; open: boolean; onClose: () => void;
  isBookmarked: boolean; onBookmark: () => void;
}) => {
  if (!s) return null;
  const tier = TIER[s.priority];
  const flag = FLAGS[s.host_country || ""] ?? "🌍";
  const dl = deadlineDisplay(s.application_deadline);
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[520px] overflow-y-auto p-0">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 px-7 pt-8 pb-7 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${tier.grad} opacity-10`} />
          <span className="absolute -right-6 -top-6 text-[200px] opacity-[0.07] select-none pointer-events-none leading-none">{flag}</span>
          <SheetHeader className="relative space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <MatchDial value={s.match} size={70} stroke={5} gradId={`sh-${s.scholarship_id}`} color1="#fbbf24" color2="#f59e0b" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-white tabular-nums">{s.match}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tier.text}`}>{tier.label}</p>
                  </div>
                  <p className="text-white/40 text-xs mt-1">{s.eligibility === "eligible" ? "✓ You qualify on paper" : s.eligibility === "missing" ? "Near miss — close" : s.eligibility === "not_eligible" ? "Doesn't fit" : "Likely fit"}</p>
                </div>
              </div>
              <span className="text-3xl">{flag}</span>
            </div>
            <SheetTitle className="text-white font-heading text-2xl leading-tight tracking-tight pt-1 text-left">{s.scholarship_name}</SheetTitle>
            <p className="text-white/50 text-sm text-left">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
          </SheetHeader>
        </div>

        <div className="px-7 py-6 space-y-6 text-sm">
          {s.reasons.length > 0 && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Why you matched</h4>
              <div className="space-y-2">
                {s.reasons.map((r, i) => {
                  const pos = !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not open") && !r.toLowerCase().includes("borderline");
                  return (
                    <div key={i} className={`flex items-start gap-2 text-sm leading-relaxed ${pos ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {pos ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                      {r}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <Separator />
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
              {s.min_gpa != null && <div className="flex justify-between"><span className="text-muted-foreground">Min GPA</span><span className="font-semibold">≥ {s.min_gpa}/{s.gpa_scale ?? 4.0}</span></div>}
              {s.min_ielts != null && <div className="flex justify-between"><span className="text-muted-foreground">Min IELTS</span><span className="font-semibold">≥ {s.min_ielts}</span></div>}
              {s.min_toefl != null && <div className="flex justify-between"><span className="text-muted-foreground">Min TOEFL</span><span className="font-semibold">≥ {s.min_toefl}</span></div>}
              {s.min_sat != null && <div className="flex justify-between"><span className="text-muted-foreground">Min SAT</span><span className="font-semibold">≥ {s.min_sat}</span></div>}
              {s.citizenship_requirements && <div className="flex flex-col gap-0.5"><span className="text-muted-foreground">Citizenship</span><span className="font-medium">{s.citizenship_requirements}</span></div>}
            </div>
          </section>
          {s.required_documents && s.required_documents.length > 0 && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Documents needed</h4>
              <div className="grid grid-cols-2 gap-2">
                {s.required_documents.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />{d}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                {s.essay_required && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" />Essay</span>}
                {s.interview_required && <span>Interview required</span>}
                {(s.recommendation_letters_required ?? 0) > 0 && <span>{s.recommendation_letters_required} rec letter{(s.recommendation_letters_required ?? 0) > 1 ? "s" : ""}</span>}
              </div>
            </section>
          )}
          {s.how_to_win && (
            <section className="bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" />Application approach</h4>
              <p className="text-sm text-foreground/85 leading-relaxed">{s.how_to_win}</p>
            </section>
          )}
          {s.strategy_notes && (
            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Strategy</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{s.strategy_notes}</p>
            </section>
          )}
          {s.what_to_prepare_first && (
            <section className="border-l-2 border-l-amber-500 bg-muted/30 rounded-r-2xl px-5 py-4">
              <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-[0.14em]">Start here</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{s.what_to_prepare_first}</p>
            </section>
          )}
          {s.risk_note && (
            <section className="bg-rose-500/[0.06] border border-rose-500/20 rounded-2xl p-4">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Watch out</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{s.risk_note}</p>
            </section>
          )}
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
              {isBookmarked ? <><BookmarkCheck className="h-4 w-4 mr-2 text-amber-500" />Saved</> : <><Bookmark className="h-4 w-4 mr-2" />Save to shortlist</>}
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
const InlineStat = ({ label, value, color = "text-white", isMoney = false, delay = 0, icon: Icon }: {
  label: string; value: number; color?: string; isMoney?: boolean; delay?: number; icon: React.ComponentType<{ className?: string }>;
}) => {
  const animated = useCountUp(value, 1300);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-3">
      <Icon className={`h-4 w-4 ${color} opacity-60`} />
      <div>
        <div className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${color} tracking-tight`}>{isMoney ? fmtValue(animated) : animated}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 mt-1.5">{label}</div>
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
    `Scanning ${rows.length || 75} verified scholarships`,
    `Filtering by nationality${wiz.nationality ? `: ${wiz.nationality}` : ""}`,
    `Matching ${wiz.degree || "your degree"} programs`,
    "Evaluating academic thresholds",
    "Ranking your best opportunities",
  ];

  const dark = phase === "landing" || phase === "wizard" || phase === "analyzing";
  const totalVerified = rows.length || 75;

  return (
    <div className={`min-h-screen relative transition-colors duration-700 ${dark ? "" : "bg-background"}`}>
      {dark && <Aurora />}

      <div className="relative z-10">
        <Navigation language={language} />

        <AnimatePresence mode="wait">
          {/* ══ LANDING ══ */}
          {phase === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center overflow-hidden">

              <FloatingOrbs />

              <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-4xl mx-auto relative z-10 space-y-9">
                {/* Status pill */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}
                  className="inline-flex items-center gap-2.5 bg-white/[0.04] border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-white/90 text-xs font-semibold tracking-wide">
                    <span className="text-amber-300">{totalVerified}</span> verified scholarships · live database
                  </span>
                </motion.div>

                {/* Headline */}
                <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="font-heading text-[clamp(2.75rem,7vw,5.5rem)] font-bold text-white leading-[1.02] tracking-[-0.03em]">
                  The scholarships<br />
                  <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 bg-clip-text text-transparent inline-block" style={{ backgroundSize: "200% 100%", animation: "shimmer 7s linear infinite" }}>
                    made for you.
                  </span>
                </motion.h1>

                {/* Subhead */}
                <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.7 }}
                  className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-light">
                  Answer four questions. We rank every scholarship in our database against your profile and tell you exactly where you have a real shot.
                </motion.p>

                {/* CTA */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7 }}
                  className="flex flex-col items-center gap-4 pt-2">
                  <Button variant="gold" size="lg" className="text-base px-12 py-7 hover:scale-[1.03] transition-transform gap-2.5 shadow-2xl shadow-amber-500/30 relative overflow-hidden group" onClick={() => setPhase("wizard")}>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    Find my scholarships
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <div className="flex items-center justify-center gap-5 text-xs text-white/30 font-medium tracking-wide">
                    <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-amber-400" /> 2 minutes</span>
                    <span className="opacity-50">·</span>
                    <span>No account needed</span>
                    <span className="opacity-50">·</span>
                    <span>Free during beta</span>
                  </div>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.7 }}
                  className="absolute bottom-[-180px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
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
                <button onClick={() => wizardStep === 0 ? setPhase("landing") : setWizardStep(s => s - 1)} className="text-white/40 hover:text-white/90 transition-colors p-2 -ml-2">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: WIZARD_STEPS }).map((_, i) => (
                    <div key={i} className="h-1 w-9 rounded-full bg-white/10 overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-amber-300 to-amber-400"
                        initial={false}
                        animate={{ width: i < wizardStep ? "100%" : i === wizardStep ? "60%" : "0%" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  ))}
                </div>
                <span className="text-white/40 text-xs tabular-nums font-medium tracking-wider">{wizardStep + 1} / {WIZARD_STEPS}</span>
              </div>

              <AnimatePresence mode="wait">
                {wizardStep === 0 && (
                  <motion.div key="ws0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-xl mx-auto w-full text-center relative z-10">
                    <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 1 · Hello</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-white mb-4 tracking-[-0.02em] leading-[1.05]">Let's start with you.</h2>
                    <p className="text-white/50 mb-12 text-base">Just so we can save your matches.</p>
                    <div className="w-full space-y-5 text-left">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Your name</label>
                        <Input value={wiz.fullName} onChange={e => setWiz(w => ({ ...w, fullName: e.target.value }))} placeholder="First name (optional)"
                          className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-13 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Email</label>
                        <Input type="email" value={wiz.email} onChange={e => setWiz(w => ({ ...w, email: e.target.value }))} placeholder="you@email.com"
                          className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-13 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                      </div>
                    </div>
                    <Button variant="gold" size="lg" className="mt-10 px-12 gap-2 text-base shadow-xl shadow-amber-500/25" disabled={!wiz.email} onClick={() => setWizardStep(1)}>
                      Continue <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {wizardStep === 1 && (
                  <motion.div key="ws1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 2 · Origin</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-white mb-4 tracking-[-0.02em] leading-[1.05]">Where are you from?</h2>
                    <p className="text-white/50 mb-10 text-base max-w-md mx-auto">Your nationality determines eligibility for most scholarships.</p>
                    <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {COUNTRIES.map((c, i) => (
                        <motion.button key={c.v} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025, duration: 0.4 }}
                          onClick={() => { setWiz(w => ({ ...w, nationality: c.v })); setWizardStep(2); }}
                          className={`group flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border transition-all hover:scale-[1.04] active:scale-95 ${wiz.nationality === c.v ? "bg-gradient-to-br from-amber-300 to-amber-400 text-slate-900 border-amber-300 shadow-xl shadow-amber-500/30" : "bg-white/[0.03] border-white/12 text-white hover:bg-white/[0.07] hover:border-white/25 backdrop-blur-md"}`}>
                          <span className="text-2xl">{c.f}</span>
                          <span className="text-xs font-medium leading-tight">{c.v}</span>
                        </motion.button>
                      ))}
                      <button onClick={() => setWiz(w => ({ ...w, nationality: "other" }))}
                        className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border transition-all hover:scale-[1.04] ${wiz.nationality === "other" ? "bg-gradient-to-br from-amber-300 to-amber-400 text-slate-900 border-amber-300" : "bg-white/[0.03] border-white/12 text-white hover:bg-white/[0.07] hover:border-white/25 backdrop-blur-md"}`}>
                        <span className="text-2xl">🌍</span>
                        <span className="text-xs font-medium">Other</span>
                      </button>
                    </div>
                    {wiz.nationality === "other" && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 w-full max-w-md mx-auto space-y-3">
                        <Input value={wiz.customNationality} onChange={e => setWiz(w => ({ ...w, customNationality: e.target.value }))} placeholder="Type your country..."
                          className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 backdrop-blur-md" />
                        <Button variant="gold" onClick={() => setWizardStep(2)} disabled={!wiz.customNationality} className="w-full gap-2">Continue <ArrowRight className="h-4 w-4" /></Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div key="ws2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center relative z-10">
                    <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 3 · Path</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-white mb-4 tracking-[-0.02em] leading-[1.05]">What will you study?</h2>
                    <p className="text-white/50 mb-10 text-base">Pick the level you're applying for.</p>
                    <div className="w-full grid grid-cols-3 gap-4 mb-10">
                      {DEGREES.map((d, i) => (
                        <motion.button key={d.v} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                          onClick={() => setWiz(w => ({ ...w, degree: d.v }))}
                          className={`flex flex-col items-center gap-2.5 p-6 rounded-3xl border transition-all hover:scale-[1.03] active:scale-95 ${wiz.degree === d.v ? "bg-gradient-to-br from-amber-300 to-amber-400 text-slate-900 border-amber-300 shadow-xl shadow-amber-500/30" : "bg-white/[0.03] border-white/12 text-white hover:bg-white/[0.07] hover:border-white/25 backdrop-blur-md"}`}>
                          <span className="text-4xl">{d.icon}</span>
                          <span className="font-semibold text-base">{d.l}</span>
                          <span className={`text-xs leading-tight ${wiz.degree === d.v ? "opacity-70" : "opacity-50"}`}>{d.d}</span>
                        </motion.button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {wiz.degree && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="w-full">
                          <p className="text-white/50 text-sm mb-4">And your field?</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {FIELDS.map((f, i) => (
                              <motion.button key={f.v} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                onClick={() => setWiz(w => ({ ...w, field: f.v }))}
                                className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-xs font-medium transition-all hover:scale-[1.04] ${wiz.field === f.v ? "bg-gradient-to-br from-amber-300 to-amber-400 text-slate-900 border-amber-300" : "bg-white/[0.03] border-white/12 text-white hover:bg-white/[0.07] backdrop-blur-md"}`}>
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
                          <Button variant="gold" size="lg" onClick={() => setWizardStep(3)} className="px-12 gap-2 shadow-xl shadow-amber-500/25">
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
                    <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 4 · Stats</p>
                    <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-white mb-4 tracking-[-0.02em] leading-[1.05]">Your scores.</h2>
                    <p className="text-white/50 mb-10 text-base">Leave blank if you don't have them yet.</p>
                    <div className="w-full space-y-6 text-left">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">GPA</label>
                        <div className="flex gap-2">
                          <Input value={wiz.gpa} onChange={e => setWiz(w => ({ ...w, gpa: e.target.value }))} placeholder="e.g. 3.8"
                            className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-13 flex-1 backdrop-blur-md focus-visible:border-amber-300/50" />
                          <div className="flex rounded-xl overflow-hidden border border-white/15 backdrop-blur-md">
                            {["/4.0", "/5.0", "/100"].map(s => (
                              <button key={s} onClick={() => setWiz(w => ({ ...w, gpaScale: s.slice(1) }))}
                                className={`px-4 text-xs font-semibold transition-colors ${wiz.gpaScale === s.slice(1) ? "bg-gradient-to-br from-amber-300 to-amber-400 text-slate-900" : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"}`}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">IELTS score (optional)</label>
                        <Input value={wiz.ielts} onChange={e => setWiz(w => ({ ...w, ielts: e.target.value }))} placeholder="e.g. 7.0"
                          className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-13 backdrop-blur-md focus-visible:border-amber-300/50" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Funding situation</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ v: "low", l: "Need full funding", d: "Can't self-fund tuition" }, { v: "medium", l: "Can cover some", d: "Partial support is OK" }].map(b => (
                            <button key={b.v} onClick={() => setWiz(w => ({ ...w, budget: b.v }))}
                              className={`flex flex-col items-start gap-1 p-4 rounded-2xl border text-left transition-all ${wiz.budget === b.v ? "bg-gradient-to-br from-amber-300 to-amber-400 text-slate-900 border-amber-300 shadow-lg" : "bg-white/[0.03] border-white/12 text-white hover:bg-white/[0.07] backdrop-blur-md"}`}>
                              <span className="text-sm font-semibold">{b.l}</span>
                              <span className={`text-xs ${wiz.budget === b.v ? "opacity-70" : "opacity-50"}`}>{b.d}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button variant="gold" size="lg" className="mt-10 px-12 gap-2 text-base shadow-2xl shadow-amber-500/40" onClick={completeWizard}>
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
                    className="absolute inset-0 rounded-full border border-dashed border-amber-300/30" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-3 rounded-full border border-dashed border-amber-300/15" />
                  <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 backdrop-blur flex items-center justify-center shadow-2xl shadow-amber-500/40">
                    <Sparkles className="h-9 w-9 text-slate-900" />
                  </motion.div>
                </div>
                <div className="space-y-3">
                  <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">Reading your profile...</h2>
                  <p className="text-white/40 text-sm">This usually takes a few seconds.</p>
                </div>
                <div className="w-full bg-white/8 rounded-full h-1 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300"
                    style={{ backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }}
                    animate={{ width: `${Math.min((analysisStep / 5) * 100, 100)}%` }} transition={{ duration: 0.4 }} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p key={analysisStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="text-white/65 text-sm font-mono tracking-wide">
                    {analysisTexts[Math.min(analysisStep, analysisTexts.length - 1)]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ══ RESULTS ══ */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
              {/* ── Hero briefing ── */}
              <section className="relative bg-gradient-to-br from-slate-950 via-[#0a1729] to-slate-950 pt-12 pb-14 sm:pt-20 sm:pb-20 overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute -top-1/3 left-1/4 w-[40vw] h-[40vw] rounded-full blur-[140px] opacity-25" style={{ background: "radial-gradient(circle, hsl(42 90% 55%) 0%, transparent 70%)" }} />
                  <div className="absolute -bottom-1/4 right-0 w-[40vw] h-[40vw] rounded-full blur-[140px] opacity-20" style={{ background: "radial-gradient(circle, hsl(200 80% 50%) 0%, transparent 70%)" }} />
                  <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "28px 28px" }} />
                </div>

                <div className="max-w-7xl mx-auto px-6 sm:px-8 relative">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                    {wiz.fullName && <p className="text-amber-300/80 text-sm font-semibold tracking-[0.06em] mb-4 uppercase">Welcome back, {wiz.fullName}</p>}
                    <h1 className="font-heading text-[clamp(2.25rem,5.5vw,4.5rem)] font-bold text-white leading-[1.05] tracking-[-0.025em] max-w-4xl">
                      {loading ? "Loading your matches..." : (
                        <>
                          You have{" "}
                          <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent tabular-nums">
                            {stats.strong + stats.competitive}
                          </span>{" "}
                          real opportunities.
                        </>
                      )}
                    </h1>
                    <p className="text-white/55 text-lg sm:text-xl max-w-2xl mt-5 leading-relaxed font-light">
                      Based on your profile, we ranked all <span className="text-white font-medium tabular-nums">{rows.length}</span> scholarships in our database. Here's where you have a real shot.
                    </p>

                    <div className="flex flex-wrap gap-2 mt-7">
                      {[profile.country, profile.degree, profile.gpa ? `GPA ${profile.gpa}/${profile.gpaScale}` : null, profile.ielts ? `IELTS ${profile.ielts}` : null].filter(Boolean).map(chip => (
                        <span key={chip} className="text-xs bg-white/[0.05] text-white/70 border border-white/12 backdrop-blur-md px-3 py-1.5 rounded-full font-medium">{chip}</span>
                      ))}
                      <button onClick={resetProfile} className="text-xs text-white/35 hover:text-amber-300 transition-colors flex items-center gap-1.5 px-2.5 py-1.5 font-medium">
                        <RefreshCw className="h-3 w-3" /> Update profile
                      </button>
                    </div>
                  </motion.div>

                  {/* Stats row */}
                  {!loading && (
                    <Reveal delay={0.15} y={28} className="mt-12 pt-10 border-t border-white/8">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-7">
                        <InlineStat label="Strong matches" value={stats.strong} color="text-emerald-300" icon={Trophy} delay={0.05} />
                        <InlineStat label="Worth a shot" value={stats.competitive} color="text-amber-300" icon={Target} delay={0.1} />
                        <InlineStat label="Closing soon" value={stats.closing} color="text-rose-300" icon={Flame} delay={0.15} />
                        <InlineStat label="Funding pool" value={stats.totalValue} color="text-amber-200" icon={Sparkles} isMoney delay={0.2} />
                      </div>
                    </Reveal>
                  )}

                  {/* Match landscape */}
                  {!loading && ranked.length > 0 && (
                    <Reveal delay={0.3} className="mt-10 pt-8 border-t border-white/8">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white/35 text-[10px] uppercase tracking-[0.22em] mb-1 font-semibold">Match landscape</p>
                          <p className="text-white/60 text-xs">Each bar is one scholarship · click to view</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-[11px] text-white/40 font-medium">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Strong</span>
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Competitive</span>
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-500" />Lower</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-[2px] h-20 overflow-hidden rounded-2xl bg-white/[0.025] p-2">
                        {ranked.map((s, i) => (
                          <motion.div
                            key={s.scholarship_id}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${Math.max(s.match, 8)}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.012, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex-1 min-w-[3px] rounded-t cursor-pointer transition-all opacity-80 hover:opacity-100 hover:scale-y-110 origin-bottom ${
                              s.priority === "strong_match" ? "bg-gradient-to-t from-emerald-500 to-emerald-300" :
                              s.priority === "competitive" ? "bg-gradient-to-t from-amber-500 to-amber-300" :
                              "bg-gradient-to-t from-zinc-600/60 to-zinc-400/40"
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

              {/* ── Sticky toolbar ── */}
              <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 py-3.5 flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search scholarships..."
                      className="pl-10 h-11 text-sm rounded-xl border-border/60" />
                    {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <Button variant="outline" size="default" className="lg:hidden gap-1.5 h-11 rounded-xl" onClick={() => setFiltersOpen(true)}>
                    <Filter className="h-4 w-4" />Filters{activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 ml-0.5">{activeFiltersCount}</Badge>}
                  </Button>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                    <SelectTrigger className="w-[160px] h-11 text-sm rounded-xl border-border/60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">Best match</SelectItem>
                      <SelectItem value="deadline">Deadline first</SelectItem>
                      <SelectItem value="value">Highest value</SelectItem>
                      <SelectItem value="effort">Easiest first</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground hidden sm:inline ml-auto tabular-nums">{filtered.length} of {ranked.length}</span>
                </div>
              </div>

              {/* ── Results body ── */}
              <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-16">
                <div className="flex gap-10">
                  {/* Sidebar */}
                  <aside className="hidden lg:block w-[220px] shrink-0">
                    <div className="sticky top-24 bg-card border border-border/60 rounded-3xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" />Refine</h3>
                        {activeFiltersCount > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0">{activeFiltersCount}</Badge>}
                      </div>
                      <FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} />
                    </div>
                  </aside>

                  {/* Content */}
                  <main className="flex-1 min-w-0">
                    {loading ? (
                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-card border border-border/60 rounded-3xl animate-pulse" />)}
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
                        {/* Hero featured */}
                        {sections.hero.length > 0 && (
                          <section>
                            <Reveal y={20}>
                              <p className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4 flex items-center gap-2">
                                <span className="h-px w-6 bg-amber-500" /> Top match for you
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

                        {/* Strong */}
                        {sections.strong.length > 0 && (
                          <section>
                            <SectionHeader kicker="Strong matches" title="Where you have a real shot" subtitle="High alignment with your profile and goals."
                              count={sections.strong.length} accentClass="text-emerald-600 dark:text-emerald-400" />
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

                        {/* Competitive */}
                        {sections.competitive.length > 0 && (
                          <section>
                            <SectionHeader kicker="Competitive" title="Worth a shot" subtitle="Achievable with a strong, well-targeted application."
                              count={sections.competitive.length} accentClass="text-amber-600 dark:text-amber-400" />
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

                        {/* Stretch */}
                        {sections.stretch.length > 0 && (
                          <section>
                            <SectionHeader kicker="Stretch" title="Long shots" subtitle="Lower fit — apply only if you have bandwidth."
                              count={sections.stretch.length} accentClass="text-zinc-500 dark:text-zinc-400" />
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
              className="fixed bottom-6 right-6 z-40 bg-gradient-to-br from-amber-300 to-amber-500 text-slate-900 font-bold pl-5 pr-4 py-3.5 rounded-2xl shadow-2xl shadow-amber-500/40 hover:scale-[1.03] transition-transform flex items-center gap-3"
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
                <BookmarkCheck className="h-5 w-5 text-amber-500" /> Your shortlist · {shortlist.size}
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
                    className="w-full text-left bg-card border border-border/60 rounded-2xl p-3.5 hover:border-amber-500/40 hover:shadow-md transition-all flex items-start gap-3 group">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tier.grad} flex items-center justify-center text-xl shrink-0 shadow-sm`}>{flag}</div>
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
            <div className="mt-5"><FiltersPanel filters={filters} setFilters={setFilters} activeCount={activeFiltersCount} /></div>
          </SheetContent>
        </Sheet>

        <DetailSheet s={openDetail} open={!!openDetail} onClose={() => setOpenDetail(null)}
          isBookmarked={openDetail ? shortlist.has(openDetail.scholarship_id) : false}
          onBookmark={() => openDetail && toggleBookmark(openDetail.scholarship_id)} />
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .h-13 { height: 3.25rem; }
      `}</style>
    </div>
  );
};

export default Discover;
