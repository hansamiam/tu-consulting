import { useState, useEffect, useMemo } from "react";
import { trackPageView } from "@/utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import topuniBg from "@/assets/topuni-bg.jpg";
// BetaBanner retired site-wide 2026-05-10 per user direction.
import { TopUniAIEntrance } from "@/components/topuni/TopUniAIEntrance";
import { Footer } from "@/components/Footer";
import TopUniDashboard from "@/components/TopUniDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Plus,
  Check,
  X,
} from "lucide-react";
import {
  COUNTRY_DEFAULT_CHIPS,
  COUNTRY_MASTER,
  countryLabel,
  COUNTRY_PICK_CAP,
  OTHER_TOKEN,
} from "@/lib/country-chips";
import {
  LANGUAGE_CHIPS,
  languageLabel,
  FIRST_ABROAD_CHIPS,
  firstAbroadLabel,
  type FirstAbroadOption,
} from "@/lib/language-chips";
import {
  EC_BROAD_CHIPS,
  EC_ELITE_EXPANDABLE,
  ecChipLabel,
  composeExtracurriculars,
} from "@/lib/ec-chips";
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
  /* 2026-05-18 Sharpen-step optional intake (was Step 4, became Step 3
   * when the wizard collapsed 4 → 3 on 2026-05-20). All skippable.
   * Sharpens the brief's personalisation when filled; absent ⇒ brief
   * just leans on Step 1-2 fields like before. */
  careerGoal?: string;
  extracurriculars?: string;
  background?: string;
  namedSchools?: string;
  /** Sparse-input pass (2026-05-23). Step 1 chip multi-select for
   *  foreign languages learned (excludes English + CIS native — anything
   *  here is distinctive by definition). Drives brief celebration of
   *  language fluency. */
  foreignLanguages?: string[];
  /** Sparse-input pass (2026-05-23). Step 1 chip single-select. Drives
   *  cultural-context.firstAbroadFramingFor() in the brief generator —
   *  CIS = "leaving home" angle, US/LatAm = "first-gen college" angle. */
  firstToApplyAbroad?: "yes" | "siblings_have" | "parents_have" | "unsure";
  /** Sparse-input pass (2026-05-23). Step 3 broad-first EC chip
   *  selections. Prepended to extracurriculars textarea on Generate. */
  selectedECTags?: string[];
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

interface TopUniAIProps {
  /** Language for visible copy. RU also flips the document title +
   *  the saveProfile redirect target to /discover/ru. */
  language?: "en" | "ru";
}

