import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Clock, CheckCircle2, AlertTriangle,
  ExternalLink, BookmarkCheck, Bookmark,
  ChevronLeft, Zap, RefreshCw, Star, PenTool, Award, Lightbulb,
} from "lucide-react";
import { getStoredProfile, saveProfile } from "@/components/discover/DiscoverProfileGate";

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
  degree: string; field: string; gpa: string; gpaScale: string;
  ielts: string; budget: string;
}

type Phase = "landing" | "wizard" | "analyzing" | "briefing" | "all";

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
    else { eligibility = "not_eligible"; match -= 40; reasons.push(`Not available to ${p.country} nationals`); }
  }
  if (s.target_degree_level && p.degree) {
    if (s.target_degree_level.some(d => d.toLowerCase() === p.degree.toLowerCase())) {
      match += 10; reasons.push(`Matches ${p.degree} level`);
    } else { eligibility = "not_eligible"; match -= 25; }
  }
  if (s.min_gpa && p.gpa) {
    const ug = normalizeGpa(parseFloat(p.gpa), parseFloat(p.gpaScale));
    const rg = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
    if (ug >= rg) { match += 15; reasons.push(`GPA meets the ${s.min_gpa}/${s.gpa_scale ?? 4.0} requirement`); }
    else if (ug >= rg - 0.3) { match += 5; reasons.push("GPA borderline — strengthen other areas"); if (eligibility !== "not_eligible") eligibility = "missing"; }
    else { match -= 20; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`GPA below minimum (${s.min_gpa}/${s.gpa_scale ?? 4.0})`); }
  }
  if (s.min_ielts && p.ielts) {
    const u = parseFloat(p.ielts);
    if (u >= s.min_ielts) { match += 8; reasons.push(`IELTS ${u} meets the ${s.min_ielts} requirement`); }
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
  { v: "undergraduate", l: "Bachelor's", icon: "🎓", d: "3–5 year degree" },
  { v: "master's", l: "Master's", icon: "📚", d: "1–2 year graduate" },
  { v: "PhD", l: "PhD", icon: "🔬", d: "Research doctorate" },
];

const FIELDS = [
  { v: "Computer Science & IT", i: "💻" }, { v: "Business & Management", i: "📊" },
  { v: "Engineering", i: "⚙️" }, { v: "Medicine & Health", i: "🏥" },
  { v: "Natural Sciences", i: "🔬" }, { v: "Social Sciences", i: "🌐" },
  { v: "Arts & Humanities", i: "📖" }, { v: "Law", i: "⚖️" },
];

const WIZARD_STEPS = 4;

const DEFAULT_WIZARD: WizardData = {
  fullName: "", email: "", nationality: "", customNationality: "",
  degree: "", field: "", gpa: "", gpaScale: "4.0", ielts: "", budget: "low",
};

