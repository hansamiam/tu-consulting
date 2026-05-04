import { useState, useEffect, useMemo } from "react";
import { trackPageView } from "@/utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { Footer } from "@/components/Footer";
import topuniBg from "@/assets/topuni-bg.jpg";
import TopUniChat from "@/components/TopUniChat";
import TopUniDashboard from "@/components/TopUniDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, ArrowLeft, Sparkles, GraduationCap, Target, Shield,
  CheckCircle2, Search, BookOpen, ListChecks, Map, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Screen = "landing" | "intake" | "dashboard";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Netherlands", "Switzerland", "Ireland",
  "Sweden", "Norway", "Denmark", "Italy", "Spain", "Belgium",
  "Singapore", "South Korea", "Japan", "Hong Kong", "China",
  "New Zealand", "United Arab Emirates",
  "Czech Republic", "Hungary", "Poland", "Estonia",
  "Turkey", "Malaysia",
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
});

const WIZARD_DRAFT_KEY = "topuni-intake-draft-v1";

interface WizardDraft {
  fullName: string;
  email: string;
  whatsapp: string;
  gradeLevel: string;
  gpa: string;
  ielts: string;
  sat: string;
  targetCountries: string[];
  major: string;
  budget: string;
  scholarshipNeeded: string;
  timeline: string;
  prestige: number;
  scholarship: number;
  careerRoi: number;
  visaAccess: number;
  locationPref: number;
  /** Wall-clock ms — drafts older than 14 days are dropped on read. */
  ts?: number;
}

/** Drafts older than this are treated as cold and silently discarded
 *  on next mount — users coming back weeks later see a fresh wizard
 *  rather than stale half-finished answers from a different intent. */
const DRAFT_TTL_MS = 14 * 86400_000;

const loadDraft = (): Partial<WizardDraft> | null => {
  try {
    const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const ts = (parsed as { ts?: unknown }).ts;
    if (typeof ts === "number" && Date.now() - ts > DRAFT_TTL_MS) {
      localStorage.removeItem(WIZARD_DRAFT_KEY);
      return null;
    }
    return parsed as Partial<WizardDraft>;
  } catch { return null; }
};