const TopUniAI = ({ language = "en" }: TopUniAIProps) => {
  const ru = language === "ru";
  // Inline translation helper — only English literals live in the JSX
  // by default; RU strings get added as `t("English", "Русский")` as
  // we touch each piece of copy. Keeps the two languages in lock-step
  // via the same source of truth (one component, both renderings).
  const t = (en: string, rText: string) => (ru ? rText : en);
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
    trackPageView(ru ? "/topuni-ai/ru" : "/topuni-ai");
    const prev = document.title;
    document.title = ru
      ? "TopUni AI — Ваша персональная стратегия поступления"
      : "TopUni AI — Your personalized scholarship strategy";
    return () => { document.title = prev; };
  }, [ru]);

  // Load any in-progress draft on first render. The hub-context handoff
  // effect runs separately and may overwrite specific fields (country
  // prefill etc.) after this — that's intentional: a fresh hub click
  // should shape the draft, not be ignored. Empty string defaults are
  // used when the draft is absent or partial.
  const draft = useMemo(() => loadDraft(), []);

  // 2026-05-19: surface a toast when we restore a meaningful draft so
  // the user understands why fields are pre-filled. Fires once on
  // mount. "Meaningful" = at least 2 substantive fields filled AND
  // at least 5 minutes since the last save — a draft from a refresh
  // 30 seconds ago doesn't warrant a toast. (2026-05-20 tightened from
  // "any age" to "≥5 min" to suppress toast spam on accidental
  // reloads / dev-mode hot module swaps.)
  useEffect(() => {
    if (!draft) return;
    const filled = [
      draft.fullName, draft.email, draft.nationality, draft.gradeLevel,
      draft.gpa, draft.major, draft.ielts, draft.toefl, draft.sat,
    ].filter((v) => typeof v === "string" && v.trim().length > 0).length;
    if (filled < 2) return;
    const ageMs = draft.ts ? Date.now() - draft.ts : 0;
    if (ageMs < 5 * 60_000) return;
    const minutes = Math.max(1, Math.round(ageMs / 60_000));
    const timeLabel = minutes > 1440
      ? `${Math.round(minutes / 1440)} day${Math.round(minutes / 1440) === 1 ? "" : "s"} ago`
      : minutes > 60
        ? `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) === 1 ? "" : "s"} ago`
        : `${minutes} min ago`;
    toast.success(
      ru
        ? `С возвращением — восстановили ваш прогресс (${timeLabel}).`
        : `Welcome back — restored your progress from ${timeLabel}.`,
      { duration: 4500 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  // 2026-05-23: country chips restored. Step 2 renders 11 default chips
  // + an "Other" chip that opens a typeahead modal. Cap at 3 per
  // COUNTRY_PICK_CAP — matches the brief-plan countryBuckets slice.
  // The synthetic OTHER_TOKEN is intercepted in toggleCountry so it
  // never lands in targetCountries state — it only opens the modal.
  const [showCountrySearch, setShowCountrySearch] = useState(false);
  const toggleCountry = (token: string) => {
    if (token === OTHER_TOKEN) { setShowCountrySearch(true); return; }
    setTargetCountries((prev) => {
      if (prev.includes(token)) return prev.filter((c) => c !== token);
      if (prev.length >= COUNTRY_PICK_CAP) return prev;
      return [...prev, token];
    });
  };
  // 2026-05-23 sparse-input pass: Step 1 captures foreign languages
  // (chip multi-select, no cap) + first-in-family-abroad (chip single-
  // select). Both feed the brief's cultural-context lens. Defaults:
  // empty array / undefined → brief skips the framing branch entirely.
  const [foreignLanguages, setForeignLanguages] = useState<string[]>(
    Array.isArray(draft?.foreignLanguages) ? draft!.foreignLanguages! : [],
  );
  const toggleForeignLanguage = (token: string) => {
    setForeignLanguages((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token],
    );
  };
  const [firstToApplyAbroad, setFirstToApplyAbroad] = useState<
    FirstAbroadOption["token"] | undefined
  >(draft?.firstToApplyAbroad);
  // 2026-05-23 sparse-input pass: Step 3 EC chips. Broad-first defaults
  // visible; elite-coded (Olympiads, Debate, etc.) hidden behind a
  // "+ More activities…" expand. Selected tokens are PREPENDED to the
  // extracurriculars textarea on Generate via composeExtracurriculars()
  // — backend reads the combined string as a single field.
  const [selectedECTags, setSelectedECTags] = useState<string[]>(
    Array.isArray(draft?.selectedECTags) ? draft!.selectedECTags! : [],
  );
  const [showMoreECChips, setShowMoreECChips] = useState(false);
  const toggleECTag = (token: string) => {
    setSelectedECTags((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token],
    );
  };
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

  // 2026-05-18 Sharpen-step (Step 3) optional fields. All skippable —
  // Pro upsell dialog retired in favour of in-flow optional questions
  // so the brief can be personalised without paywalling the depth
  // signal.
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
        // Optional Sharpen-step fields — persist only when filled.
        careerGoal: careerGoal || undefined,
        extracurriculars: extracurriculars || undefined,
        background: background || undefined,
        namedSchools: namedSchools || undefined,
        // Sparse-input pass — Step 1 chip fields.
        foreignLanguages: foreignLanguages.length > 0 ? foreignLanguages : undefined,
        firstToApplyAbroad,
        // Sparse-input pass — Step 3 EC chip selections.
        selectedECTags: selectedECTags.length > 0 ? selectedECTags : undefined,
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
    foreignLanguages, firstToApplyAbroad, selectedECTags,
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
    //
    // Q2=C cream background (2026-05-23 polish): the wizard now sits
    // on a soft cream off-white instead of the default neutral
    // `--background`. Aligns with the brief's Wrapped-Bold tinted
    // surfaces and the editorial design system Samuel locked. The
    // bg-card insets (input fields, dropdowns) still render as the
    // standard card color so they read as clean foreground against
    // the cream. Inline style so it doesn't bleed into other pages.
    <div className="min-h-screen relative overflow-hidden" style={{ background: "hsl(38 35% 97%)" }}>
      {/* Campus backdrop — restored 2026-05-24. Fixed-position image at
          12% opacity with a 3px blur sits behind the cream canvas, so
          when the user scrolls the wizard the backdrop stays put (a
          subtle parallax-by-position-fixed). Subtle enough not to clash
          with form fields, present enough to add place + warmth to the
          intake. Was the wizard's original visual signature before the
          cream-clean reset on 2026-05-10. */}
      <div
        className="fixed inset-0 z-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `url(${topuniBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(3px)",
        }}
        aria-hidden
      />
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
              {/* 2026-05-20: consolidated 4 → 3 steps because Step 2
                  ("direction": major + timeline) was thin and felt
                  redundant against Step 3's sliders.
                  2026-05-24: re-split to 4 because Step 1 grew dense
                  after foreign-languages + first-in-family-abroad chips
                  were added (2026-05-23 sparse-input pass). Different
                  problem this time — old Step 2 is NOT coming back;
                  instead the original heavy "Profile" step is split
                  into "Identity" (about you) and "Academics" (your
                  numbers). Each step now holds ~equal visual weight. */}
              <div className="flex items-start justify-center gap-3 mb-10">
                {[
                  { n: 1, label: t("Identity", "О себе") },
                  { n: 2, label: t("Academics", "Учёба") },
                  { n: 3, label: t("Goals", "Цели") },
                  { n: 4, label: t("Sharpen", "Детали") },
                ].map(s => {
                  const isActive = s.n === step;
                  const isDone = s.n < step;
                  return (
                    <div key={s.n} className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className="h-1.5 w-12 sm:w-14 rounded-full overflow-hidden bg-border/60">
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
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="font-mono text-[12px] text-gold-dark font-semibold tabular-nums tracking-wider">01</span>
                        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
                          {t("Who you are", "Кто вы")}
                        </span>
                      </div>
                      <h2 className="font-heading text-[32px] sm:text-[44px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("Let's start with you.", "Начнём с вас.")}
                      </h2>
                      <p className="text-foreground/65 mt-3 text-[14.5px] leading-relaxed max-w-[50ch]">
                        {t("The basics that shape every program match — takes about a minute.", "Основы для подбора программ — займёт минуту.")}
                      </p>
                    </div>
                    <div className="grid gap-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">{t("Full name *", "Полное имя *")}</Label>
                          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t("What should we call you?", "Как тебя зовут?")} className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">{t("Where do we send your strategy?", "Куда отправить твою стратегию?")}</Label>
                          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="h-11 bg-card" />
                        </div>
                      </div>
                      <div className="space-y-1.5 relative">
                        {/* WhatsApp field retired — never used by the
                            brief generator and the extra "give us your
                            phone" ask was friction with no payoff. */}
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("Where are you from?", "Откуда ты?")}</Label>
                        <Input
                          value={nationality}
                          onChange={e => setNationality(e.target.value)}
                          placeholder={t("Type any country (Kazakhstan, Nigeria, …)", "Любая страна (Казахстан, Кыргызстан, …)")}
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
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("Current stage *", "Текущий этап *")}</Label>
                        <Select value={gradeLevel} onValueChange={setGradeLevel}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder={t("Where are you in school right now?", "На каком ты этапе?")} /></SelectTrigger>
                          <SelectContent>
                            {([
                              ["High School", "Школа"],
                              ["Gap Year", "Gap Year"],
                              ["Bachelor's", "Бакалавр"],
                              ["Master's", "Магистр"],
                              ["PhD applicant", "Аспирант / PhD"],
                              ["Working professional", "Работаю"],
                            ] as const).map(([val, ruLabel]) => (
                              <SelectItem key={val} value={val}>{t(val, ruLabel)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* First-in-family chip is identity context — drives
                        cultural-context.firstAbroadFramingFor() in the
                        brief (CIS = "leaving home" angle, US/LatAm =
                        "first-gen college"). Kept on the Identity step.
                        GPA + the three test scores were split off to
                        Step 2 (Academics) on 2026-05-24 to relieve
                        Step 1's vertical density. */}
                    <div className="pt-2 space-y-5">
                      <div>
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("First in your family to apply abroad?", "Первый в семье поступает за рубеж?")}</Label>
                        <p className="text-muted-foreground text-xs mt-1 mb-3">{t("Pick one — optional.", "Выбери один — по желанию.")}</p>
                        <div className="flex flex-wrap gap-2">
                          {FIRST_ABROAD_CHIPS.map((c) => {
                            const selected = firstToApplyAbroad === c.token;
                            return (
                              <button
                                key={c.token}
                                type="button"
                                onClick={() => setFirstToApplyAbroad(selected ? undefined : c.token)}
                                aria-pressed={selected}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[36px] ${
                                  selected
                                    ? "bg-gold-dark text-cream border-gold-dark"
                                    : "bg-card text-foreground border-border/70 hover:border-gold-dark/60"
                                }`}
                              >
                                {selected && <Check className="w-3 h-3" />}
                                {firstAbroadLabel(c.token, language === "ru" ? "ru" : "en")}
                              </button>
                            );
                          })}
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
                              {t("Save your report", "Сохраните ваш отчёт")}
                            </p>
                            <p className="text-[11px] text-foreground/70 leading-snug mt-0.5">
                              {t("Set a password to create an account.", "Задайте пароль чтобы создать аккаунт.")}
                            </p>
                          </div>
                        </div>
                        <div className="relative grid sm:grid-cols-[1fr,auto] gap-2.5">
                          <Input
                            type="password"
                            value={accountPassword}
                            onChange={e => setAccountPassword(e.target.value)}
                            placeholder={t("Pick a password (8+ chars · optional)", "Пароль (от 8 символов · по желанию)")}
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
                      <Button variant="outline" onClick={() => navigate(ru ? "/ru" : "/")}><ArrowLeft className="mr-2 w-4 h-4" /> {t("Back", "Назад")}</Button>
                      <Button
                        variant="gold"
                        onClick={async () => {
                          if (!user && accountPassword.trim().length > 0) {
                            if (accountPassword.length < 8) {
                              toast.error(t("Password needs at least 8 characters.", "Пароль должен быть от 8 символов."));
                              return;
                            }
                            setAccountSubmitting(true);
                            const { error, needsConfirmation } = await signUpWithPassword(email.trim(), accountPassword);
                            setAccountSubmitting(false);
                            if (error) {
                              toast.error(/already|exists|registered/i.test(error)
                                ? t("That email already has an account — leave the password blank to continue, or sign in from Account.",
                                    "На этот email уже есть аккаунт — оставьте пароль пустым или войдите через Аккаунт.")
                                : error);
                              return;
                            }
                            if (needsConfirmation) {
                              toast.success(t("Account created — check your email to confirm. Your report saves to this device meanwhile.",
                                              "Аккаунт создан — подтвердите email. Отчёт пока сохраняется локально."));
                            } else {
                              toast.success(t("Account created — your report will save automatically.",
                                              "Аккаунт создан — отчёт сохранится автоматически."));
                            }
                          }
                          goToStep(2);
                        }}
                        disabled={accountSubmitting || !fullName.trim() || !email.trim() || !nationality.trim() || !gradeLevel}
                      >
                        {t("Nice. Your numbers next.", "Хорошо. Дальше — баллы.")} <ArrowRight className="ml-2 w-4 h-4" />
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
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="font-mono text-[12px] text-gold-dark font-semibold tabular-nums tracking-wider">02</span>
                        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
                          {t("Your numbers", "Баллы")}
                        </span>
                      </div>
                      <h2 className="font-heading text-[32px] sm:text-[44px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("How does your academic record look?", "Как выглядит твоя успеваемость?")}
                      </h2>
                      <p className="text-foreground/65 mt-3 text-[14.5px] leading-relaxed max-w-[50ch]">
                        {t("Just what you've got. Skip the tests you haven't taken.", "Только то, что есть. Пропускай тесты, которые не сдавал.")}
                      </p>
                    </div>
                    <div className="grid gap-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">{t("What's your GPA looking like?", "Какой у тебя средний балл?")}</Label>
                          {/* Paired input + scale picker — covers the four
                              common bases (US 4.0, post-Soviet 5.0,
                              Continental Europe 10.0, percentage 100) so
                              users put in their actual number rather than
                              mentally converting. Downstream scoring
                              normalizes to 4.0. */}
                          <div className="flex gap-2">
                            <Input
                              value={gpa}
                              onKeyDown={e => {
                                const allowed = [
                                  "Backspace", "Delete", "Tab", "Escape", "Enter",
                                  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
                                  "Home", "End",
                                ];
                                if (allowed.includes(e.key)) return;
                                if (e.metaKey || e.ctrlKey) return;
                                if (e.key === ".") {
                                  if (gpa.includes(".")) e.preventDefault();
                                  return;
                                }
                                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                              }}
                              onChange={e => {
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
                          <Input value={ielts} onChange={e => setIelts(e.target.value)} placeholder={t("Score or skip · e.g. 7.0", "Балл или пропусти · напр. 7.0")} className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">TOEFL</Label>
                          <Input value={toefl} onChange={e => setToefl(e.target.value)} placeholder={t("Score or skip · e.g. 100", "Балл или пропусти · напр. 100")} className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">SAT</Label>
                          <Input value={sat} onChange={e => setSat(e.target.value)} placeholder={t("Score or skip · e.g. 1450", "Балл или пропусти · напр. 1450")} className="h-11 bg-card" />
                        </div>
                      </div>
                    </div>
                    {/* Foreign-languages chip set — moved from old Step 1
                        on 2026-05-24 to pair with English-test scores on
                        the academic-record step. Set deliberately omits
                        English + CIS native languages so anything picked
                        IS distinctive (no cultural-baseline filtering
                        needed in the brief). */}
                    <div>
                      <Label className="text-xs uppercase tracking-wider font-medium">{t("Foreign languages you're learning or speak", "Иностранные языки")}</Label>
                      <p className="text-muted-foreground text-xs mt-1 mb-3">{t("Beyond your native and English. Pick all that apply — optional.", "Помимо родного и английского. Отметь все — по желанию.")}</p>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGE_CHIPS.map((c) => {
                          const selected = foreignLanguages.includes(c.token);
                          return (
                            <button
                              key={c.token}
                              type="button"
                              onClick={() => toggleForeignLanguage(c.token)}
                              aria-pressed={selected}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[36px] ${
                                selected
                                  ? "bg-gold-dark text-cream border-gold-dark"
                                  : "bg-card text-foreground border-border/70 hover:border-gold-dark/60"
                              }`}
                            >
                              {selected && <Check className="w-3 h-3" />}
                              {languageLabel(c.token, language === "ru" ? "ru" : "en")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => goToStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> {t("Back", "Назад")}</Button>
                      <Button
                        variant="gold"
                        onClick={() => goToStep(3)}
                        disabled={!gpa.trim()}
                      >
                        {t("Got it. Where are you headed?", "Понял. Куда поступаешь?")} <ArrowRight className="ml-2 w-4 h-4" />
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
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="font-mono text-[12px] text-gold-dark font-semibold tabular-nums tracking-wider">03</span>
                        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{t("Direction", "Направление")}</span>
                      </div>
                      <h2 className="font-heading text-[32px] sm:text-[44px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("What are you chasing?", "К чему вы стремитесь?")}
                      </h2>
                      <p className="text-foreground/65 mt-3 text-[14.5px] leading-relaxed max-w-[52ch]">
                        {t("Field, timeline, and what matters most. We'll match across every geography that fits.", "Область, сроки и приоритеты. Подберём программы по всему миру.")}
                      </p>
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
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("What do you (think you) want to study?", "Что ты (думаешь, что) хочешь изучать?")}</Label>
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
                                <SelectTrigger className="h-11 bg-card"><SelectValue placeholder={t("Select your major", "Выберите специальность")} /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                  {MAJORS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                  <SelectItem value="__other__">{t("Other (type below)", "Другое (ввести ниже)")}</SelectItem>
                                </SelectContent>
                              </Select>
                              {selectValue === "__other__" && (
                                <Input
                                  value={isOther ? major : ""}
                                  onChange={e => setMajor(e.target.value)}
                                  placeholder={t("e.g. Quantum Biophysics", "напр. Квантовая биофизика")}
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
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("When are you starting?", "Когда стартуешь?")}</Label>
                        <Select value={timeline} onValueChange={setTimeline}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder={t("Select", "Выберите")} /></SelectTrigger>
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
                    {/* 2026-05-23: country chip multi-select restored.
                        Pre-PR-#54 this UI existed but was removed. The
                        brief generator still references targetCountries
                        in Card 02 ("Where you belong"); without a UI input
                        direct visitors always passed [], and Card 02 either
                        invented countries or fell back to broken ["Open"].
                        Same silent-failure pattern as PR #10. Chip defaults
                        intentionally include Hungary / Türkiye / China to
                        teach Top Uni's anti-Crimson positioning. */}
                    <div className="pt-2">
                      <Label className="text-xs uppercase tracking-wider font-medium">{t("Where do you want to study?", "Куда хочешь поступать?")}</Label>
                      <p className="text-muted-foreground text-xs mt-1 mb-3">{t(`Pick up to ${COUNTRY_PICK_CAP} — optional.`, `Выбери до ${COUNTRY_PICK_CAP} — по желанию.`)}</p>
                      <div className="flex flex-wrap gap-2">
                        {[...COUNTRY_DEFAULT_CHIPS, OTHER_TOKEN].map((token) => {
                          const isOther = token === OTHER_TOKEN;
                          const selected = !isOther && targetCountries.includes(token);
                          const atCap = !selected && !isOther && targetCountries.length >= COUNTRY_PICK_CAP;
                          const label = isOther
                            ? t("Other…", "Другое…")
                            : countryLabel(token, language === "ru" ? "ru" : "en");
                          return (
                            <button
                              key={token}
                              type="button"
                              onClick={() => toggleCountry(token)}
                              disabled={atCap}
                              aria-pressed={selected}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[36px] ${
                                selected
                                  ? "bg-gold-dark text-cream border-gold-dark"
                                  : isOther
                                    ? "bg-card text-foreground border-dashed border-border hover:border-gold-dark/60"
                                    : "bg-card text-foreground border-border/70 hover:border-gold-dark/60"
                              } ${atCap ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                              {selected && <Check className="w-3 h-3" />}
                              {isOther && !selected && <Plus className="w-3 h-3" />}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Selected-but-not-in-defaults chips — render below
                          so users see their typeahead picks alongside the
                          default-chip selections. */}
                      {targetCountries.some((t2) => !COUNTRY_DEFAULT_CHIPS.includes(t2)) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {targetCountries.filter((t2) => !COUNTRY_DEFAULT_CHIPS.includes(t2)).map((token) => (
                            <button
                              key={token}
                              type="button"
                              onClick={() => toggleCountry(token)}
                              aria-pressed={true}
                              className="inline-flex items-center gap-1.5 rounded-full border bg-gold-dark text-cream border-gold-dark px-3 py-1.5 text-xs font-medium min-h-[36px]"
                            >
                              <Check className="w-3 h-3" />
                              {countryLabel(token, language === "ru" ? "ru" : "en")}
                              <X className="w-3 h-3 opacity-70 ml-0.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Typeahead modal for the long-tail countries.
                        cmdk-backed Command filters as the user types. */}
                    <Dialog open={showCountrySearch} onOpenChange={setShowCountrySearch}>
                      <DialogContent className="max-w-md p-0 overflow-hidden">
                        <DialogHeader className="px-4 pt-4">
                          <DialogTitle className="text-base">{t("More countries", "Больше стран")}</DialogTitle>
                        </DialogHeader>
                        <Command>
                          <CommandInput placeholder={t("Search countries…", "Поиск стран…")} />
                          <CommandList className="max-h-80">
                            <CommandEmpty>{t("No matches.", "Ничего не найдено.")}</CommandEmpty>
                            <CommandGroup>
                              {COUNTRY_MASTER.map((c) => {
                                const selected = targetCountries.includes(c.token);
                                const atCap = !selected && targetCountries.length >= COUNTRY_PICK_CAP;
                                const label = language === "ru" ? c.ru : c.en;
                                return (
                                  <CommandItem
                                    key={c.token}
                                    value={`${c.en} ${c.ru}`}
                                    disabled={atCap}
                                    onSelect={() => {
                                      if (atCap) return;
                                      toggleCountry(c.token);
                                      if (!selected) setShowCountrySearch(false);
                                    }}
                                    className={atCap ? "opacity-40" : ""}
                                  >
                                    {selected && <Check className="w-4 h-4 mr-2 text-gold-dark" />}
                                    {!selected && <span className="w-4 mr-2" />}
                                    {label}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                        {targetCountries.length >= COUNTRY_PICK_CAP && (
                          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/60">
                            {t(`Up to ${COUNTRY_PICK_CAP} — remove one to add another.`, `Максимум ${COUNTRY_PICK_CAP} — удали одну, чтобы добавить другую.`)}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    {/* Priorities sliders — folded into Step 02 on 2026-05-20
                        when 4 steps collapsed to 3. Three sliders that
                        shape the brief: prestige, scholarship need, visa
                        accessibility. Header sets a soft divider between
                        the "direction" half above and "priorities" below
                        so the merged step still reads as two intents. */}
                    <div className="pt-2">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark/80 font-medium mb-1.5">{t("What matters most", "Что важно")}</p>
                      <p className="text-muted-foreground text-sm mb-4">{t("Weight each on a 1-5 scale.", "Оцените каждое по шкале 1–5.")}</p>
                      <div className="space-y-5">
                        {[
                          { label: t("Prestige", "Престиж"), value: prestige, set: setPrestige, icon: GraduationCap, low: t("Any school", "Любой вуз"), high: t("Top 50 only", "Только топ-50") },
                          { label: t("Scholarship need", "Нужна стипендия"), value: scholarship, set: setScholarship, icon: Shield, low: t("Self-fund OK", "Готов(а) платить"), high: t("Must be free", "Только бесплатно") },
                          { label: t("Visa accessibility", "Доступность визы"), value: visaAccess, set: setVisaAccess, icon: CheckCircle2, low: t("Don't mind", "Не важно"), high: t("Easy access", "Простая виза") },
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
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => goToStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> {t("Back", "Назад")}</Button>
                      <Button
                        variant="gold"
                        onClick={() => goToStep(4)}
                        disabled={!major.trim()}
                      >
                        {t("Good. Last bit's optional.", "Отлично. Последнее — по желанию.")} <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={stepEnter}
                    animate={{ opacity: 1, x: 0 }}
                    exit={stepExit}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-7"
                  >
                    <div>
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="font-mono text-[12px] text-gold-dark font-semibold tabular-nums tracking-wider">04</span>
                        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{t("Sharpen", "Детали")}</span>
                      </div>
                      <h2 className="font-heading text-[32px] sm:text-[44px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("Tell us more — or skip ahead.", "Расскажите больше — или пропустите.")}
                      </h2>
                      <p className="text-foreground/65 mt-3 text-[14.5px] leading-relaxed max-w-[54ch]">
                        {t("Optional. Each detail makes your essay angles and shortlist sharper. Anything you share stays private to your report.",
                           "По желанию. Каждая деталь усиливает идеи эссе и подбор. Всё остаётся приватным в вашем отчёте.")}
                      </p>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="careerGoal" className="text-xs uppercase tracking-wider font-medium">{t("Where do you want this to lead?", "К чему ты идёшь?")}</Label>
                        <Textarea
                          id="careerGoal"
                          placeholder={t("e.g. data scientist focused on climate modeling", "напр. data scientist в климатическом моделировании")}
                          value={careerGoal}
                          onChange={(e) => setCareerGoal(e.target.value)}
                          className="min-h-[70px] resize-none bg-card"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="extracurriculars" className="text-xs uppercase tracking-wider font-medium">{t("What have you actually been doing outside class?", "Чем ты реально занимаешься помимо учёбы?")}</Label>
                        {/* 2026-05-23 sparse-input pass: broad-first EC chip
                            row. Leads with culturally inclusive options
                            (Tutoring, Part-time job, Family responsibilities,
                            Creating online, Self-taught skill). Elite-coded
                            chips (Olympiads, Debate, Research, etc.) live
                            behind "+ More activities…" so they're reachable
                            but don't telegraph the Crimson Education default.
                            On Generate the selected tokens are prepended to
                            this textarea as `tags: ...` so the backend reads
                            them as a single extracurriculars field. */}
                        <div className="space-y-1.5">
                          <p className="text-muted-foreground text-xs">{t("Quick picks — tap any that apply.", "Быстрый выбор — отметь подходящее.")}</p>
                          <div className="flex flex-wrap gap-2">
                            {EC_BROAD_CHIPS.map((c) => {
                              const selected = selectedECTags.includes(c.token);
                              return (
                                <button
                                  key={c.token}
                                  type="button"
                                  onClick={() => toggleECTag(c.token)}
                                  aria-pressed={selected}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[34px] ${
                                    selected
                                      ? "bg-gold-dark text-cream border-gold-dark"
                                      : "bg-card text-foreground border-border/70 hover:border-gold-dark/60"
                                  }`}
                                >
                                  {selected && <Check className="w-3 h-3" />}
                                  {ecChipLabel(c.token, language === "ru" ? "ru" : "en")}
                                </button>
                              );
                            })}
                          </div>
                          {!showMoreECChips && (
                            <button
                              type="button"
                              onClick={() => setShowMoreECChips(true)}
                              className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-1"
                            >
                              + {t("More activities…", "Ещё активности…")}
                            </button>
                          )}
                          {showMoreECChips && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {EC_ELITE_EXPANDABLE.map((c) => {
                                const selected = selectedECTags.includes(c.token);
                                return (
                                  <button
                                    key={c.token}
                                    type="button"
                                    onClick={() => toggleECTag(c.token)}
                                    aria-pressed={selected}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all min-h-[34px] ${
                                      selected
                                        ? "bg-gold-dark text-cream border-gold-dark"
                                        : "bg-card text-foreground border-border/70 hover:border-gold-dark/60"
                                    }`}
                                  >
                                    {selected && <Check className="w-3 h-3" />}
                                    {ecChipLabel(c.token, language === "ru" ? "ru" : "en")}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <Textarea
                          id="extracurriculars"
                          placeholder={t("e.g. tutored my cousins for 2 years, ran a small reselling IG, IMO bronze, photography", "напр. репетировал сестру 2 года, веду IG-магазин, бронза IMO, фотография")}
                          value={extracurriculars}
                          onChange={(e) => setExtracurriculars(e.target.value)}
                          className="min-h-[90px] resize-none bg-card"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="background" className="text-xs uppercase tracking-wider font-medium">{t("Tell us about you — the version your closest friend would describe", "Расскажи о себе — так, как описал бы твой лучший друг")}</Label>
                        <Textarea
                          id="background"
                          placeholder={t("e.g. first-gen, raised in Bishkek, parents both teachers", "напр. первый в семье в вузе, из Бишкека, родители учителя")}
                          value={background}
                          onChange={(e) => setBackground(e.target.value)}
                          className="min-h-[70px] resize-none bg-card"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="namedSchools" className="text-xs uppercase tracking-wider font-medium">{t("Schools already on your list?", "Вузы, которые ты уже присмотрел(а)?")}</Label>
                        <Textarea
                          id="namedSchools"
                          placeholder={t("e.g. Stanford, U of Toronto, KAIST", "напр. Stanford, U of Toronto, KAIST")}
                          value={namedSchools}
                          onChange={(e) => setNamedSchools(e.target.value)}
                          className="min-h-[60px] resize-none bg-card"
                        />
                      </div>
                    </div>

                    {/* Generate handler shared by Skip + Generate buttons.
                        Same as old Step 3 Generate but moved here so the
                        optional context fields are guaranteed-persisted
                        before the brief streams. */}
                    {(() => {
                      const onGenerate = () => {
                        try {
                          saveProfile(projectToDiscoverProfile({
                            fullName, email, nationality, gradeLevel,
                            gpa, gpaScale, ielts, toefl, sat, major, budget,
                            targetCountries,
                            careerGoal,
                            // 2026-05-23: chip tag-line prepended to free
                            // text so backend reads a single combined
                            // extracurriculars field. Tags-only path also
                            // covered (sparse fillers picking chips with
                            // empty textarea still feed the brief).
                            extracurriculars: composeExtracurriculars(selectedECTags, extracurriculars) || undefined,
                            background, namedSchools,
                            foreignLanguages: foreignLanguages.length > 0 ? foreignLanguages : undefined,
                            firstToApplyAbroad,
                          }));
                        } catch { /* localStorage may be unavailable; brief still renders */ }
                        setScreen("dashboard");
                      };
                      const filled = [careerGoal, extracurriculars, background, namedSchools]
                        .filter((v) => v && v.trim().length > 0).length;
                      // 2026-05-23 sparse-input pass: when fewer than 2 of
                      // the 4 sharpen fields are filled, show a richer
                      // nudge instead of the bland "optional" line. Gives
                      // the user one explicit chance to add more before
                      // submitting a sparse profile. "Add more" focuses
                      // the first empty textarea; the primary Generate
                      // button below is the "skip anyway" path.
                      const focusFirstEmptyStep3 = () => {
                        const ids: ReadonlyArray<[string, string]> = [
                          ["careerGoal", careerGoal],
                          ["extracurriculars", extracurriculars],
                          ["background", background],
                          ["namedSchools", namedSchools],
                        ];
                        const next = ids.find(([, v]) => !v || v.trim().length === 0);
                        if (!next) return;
                        const el = document.getElementById(next[0]);
                        if (el && "focus" in el) {
                          (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
                          (el as HTMLElement).focus({ preventScroll: true });
                        }
                      };
                      const showNudge = filled < 2;
                      return (
                        <>
                          <div className="text-center pt-2" aria-live="polite">
                            {showNudge ? (
                              <p className="text-[12px] text-muted-foreground leading-snug">
                                {t("Your brief will read more general with shorter answers. Even one line per box sharpens it.",
                                   "С короткими ответами отчёт будет более общим. Даже одна строка в каждом поле его уточняет.")}
                                {" "}
                                <button
                                  type="button"
                                  onClick={focusFirstEmptyStep3}
                                  className="text-gold-dark hover:text-gold underline underline-offset-2 font-medium"
                                >
                                  {t("Add more", "Добавить ещё")}
                                </button>
                              </p>
                            ) : (
                              <p className="text-[11.5px] text-muted-foreground">
                                {t(`${filled} of 4 fields added · sharpens essay angles and fit notes.`,
                                   `Заполнено ${filled} из 4 · улучшит идеи эссе и подбор.`)}
                              </p>
                            )}
                          </div>
                          {/* 2026-05-20: dropped the redundant "Skip for
                              now" ghost button — it called the same
                              onGenerate handler as the primary CTA, so
                              two buttons doing the same thing read as
                              clutter. The label hint above already
                              tells users they can leave fields blank. */}
                          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                            <Button variant="outline" onClick={() => goToStep(3)}>
                              <ArrowLeft className="mr-2 w-4 h-4" /> {t("Back", "Назад")}
                            </Button>
                            <Button variant="gold" size="lg" onClick={onGenerate}>
                              {t("That's enough — write it up", "Хватит — напиши мне план")}
                              <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                          </div>
                        </>
                      );
                    })()}
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
