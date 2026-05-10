import { useState, useEffect, useMemo } from "react";
import { trackPageView } from "@/utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { TopUniAIEntrance } from "@/components/topuni/TopUniAIEntrance";
import { Footer } from "@/components/Footer";
import TopUniDashboard from "@/components/TopUniDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Award,
  GraduationCap,
  Target,
  Shield,
  CheckCircle2,
  Search,
  BookOpen,
  ListChecks,
  Map,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveProfile } from "@/components/discover/DiscoverProfileGate";
import { projectToDiscoverProfile } from "@/lib/topuniIntakeProjection";

// 'landing' retired round 10 — TopUni AI opens directly in intake.
type Screen = "intake" | "dashboard";

/* Round-27 integration: TopUni AI is the single front door. The
 * Discover wizard used to be a separate 4-step intake that asked
 * the same nationality / level / GPA / IELTS questions a second
 * time. Now we project the TopUniAI intake directly onto the
 * DiscoverProfile shape and persist it via the same localStorage +
 * student_profiles plumbing the wizard used. Result: completing
 * the AI brief instantly seeds the Discover database, the wizard
 * is skipped, and there's one source of truth for "who is this
 * student".
 *
 * Round 53: extracted projectToDiscoverProfile + mapGradeLevelToTarget
 * Degree to src/lib/topuniIntakeProjection.ts so the Russian
 * /topuni-ai/ru page can call the SAME projection. Pre-extraction RU
 * just set screen="dashboard" without seeding Discover, leaving
 * Russian users to re-answer the wizard inside Discover. */

/* TopUniAI's gradeLevel uses descriptive labels ("Bachelor's —
 * graduating", "11th Grade", "Working professional") so the brief
 * can speak to the student's actual moment. But Discover scores
 * against canonical degree levels: "undergraduate" / "master's" /
 * "PhD". Without this mapping a TopUniAI graduate applying to
 * master's would have targetDegree="Bachelor's — graduating" which
 * Discover's canonicalize fallback misreads as "undergraduate" —
 * surfacing all the wrong programs. Map intentionally to what the
 * student is APPLYING TO, not where they currently are.
 *
 * Heuristic + RU patterns now live in src/lib/topuniIntakeProjection.ts. */