const TopUniAI = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("landing");
  const [step, setStep] = useState(1);

  useEffect(() => { trackPageView("/topuni-ai"); }, []);

  // Load any in-progress draft on first render. The hub-context handoff
  // effect runs separately and may overwrite specific fields (country
  // prefill etc.) after this — that's intentional: a fresh hub click
  // should shape the draft, not be ignored. Empty string defaults are
  // used when the draft is absent or partial.
  const draft = useMemo(() => loadDraft(), []);

  const [fullName, setFullName] = useState(draft?.fullName ?? "");
  const [email, setEmail] = useState(draft?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(draft?.whatsapp ?? "");
  const [gradeLevel, setGradeLevel] = useState(draft?.gradeLevel ?? "");
  const [gpa, setGpa] = useState(draft?.gpa ?? "");
  const [ielts, setIelts] = useState(draft?.ielts ?? "");
  const [sat, setSat] = useState(draft?.sat ?? "");
  const [targetCountries, setTargetCountries] = useState<string[]>(Array.isArray(draft?.targetCountries) ? draft!.targetCountries! : []);
  const [major, setMajor] = useState(draft?.major ?? "");
  const [budget, setBudget] = useState(draft?.budget ?? "");
  const [scholarshipNeeded, setScholarshipNeeded] = useState(draft?.scholarshipNeeded ?? "");
  const [timeline, setTimeline] = useState(draft?.timeline ?? "");
  const [prestige, setPrestige] = useState<number[]>([typeof draft?.prestige === "number" ? draft.prestige : 3]);
  const [scholarship, setScholarship] = useState<number[]>([typeof draft?.scholarship === "number" ? draft.scholarship : 3]);
  const [careerRoi, setCareerRoi] = useState<number[]>([typeof draft?.careerRoi === "number" ? draft.careerRoi : 3]);
  const [visaAccess, setVisaAccess] = useState<number[]>([typeof draft?.visaAccess === "number" ? draft.visaAccess : 3]);
  const [locationPref, setLocationPref] = useState<number[]>([typeof draft?.locationPref === "number" ? draft.locationPref : 3]);

  // If we restored a draft with meaningful content, jump the user past
  // the landing screen so they don't have to re-click "Start my plan".
  useEffect(() => {
    if (draft && (draft.fullName || draft.email || draft.gpa || (Array.isArray(draft.targetCountries) && draft.targetCountries.length > 0))) {
      setScreen("intake");
    }
  }, [draft]);
  /* When the user arrives from a /scholarships/by-* hub or from a
     specific scholarship detail page, show a small "Pre-filled from
     {label}" indicator so they understand why their wizard already has
     an answer. Cleared once they finish step 2 (target countries /
     major) since that's the last step that depends on this context. */
  const [hubContext, setHubContext] = useState<{
    label: string;
    kind: "country" | "field" | "theme" | "scholarship";
  } | null>(null);

  /* Drain hub-context payload from sessionStorage on mount.
     Mirrors the focus-scholarship + counselor-prefill handoff patterns:
     5-minute stale guard, removed after read. The payload may carry a
     country (→ pre-select it in targetCountries), a field (→ pre-fill
     the major input), a theme like "full-funding" (→ pre-set
     scholarshipNeeded to "yes" and bias the scholarship-priority
     slider), or a "scholarship" kind from a detail-page CTA (→ same
     country prefill, different indicator label). */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("topuni-hub-context");
      if (!raw) return;
      sessionStorage.removeItem("topuni-hub-context");
      const payload = JSON.parse(raw) as {
        kind?: "country" | "field" | "theme" | "scholarship";
        country?: string;
        field?: string;
        theme?: string;
        label?: string;
        ts?: number;
      };
      if (typeof payload?.ts === "number" && Date.now() - payload.ts > 5 * 60_000) return;
      if (payload.kind === "country" && payload.country) {
        setTargetCountries((prev) => (prev.includes(payload.country!) ? prev : [...prev, payload.country!]));
        setHubContext({ kind: "country", label: payload.label || payload.country });
      } else if (payload.kind === "field" && payload.field) {
        setMajor((prev) => prev || payload.field!);
        setHubContext({ kind: "field", label: payload.label || payload.field });
      } else if (payload.kind === "theme" && payload.theme) {
        // Theme-specific defaults: full-funding ⇒ needs scholarship; closing-soon
        // ⇒ Fall 2026 timeline; high-value ⇒ scholarship-priority sloped up.
        if (payload.theme === "full-funding") {
          setScholarshipNeeded("yes");
          setScholarship([5]);
        } else if (payload.theme === "closing-soon") {
          setTimeline("Fall 2026");
        } else if (payload.theme === "high-value") {
          setScholarship((prev) => (prev[0] >= 4 ? prev : [4]));
        }
        setHubContext({ kind: "theme", label: payload.label || payload.theme });
      } else if (payload.kind === "scholarship" && payload.country) {
        // Detail-page handoff: scholarshipId/Name flow through topuni-focus-
        // scholarship (drained on the dashboard side); this payload only
        // carries the country to pre-select for the wizard.
        setTargetCountries((prev) => (prev.includes(payload.country!) ? prev : [...prev, payload.country!]));
        setHubContext({ kind: "scholarship", label: payload.label || payload.country });
      }
    } catch { /* ignore */ }
  }, []);

  const toggleCountry = (country: string) => {
    setTargetCountries(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
  };

  /* Auto-save the wizard draft to localStorage whenever any field
     changes. This way the user can close the tab mid-wizard and come
     back to where they were instead of losing 5 minutes of profile
     entry. The dashboard-screen transition clears the draft (the
     answers now live in the dashboard's profile state and the
     server-side cache).

     Skip writing while still on the landing screen — the draft fields
     are still defaults and we don't want a stray empty draft to
     trigger the auto-jump-to-intake on next visit. */
  useEffect(() => {
    if (screen === "landing") return;
    try {
      const draftPayload: WizardDraft = {
        fullName, email, whatsapp, gradeLevel, gpa, ielts, sat,
        targetCountries, major, budget, scholarshipNeeded, timeline,
        prestige: prestige[0], scholarship: scholarship[0],
        careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
        ts: Date.now(),
      };
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draftPayload));
    } catch { /* ignore quota / private-mode errors */ }
  }, [
    screen,
    fullName, email, whatsapp, gradeLevel, gpa, ielts, sat,
    targetCountries, major, budget, scholarshipNeeded, timeline,
    prestige, scholarship, careerRoi, visaAccess, locationPref,
  ]);

  /* Once the user transitions to the dashboard the wizard answers are
     "committed" — the dashboard renders the brief from these inputs and
     the server-side cache key is hashed off them. Drop the local draft
     so the next /topuni-ai visit starts from landing if the user
     finished the funnel. */
  useEffect(() => {
    if (screen !== "dashboard") return;
    try { localStorage.removeItem(WIZARD_DRAFT_KEY); } catch { /* ignore */ }
  }, [screen]);

  const profile = {
    fullName, email, whatsapp, gradeLevel, gpa, ielts, sat,
    targetCountries, major, budget, scholarshipNeeded, timeline,
    prestige: prestige[0], scholarship: scholarship[0],
    careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
    // Depth fields — captured separately via the Pro upgrade dialog inside
    // the Dashboard, not in the standard wizard. Default empty here so the
    // base flow stays a quick 3-step intake.
    topActivity: "",
    personalStory: "",
    namedSchools: "",
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Faint blurred backdrop — TopUniAI's existing visual signature */}
      <div
        className="fixed inset-0 z-0 opacity-[0.12] pointer-events-none"
        style={{ backgroundImage: `url(${topuniBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(3px)' }}
      />

      <div className="relative z-10">
        <Navigation language="en" />
        <BetaBanner />

        <AnimatePresence mode="wait">
          {/* ═══ LANDING ═══ */}
          {screen === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* HERO — strategy plan positioning, with strong navy bookend at top */}
              <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
                {/* Navy band at the top — same bookend pattern as homepage */}
                <div className="absolute inset-x-0 top-0 h-64 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(180deg,
                      hsl(var(--primary) / 0.18) 0%,
                      hsl(var(--primary) / 0.10) 35%,
                      hsl(var(--primary) / 0.04) 70%,
                      transparent 100%)`,
                  }} />

                <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center relative">
                  <motion.p {...fadeUp(0.05)} className="text-[11px] uppercase tracking-[0.24em] text-gold-dark font-medium mb-5">
                    TopUni AI · Free
                  </motion.p>

                  <motion.h1 {...fadeUp(0.12)} className="font-heading text-[clamp(2.5rem,6.5vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.025em] text-foreground mb-6">
                    Your <span className="text-gold-dark">admissions strategy.</span><br />
                    In two minutes.
                  </motion.h1>

                  <motion.p {...fadeUp(0.22)} className="text-lg sm:text-xl text-foreground/75 leading-[1.6] max-w-xl mx-auto mb-10 font-light">
                    Tell us your scores, goals, and constraints. Our AI returns a tailored plan: where to apply, how to fund it, and what to do next.
                  </motion.p>

                  <motion.div {...fadeUp(0.32)} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                    <Button variant="gold" size="lg" className="text-base px-8 py-6 gap-2" onClick={() => setScreen("intake")}>
                      <Sparkles className="w-5 h-5" /> Start my plan <ArrowRight className="w-5 h-5" />
                    </Button>
                  </motion.div>

                  <motion.p {...fadeUp(0.4)} className="text-xs text-muted-foreground tracking-wide">
                    2 minutes · No account needed · Free during beta
                  </motion.p>
                </div>
              </section>

              {/* WHAT YOU'LL GET — three outcomes the strategy plan delivers */}
              <section className="py-16 sm:py-20 border-t border-border/60">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                  <motion.div {...fadeUp()} className="text-center mb-12">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Your plan delivers</p>
                    <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
                      Three concrete outputs.
                    </h2>
                  </motion.div>

                  <div className="grid sm:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-2xl overflow-hidden">
                    {[
                      {
                        icon: ListChecks,
                        kicker: "01 · Target list",
                        title: "A balanced shortlist",
                        body: "Strong fits, aligned options, and ones worth keeping on the radar — ranked by your fit and funding need.",
                      },
                      {
                        icon: Map,
                        kicker: "02 · Funding pathway",
                        title: "Where the money is",
                        body: "Scholarships and need-based aid you can realistically win, with deadlines and effort tagged.",
                      },
                      {
                        icon: Zap,
                        kicker: "03 · Action plan",
                        title: "What to do this month",
                        body: "Tests to take, essays to draft, recommenders to ask — sequenced backwards from your earliest deadline.",
                      },
                    ].map((item, i) => (
                      <motion.div
                        key={item.kicker}
                        {...fadeUp(0.08 * i)}
                        className="bg-card p-7 flex flex-col"
                      >
                        <item.icon className="w-5 h-5 text-gold-dark mb-5" />
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-2">{item.kicker}</p>
                        <h3 className="font-heading font-semibold text-lg text-foreground mb-2 leading-tight">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-[1.65]">{item.body}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* THE FLOW — strategy → discover → academy */}
              <section className="py-16 sm:py-20">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                  <motion.div {...fadeUp()} className="max-w-2xl mb-12">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">From plan to admission</p>
                    <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
                      One plan. Two products to execute it.
                    </h2>
                    <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                      Once your strategy is generated, your scholarships are waiting in Discover and your live workshops happen in Academy.
                    </p>
                  </motion.div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <motion.button
                      {...fadeUp(0.1)}
                      onClick={() => navigate("/discover")}
                      className="group text-left p-7 rounded-2xl border border-border/70 bg-card hover:border-gold/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                          <Search className="w-5 h-5 text-gold-dark" />
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Step 02</span>
                      </div>
                      <h3 className="font-heading font-bold text-xl text-foreground mb-2 tracking-tight">Discover</h3>
                      <p className="text-sm text-muted-foreground leading-[1.65] mb-5">
                        Every scholarship in our database, ranked against your profile, with deadlines and effort tagged.
                      </p>
                      <span className="text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors flex items-center gap-1.5">
                        See your matches <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </motion.button>

                    <motion.button
                      {...fadeUp(0.18)}
                      onClick={() => navigate("/academy")}
                      className="group text-left p-7 rounded-2xl border border-border/70 bg-card hover:border-gold/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-gold-dark" />
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Step 03</span>
                      </div>
                      <h3 className="font-heading font-bold text-xl text-foreground mb-2 tracking-tight">Academy</h3>
                      <p className="text-sm text-muted-foreground leading-[1.65] mb-5">
                        Live workshops with our founders and a recorded library — execute your plan with people who've done it.
                      </p>
                      <span className="text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors flex items-center gap-1.5">
                        Preview Academy <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </motion.button>
                  </div>

                  <motion.div {...fadeUp(0.3)} className="text-center mt-12">
                    <a
                      href="/topuni-ai/partners"
                      className="text-sm text-muted-foreground hover:text-gold-dark transition-colors underline-offset-4 hover:underline"
                    >
                      For university partners →
                    </a>
                  </motion.div>
                </div>
              </section>

              {/* Bottom bookend — gradient ramp into the navy footer */}
              <div
                className="h-32 sm:h-40"
                style={{
                  backgroundImage: `linear-gradient(180deg,
                    transparent 0%,
                    hsl(var(--primary) / 0.06) 40%,
                    hsl(var(--primary) / 0.30) 75%,
                    hsl(var(--primary)) 100%)`,
                }}
                aria-hidden="true"
              />
            </motion.div>
          )}

          {/* ═══ INTAKE ═══ */}
          {screen === "intake" && (
            <motion.div
              key="intake"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto px-5 sm:px-8 pt-12 pb-20"
            >
              {/* Progress */}
              <div className="flex items-center justify-center gap-2 mb-12">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-1.5 w-12 rounded-full overflow-hidden bg-border/60`}>
                      <motion.div
                        className="h-full bg-gold-dark"
                        initial={false}
                        animate={{ width: s < step ? "100%" : s === step ? "60%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
                <span className="text-xs text-muted-foreground tabular-nums tracking-wider font-medium ml-3">{step} / 3</span>
              </div>

              {/* Hub-context indicator — confirms to the user why a field
                  in this wizard is pre-filled. Cleared by the user with
                  the X if they want to start fresh. */}
              {hubContext && (
                <div className="mb-6 rounded-lg border border-gold/30 bg-gradient-to-br from-gold/[0.06] to-transparent px-4 py-2.5 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-gold-dark shrink-0" />
                  <p className="text-sm text-foreground/85 flex-1 min-w-0 leading-snug">
                    {hubContext.kind === "scholarship" ? (
                      <>
                        Building strategy around{" "}
                        <span className="font-semibold text-foreground">{hubContext.label}</span>.
                      </>
                    ) : (
                      <>
                        Pre-filled from the{" "}
                        <span className="font-semibold text-foreground">{hubContext.label}</span>{" "}
                        {hubContext.kind === "country" ? "country hub" : hubContext.kind === "field" ? "field hub" : "theme hub"}.
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHubContext(null);
                      setTargetCountries([]);
                      if (hubContext.kind === "field") setMajor("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-7"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-3">Step 01 · Profile</p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                        Tell us about you.
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">Your academic foundation. About a minute.</p>
                    </div>
                    <div className="grid gap-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Full name *</Label>
                          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Email *</Label>
                          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="h-11 bg-card" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">WhatsApp</Label>
                          <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="With country code" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Grade level *</Label>
                          <Select value={gradeLevel} onValueChange={setGradeLevel}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {["9th Grade", "10th Grade", "11th Grade", "12th Grade", "Gap Year", "University Transfer"].map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">GPA *</Label>
                          <Input value={gpa} onChange={e => setGpa(e.target.value)} placeholder="e.g. 3.7" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">IELTS</Label>
                          <Input value={ielts} onChange={e => setIelts(e.target.value)} placeholder="Optional" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">SAT</Label>
                          <Input value={sat} onChange={e => setSat(e.target.value)} placeholder="Optional" className="h-11 bg-card" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setScreen("landing")}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button
                        variant="gold"
                        onClick={() => setStep(2)}
                        disabled={!fullName.trim() || !email.trim() || !gradeLevel || !gpa.trim()}
                      >
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-7"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-3">Step 02 · Direction</p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                        Where, and what?
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">Your target geographies and field.</p>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-medium">Target countries *</Label>
                        <div className="flex flex-wrap gap-2">
                          {COUNTRIES.map(c => (
                            <button
                              key={c}
                              onClick={() => toggleCountry(c)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                targetCountries.includes(c)
                                  ? "bg-gold-dark text-primary-foreground border-gold-dark"
                                  : "bg-card text-foreground/75 border-border hover:border-gold/40"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">Intended major *</Label>
                        <Input value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science, Economics" className="h-11 bg-card" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Budget</Label>
                          <Select value={budget} onValueChange={setBudget}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {["Under $5,000/year", "$5,000–$15,000/year", "$15,000–$30,000/year", "$30,000+/year", "Full scholarship needed"].map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Need scholarship?</Label>
                          <Select value={scholarshipNeeded} onValueChange={setScholarshipNeeded}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">Timeline</Label>
                        <Select value={timeline} onValueChange={setTimeline}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                            <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                            <SelectItem value="Flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button
                        variant="gold"
                        onClick={() => setStep(3)}
                        disabled={targetCountries.length === 0 || !major.trim()}
                      >
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-7"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-3">Step 03 · Priorities</p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                        What matters most?
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">Weight each on a 1-5 scale.</p>
                    </div>
                    <div className="space-y-5">
                      {[
                        { label: "Prestige", value: prestige, set: setPrestige, icon: GraduationCap, low: "Any school", high: "Top 50 only" },
                        { label: "Scholarship need", value: scholarship, set: setScholarship, icon: Shield, low: "Self-fund OK", high: "Must be free" },
                        { label: "Career ROI", value: careerRoi, set: setCareerRoi, icon: Target, low: "Open-ended", high: "Top 1% jobs" },
                        { label: "Visa accessibility", value: visaAccess, set: setVisaAccess, icon: CheckCircle2, low: "Don't mind", high: "Easy access" },
                        { label: "Location preference", value: locationPref, set: setLocationPref, icon: ArrowRight, low: "Anywhere", high: "Specific city" },
                      ].map(item => (
                        <div key={item.label} className="bg-card border border-border/70 rounded-xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <item.icon className="w-4 h-4 text-gold-dark" />
                              <span className="text-sm font-semibold text-foreground">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} className={`h-1.5 w-1.5 rounded-full transition-colors ${n <= item.value[0] ? "bg-gold-dark" : "bg-border"}`} />
                              ))}
                              <span className="text-xs font-bold text-gold-dark tabular-nums ml-1.5">{item.value[0]}/5</span>
                            </div>
                          </div>
                          <Slider min={1} max={5} step={1} value={item.value} onValueChange={item.set} className="w-full" />
                          <div className="flex justify-between mt-2 text-[11px] text-muted-foreground font-medium">
                            <span>{item.low}</span>
                            <span>{item.high}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button variant="gold" size="lg" onClick={() => setScreen("dashboard")}>
                        <Sparkles className="mr-2 w-5 h-5" /> Generate my plan
                      </Button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {screen === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <TopUniDashboard
                profile={profile}
                language="en"
                onBack={() => setScreen("landing")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {screen !== "dashboard" && <Footer language="en" />}
        {screen === "landing" && <TopUniChat />}
      </div>
    </div>
  );
};

export default TopUniAI;