const fmtValue = (v: number) =>
  v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` :
  v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

const deadlineDisplay = (d: string | null) => {
  if (!d) return { text: "Rolling deadline", cls: "text-muted-foreground" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: "Closed", cls: "text-muted-foreground line-through" };
  if (days <= 30) return { text: `${days} days left`, cls: "text-red-500 font-semibold" };
  if (days <= 90) return { text: `${days} days left`, cls: "text-amber-500 font-semibold" };
  return { text: `${Math.ceil(days / 30)} months away`, cls: "text-muted-foreground" };
};

const COVERAGE_LABEL: Record<string, string> = {
  full_ride: "Full ride", tuition_only: "Tuition covered", stipend: "Stipend",
};

/* Detail Sheet */
const DetailSheet = ({ s, open, onClose, isBookmarked, onBookmark }: {
  s: Scored | null; open: boolean; onClose: () => void;
  isBookmarked: boolean; onBookmark: () => void;
}) => {
  if (!s) return null;
  const dl = deadlineDisplay(s.application_deadline);
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto p-0">
        <div className="bg-primary px-6 pt-7 pb-6">
          <SheetHeader>
            <SheetTitle className="text-primary-foreground font-heading text-xl leading-snug">{s.scholarship_name}</SheetTitle>
            <p className="text-primary-foreground/60 text-sm mt-1">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
          </SheetHeader>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.priority === "strong_match" && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border text-xs">Strong match</Badge>}
            {s.priority === "competitive" && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 border text-xs">Competitive</Badge>}
            {s.coverage_type && <Badge className="bg-primary-foreground/10 text-primary-foreground/80 border-primary-foreground/20 border text-xs">{COVERAGE_LABEL[s.coverage_type] || s.coverage_type}</Badge>}
            {s.estimated_total_value_usd ? <Badge className="bg-gold/20 text-gold border-gold/30 border text-xs">{fmtValue(s.estimated_total_value_usd)}</Badge> : null}
          </div>
        </div>
        <div className="px-6 py-5 space-y-5 text-sm">
          {s.reasons.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">Why you matched</h4>
              <div className="space-y-1.5">
                {s.reasons.map((r, i) => {
                  const pos = !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not available");
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
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">Requirements</h4>
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
              {s.citizenship_requirements && <div className="flex flex-col gap-0.5"><span className="text-muted-foreground">Citizenship</span><span className="font-medium">{s.citizenship_requirements}</span></div>}
            </div>
          </section>
          {s.required_documents && s.required_documents.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">Documents needed</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {s.required_documents.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />{d}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {s.essay_required && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" />Essay</span>}
                {s.interview_required && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" />Interview</span>}
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
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Strategy</h4>
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
            <div className="bg-primary/5 border border-border rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-foreground/80">Need to improve your scores?</p>
              <Button size="sm" variant="outline" asChild className="shrink-0 text-xs">
                <Link to="/prep">Open Prep <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          )}
          <div className="flex gap-2 pb-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onBookmark}>
              {isBookmarked ? <><BookmarkCheck className="h-4 w-4 mr-1.5 text-accent" />Saved</> : <><Bookmark className="h-4 w-4 mr-1.5" />Save</>}
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

/* Pick card (top scholarships in briefing) */
const PickCard = ({ s, rank, onSelect, isBookmarked, onBookmark }: {
  s: Scored; rank: number; onSelect: () => void;
  isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
}) => {
  const dl = deadlineDisplay(s.application_deadline);
  const isTop = rank === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.08 }}
      className={`rounded-2xl border overflow-hidden cursor-pointer group transition-all hover:shadow-md ${isTop ? "border-gold/40 bg-gradient-to-br from-card to-gold/5" : "border-border bg-card hover:border-accent/30"}`}
      onClick={onSelect}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          {isTop ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-full">
              <Star className="h-2.5 w-2.5" />Top pick
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="h-2.5 w-2.5" />Strong match
            </span>
          )}
          <button onClick={onBookmark} className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors">
            {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
          </button>
        </div>
        <h3 className={`font-heading font-bold leading-tight mb-1 ${isTop ? "text-xl" : "text-lg"}`}>{s.scholarship_name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{[s.provider_name, s.host_country].filter(Boolean).join(" · ")}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-sm font-bold ${isTop ? "text-gold" : "text-accent"}`}>
            {s.award_amount_text || COVERAGE_LABEL[s.coverage_type] || "—"}
          </span>
          {s.estimated_total_value_usd ? (
            <span className="text-sm text-muted-foreground">· Est. {fmtValue(s.estimated_total_value_usd)}</span>
          ) : null}
        </div>
        {s.reasons.filter(r => !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not available")).slice(0, 3).length > 0 && (
          <div className="space-y-1.5 mb-4">
            {s.reasons.filter(r => !r.toLowerCase().includes("below") && !r.toLowerCase().includes("not available")).slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{r}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs mb-5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className={dl.cls}>
            {s.application_deadline
              ? `${new Date(s.application_deadline).toLocaleDateString("en-US", { month: "long", year: "numeric" })} — ${dl.text}`
              : dl.text}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={isTop ? "gold" : "default"} className="flex-1 text-xs" onClick={e => { e.stopPropagation(); onSelect(); }}>
            Full details & strategy <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          {s.official_url && (
            <Button size="sm" variant="outline" asChild className="text-xs" onClick={e => e.stopPropagation()}>
              <a href={s.official_url} target="_blank" rel="noopener noreferrer">Apply <ExternalLink className="h-3 w-3 ml-1" /></a>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* Near-miss card */
const NearMissCard = ({ s, onSelect }: { s: Scored; onSelect: () => void }) => {
  const gaps = s.reasons.filter(r => r.toLowerCase().includes("below") || r.toLowerCase().includes("borderline"));
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 cursor-pointer hover:border-amber-500/40 transition-colors" onClick={onSelect}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-foreground leading-snug">{s.scholarship_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{s.host_country}</p>
        </div>
        {s.estimated_total_value_usd ? <span className="text-sm font-bold text-foreground shrink-0">{fmtValue(s.estimated_total_value_usd)}</span> : null}
      </div>
      {gaps.slice(0, 2).map((g, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 mb-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />{g}
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between">
        <Link to="/prep" onClick={e => e.stopPropagation()} className="text-xs text-accent underline underline-offset-2 hover:text-accent/80">
          Improve your scores →
        </Link>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">Details →</button>
      </div>
    </div>
  );
};

/* Simple list row */
const AllRow = ({ s, onSelect, isBookmarked, onBookmark }: {
  s: Scored; onSelect: () => void; isBookmarked: boolean; onBookmark: (e: React.MouseEvent) => void;
}) => {
  const dl = deadlineDisplay(s.application_deadline);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors border-b border-border last:border-b-0 ${s.priority === "strong_match" ? "border-l-2 border-l-emerald-500" : s.priority === "competitive" ? "border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent"}`}
      onClick={onSelect}
    >
      <div className={`h-2 w-2 rounded-full shrink-0 ${s.priority === "strong_match" ? "bg-emerald-500" : s.priority === "competitive" ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{s.scholarship_name}</p>
        <p className="text-xs text-muted-foreground truncate">{[s.host_country, s.coverage_type ? COVERAGE_LABEL[s.coverage_type] : null].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
        {s.estimated_total_value_usd ? <span className="font-medium text-foreground">{fmtValue(s.estimated_total_value_usd)}</span> : null}
        <span className={dl.cls}>{dl.text}</span>
      </div>
      <button onClick={onBookmark} className="p-1 rounded hover:bg-muted transition-colors shrink-0">
        {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );
};

/* Main */
interface Props { language?: "en" | "ru" }

const Discover = ({ language = "en" }: Props) => {
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({ country: "", degree: "", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" });
  const [phase, setPhase] = useState<Phase>(() => getStoredProfile()?.nationality ? "briefing" : "landing");
  const [wizardStep, setWizardStep] = useState(0);
  const [wiz, setWiz] = useState<WizardData>(DEFAULT_WIZARD);
  const [openDetail, setOpenDetail] = useState<Scored | null>(null);
  const [shortlist, setShortlist] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("tu_shortlist") || "[]")); }
    catch { return new Set(); }
  });
  const [analysisStep, setAnalysisStep] = useState(0);
  const [searchAll, setSearchAll] = useState("");

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
        degree: stored.targetDegree === "phd" ? "PhD" : stored.targetDegree === "master" ? "master's" : stored.targetDegree || "undergraduate",
        gpa: stored.gpa || "",
        gpaScale: "4.0",
        ielts: stored.ieltsScore || "",
        sat: "",
        field: stored.fieldOfInterest || "",
        budget: stored.budgetRange?.startsWith("0") || stored.budgetRange?.startsWith("5000") ? "low" : "medium",
      });
    }
  }, []);

  useEffect(() => {
    if (phase !== "analyzing") return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setAnalysisStep(i);
      if (i >= 5) { clearInterval(interval); setTimeout(() => setPhase("briefing"), 400); }
    }, 450);
    return () => clearInterval(interval);
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
    const newProfile: Profile = { country, degree: wiz.degree, gpa: wiz.gpa, gpaScale: wiz.gpaScale, ielts: wiz.ielts, sat: "", field: wiz.field, budget: wiz.budget };
    setProfile(newProfile);
    saveProfile({ fullName: wiz.fullName, email: wiz.email, nationality: country, targetDegree: wiz.degree, gpa: wiz.gpa, ieltsScore: wiz.ielts, budgetRange: wiz.budget === "low" ? "0-5000" : "15000+", fieldOfInterest: wiz.field });
    setAnalysisStep(0);
    setPhase("analyzing");
  };

  const resetProfile = () => { setWiz(DEFAULT_WIZARD); setWizardStep(0); setPhase("wizard"); };

  const ranked = useMemo(() => {
    const p = profile.country || profile.degree ? profile : { country: "", degree: "master's", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" };
    return rows.map(r => scoreScholarship(r, p)).sort((a, b) => {
      const e = { eligible: 0, likely: 1, missing: 2, not_eligible: 3 };
      if (e[a.eligibility] !== e[b.eligibility]) return e[a.eligibility] - e[b.eligibility];
      return b.match - a.match;
    });
  }, [rows, profile]);

  const topPicks = useMemo(() => ranked.filter(s => s.priority === "strong_match" || s.priority === "competitive").slice(0, 3), [ranked]);
  const nearMisses = useMemo(() => ranked.filter(s => s.eligibility === "missing" && s.priority !== "strong_match").slice(0, 3), [ranked]);
  const totalValue = useMemo(() => topPicks.reduce((sum, s) => sum + (s.estimated_total_value_usd ?? 0), 0), [topPicks]);

  const filteredAll = useMemo(() => {
    if (!searchAll) return ranked;
    const q = searchAll.toLowerCase();
    return ranked.filter(s => s.scholarship_name.toLowerCase().includes(q) || (s.host_country?.toLowerCase() || "").includes(q) || (s.provider_name?.toLowerCase() || "").includes(q));
  }, [ranked, searchAll]);

  const analysisTexts = [
    `Scanning ${rows.length || 42} verified scholarships...`,
    `Filtering by nationality${wiz.nationality ? `: ${wiz.nationality}` : ""}...`,
    `Matching ${wiz.degree || "your degree"} programs...`,
    "Evaluating academic thresholds...",
    "Ranking your best opportunities...",
  ];

  const dark = phase === "landing" || phase === "wizard" || phase === "analyzing";

  return (
    <div className={`min-h-screen transition-colors duration-500 ${dark ? "bg-primary" : "bg-background"}`}>
      <Navigation language={language} />

      <AnimatePresence mode="wait">
        {/* LANDING */}
        {phase === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }} className="max-w-2xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 px-3 py-1.5 rounded-full text-gold text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> Scholarship database
              </div>
              <div className="space-y-4">
                <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-primary-foreground leading-[1.05] tracking-tight">
                  Find the scholarships<br /><span className="text-gold">made for you.</span>
                </h1>
                <p className="text-primary-foreground/60 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
                  Answer 4 questions. We match your profile against {rows.length || 42} verified scholarships and show you where you have a real shot.
                </p>
              </div>
              <Button variant="gold" size="lg" className="text-base px-10 py-6 hover:scale-105 transition-transform gap-2 shadow-lg shadow-gold/20" onClick={() => setPhase("wizard")}>
                Find my scholarships <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center gap-6 text-xs text-primary-foreground/35">
                <span>2 minutes</span><span>·</span><span>No account needed</span><span>·</span><span>Free</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* WIZARD */}
        {phase === "wizard" && (
          <motion.div key="wizard" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
            className="min-h-[calc(100vh-64px)] flex flex-col">
            <div className="pt-6 px-6 flex items-center justify-between max-w-2xl mx-auto w-full">
              <button onClick={() => wizardStep === 0 ? setPhase("landing") : setWizardStep(s => s - 1)} className="text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors p-1">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-2">
                {Array.from({ length: WIZARD_STEPS }).map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < wizardStep ? "w-8 bg-gold" : i === wizardStep ? "w-8 bg-gold/60" : "w-8 bg-primary-foreground/15"}`} />
                ))}
              </div>
              <span className="text-primary-foreground/40 text-xs">{wizardStep + 1}/{WIZARD_STEPS}</span>
            </div>

            <AnimatePresence mode="wait">
              {wizardStep === 0 && (
                <motion.div key="ws0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center">
                  <h2 className="font-heading text-4xl sm:text-5xl font-bold text-primary-foreground mb-3 tracking-tight">Let's get started</h2>
                  <p className="text-primary-foreground/50 mb-10">Your results stay on your device. No spam.</p>
                  <div className="w-full space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/50">Your name</label>
                      <Input value={wiz.fullName} onChange={e => setWiz(w => ({ ...w, fullName: e.target.value }))} placeholder="First name (optional)"
                        className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 h-12 text-base" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/50">Email *</label>
                      <Input type="email" value={wiz.email} onChange={e => setWiz(w => ({ ...w, email: e.target.value }))} placeholder="you@email.com"
                        className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 h-12 text-base" />
                    </div>
                  </div>
                  <Button variant="gold" size="lg" className="mt-8 px-12 gap-2 text-base" disabled={!wiz.email} onClick={() => setWizardStep(1)}>
                    Continue <ArrowRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              {wizardStep === 1 && (
                <motion.div key="ws1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center">
                  <h2 className="font-heading text-4xl sm:text-5xl font-bold text-primary-foreground mb-3 tracking-tight">Where are you from?</h2>
                  <p className="text-primary-foreground/50 mb-8">Your nationality determines eligibility for most scholarships.</p>
                  <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {COUNTRIES.map(c => (
                      <button key={c.v} onClick={() => { setWiz(w => ({ ...w, nationality: c.v })); setWizardStep(2); }}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-105 active:scale-95 ${wiz.nationality === c.v ? "bg-gold text-primary border-gold shadow-lg" : "bg-primary-foreground/8 border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15"}`}>
                        <span className="text-2xl">{c.f}</span>
                        <span className="text-xs leading-tight">{c.v}</span>
                      </button>
                    ))}
                    <button onClick={() => setWiz(w => ({ ...w, nationality: "other" }))}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-105 ${wiz.nationality === "other" ? "bg-gold text-primary border-gold" : "bg-primary-foreground/8 border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15"}`}>
                      <span className="text-2xl">🌍</span><span className="text-xs">Other</span>
                    </button>
                  </div>
                  {wiz.nationality === "other" && (
                    <div className="mt-4 w-full space-y-3">
                      <Input value={wiz.customNationality} onChange={e => setWiz(w => ({ ...w, customNationality: e.target.value }))} placeholder="Type your country..."
                        className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 h-11" />
                      <Button variant="gold" onClick={() => setWizardStep(2)} disabled={!wiz.customNationality} className="w-full gap-2">
                        Continue <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {wizardStep === 2 && (
                <motion.div key="ws2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full text-center">
                  <h2 className="font-heading text-4xl sm:text-5xl font-bold text-primary-foreground mb-3 tracking-tight">What will you study?</h2>
                  <p className="text-primary-foreground/50 mb-8">Pick the degree level you're applying for.</p>
                  <div className="w-full grid grid-cols-3 gap-3 mb-8">
                    {DEGREES.map(d => (
                      <button key={d.v} onClick={() => setWiz(w => ({ ...w, degree: d.v }))}
                        className={`flex flex-col items-center gap-2 p-5 rounded-2xl border font-medium transition-all hover:scale-105 active:scale-95 ${wiz.degree === d.v ? "bg-gold text-primary border-gold shadow-lg" : "bg-primary-foreground/8 border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15"}`}>
                        <span className="text-3xl">{d.icon}</span>
                        <span className="font-semibold text-sm">{d.l}</span>
                        <span className="text-[11px] opacity-60 leading-tight">{d.d}</span>
                      </button>
                    ))}
                  </div>
                  {wiz.degree && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                      <p className="text-primary-foreground/50 text-sm mb-4">And your field of study?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FIELDS.map(f => (
                          <button key={f.v} onClick={() => setWiz(w => ({ ...w, field: f.v }))}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all hover:scale-105 ${wiz.field === f.v ? "bg-gold text-primary border-gold" : "bg-primary-foreground/8 border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15"}`}>
                            <span>{f.i}</span><span>{f.v.split(" &")[0]}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {wiz.degree && wiz.field && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                      <Button variant="gold" size="lg" onClick={() => setWizardStep(3)} className="px-12 gap-2">
                        Continue <ArrowRight className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {wizardStep === 3 && (
                <motion.div key="ws3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto w-full text-center">
                  <h2 className="font-heading text-4xl sm:text-5xl font-bold text-primary-foreground mb-3 tracking-tight">Your scores</h2>
                  <p className="text-primary-foreground/50 mb-8">Don't have them yet? Leave blank — we'll show what you need to aim for.</p>
                  <div className="w-full space-y-5 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/50">GPA</label>
                      <div className="flex gap-2">
                        <Input value={wiz.gpa} onChange={e => setWiz(w => ({ ...w, gpa: e.target.value }))} placeholder="e.g. 3.8"
                          className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 h-12 flex-1" />
                        <div className="flex rounded-lg overflow-hidden border border-primary-foreground/20">
                          {["/4.0", "/5.0", "/100"].map(s => (
                            <button key={s} onClick={() => setWiz(w => ({ ...w, gpaScale: s.slice(1) }))}
                              className={`px-3 text-xs font-medium transition-colors ${wiz.gpaScale === s.slice(1) ? "bg-gold text-primary" : "bg-primary-foreground/8 text-primary-foreground/60 hover:bg-primary-foreground/15"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/50">IELTS score (or target)</label>
                      <Input value={wiz.ielts} onChange={e => setWiz(w => ({ ...w, ielts: e.target.value }))} placeholder="e.g. 7.0  (optional)"
                        className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 h-12" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/50">Funding situation</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ v: "low", l: "Need full funding", d: "Can't cover tuition myself" }, { v: "medium", l: "Can cover some", d: "Partial support is OK" }].map(b => (
                          <button key={b.v} onClick={() => setWiz(w => ({ ...w, budget: b.v }))}
                            className={`flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all ${wiz.budget === b.v ? "bg-gold text-primary border-gold" : "bg-primary-foreground/8 border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15"}`}>
                            <span className="text-sm font-semibold">{b.l}</span>
                            <span className="text-[11px] opacity-60">{b.d}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="gold" size="lg" className="mt-10 px-12 gap-2 text-base shadow-lg shadow-gold/20" onClick={completeWizard}>
                    <Zap className="h-5 w-5" /> Show my scholarships
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ANALYZING */}
        {phase === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center">
            <div className="max-w-md mx-auto space-y-10">
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gold/15 border border-gold/30 mx-auto">
                  <Sparkles className="h-8 w-8 text-gold" />
                </div>
                <h2 className="font-heading text-3xl font-bold text-primary-foreground">Matching your profile...</h2>
              </div>
              <div className="w-full bg-primary-foreground/10 rounded-full h-1.5 overflow-hidden">
                <motion.div className="h-full bg-gold rounded-full" animate={{ width: `${Math.min((analysisStep / 5) * 100, 100)}%` }} transition={{ duration: 0.4 }} />
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={analysisStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-primary-foreground/60 text-base">
                  {analysisTexts[Math.min(analysisStep, analysisTexts.length - 1)]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* BRIEFING + ALL */}
        {(phase === "briefing" || phase === "all") && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Impact header */}
            <section className="bg-primary py-10 sm:py-14">
              <div className="max-w-3xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                  <div>
                    {loading ? (
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-primary-foreground/10 rounded animate-pulse" />
                        <div className="h-10 w-72 bg-primary-foreground/10 rounded-xl animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <p className="text-primary-foreground/50 text-sm mb-1">
                          {wiz.fullName ? `${wiz.fullName}, here's` : "Here's"} your briefing
                        </p>
                        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-primary-foreground leading-tight">
                          {topPicks.length > 0 ? <>{topPicks.length} scholarships <span className="text-gold">matched.</span></> : "Scholarships for you"}
                        </h1>
                        {totalValue > 0 && (
                          <p className="text-primary-foreground/60 text-lg mt-2">
                            Up to <span className="text-gold font-bold">{fmtValue(totalValue)}</span> in opportunities for your profile
                          </p>
                        )}
                      </>
                    )}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {[profile.country, profile.degree, profile.gpa ? `GPA ${profile.gpa}/${profile.gpaScale}` : null, profile.ielts ? `IELTS ${profile.ielts}` : null].filter(Boolean).map(chip => (
                        <span key={chip} className="text-xs bg-primary-foreground/10 text-primary-foreground/70 border border-primary-foreground/20 px-2.5 py-1 rounded-full">{chip}</span>
                      ))}
                      <button onClick={resetProfile} className="text-xs text-primary-foreground/40 hover:text-gold transition-colors flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Update
                      </button>
                    </div>
                  </div>
                  {!loading && topPicks.length > 0 && (
                    <div className="flex gap-3 shrink-0">
                      <div className="bg-emerald-500/15 border border-emerald-500/25 rounded-xl px-4 py-3 text-center">
                        <div className="text-2xl font-bold text-emerald-300">{topPicks.filter(s => s.priority === "strong_match").length}</div>
                        <div className="text-[10px] text-emerald-300/60 uppercase tracking-wide">Strong</div>
                      </div>
                      {nearMisses.length > 0 && (
                        <div className="bg-amber-500/15 border border-amber-500/25 rounded-xl px-4 py-3 text-center">
                          <div className="text-2xl font-bold text-amber-300">{nearMisses.length}</div>
                          <div className="text-[10px] text-amber-300/60 uppercase tracking-wide">Near miss</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
              {loading ? (
                <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-56 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
              ) : phase === "briefing" ? (
                <>
                  {topPicks.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <div className="text-5xl">🔍</div>
                      <h3 className="font-heading text-xl font-bold">No strong matches found yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">Our database is growing. Try browsing all scholarships — you may find opportunities that fit.</p>
                      <Button variant="outline" onClick={() => setPhase("all")}>Browse all scholarships</Button>
                    </div>
                  ) : (
                    <section>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="font-heading text-xl font-bold text-foreground">Your top picks</h2>
                        <span className="text-sm text-muted-foreground">{topPicks.length} opportunities</span>
                      </div>
                      <div className="space-y-4">
                        {topPicks.map((s, i) => (
                          <PickCard key={s.scholarship_id} s={s} rank={i} onSelect={() => setOpenDetail(s)}
                            isBookmarked={shortlist.has(s.scholarship_id)} onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                        ))}
                      </div>
                    </section>
                  )}

                  {nearMisses.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <h2 className="font-heading text-lg font-bold text-foreground">You're close on these</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">One requirement away. Improve your scores to unlock them.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {nearMisses.map(s => <NearMissCard key={s.scholarship_id} s={s} onSelect={() => setOpenDetail(s)} />)}
                      </div>
                    </section>
                  )}

                  {(nearMisses.length > 0 || !profile.ielts) && (
                    <section className="rounded-2xl bg-gradient-to-br from-accent/8 to-primary/5 border border-accent/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <PenTool className="h-4 w-4 text-accent" />
                          <span className="text-sm font-bold text-foreground">Improve your scores, unlock more scholarships</span>
                        </div>
                        <p className="text-sm text-muted-foreground">IELTS prep, SAT practice, AI essay grader.</p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="shrink-0 border-accent/30 hover:bg-accent/10">
                        <Link to="/prep">Open Prep <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
                      </Button>
                    </section>
                  )}

                  <section className="rounded-2xl bg-primary text-primary-foreground p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gold mb-1.5">Expert guidance</p>
                      <h3 className="font-heading text-lg font-bold mb-1">Want help actually applying?</h3>
                      <p className="text-primary-foreground/60 text-sm">Our advisors have walked students through Chevening, DAAD, MEXT, and more. First call is free.</p>
                    </div>
                    <Button variant="gold" size="sm" asChild className="shrink-0">
                      <Link to="/offerings">Book a free call <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
                    </Button>
                  </section>

                  <div className="text-center pt-2 pb-4">
                    <p className="text-sm text-muted-foreground mb-3">Your briefing shows your top matches. {rows.length} scholarships are in the full database.</p>
                    <Button variant="outline" onClick={() => setPhase("all")} className="gap-2">
                      Browse all {rows.length} scholarships <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                /* ALL MODE */
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-heading text-xl font-bold text-foreground">All scholarships</h2>
                      <p className="text-sm text-muted-foreground">Ranked by match to your profile</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setPhase("briefing")} className="text-accent">← My briefing</Button>
                  </div>
                  <input value={searchAll} onChange={e => setSearchAll(e.target.value)} placeholder="Search scholarship, country, provider..."
                    className="w-full h-11 pl-4 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  <div className="flex items-center gap-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />Strong match</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />Competitive</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />Lower fit</span>
                  </div>
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    {filteredAll.length === 0 ? (
                      <p className="p-10 text-center text-muted-foreground text-sm">No scholarships match</p>
                    ) : filteredAll.map(s => (
                      <AllRow key={s.scholarship_id} s={s} onSelect={() => setOpenDetail(s)}
                        isBookmarked={shortlist.has(s.scholarship_id)} onBookmark={e => { e.stopPropagation(); toggleBookmark(s.scholarship_id); }} />
                    ))}
                  </div>
                  <section className="rounded-2xl bg-primary text-primary-foreground p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gold mb-1.5">Expert guidance</p>
                      <h3 className="font-heading text-lg font-bold mb-1">Narrowed your shortlist? Get expert help.</h3>
                      <p className="text-primary-foreground/60 text-sm">First consultation free.</p>
                    </div>
                    <Button variant="gold" size="sm" asChild className="shrink-0">
                      <Link to="/offerings">Book a call <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
                    </Button>
                  </section>
                </>
              )}
            </div>
            <Footer language={language} />
          </motion.div>
        )}
      </AnimatePresence>

      <DetailSheet s={openDetail} open={!!openDetail} onClose={() => setOpenDetail(null)}
        isBookmarked={openDetail ? shortlist.has(openDetail.scholarship_id) : false}
        onBookmark={() => openDetail && toggleBookmark(openDetail.scholarship_id)} />
    </div>
  );
};

export default Discover;