import { POPULAR_DESTINATIONS, ALL_COUNTRIES } from "@/data/countries";

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
  nationality: string;
  gradeLevel: string;
  gpa: string;
  ielts: string;
  toefl: string;
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
  // Landing screen retired round 10 — TopUni AI now opens directly into
  // the intake wizard. The pre-landing felt like an extra click before
  // the actual product. Sales / context lives on the home landing page;
  // /topuni-ai itself is the tool.
  const [screen, setScreen] = useState<Screen>("intake");
  const [step, setStep] = useState(1);
  // Step transitions are direction-aware — going forward, the next
  // step slides in from the right; going back, the previous step
  // slides in from the left. Without this, the "Back" click felt
  // jumpy because every step entered with the same right-to-center
  // animation regardless of intent.
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const goToStep = (next: number) => {
    setStepDir(next > step ? 1 : -1);
    setStep(next);
  };
  const stepEnter = { x: stepDir * 24, opacity: 0 };
  const stepExit = { x: -stepDir * 24, opacity: 0 };

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
  const [nationality, setNationality] = useState(draft?.nationality ?? "");
  const [gradeLevel, setGradeLevel] = useState(draft?.gradeLevel ?? "");
  const [gpa, setGpa] = useState(draft?.gpa ?? "");
  const [ielts, setIelts] = useState(draft?.ielts ?? "");
  const [toefl, setToefl] = useState(draft?.toefl ?? "");
  const [sat, setSat] = useState(draft?.sat ?? "");
  const [targetCountries, setTargetCountries] = useState<string[]>(Array.isArray(draft?.targetCountries) ? draft!.targetCountries! : []);
  const [countrySearch, setCountrySearch] = useState("");
  const [major, setMajor] = useState(draft?.major ?? "");
  // Normalize legacy drafts: the budget option used to be labeled
  // "Full scholarship needed" — renamed to "Need full scholarship" when
  // the standalone scholarshipNeeded yes/no question was folded into
  // budget. Migrate-on-read so cached drafts don't show a blank Select.
  const [timeline, setTimeline] = useState(draft?.timeline ?? "");
  const [prestige, setPrestige] = useState<number[]>([typeof draft?.prestige === "number" ? draft.prestige : 3]);
  const [scholarship, setScholarship] = useState<number[]>([typeof draft?.scholarship === "number" ? draft.scholarship : 3]);

  // Budget is now derived from the "Scholarship need" 1–5 slider rather
  // than a separate select on step 2. Mapping:
  //   5 → "Need full scholarship", 4 → "Under $5,000/year",
  //   3 → "$5,000–$15,000/year",   2 → "$15,000–$30,000/year",
  //   1 → "$30,000+/year"
  const SLIDER_TO_BUDGET = ["", "$30,000+/year", "$15,000–$30,000/year", "$5,000–$15,000/year", "Under $5,000/year", "Need full scholarship"] as const;
  const budget = SLIDER_TO_BUDGET[scholarship[0] ?? 3] || "$5,000–$15,000/year";
  const scholarshipNeeded = scholarship[0] >= 4 ? "yes" : "no";
  const [careerRoi, setCareerRoi] = useState<number[]>([typeof draft?.careerRoi === "number" ? draft.careerRoi : 3]);
  const [visaAccess, setVisaAccess] = useState<number[]>([typeof draft?.visaAccess === "number" ? draft.visaAccess : 3]);
  const [locationPref, setLocationPref] = useState<number[]>([typeof draft?.locationPref === "number" ? draft.locationPref : 3]);

  // Pro-depth questions (top achievement, personal story, named
  // schools) live entirely in the after-brief ProBriefUnlock dialog
  // now — keeping the intake to a fast 3-step flow and putting the
  // depth ask AFTER the user has seen what the free brief delivers,
  // which converts better than asking up-front.

  // Draft-restore auto-jump retired round 10 alongside the landing
  // screen — the page now always opens directly in 'intake' so there's
  // nothing to jump past.
  /* When the user arrives from a /scholarships/by-* hub or from a
     specific scholarship detail page, show a small "Pre-filled from
     {label}" indicator so they understand why their wizard already has
     an answer. Cleared once they finish step 2 (target countries /
     major) since that's the last step that depends on this context. */
  const [hubContext, setHubContext] = useState<{
    label: string;
    kind: "country" | "field" | "theme" | "scholarship" | "shared-brief";
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
        kind?: "country" | "field" | "theme" | "scholarship" | "shared-brief";
        country?: string;
        countries?: string[];
        field?: string;
        gradeLevel?: string;
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
      } else if (payload.kind === "shared-brief") {
        // Recipient of a /brief/:slug share clicked "Build my brief".
        // Carry over the original brief's profile so the recipient
        // doesn't have to re-derive what looked appealing — just enter
        // their own scores. Deduplicates target countries against any
        // pre-existing draft state.
        if (Array.isArray(payload.countries) && payload.countries.length > 0) {
          setTargetCountries((prev) => {
            const merged = [...prev];
            for (const c of payload.countries!) if (!merged.includes(c)) merged.push(c);
            return merged;
          });
        }
        if (payload.field) setMajor((prev) => prev || payload.field!);
        if (payload.gradeLevel) setGradeLevel((prev) => prev || payload.gradeLevel!);
        setHubContext({ kind: "shared-brief", label: payload.label || "shared brief" });
      } else if (payload.kind === "theme" && payload.theme) {
        // Theme-specific defaults: full-funding ⇒ scholarship-need slider
        // pinned to 5 (which derives budget="Need full scholarship");
        // closing-soon ⇒ Fall 2026 timeline; high-value ⇒ scholarship
        // priority sloped up.
        if (payload.theme === "full-funding") {
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

     Skip writing while on a non-intake screen — the draft fields are
     still defaults and we don't want a stray empty draft. */
  useEffect(() => {
    if (screen !== "intake") return;
    try {
      const draftPayload: WizardDraft = {
        fullName, email, whatsapp, nationality, gradeLevel, gpa, ielts, toefl, sat,
        targetCountries, major, budget, scholarshipNeeded, timeline,
        prestige: prestige[0], scholarship: scholarship[0],
        careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
        ts: Date.now(),
      };
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draftPayload));
    } catch { /* ignore quota / private-mode errors */ }
  }, [
    screen,
    fullName, email, whatsapp, nationality, gradeLevel, gpa, ielts, toefl, sat,
    targetCountries, major, budget, scholarshipNeeded, timeline,
    prestige, scholarship, careerRoi, visaAccess, locationPref,
  ]);

  /* Once the user transitions to the dashboard the wizard answers are
     "committed" — the dashboard renders the brief from these inputs and
     the server-side cache key is hashed off them. Drop the local draft
     so the next /topuni-ai visit starts from a fresh intake. */
  useEffect(() => {
    if (screen !== "dashboard") return;
    try { localStorage.removeItem(WIZARD_DRAFT_KEY); } catch { /* ignore */ }
  }, [screen]);

  const profile = {
    fullName, email, whatsapp, nationality, gradeLevel, gpa, ielts, toefl, sat,
    targetCountries, major, budget, scholarshipNeeded, timeline,
    prestige: prestige[0], scholarship: scholarship[0],
    careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
  };

  return (
    // Background philosophy 2026-05-10: TopUni AI is a focus surface
    // (intake form + dense personal brief). The campus backdrop blur
    // that lived here was visual noise competing with the form fields
    // and the brief prose. Cream-clean lets the typography and gold
    // accents do the premium work. Campus + parallax stays on the
    // home landing only where emotional/aspirational visuals do work
    // that words can't.
    <div className="min-h-screen bg-background relative overflow-hidden">
      <TopUniAIEntrance language="en" />
      <div className="relative z-10">
        <Navigation language="en" />
        <BetaBanner />

        <AnimatePresence mode="wait">
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
              {/* Progress — three pills with named-step labels under
                  each, so users see WHAT they're answering at each
                  stage instead of three abstract bars. Active step's
                  label gets a subtle gold tint; completed steps get
                  the canvas-foreground colour; upcoming stay muted. */}
              <div className="flex items-start justify-center gap-3 mb-10">
                {[
                  { n: 1, label: "Profile" },
                  { n: 2, label: "Goals" },
                  { n: 3, label: "Priorities" },
                ].map(s => {
                  const isActive = s.n === step;
                  const isDone = s.n < step;
                  return (
                    <div key={s.n} className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className="h-1.5 w-14 sm:w-16 rounded-full overflow-hidden bg-border/60">
                        <motion.div
                          className="h-full bg-gold-dark"
                          initial={false}
                          animate={{ width: isDone ? "100%" : isActive ? "60%" : "0%" }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                      <span className={`text-[10px] uppercase tracking-[0.18em] font-semibold transition-colors ${
                        isActive ? "text-gold-dark" : isDone ? "text-foreground/70" : "text-muted-foreground/60"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hub-context indicator — confirms to the user why a field
                  in this wizard is pre-filled. Cleared by the user with
                  the X if they want to start fresh. */}
              {hubContext && (
                <div className="mb-6 rounded-lg border border-gold/30 bg-gradient-to-br from-gold/[0.06] to-transparent px-4 py-2.5 flex items-center gap-3">
                  <Target className="w-4 h-4 text-gold-dark shrink-0" />
                  <p className="text-sm text-foreground/85 flex-1 min-w-0 leading-snug">
                    {hubContext.kind === "scholarship" ? (
                      <>
                        Building strategy around{" "}
                        <span className="font-semibold text-foreground">{hubContext.label}</span>.
                      </>
                    ) : hubContext.kind === "shared-brief" ? (
                      <>
                        Pre-filled from the brief you just read. Enter your scores to make it yours.
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
                      if (hubContext.kind === "field" || hubContext.kind === "shared-brief") setMajor("");
                      if (hubContext.kind === "shared-brief") setGradeLevel("");
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
                    initial={stepEnter}
                    animate={{ opacity: 1, x: 0 }}
                    exit={stepExit}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                      <div className="space-y-1.5 relative">
                        {/* WhatsApp field retired — never used by the
                            brief generator and the extra "give us your
                            phone" ask was friction with no payoff. */}
                        <Label className="text-xs uppercase tracking-wider font-medium">Nationality *</Label>
                        <Input
                          value={nationality}
                          onChange={e => setNationality(e.target.value)}
                          placeholder="Type any country (Kazakhstan, Nigeria, …)"
                          className="h-11 bg-card"
                        />
                        {(() => {
                          const q = nationality.trim().toLowerCase();
                          if (!q) return null;
                          const exact = ALL_COUNTRIES.find(c => c.v.toLowerCase() === q);
                          if (exact) return null;
                          const matches = ALL_COUNTRIES.filter(c => c.v.toLowerCase().includes(q)).slice(0, 5);
                          if (matches.length === 0) return null;
                          return (
                            <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border border-border bg-card shadow-lg overflow-hidden">
                              {matches.map(c => (
                                <button
                                  key={c.v}
                                  type="button"
                                  onClick={() => setNationality(c.v)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
                                >
                                  <span>{c.f}</span>
                                  <span>{c.v}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">Current stage *</Label>
                        <Select value={gradeLevel} onValueChange={setGradeLevel}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Pick your stage" /></SelectTrigger>
                          <SelectContent>
                            {[
                              "High School",
                              "Gap Year",
                              "Bachelor's",
                              "Master's",
                              "PhD applicant",
                              "Working professional",
                            ].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">GPA *</Label>
                          <Input value={gpa} onChange={e => setGpa(e.target.value)} placeholder="e.g. 3.7" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">IELTS</Label>
                          <Input value={ielts} onChange={e => setIelts(e.target.value)} placeholder="Optional · e.g. 7.0" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">TOEFL</Label>
                          <Input value={toefl} onChange={e => setToefl(e.target.value)} placeholder="Optional · e.g. 100" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">SAT</Label>
                          <Input value={sat} onChange={e => setSat(e.target.value)} placeholder="Optional · e.g. 1450" className="h-11 bg-card" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => navigate("/")}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button
                        variant="gold"
                        onClick={() => goToStep(2)}
                        disabled={!fullName.trim() || !email.trim() || !nationality.trim() || !gradeLevel || !gpa.trim()}
                      >
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={stepEnter}
                    animate={{ opacity: 1, x: 0 }}
                    exit={stepExit}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                        {/* Type-to-search across the full ALL_COUNTRIES list;
                            popular destinations show by default. Selected
                            chips bubble up at the top regardless of search
                            so the user always sees what they've picked. */}
                        <Input
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Type any country to search… (Mexico, Czech Republic, etc.)"
                          className="h-10 bg-card"
                        />
                        {targetCountries.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {targetCountries.map(c => {
                              const flag = ALL_COUNTRIES.find(x => x.v === c)?.f;
                              return (
                                <button
                                  key={`sel-${c}`}
                                  onClick={() => toggleCountry(c)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gold-dark text-primary-foreground border border-gold-dark"
                                >
                                  {flag && <span className="text-sm leading-none">{flag}</span>}
                                  <span>{c}</span>
                                  <span className="text-primary-foreground/70 hover:text-primary-foreground">×</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {(() => {
                            const q = countrySearch.trim().toLowerCase();
                            const list = q
                              ? ALL_COUNTRIES.filter(c => c.v.toLowerCase().includes(q)).slice(0, 24)
                              : POPULAR_DESTINATIONS;
                            return list.map(c => {
                              const selected = targetCountries.includes(c.v);
                              if (selected) return null; // already shown in selected row
                              return (
                                <button
                                  key={c.v}
                                  onClick={() => toggleCountry(c.v)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all bg-card text-foreground/75 border-border hover:border-gold/40"
                                >
                                  <span className="text-base leading-none">{c.f}</span>
                                  <span>{c.v}</span>
                                </button>
                              );
                            });
                          })()}
                          {countrySearch.trim() && !ALL_COUNTRIES.some(c => c.v.toLowerCase() === countrySearch.trim().toLowerCase()) && (
                            <button
                              onClick={() => { toggleCountry(countrySearch.trim()); setCountrySearch(""); }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-gold/50 text-gold-dark hover:bg-gold/10"
                            >
                              + Add "{countrySearch.trim()}"
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">Intended major *</Label>
                        <Input
                          value={major}
                          onChange={e => setMajor(e.target.value)}
                          placeholder="Type or pick — e.g. Computer Science"
                          className="h-11 bg-card"
                          list="major-suggestions"
                          autoComplete="off"
                        />
                        <datalist id="major-suggestions">
                          {[
                            "Undecided",
                            "Computer Science", "Engineering", "Business", "Economics",
                            "Mathematics", "Physics", "Chemistry", "Biology",
                            "Medicine & Public Health", "Law", "International Relations",
                            "Public Policy", "Political Science", "Psychology",
                            "Sociology", "Anthropology", "History", "Philosophy",
                            "Literature", "Linguistics", "Education", "Architecture",
                            "Design", "Environmental Studies", "Sustainability",
                            "Data Science", "Artificial Intelligence", "Statistics",
                            "Finance", "Marketing", "Communications", "Journalism",
                            "Music", "Visual Arts", "Performing Arts", "Film",
                            "Cultural Studies", "Development Studies", "Social Work",
                          ].map(m => <option key={m} value={m} />)}
                        </datalist>
                      </div>
                      {/* Self-fund Select retired 2026-05-09 — overlapped
                          with the "Scholarship need" 1–5 slider on step 3.
                          Budget is now derived from that slider downstream. */}
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">When you'd start</Label>
                        <Select value={timeline} onValueChange={setTimeline}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                            <SelectItem value="Spring 2027">Spring 2027</SelectItem>
                            <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                            <SelectItem value="Spring 2028">Spring 2028</SelectItem>
                            <SelectItem value="Flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => goToStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button
                        variant="gold"
                        onClick={() => goToStep(3)}
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
                    initial={stepEnter}
                    animate={{ opacity: 1, x: 0 }}
                    exit={stepExit}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                      {/* Round-42: 5 sliders → 3. "Career ROI" was vague
                          and the brief generator gets the same signal
                          from major + grade level. "Location preference"
                          duplicated the targetCountries selection on
                          step 2. Cuts the page from 5 sliders to the
                          three that actually shape the report:
                          prestige, scholarship need, visa accessibility. */}
                      {[
                        { label: "Prestige", value: prestige, set: setPrestige, icon: GraduationCap, low: "Any school", high: "Top 50 only" },
                        { label: "Scholarship need", value: scholarship, set: setScholarship, icon: Shield, low: "Self-fund OK", high: "Must be free" },
                        { label: "Visa accessibility", value: visaAccess, set: setVisaAccess, icon: CheckCircle2, low: "Don't mind", high: "Easy access" },
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
                      <Button variant="outline" onClick={() => goToStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button
                        variant="gold"
                        size="lg"
                        onClick={() => {
                          // Seed Discover with the same profile so the user
                          // never has to re-answer the nationality / level /
                          // GPA / IELTS questions inside Discover. Once this
                          // fires, /discover skips its wizard and lands
                          // straight on personalized results. saveProfile
                          // also fires the cross-device sync to
                          // student_profiles, so signing in on another
                          // device pulls the same profile back down.
                          try {
                            saveProfile(projectToDiscoverProfile({
                              fullName, email, nationality, gradeLevel,
                              gpa, ielts, toefl, sat, major, budget,
                              targetCountries,
                            }));
                          } catch { /* localStorage may be unavailable; brief still renders */ }
                          setScreen("dashboard");
                        }}
                      >
                        Generate my plan
                        <ArrowRight className="ml-2 w-5 h-5" />
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
                onBack={() => navigate("/discover")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {screen !== "dashboard" && <Footer language="en" />}
      </div>
    </div>
  );
};

export default TopUniAI;
