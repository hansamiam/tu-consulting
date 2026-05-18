import { useState, useEffect, useMemo } from "react";
import { trackPageView } from "@/utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
// BetaBanner retired site-wide 2026-05-10 per user direction.
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
  Crown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveProfile } from "@/components/discover/DiscoverProfileGate";
import { projectToDiscoverProfile } from "@/lib/topuniIntakeProjection";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

import { ALL_COUNTRIES } from "@/data/countries";

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
  /** GPA scale: "4.0" | "5.0" | "10.0" | "100" — used by Discover
   *  scoring to normalize to a 4.0 baseline. Defaults to "4.0" when
   *  unset so legacy drafts still parse cleanly. */
  gpaScale: string;
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
  /* 2026-05-18 Step 4 optional intake. All skippable. Sharpen the
   * brief's personalisation when filled; absent ⇒ brief just leans on
   * Step 1-3 fields like before. */
  careerGoal?: string;
  extracurriculars?: string;
  background?: string;
  namedSchools?: string;
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
  // Auth combined with intake (2026-05-10): the wizard now invites the
  // user to set a password OR continue with Google on Step 1 so the
  // email field they're filling in anyway doubles as their account
  // email. Pre-fix the wizard captured email anonymously, which read
  // as sus ("why do you need my email if the report doesn't get
  // emailed?"), and lost users on tab close. The skip path is
  // preserved — anyone uncomfortable with sign-up can advance
  // anonymously. Email is the wizard input either way.
  const { user, signUpWithPassword, signInWithGoogle } = useAuth();
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSubmitting, setAccountSubmitting] = useState(false);
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

  useEffect(() => {
    trackPageView("/topuni-ai");
    const prev = document.title;
    document.title = "TopUni AI — Your personalized scholarship strategy";
    return () => { document.title = prev; };
  }, []);

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
  // GPA scale picker — defaults to 4.0 (US standard, the most common
  // baseline most students think in). The brief generator + Discover
  // both normalize against 4.0 so picking a different scale at intake
  // means we preserve the user's actual number rather than asking them
  // to mentally convert.
  const [gpaScale, setGpaScale] = useState<string>(draft?.gpaScale ?? "4.0");
  const [ielts, setIelts] = useState(draft?.ielts ?? "");
  const [toefl, setToefl] = useState(draft?.toefl ?? "");
  const [sat, setSat] = useState(draft?.sat ?? "");
  const [targetCountries, setTargetCountries] = useState<string[]>(Array.isArray(draft?.targetCountries) ? draft!.targetCountries! : []);
  // countrySearch state retired with the target-countries section.
  // ALL_COUNTRIES still imported for the nationality typeahead.
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

  // 2026-05-18 Step 4 optional fields. All skippable — Pro upsell
  // dialog retired in favour of in-flow optional questions so the
  // brief can be personalised without paywalling the depth signal.
  // Users who want a quick pass click "Skip" and never see them; users
  // who want a sharper brief fill them in. Each maps directly into
  // the topuni-ai-pathway prompt's PROFILE section.
  const [careerGoal, setCareerGoal] = useState<string>(draft?.careerGoal ?? "");
  const [extracurriculars, setExtracurriculars] = useState<string>(draft?.extracurriculars ?? "");
  const [background, setBackground] = useState<string>(draft?.background ?? "");
  const [namedSchools, setNamedSchools] = useState<string>(draft?.namedSchools ?? "");

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

  // toggleCountry removed with the target-countries UI. setTargetCountries
  // still used by hub-context pre-selection (e.g. user lands here from a
  // specific scholarship — the country gets added to the saved profile
  // even though there's no UI affordance for it).

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
        fullName, email, whatsapp, nationality, gradeLevel, gpa, gpaScale, ielts, toefl, sat,
        targetCountries, major, budget, scholarshipNeeded, timeline,
        prestige: prestige[0], scholarship: scholarship[0],
        careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
        // Optional Step 4 — persist only when filled.
        careerGoal: careerGoal || undefined,
        extracurriculars: extracurriculars || undefined,
        background: background || undefined,
        namedSchools: namedSchools || undefined,
        ts: Date.now(),
      };
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draftPayload));
    } catch { /* ignore quota / private-mode errors */ }
  }, [
    screen,
    fullName, email, whatsapp, nationality, gradeLevel, gpa, gpaScale, ielts, toefl, sat,
    targetCountries, major, budget, scholarshipNeeded, timeline,
    prestige, scholarship, careerRoi, visaAccess, locationPref,
    careerGoal, extracurriculars, background, namedSchools,
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
    fullName, email, whatsapp, nationality, gradeLevel, gpa, gpaScale, ielts, toefl, sat,
    targetCountries, major, budget, scholarshipNeeded, timeline,
    prestige: prestige[0], scholarship: scholarship[0],
    careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
  };

  return (
    // Background philosophy 2026-05-10 (revised): two distinct visual
    // zones for the two distinct mental modes the user is in.
    //   · INTAKE = focus mode → DARK navy. Like a writing app or a
    //     creative tool, the wizard is where the user pours their
    //     profile in. Dark canvas reduces visual noise, centers
    //     attention on the form fields, signals "we're working here".
    //   · DASHBOARD = reading mode → CREAM. The brief is dense
    //     personal prose — needs the calm canvas you'd want for
    //     reading a letter. Cream + gold accents + editorial type.
    //
    // 2026-05-10 rework: pre-fix the `dark` class lived on the OUTER
    // wrapper which made the entire page (footer included) flip to a
    // dark-mode color theme. The user flagged this hard — the footer
    // should not abruptly change colors, and the navy we want is the
    // navy from our existing palette, not a wholesale dark-mode flip.
    //
    // Fix: the `dark` class is now scoped to the intake motion.div
    // ITSELF, treating the wizard as a navy island rather than the
    // page going dark mode. Outer wrapper stays cream. Navigation
    // gets `variant="overlay"` while on intake so it reads correctly
    // against the navy band (mirrors the Discover dark-phase pattern).
    // Footer is hidden during intake so there's no abrupt color shift
    // when crossing into the navy panel — it returns when the user
    // lands on the dashboard (strategy report).
    // 2026-05-10 v4 — RESET. After three rounds of navy-tuning attempts
    // that the user kept finding "off", I'm dropping the dark/navy intake
    // mode entirely and going premium-minimal CREAM throughout (per user
    // direction: "completely scrap everything I said... full discretion").
    //
    // The new direction takes inspiration from Linear, Notion, Stripe
    // Express onboardings: a single calm cream canvas, editorial display
    // typography, generous whitespace, gold accents used SPARINGLY (the
    // active step pill, focus rings, the "Generate" CTA), no mode flip,
    // no theme overrides. The form element styling lives directly on the
    // inputs/labels rather than relying on dark-mode tokens.
    //
    // Footer stays hidden during intake — keeps the page reading as a
    // focused product surface, not a website page with a footer.
    <div className="min-h-screen bg-background relative overflow-hidden">
      <TopUniAIEntrance language="en" />
      <div className="relative z-10">
        <Navigation language="en" />

        <AnimatePresence mode="wait">
          {/* ═══ INTAKE — premium cream canvas ═══ */}
          {screen === "intake" && (
            <motion.div
              key="intake"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-12 pb-20">
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
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-3">Step 01 · Who you are</p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                        Let's start with you.
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">The basics that shape every program match — about a minute.</p>
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
                          {/* Paired input + scale picker — covers the four
                              common bases (US 4.0, post-Soviet 5.0,
                              Continental Europe 10.0, percentage 100) so
                              users put in their actual number rather than
                              mentally converting. Downstream scoring
                              normalizes to 4.0. */}
                          <div className="flex gap-2">
                            <Input
                              value={gpa}
                              // Keydown gate: block non-numeric keys at the
                              // keystroke before they enter the field. The
                              // previous onChange-only strip let letters
                              // briefly flash into the input then disappear
                              // (visible jitter); blocking on keydown means
                              // letters never appear in the first place.
                              // Whitelist navigation + clipboard keys so
                              // arrows, backspace, copy/paste still work.
                              onKeyDown={e => {
                                const allowed = [
                                  "Backspace", "Delete", "Tab", "Escape", "Enter",
                                  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
                                  "Home", "End",
                                ];
                                if (allowed.includes(e.key)) return;
                                if (e.metaKey || e.ctrlKey) return; // cmd+a, cmd+c, etc.
                                // One decimal point max.
                                if (e.key === ".") {
                                  if (gpa.includes(".")) e.preventDefault();
                                  return;
                                }
                                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                              }}
                              onChange={e => {
                                // Belt-and-braces strip — paste events
                                // bypass keydown so anything pasted still
                                // needs cleaning here. Single decimal point
                                // enforced same as the keydown branch.
                                const v = e.target.value.replace(/[^0-9.]/g, "");
                                const parts = v.split(".");
                                const cleaned = parts.length > 2
                                  ? `${parts[0]}.${parts.slice(1).join("")}`
                                  : v;
                                setGpa(cleaned);
                              }}
                              inputMode="decimal"
                              placeholder={
                                gpaScale === "5.0" ? "e.g. 4.7"
                                : gpaScale === "10.0" ? "e.g. 8.5"
                                : gpaScale === "100" ? "e.g. 87"
                                : "e.g. 3.7"
                              }
                              className="h-11 bg-card flex-1"
                            />
                            <div className="flex rounded-md overflow-hidden border border-border bg-card shrink-0">
                              {["4.0", "5.0", "10.0", "100"].map(s => (
                                <button
                                  type="button"
                                  key={s}
                                  onClick={() => setGpaScale(s)}
                                  className={`px-2.5 text-xs font-semibold transition-colors ${
                                    gpaScale === s
                                      ? "bg-gold-dark text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  }`}
                                >
                                  /{s}
                                </button>
                              ))}
                            </div>
                          </div>
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
                    {/* Account sign-up callout — collapsed-by-default
                        invitation to convert the email field into a
                        full account so the user's strategy report
                        survives tab close + syncs across devices.
                        Hidden when already signed in. The Continue
                        button calls signUpWithPassword first if a
                        password was set; failures (email taken,
                        weak password) keep the user on Step 1 with
                        an inline toast — they can fix or skip. */}
                    {!user && (
                      <div className="rounded-xl border border-gold/35 bg-gold/[0.06] px-5 py-4 space-y-3 relative overflow-hidden">
                        {/* Subtle gold-flare accent — soft inner glow that
                            signals "this is the value-saving moment" without
                            dominating. */}
                        <div
                          className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/15 blur-2xl"
                          aria-hidden
                        />
                        <div className="relative flex items-start gap-2.5">
                          <Shield className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              Save your report
                            </p>
                            <p className="text-[11px] text-foreground/70 leading-snug mt-0.5">
                              Set a password to create an account.
                            </p>
                          </div>
                        </div>
                        <div className="relative grid sm:grid-cols-[1fr,auto] gap-2.5">
                          <Input
                            type="password"
                            value={accountPassword}
                            onChange={e => setAccountPassword(e.target.value)}
                            placeholder="Pick a password (8+ chars · optional)"
                            className="h-10 bg-card text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 gap-2 bg-card border-border/80 hover:border-foreground/40"
                            onClick={async () => {
                              setAccountSubmitting(true);
                              const { error } = await signInWithGoogle();
                              setAccountSubmitting(false);
                              if (error) toast.error(error);
                              // Google redirects out — no further work here.
                            }}
                            disabled={accountSubmitting}
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.1A6.84 6.84 0 015.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 001 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
                              <path fill="#EA4335" d="M12 5.5c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.18 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.43 9.14 5.5 12 5.5z"/>
                            </svg>
                            Google
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => navigate("/")}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button
                        variant="gold"
                        onClick={async () => {
                          // If the user typed a password and isn't yet
                          // signed in, attempt sign-up before advancing.
                          // On success the AuthContext picks up the new
                          // session; on failure (email taken, weak pwd)
                          // we surface a toast and keep them on Step 1.
                          if (!user && accountPassword.trim().length > 0) {
                            if (accountPassword.length < 8) {
                              toast.error("Password needs at least 8 characters.");
                              return;
                            }
                            setAccountSubmitting(true);
                            const { error, needsConfirmation } = await signUpWithPassword(email.trim(), accountPassword);
                            setAccountSubmitting(false);
                            if (error) {
                              toast.error(/already|exists|registered/i.test(error)
                                ? "That email already has an account — leave the password blank to continue, or sign in from Account."
                                : error);
                              return;
                            }
                            // When Supabase email-confirmation is on the
                            // session isn't created until the user clicks
                            // the verification link, so we can't sync the
                            // brief to their account yet. Surface the
                            // confirm-email case explicitly + still let
                            // them advance — the brief generates on
                            // localStorage and will adopt the account
                            // once they verify and come back.
                            if (needsConfirmation) {
                              toast.success("Account created — check your email to confirm. Your report saves to this device meanwhile.");
                            } else {
                              toast.success("Account created — your report will save automatically.");
                            }
                          }
                          goToStep(2);
                        }}
                        disabled={accountSubmitting || !fullName.trim() || !email.trim() || !nationality.trim() || !gradeLevel || !gpa.trim()}
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
                        What are you studying?
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">Tell us your field and when you'd start — we'll match programs across every geography that fits your profile.</p>
                    </div>
                    <div className="space-y-6">
                      {/* Target countries removed entirely 2026-05-10.
                          Earlier the field was OPTIONAL but the typeahead
                          (which suggested Mexico/Czech Republic etc. that
                          weren't on the popular dropdown) created
                          confusion AND the broader filter geography
                          already disambiguates location downstream.
                          Brief generator now always treats geography
                          as Open and the shortlist samples across all
                          regions — what the optional path delivered
                          anyway. The major/field below is the real
                          locking variable for direction. */}
                      {/* Intended major — converted from a native
                          <datalist> (browser-default ugly dropdown) to a
                          themed Select to match the rest of the wizard.
                          "Other" reveals a free-text input so users with
                          a specialty not in the canonical list (e.g.
                          "Quantum Biophysics") aren't blocked. */}
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">Intended major *</Label>
                        {(() => {
                          const MAJORS = [
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
                          ];
                          const isOther = !!major && !MAJORS.includes(major);
                          const selectValue = isOther ? "__other__" : (major || "");
                          return (
                            <>
                              <Select
                                value={selectValue}
                                onValueChange={v => setMajor(v === "__other__" ? (isOther ? major : "") : v)}
                              >
                                <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select your major" /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                  {MAJORS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                  <SelectItem value="__other__">Other (type below)</SelectItem>
                                </SelectContent>
                              </Select>
                              {selectValue === "__other__" && (
                                <Input
                                  value={isOther ? major : ""}
                                  onChange={e => setMajor(e.target.value)}
                                  placeholder="e.g. Quantum Biophysics"
                                  className="h-11 bg-card mt-2"
                                  autoFocus
                                />
                              )}
                            </>
                          );
                        })()}
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
                        disabled={!major.trim()}
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
                      {/* Reverted to the simple 1-5 sliders 2026-05-10
                          per user direction "REVERT" — the tier-picker /
                          money-signal / 3-tile creative redesign didn't
                          land. Three sliders that shape the brief:
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
                              gpa, gpaScale, ielts, toefl, sat, major, budget,
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
              </div>
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

        {/* Footer hidden during intake (steps 1-3) so the navy island
            isn't broken up by a colour shift; returns on dashboard
            where the user is in reading-mode for the strategy report
            and the cream canvas calls for site chrome. */}
        {screen === "dashboard" && <Footer language="en" />}
      </div>
    </div>
  );
};

export default TopUniAI;
