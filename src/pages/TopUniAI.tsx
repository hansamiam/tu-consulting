import { useState, useEffect, useMemo } from "react";
import { trackPageView } from "@/utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import topuniBg from "@/assets/topuni-bg.jpg";
// BetaBanner retired site-wide 2026-05-10 per user direction.
import { TopUniAIEntrance } from "@/components/topuni/TopUniAIEntrance";
import { Footer } from "@/components/Footer";
import { StrategyView } from "@/components/strategy/StrategyView";
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
  Trophy,
  Banknote,
  Plane,
  Search,
  BookOpen,
  ListChecks,
  // 2026-05-30 — aliased to MapIcon to avoid shadowing the global JS
  // Map constructor in this file's module scope. Pre-fix the
  // nationality typeahead's `new Map(...)` resolved to this icon
  // component in the production bundle (the lucide Map is a
  // forwardRef function, not a constructor), throwing "Us is not a
  // constructor" at runtime the moment the user typed in Step 1.
  // The icon itself is currently unused below (legacy import) but
  // tree-shaking only kicks in on truly unreferenced names.
  Map as MapIcon,
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
  countryFlag,
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
import { saveProfile, getStoredProfile } from "@/components/discover/DiscoverProfileGate";
import { projectToDiscoverProfile } from "@/lib/topuniIntakeProjection";
import { KNOWN_SCHOLARSHIP_CHIPS, knownScholarshipLabel } from "@/lib/known-scholarship-chips";
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
  // Legacy siblings_have / parents_have accepted on read from old
  // drafts (pre-2026-05-25) and normalized to "no" by readers.
  firstToApplyAbroad?: "yes" | "no" | "unsure" | "siblings_have" | "parents_have";
  /** Sparse-input pass (2026-05-23). Step 3 broad-first EC chip
   *  selections. Prepended to extracurriculars textarea on Generate. */
  selectedECTags?: string[];
  /** Step 3 known-scholarship awareness chips (2026-05-27). */
  knownScholarships?: string[];
  /** 2026-05-26 — per-test "Taken / Not yet" chip state. Persisted so a
   *  page refresh keeps the user's answer rather than collapsing back to
   *  "unspecified" + an empty score field. Drives the brief generator's
   *  notTakenTests pathway. */
  ieltsState?: "unspecified" | "taken" | "not_yet";
  toeflState?: "unspecified" | "taken" | "not_yet";
  satState?: "unspecified" | "taken" | "not_yet";
  actState?: "unspecified" | "taken" | "not_yet";
  greState?: "unspecified" | "taken" | "not_yet";
  gmatState?: "unspecified" | "taken" | "not_yet";
  act?: string;
  gre?: string;
  gmat?: string;
  /** 2026-05-29 v2 — bachelor Step-2 additions. AP/IB skews how an
   *  admissions reader weighs a transcript; favorite subject is the
   *  narrative anchor for applicants without much else to grab. */
  curriculumType?: "ap" | "ib" | "alevel" | "national" | "other";
  favoriteSubject?: string;
  /** 2026-05-30 v3 — grad-only Narrative additions (cofounder spec).
   *  A Master's / PhD strategy hinges on whether the applicant is
   *  doubling down on their undergrad field, pivoting to an adjacent
   *  one, or jumping into a new domain. previousMajor + fieldContinuity
   *  + fieldBridge let the LLM read pivot viability instead of
   *  guessing from major alone.
   *
   *    previousMajor   — free text, what they studied (degree + major)
   *    fieldContinuity — closed-set verdict on relationship to target
   *    fieldBridge     — optional connective tissue when pivoting */
  previousMajor?: string;
  fieldContinuity?: "same" | "related" | "different";
  fieldBridge?: string;
  /** 2026-05-29 v2 — English Proficiency captured via test+score on
   *  Step 1 (replaces the old 5-chip MC). The user picks the test they
   *  took (IELTS / TOEFL / Other / Not yet); for IELTS/TOEFL they enter
   *  the score directly; for Other they enter a short note (Duolingo,
   *  half-American, English-medium school, etc.). englishProficiency
   *  is derived from these inputs at save-time. The "other" bucket is
   *  passed to the LLM as raw text via englishOtherNote so it can make
   *  a judgement call. */
  englishTestKind?: "ielts" | "toefl" | "other" | "not_yet";
  englishOtherNote?: string;
  /** Kept for cached-draft backward compat. New flows derive this from
   *  englishTestKind + ielts/toefl score; the LLM intake projector
   *  reads englishOtherNote when englishTestKind === "other". */
  englishProficiency?: "ielts_7_plus" | "ielts_6_0_to_6_5" | "ielts_below_6" | "toefl_equiv" | "not_taken_yet" | "other";

  /** 2026-05-29 grad-applicant additions (Samuel's spec):
   *  These three drive most of the LLM's grad-track diagnosis quality.
   *  quantBackground specifically resolves the cofounder's
   *  "PhD-Econ-without-math pivot" classroom. */
  quantBackground?: "heavy" | "moderate" | "light";
  workExperience?: "none" | "1_2" | "3_5" | "5_plus";
  researchExperience?: "extensive" | "moderate" | "light" | "none";
  /** 2026-05-29 v2 — Narrative page Top-3 capture. Three numbered
   *  rows; each row pairs a free-text activity / experience with a
   *  per-row leadership toggle so the LLM can see WHICH item the user
   *  led on (not just "led something somewhere"). The legacy
   *  hasLeadership chip below is derived from these now. */
  activity1?: string;
  activity2?: string;
  activity3?: string;
  activity1Leadership?: "yes" | "no";
  activity2Leadership?: "yes" | "no";
  activity3Leadership?: "yes" | "no";
  /** 2026-05-29 bachelor-applicant addition (Samuel's spec): quick
   *  Y/N on whether they held a leadership role. Low friction, high
   *  signal for narrative differentiation. */
  hasLeadership?: "yes" | "no";
  /** Wall-clock ms — drafts older than 14 days are dropped on read. */
  ts?: number;
}

/** Drafts older than this are treated as cold and silently discarded
 *  on next mount — users coming back weeks later see a fresh wizard
 *  rather than stale half-finished answers from a different intent. */
const DRAFT_TTL_MS = 14 * 86400_000;

/** Sanitize a numeric-input value and clamp it to a max. Keeps users
 *  from typing "9000" into IELTS or "1600000" into SAT. Allows a single
 *  decimal point when `allowDecimal` is true. Returns the string the
 *  input should display — the caller stores it in state as-is. */
const clampScore = (raw: string, max: number, allowDecimal: boolean): string => {
  // Strip everything except digits and (maybe) a single decimal point.
  const stripped = allowDecimal
    ? raw.replace(/[^0-9.]/g, "")
    : raw.replace(/[^0-9]/g, "");
  // Collapse multiple decimals into the first one.
  let cleaned = stripped;
  if (allowDecimal) {
    const parts = stripped.split(".");
    if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  if (cleaned === "" || cleaned === ".") return cleaned;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return "";
  if (num > max) return String(max);
  return cleaned;
};

/** Lightweight email-shape gate. RFC 5322 is unsanitary in practice;
 *  this rejects the everyday typos (missing @, missing domain dot,
 *  trailing whitespace inside, leading dot, double-@) while letting
 *  the long tail through. The downstream Resend send still validates
 *  authoritatively; this is the user-facing first-pass. */
const isPlausibleEmail = (raw: string): boolean => {
  const s = (raw || "").trim();
  if (s.length < 5 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
};

/** Block the Step 3 Next button when the "Other" major free-text input
 *  is obvious garbage — numbers only, punctuation only, or fewer than
 *  three letter chars. Permissive on purpose: real majors include
 *  multilingual labels ("Архитектура", "经济学"), single-word entries
 *  ("Business"), and unusual specialities ("Quantum Biophysics"), so
 *  the gate only blocks the keyboard-mash / number-only / sub-3-char
 *  case. Anything mostly-letterish slips through to the brief generator
 *  where dictionary checks would do more harm than good (false reject
 *  on legitimate non-English fields). */
const isPlausibleMajor = (raw: string): boolean => {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return false;
  const letterMatches = trimmed.match(/\p{L}/gu);
  return !!letterMatches && letterMatches.length >= 3;
};

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

// When the wizard mounts without a draft (TTL expired, signed up via
// Discover's quick wizard instead, or coming in fresh from "Strengthen
// profile" on Discover), seed initial state from the persisted
// DiscoverProfile so known fields pre-fill instead of the user staring
// at a blank form. DiscoverProfile is what Settings + the Discover
// quick wizard both write to, so this also fixes Settings→AI form drift.
const seedFromDiscoverProfile = (): Partial<WizardDraft> => {
  const p = getStoredProfile();
  if (!p) return {};
  return {
    fullName: p.fullName,
    email: p.email,
    nationality: p.nationality,
    gradeLevel: p.targetDegree ?? p.educationLevel,
    gpa: p.gpa,
    gpaScale: p.gpaScale,
    ielts: p.ieltsScore,
    toefl: p.toeflScore,
    sat: p.satScore,
    major: p.fieldOfInterest,
    targetCountries: p.targetCountries,
  };
};

interface TopUniAIProps {
  /** Language for visible copy. RU also flips the document title +
   *  the saveProfile redirect target to /discover/ru. */
  language?: "en" | "ru";
}

/* ─── MajorCombobox ────────────────────────────────────────────────
 * Typeahead for the "What do you want to study?" field.
 *
 * Declared BEFORE TopUniAI to avoid any forward-reference / inlining
 * edge case in production minification — Samuel hit a "Us is not a
 * constructor" runtime error after the v2 audit and the most likely
 * culprit was Vite/Terser misinterpreting the late-declared component.
 *
 * Behaviour: free-typing filters the canonical major list AND becomes
 * the submitted value if no row matches. Arrow Up/Down navigates,
 * Enter selects, Escape closes, Tab commits. Bilingual: matches both
 * EN and RU labels; canonical EN token is what gets persisted.
 * ──────────────────────────────────────────────────────────────────── */
const MAJORS: Array<{ en: string; ru: string }> = [
  { en: "Undecided",                 ru: "Ещё не решил(а)" },
  { en: "Anthropology",              ru: "Антропология" },
  { en: "Architecture",              ru: "Архитектура" },
  { en: "Artificial Intelligence",   ru: "Искусственный интеллект" },
  { en: "Biology",                   ru: "Биология" },
  { en: "Business",                  ru: "Бизнес" },
  { en: "Chemistry",                 ru: "Химия" },
  { en: "Communications",            ru: "Коммуникации" },
  { en: "Computer Science",          ru: "Computer Science" },
  { en: "Cultural Studies",          ru: "Культурология" },
  { en: "Data Science",              ru: "Data Science" },
  { en: "Design",                    ru: "Дизайн" },
  { en: "Development Studies",       ru: "Development Studies" },
  { en: "Economics",                 ru: "Экономика" },
  { en: "Education",                 ru: "Педагогика" },
  { en: "Engineering",               ru: "Инженерия" },
  { en: "Environmental Studies",     ru: "Экология" },
  { en: "Film",                      ru: "Кино" },
  { en: "Finance",                   ru: "Финансы" },
  { en: "History",                   ru: "История" },
  { en: "International Relations",   ru: "Международные отношения" },
  { en: "Journalism",                ru: "Журналистика" },
  { en: "Law",                       ru: "Юриспруденция" },
  { en: "Linguistics",               ru: "Лингвистика" },
  { en: "Literature",                ru: "Литература" },
  { en: "Marketing",                 ru: "Маркетинг" },
  { en: "Mathematics",               ru: "Математика" },
  { en: "Medicine & Public Health",  ru: "Медицина и public health" },
  { en: "Music",                     ru: "Музыка" },
  { en: "Performing Arts",           ru: "Исполнительские искусства" },
  { en: "Philosophy",                ru: "Философия" },
  { en: "Physics",                   ru: "Физика" },
  { en: "Political Science",         ru: "Политология" },
  { en: "Psychology",                ru: "Психология" },
  { en: "Public Policy",             ru: "Государственная политика" },
  { en: "Social Work",               ru: "Социальная работа" },
  { en: "Sociology",                 ru: "Социология" },
  { en: "Statistics",                ru: "Статистика" },
  { en: "Sustainability",            ru: "Устойчивое развитие" },
  { en: "Visual Arts",               ru: "Изобразительное искусство" },
];

interface MajorComboboxProps {
  value: string;
  onChange: (v: string) => void;
  t: (en: string, ru: string) => string;
  language: "en" | "ru";
}

const MajorCombobox = ({ value, onChange, t, language }: MajorComboboxProps) => {
  const isRu = language === "ru";
  const labelFor = (m: { en: string; ru: string }) => (isRu ? m.ru : m.en);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return MAJORS;
    const hit = (m: { en: string; ru: string }) =>
      m.en.toLowerCase().includes(q) || m.ru.toLowerCase().includes(q);
    const startsWith = (m: { en: string; ru: string }) =>
      m.en.toLowerCase().startsWith(q) || m.ru.toLowerCase().startsWith(q);
    const starts = MAJORS.filter(startsWith);
    const contains = MAJORS.filter(m => !startsWith(m) && hit(m));
    return [...starts, ...contains];
  }, [value]);
  useEffect(() => { setActiveIdx(0); }, [matches]);

  const pickIfMatch = (raw: string) => {
    const norm = raw.trim().toLowerCase();
    const exact = MAJORS.find(m => m.en.toLowerCase() === norm || m.ru.toLowerCase() === norm);
    onChange(exact ? exact.en : raw.trim());
  };

  const canonical = isRu ? MAJORS.find(m => m.en === value) : null;
  const displayValue = canonical ? canonical.ru : value;

  return (
    <div className="relative">
      <Input
        value={displayValue}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 120); }}
        onKeyDown={e => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = matches[activeIdx];
            if (pick) onChange(pick.en);
            setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
            pickIfMatch(value);
          } else if (e.key === "Tab") {
            pickIfMatch(value);
            setOpen(false);
          }
        }}
        placeholder={t("Search or type your major", "Введи или выбери специальность")}
        className="h-11 bg-card"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div
          role="listbox"
          className="absolute z-30 left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {matches.map((m, i) => (
            <button
              key={m.en}
              type="button"
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={e => {
                e.preventDefault();
                onChange(m.en);
                setOpen(false);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center px-3 py-2 text-left text-sm transition-colors ${
                i === activeIdx ? "bg-muted/60 text-foreground" : "text-foreground/85 hover:bg-muted/60"
              }`}
            >
              {labelFor(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

  // Load any in-progress draft on first render. If no draft exists (or
  // it expired), fall back to the persisted DiscoverProfile so known
  // fields pre-fill — fixes "Strengthen profile → blank form" and keeps
  // Settings edits visible here. The hub-context handoff effect runs
  // separately and may overwrite specific fields (country prefill etc.)
  // after this — that's intentional.
  const draft = useMemo(() => loadDraft() ?? seedFromDiscoverProfile(), []);

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
  // 2026-05-30 — emailTouched gates whether the inline error renders.
  // Stays false until the user blurs out of the field; that way the
  // error doesn't shout while they're mid-typing.
  const [emailTouched, setEmailTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState(draft?.whatsapp ?? "");
  const [nationality, setNationality] = useState(draft?.nationality ?? "");
  // 2026-05-30 — Step-1 nationality typeahead keyboard nav. Mouse click
  // worked but Arrow Up/Down + Enter didn't. Lifting matches into a memo
  // so the onKeyDown handler and the suggestions render share one source
  // of truth; activeIdx tracks which suggestion is highlighted.
  // RU localisation: cross-reference COUNTRY_MASTER (which carries en/ru
  // labels for ~50 countries) and pick the RU label when language=ru.
  // Falls back to the English `v` for countries not in the master list.
  // Match logic also broadens to RU substrings so a user typing
  // "Казахстан" finds Kazakhstan.
  const nationalityMatches = useMemo(() => {
    const q = nationality.trim().toLowerCase();
    if (!q) return [];
    const masterByToken = new Map(COUNTRY_MASTER.map(c => [c.token.toLowerCase(), c]));
    const exact = ALL_COUNTRIES.find(c => {
      const masterRu = masterByToken.get(c.v.toLowerCase())?.ru?.toLowerCase();
      return c.v.toLowerCase() === q || masterRu === q;
    });
    if (exact) return [];
    return ALL_COUNTRIES.filter(c => {
      const masterRu = masterByToken.get(c.v.toLowerCase())?.ru?.toLowerCase();
      return c.v.toLowerCase().includes(q) || (masterRu && masterRu.includes(q));
    }).slice(0, 5).map(c => {
      const m = masterByToken.get(c.v.toLowerCase());
      // Display label respects the wizard's current language; canonical
      // English value still gets written to state on selection so
      // downstream (intake projection, prompt context) stays
      // language-stable.
      const display = ru && m?.ru ? m.ru : c.v;
      return { v: c.v, f: c.f, display };
    });
  }, [nationality, ru]);
  const [nationalityActiveIdx, setNationalityActiveIdx] = useState(0);
  // Whenever the suggestion set changes, snap the highlighted index back
  // to the top so the user doesn't accidentally Enter-select a stale row
  // that's no longer at that position.
  useEffect(() => { setNationalityActiveIdx(0); }, [nationalityMatches]);
  const [gradeLevel, setGradeLevel] = useState(draft?.gradeLevel ?? "");
  // 2026-05-26 cofounder branch: Step-1 grade-level determines whether
  // the rest of the wizard asks about extracurriculars (undergraduate
  // track), professional experience (Master's / working-professional),
  // or research output (PhD applicant). Graduate-tier scholarships
  // (Schwarzman, Chevening, Fulbright, etc.) don't weigh ECs — asking
  // about IMO medals + photography for a PhD candidate is noise.
  const isPhDApp = gradeLevel === "PhD applicant";
  const isMastersApp = gradeLevel === "Master's" || gradeLevel === "Working professional";
  const isGraduateApp = isPhDApp || isMastersApp;
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
  // 2026-05-29 v2 — ACT added on bachelor Step 2 alongside SAT per
  // Samuel's audit. Captured as a 1–36 integer.
  const [act, setAct] = useState(draft?.act ?? "");
  const [gre, setGre] = useState(draft?.gre ?? "");
  const [gmat, setGmat] = useState(draft?.gmat ?? "");
  // 2026-05-29 v2 — curriculum + favorite subject for bachelor track.
  // Curriculum is the strategic high-leverage signal (AP/IB skews
  // selectivity reads); favorite subject is the soft narrative anchor
  // the LLM can hook the Honest Diagnosis around for younger applicants
  // without anything else to grab.
  const [curriculumType, setCurriculumType] = useState<WizardDraft["curriculumType"]>(draft?.curriculumType);
  const [favoriteSubject, setFavoriteSubject] = useState<string>(draft?.favoriteSubject ?? "");
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
  >(() => {
    const v = draft?.firstToApplyAbroad;
    if (v === "siblings_have" || v === "parents_have") return "no";
    if (v === "yes" || v === "no" || v === "unsure") return v;
    return undefined;
  });
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
    setSelectedECTags((prev) => {
      if (prev.includes(token)) return prev.filter((t) => t !== token);
      // Cap at 3 per Samuel 2026-05-29 spec ("top 3 ECs"). If at cap,
      // drop the oldest and add the new — feels like a "swap" rather
      // than a hard block which strands users in a dead state.
      if (prev.length >= 3) return [...prev.slice(1), token];
      return [...prev, token];
    });
  };
  // 2026-05-27 Sam: known-scholarship awareness chips on Step 3.
  // Optional multi-select; tokens are canonical scholarship_name from
  // the catalog so a future brief-side JOIN can light up "you already
  // know about X — here's the actual edge case for it" framing.
  const [knownScholarships, setKnownScholarships] = useState<string[]>(
    Array.isArray(draft?.knownScholarships) ? draft!.knownScholarships! : [],
  );
  const toggleKnownScholarship = (token: string) => {
    setKnownScholarships((prev) =>
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
  // 2026-05-26 Sam: empty score was ambiguous — could mean "haven't taken
  // the test yet" OR "took it but skipped the field". Strategy report
  // needs to know the difference (register-for-test advice vs critique-
  // existing-score advice). Tri-state per test: "unspecified" (haven't
  // answered the toggle), "taken" (chip = "Taken", score input visible),
  // "not_yet" (chip = "Not yet", score cleared + brief sees "not taken").
  type TestState = "unspecified" | "taken" | "not_yet";
  const [ieltsState, setIeltsState] = useState<TestState>(
    (draft?.ieltsState as TestState) ?? (draft?.ielts ? "taken" : "unspecified"),
  );
  const [toeflState, setToeflState] = useState<TestState>(
    (draft?.toeflState as TestState) ?? (draft?.toefl ? "taken" : "unspecified"),
  );
  const [satState, setSatState] = useState<TestState>(
    (draft?.satState as TestState) ?? (draft?.sat ? "taken" : "unspecified"),
  );
  const [actState, setActState] = useState<TestState>(
    (draft?.actState as TestState) ?? (draft?.act ? "taken" : "unspecified"),
  );
  const [greState, setGreState] = useState<TestState>(
    (draft?.greState as TestState) ?? (draft?.gre ? "taken" : "unspecified"),
  );
  const [gmatState, setGmatState] = useState<TestState>(
    (draft?.gmatState as TestState) ?? (draft?.gmat ? "taken" : "unspecified"),
  );

  // 2026-05-29 v2 English Proficiency on Step 1 — test-kind + score
  // pattern. Replaces the 5-chip MC. englishProficiency is derived
  // below for downstream consumers (intake-to-prompt-context.ts).
  const [englishTestKind, setEnglishTestKind] = useState<WizardDraft["englishTestKind"]>(
    draft?.englishTestKind ??
      // Migrate cached drafts that only have the old MC field.
      (draft?.englishProficiency === "ielts_7_plus" ||
       draft?.englishProficiency === "ielts_6_0_to_6_5" ||
       draft?.englishProficiency === "ielts_below_6"
        ? "ielts"
        : draft?.englishProficiency === "toefl_equiv"
          ? "toefl"
          : draft?.englishProficiency === "not_taken_yet"
            ? "not_yet"
            : undefined),
  );
  const [englishOtherNote, setEnglishOtherNote] = useState<string>(draft?.englishOtherNote ?? "");
  // Derived bucket for backward compat with intake-to-prompt-context.
  // Reads the live ielts/toefl state declared above so changing the
  // score updates the bucket immediately.
  const englishProficiency: WizardDraft["englishProficiency"] = useMemo(() => {
    if (englishTestKind === "not_yet") return "not_taken_yet";
    if (englishTestKind === "other") return "other";
    if (englishTestKind === "toefl") return "toefl_equiv";
    if (englishTestKind === "ielts") {
      const n = parseFloat(ielts);
      if (!isNaN(n)) {
        if (n >= 7) return "ielts_7_plus";
        if (n >= 6) return "ielts_6_0_to_6_5";
        return "ielts_below_6";
      }
      return undefined;
    }
    return undefined;
  }, [englishTestKind, ielts]);
  // 2026-05-29 grad + bachelor additions per Samuel's spec.
  const [quantBackground, setQuantBackground] = useState<WizardDraft["quantBackground"]>(draft?.quantBackground);
  const [workExperience, setWorkExperience] = useState<WizardDraft["workExperience"]>(draft?.workExperience);
  const [researchExperience, setResearchExperience] = useState<WizardDraft["researchExperience"]>(draft?.researchExperience);
  const [hasLeadership, setHasLeadership] = useState<WizardDraft["hasLeadership"]>(draft?.hasLeadership);
  // 2026-05-29 v2 — Narrative page state. Top 3 activities (or work /
  // research experiences for grad applicants) with per-row leadership
  // Y/N. Replaces the single hasLeadership chip + EC tag pile on the
  // old Goals page.
  const [activity1, setActivity1] = useState<string>(draft?.activity1 ?? "");
  const [activity2, setActivity2] = useState<string>(draft?.activity2 ?? "");
  const [activity3, setActivity3] = useState<string>(draft?.activity3 ?? "");
  const [activity1Leadership, setActivity1Leadership] = useState<"yes" | "no" | undefined>(draft?.activity1Leadership);
  const [activity2Leadership, setActivity2Leadership] = useState<"yes" | "no" | undefined>(draft?.activity2Leadership);
  const [activity3Leadership, setActivity3Leadership] = useState<"yes" | "no" | undefined>(draft?.activity3Leadership);
  // 2026-05-30 v3 — grad-only Narrative state per cofounder spec.
  const [previousMajor, setPreviousMajor] = useState<string>(draft?.previousMajor ?? "");
  const [fieldContinuity, setFieldContinuity] = useState<WizardDraft["fieldContinuity"]>(draft?.fieldContinuity);
  const [fieldBridge, setFieldBridge] = useState<string>(draft?.fieldBridge ?? "");

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
        knownScholarships: knownScholarships.length > 0 ? knownScholarships : undefined,
        // 2026-05-29 grad + bachelor additions + English MC.
        englishProficiency,
        englishTestKind, englishOtherNote: englishOtherNote || undefined,
        quantBackground, workExperience, researchExperience, hasLeadership,
        // 2026-05-30 v3 grad-only Narrative state.
        previousMajor: previousMajor || undefined,
        fieldContinuity, fieldBridge: fieldBridge || undefined,
        // 2026-05-26 — per-test taken/not-yet chip state. Persisted so a
        // page refresh keeps the user's answer rather than resetting to
        // "unspecified" + an empty score input.
        ieltsState, toeflState, satState,
        greState, gmatState,
        gre: gre || undefined, gmat: gmat || undefined,
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
    foreignLanguages, firstToApplyAbroad, selectedECTags, knownScholarships,
    quantBackground, workExperience, researchExperience, hasLeadership,
    englishProficiency, englishTestKind, englishOtherNote,
    previousMajor, fieldContinuity, fieldBridge,
    ieltsState, toeflState, satState,
    greState, gmatState, gre, gmat,
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
    // 2026-05-28 v2: surface the full intake to the new strategy prompt
    // context. The v1 dashboard's Pro-depth dialog overlaid these; v2
    // reads them straight from wizard state via the projection in
    // supabase/functions/_shared/intake-to-prompt-context.ts.
    careerGoal, extracurriculars, background, namedSchools,
    foreignLanguages, firstToApplyAbroad, selectedECTags, knownScholarships,
    gre, gmat,
    // 2026-05-29 — grad + bachelor additions per Samuel's spec.
    englishProficiency,
    // 2026-05-29 v2 — raw English-test capture so the LLM gets the
    // user's actual answer (e.g. "Duolingo 130" / "English-medium
    // school") instead of just a bucketed label.
    englishTestKind, englishOtherNote,
    quantBackground, workExperience, researchExperience, hasLeadership,
    // 2026-05-30 v3 — grad-only Narrative additions (cofounder spec).
    // Drives the LLM's pivot-vs-deepen read for Master's / PhD.
    previousMajor, fieldContinuity, fieldBridge,
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
                {/* 2026-05-25 rename: single-noun labels (You / Scores /
                    Direction / Story) read parallel and walk the user
                    through who → numbers → where → why. Replaces the
                    weird "Sharpen" + sibling "Identity / Academics /
                    Goals" mix that didn't pattern-match. Foreign-
                    languages moved from Scores → You step in the same
                    pass (it's identity context, not a test score). */}
                {[
                  { n: 1, label: t("You", "О тебе") },
                  { n: 2, label: t("Academics", "Академика") },
                  { n: 3, label: t("Narrative", "Нарратив") },
                  { n: 4, label: t("Goals", "Цели") },
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
                      <h2 className="font-heading text-[28px] sm:text-[40px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("Let's start with you.", "Начнём с вас.")}
                      </h2>
                    </div>
                    <div className="grid gap-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">{t("Name", "Имя")} <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t("What should we call you?", "Как тебя зовут?")} className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">{t("Where do we send your strategy?", "Куда отправить твою стратегию?")} <span className="text-rose-600 font-bold">*</span></Label>
                          <Input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onBlur={() => {
                              // Show the inline error only after the user
                              // has touched the field — typing in then
                              // tabbing away is "touched". Stays out of
                              // their way until they've actually engaged.
                              if (email.trim()) setEmailTouched(true);
                            }}
                            placeholder="you@email.com"
                            className={`h-11 bg-card ${emailTouched && !isPlausibleEmail(email) ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                            autoComplete="email"
                            inputMode="email"
                          />
                          {emailTouched && !isPlausibleEmail(email) && (
                            <p className="text-[11.5px] text-rose-600 leading-snug m-0">
                              {t("Double-check this email address.", "Проверь адрес ещё раз.")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 relative">
                        {/* WhatsApp field retired — never used by the
                            brief generator and the extra "give us your
                            phone" ask was friction with no payoff. */}
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("Where are you from?", "Откуда ты?")} <span className="text-rose-600 font-bold">*</span></Label>
                        <Input
                          value={nationality}
                          onChange={e => setNationality(e.target.value)}
                          onKeyDown={e => {
                            if (nationalityMatches.length === 0) return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setNationalityActiveIdx(i => Math.min(i + 1, nationalityMatches.length - 1));
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setNationalityActiveIdx(i => Math.max(i - 1, 0));
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              const pick = nationalityMatches[nationalityActiveIdx];
                              if (pick) setNationality(pick.v);
                            } else if (e.key === "Escape") {
                              // Soft-dismiss the suggestions by selecting
                              // the typed value as-is — pre-fix Escape did
                              // nothing because the suggestions are an
                              // open popover not a focusable element.
                              setNationality(nationality.trim());
                            }
                          }}
                          placeholder={t("Type any country (Kazakhstan, Nigeria, …)", "Любая страна (Казахстан, Кыргызстан, …)")}
                          className="h-11 bg-card"
                          autoComplete="off"
                        />
                        {nationalityMatches.length > 0 && (
                          <div
                            role="listbox"
                            className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border border-border bg-card shadow-lg overflow-hidden"
                          >
                            {nationalityMatches.map((c, i) => (
                              <button
                                key={c.v}
                                type="button"
                                role="option"
                                aria-selected={i === nationalityActiveIdx}
                                onMouseEnter={() => setNationalityActiveIdx(i)}
                                onClick={() => setNationality(c.v)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                  i === nationalityActiveIdx ? "bg-muted/60" : "hover:bg-muted/60"
                                }`}
                              >
                                <span>{c.f}</span>
                                <span>{c.display}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("Degree you're applying for", "На какую степень поступаешь")} <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                        <Select value={gradeLevel} onValueChange={setGradeLevel}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder={t("Pick your target degree", "Выбери целевую степень")} /></SelectTrigger>
                          <SelectContent>
                            {([
                              ["Bachelor's",    "Бакалавриат"],
                              ["Master's",      "Магистратура"],
                              ["PhD applicant", "PhD"],
                            ] as const).map(([val, ruLabel]) => (
                              <SelectItem key={val} value={val}>
                                {/* "PhD applicant" is the internal token (matches isPhDApp gradeLevel check on
                                    line ~373). User-facing label is just "PhD" — "applicant" reads as
                                    weird filler. */}
                                {val === "PhD applicant" ? t("PhD", "PhD") : t(val, ruLabel)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2026-05-29 v2 — English captured via test + score
                          instead of a 5-chip MC. Cofounder feedback: the
                          MC felt forced; just ask the real question. The
                          LLM judges proficiency from the score (or the
                          short "Other" note for non-IELTS/TOEFL paths). */}
                      <div className="space-y-2.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">
                          {t("Have you taken IELTS or TOEFL?", "Сдавал(а) IELTS или TOEFL?")}{" "}
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {([
                            ["ielts",   t("IELTS",            "IELTS")],
                            ["toefl",   t("TOEFL",            "TOEFL")],
                            ["other",   t("Other",            "Другое")],
                            ["not_yet", t("Haven't taken it", "Ещё не сдавал(а)")],
                          ] as const).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setEnglishTestKind(val);
                                // Clear adjacent state so a back-and-forth
                                // pick doesn't smuggle a stale score / note
                                // through to Generate.
                                if (val !== "ielts") setIelts("");
                                if (val !== "toefl") setToefl("");
                                if (val !== "other") setEnglishOtherNote("");
                              }}
                              aria-pressed={englishTestKind === val}
                              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all min-h-[34px] ${
                                englishTestKind === val
                                  ? "bg-gold/20 text-brand-navy border-gold"
                                  : "bg-background text-foreground border-border/70 hover:border-gold-dark/60"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {englishTestKind === "ielts" && (
                          // IELTS scores are issued in 0.5 increments
                          // (0, 0.5, 1.0, …, 9.0). Snap on blur so 4.2
                          // becomes 4.0, 4.3 becomes 4.5, etc. Numeric
                          // clamp during typing stays at [0, 9].
                          <Input
                            value={ielts}
                            inputMode="decimal"
                            onChange={e => {
                              const next = clampScore(e.target.value, 9, true);
                              setIelts(next);
                              setIeltsState(next.trim() ? "taken" : "unspecified");
                            }}
                            onBlur={() => {
                              if (!ielts.trim()) return;
                              const n = parseFloat(ielts);
                              if (isNaN(n)) return;
                              const snapped = Math.max(0, Math.min(9, Math.round(n * 2) / 2));
                              setIelts(snapped.toFixed(1));
                            }}
                            placeholder={t("e.g. 7.0", "напр. 7.0")}
                            className="h-11 bg-card max-w-[180px]"
                          />
                        )}
                        {englishTestKind === "toefl" && (
                          // TOEFL iBT is integer-only [0, 120]. Snap on
                          // blur to round any stray decimal and clamp.
                          <Input
                            value={toefl}
                            inputMode="numeric"
                            onChange={e => {
                              const next = clampScore(e.target.value, 120, false);
                              setToefl(next);
                              setToeflState(next.trim() ? "taken" : "unspecified");
                            }}
                            onBlur={() => {
                              if (!toefl.trim()) return;
                              const n = parseInt(toefl, 10);
                              if (isNaN(n)) return;
                              setToefl(String(Math.max(0, Math.min(120, n))));
                            }}
                            placeholder={t("e.g. 100", "напр. 100")}
                            className="h-11 bg-card max-w-[180px]"
                          />
                        )}
                        {englishTestKind === "other" && (
                          <Input
                            value={englishOtherNote}
                            onChange={e => setEnglishOtherNote(e.target.value)}
                            placeholder={t("e.g. Duolingo 130", "напр. Duolingo 130")}
                            className="h-11 bg-card max-w-[260px]"
                          />
                        )}
                      </div>
                    </div>
                    {/* 2026-05-29 wizard rewrite per Samuel:
                        First-in-family chip and foreign-languages chips
                        cut from Step 1. They added friction without
                        load-bearing intake signal. State hooks still
                        exist for backward-compat with cached drafts. */}
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
                        disabled={
                          accountSubmitting ||
                          !fullName.trim() ||
                          !isPlausibleEmail(email) ||
                          !nationality.trim() ||
                          !gradeLevel ||
                          !englishTestKind ||
                          (englishTestKind === "ielts" && !ielts.trim()) ||
                          (englishTestKind === "toefl" && !toefl.trim()) ||
                          (englishTestKind === "other" && !englishOtherNote.trim())
                        }
                        onMouseDown={() => {
                          // If the user clicks Next without leaving the
                          // email field first, force the touched-state
                          // so the inline error surfaces.
                          if (email.trim() && !isPlausibleEmail(email)) {
                            setEmailTouched(true);
                          }
                        }}
                      >
                        {t("Next", "Далее")} <ArrowRight className="ml-2 w-4 h-4" />
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
                          {t("Academics", "Академика")}
                        </span>
                      </div>
                      <h2 className="font-heading text-[28px] sm:text-[40px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("How does your academic record look?", "Как выглядит твоя успеваемость?")}
                      </h2>
                    </div>
                    <div className="grid gap-5">
                      {/* GPA on its own full-width row — scale chips
                          drop below the input rather than crammed next
                          to it, per Samuel 2026-05-29 polish pass. */}
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">{t("Most recent GPA", "Последний средний балл")} <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                          {/* Paired input + scale picker — covers the four
                              common bases (US 4.0, post-Soviet 5.0,
                              Continental Europe 10.0, percentage 100) so
                              users put in their actual number rather than
                              mentally converting. Downstream scoring
                              normalizes to 4.0. */}
                          <div className="flex flex-col sm:flex-row gap-2">
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
                                let cleaned = parts.length > 2
                                  ? `${parts[0]}.${parts.slice(1).join("")}`
                                  : v;
                                // 2026-05-29 v2 — allow up to 2 decimals
                                // during typing. Round to 1 decimal on
                                // blur (below) so the stored value snaps.
                                const afterDot = cleaned.split(".")[1];
                                if (afterDot && afterDot.length > 2) {
                                  cleaned = `${cleaned.split(".")[0]}.${afterDot.slice(0, 2)}`;
                                }
                                // Clamp at the chosen scale so users can't type 9999 on a 4.0 scale.
                                const max = parseFloat(gpaScale);
                                const num = parseFloat(cleaned);
                                if (!isNaN(num) && !isNaN(max) && num > max) {
                                  setGpa(String(max));
                                  return;
                                }
                                setGpa(cleaned);
                              }}
                              onBlur={() => {
                                // Snap to 1 decimal on commit. "3.75" → "3.8",
                                // "8.49" → "8.5". Empty stays empty.
                                if (!gpa.trim()) return;
                                const n = parseFloat(gpa);
                                if (!isNaN(n)) setGpa(n.toFixed(1));
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
                            {/* 2026-05-30 — mobile fix: each scale button
                                takes equal share via flex-1, and the picker
                                itself spans full width when stacked under
                                the GPA input (sm:w-auto preserves natural
                                width once the row lays out horizontally). */}
                            <div className="flex w-full sm:w-auto rounded-md overflow-hidden border border-border bg-card">
                              {["4.0", "5.0", "10.0", "100"].map(s => (
                                <button
                                  type="button"
                                  key={s}
                                  onClick={() => setGpaScale(s)}
                                  className={`flex-1 sm:flex-initial h-11 sm:h-auto px-3 sm:px-2.5 text-xs font-semibold transition-colors ${
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
                      </div>
                      {/* 2026-05-26 Sam: empty score was ambiguous (haven't
                          taken vs took-but-skipped). Per-test taken/not-yet
                          chip — only show the score input when the user
                          confirms "Taken". When "Not yet", the brief
                          generator sees the test in notTakenTests and
                          switches from critique-the-score advice to plan-
                          a-registration advice.
                          2026-05-29 polish: each test is a self-contained
                          vertical card — label on its own line, segmented
                          control below at full width, input below. No more
                          orphan toggles cramped beside the label. */}
                      {/* 2026-05-29 v2 — IELTS / TOEFL removed from Step
                          2; they're now captured on Step 1 via the new
                          test-kind widget. Step 2 is degree-branched:
                          Bachelor's gets SAT + ACT; Master's gets GRE +
                          GMAT; PhD gets GRE only. */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        {([
                          ...(!isGraduateApp ? [{
                            key: "sat" as const,
                            label: "SAT",
                            scale: "(400–1600)",
                            state: satState,
                            setState: setSatState,
                            value: sat,
                            setValue: setSat,
                            clamp: (v: string) => clampScore(v, 1600, false),
                            inputMode: "numeric" as const,
                            placeholder: t("e.g. 1450", "напр. 1450"),
                          }] : []),
                          ...(!isGraduateApp ? [{
                            key: "act" as const,
                            label: "ACT",
                            scale: "(1–36)",
                            state: actState,
                            setState: setActState,
                            value: act,
                            setValue: setAct,
                            clamp: (v: string) => clampScore(v, 36, false),
                            inputMode: "numeric" as const,
                            placeholder: t("e.g. 32", "напр. 32"),
                          }] : []),
                          // Graduate-track tests. GRE for any graduate
                          // applicant; GMAT only for Master's-track
                          // (business-school flavour — PhD applicants
                          // rarely sit GMAT).
                          ...(isGraduateApp ? [{
                            key: "gre" as const,
                            label: "GRE",
                            scale: "(260–340)",
                            state: greState,
                            setState: setGreState,
                            value: gre,
                            setValue: setGre,
                            clamp: (v: string) => clampScore(v, 340, false),
                            inputMode: "numeric" as const,
                            placeholder: t("e.g. 320", "напр. 320"),
                          }] : []),
                          ...(isMastersApp ? [{
                            key: "gmat" as const,
                            label: "GMAT",
                            scale: "(200–800)",
                            state: gmatState,
                            setState: setGmatState,
                            value: gmat,
                            setValue: setGmat,
                            clamp: (v: string) => clampScore(v, 800, false),
                            inputMode: "numeric" as const,
                            placeholder: t("e.g. 720", "напр. 720"),
                          }] : []),
                        ]).map(({ key, label, scale, state, setState, value, setValue, clamp, inputMode, placeholder }) => (
                          // 2026-05-29 — Taken/Not yet segmented control
                          // dropped per Samuel. Score is always editable.
                          // Empty = not taken (LLM context infers from
                          // missing value); state tracking kept in sync so
                          // localStorage drafts stay coherent.
                          <div key={key} className="space-y-2 rounded-lg border border-border/70 bg-card p-3.5">
                            <Label className="text-xs uppercase tracking-wider font-medium block">
                              {label} <span className="text-muted-foreground/70 font-normal normal-case">{scale}</span>
                              <span className="text-muted-foreground/60 font-normal normal-case ml-1">·  {t("leave blank if not taken", "оставь пустым если не сдавал")}</span>
                            </Label>
                            <Input
                              value={value}
                              inputMode={inputMode}
                              onChange={e => {
                                const next = clamp(e.target.value);
                                setValue(next);
                                setState(next.trim() ? "taken" : "unspecified");
                              }}
                              placeholder={placeholder}
                              className="h-11 bg-card"
                            />
                          </div>
                        ))}
                      </div>
                      {/* 2026-05-29 v2 — Bachelor-track curriculum + favorite
                          subject. Curriculum chips frame how an admissions
                          reader weighs the GPA (AP/IB vs national curriculum
                          calibrates selectivity). Favorite subject gives the
                          LLM a narrative anchor for applicants with thin ECs. */}
                      {!isGraduateApp && (
                        <div className="space-y-4 rounded-lg border border-border/70 bg-card p-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-medium block">
                              {t("Curriculum / program", "Программа / куррикулум")}
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {([
                                ["ap",       t("AP",                "AP")],
                                ["ib",       t("IB",                "IB")],
                                ["alevel",   t("A-Level",           "A-Level")],
                                ["national", t("National curriculum","Национальная программа")],
                                ["other",    t("Other",             "Другое")],
                              ] as const).map(([val, label]) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setCurriculumType(curriculumType === val ? undefined : val)}
                                  aria-pressed={curriculumType === val}
                                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all min-h-[34px] ${
                                    curriculumType === val
                                      ? "bg-gold/20 text-brand-navy border-gold"
                                      : "bg-background text-foreground border-border/70 hover:border-gold-dark/60"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-medium block">
                              {t("Favorite subject", "Любимый предмет")}
                            </Label>
                            <Input
                              value={favoriteSubject}
                              onChange={e => setFavoriteSubject(e.target.value)}
                              placeholder={t(
                                "e.g. Biology · Calculus · History · Studio Art",
                                "напр. Биология · Математика · История · Искусство",
                              )}
                              className="h-11 bg-card"
                            />
                          </div>
                        </div>
                      )}

                      {/* 2026-05-30 v3 switcharoo — grad-only previous-degree
                          + field-continuity live on Academics. Bridge
                          question dropped (the LLM infers the bridge from
                          previousMajor + fieldContinuity; asking the user
                          to articulate it was something we should help
                          them do, not extract from them). Quant / work /
                          research chips moved to Narrative. */}
                      {isGraduateApp && (
                        <div className="space-y-4 rounded-lg border border-border/70 bg-card p-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="previousMajor" className="text-xs uppercase tracking-wider font-medium">
                              {t("What did you study before?", "Что ты изучал(а) раньше?")}{" "}
                              <span className="text-rose-500 font-bold ml-0.5">*</span>
                            </Label>
                            <Input
                              id="previousMajor"
                              value={previousMajor}
                              onChange={e => setPreviousMajor(e.target.value)}
                              placeholder={t(
                                "e.g. BSc Economics · BA Political Science",
                                "напр. BSc Экономика · BA Политология",
                              )}
                              className="h-11 bg-card"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-medium block">
                              {t("Is your target field the same as your background?", "Целевая область та же, что и бэкграунд?")}{" "}
                              <span className="text-rose-500 font-bold ml-0.5">*</span>
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {([
                                ["same",      t("Same field",              "Та же область")],
                                ["related",   t("Related / adjacent",      "Смежная")],
                                ["different", t("Different field (pivot)", "Другая (пивот)")],
                              ] as const).map(([val, label]) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setFieldContinuity(fieldContinuity === val ? undefined : val)}
                                  aria-pressed={fieldContinuity === val}
                                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all min-h-[34px] ${
                                    fieldContinuity === val
                                      ? "bg-gold/20 text-brand-navy border-gold"
                                      : "bg-background text-foreground border-border/70 hover:border-gold-dark/60"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {isPhDApp && (
                        <p className="text-[12px] text-muted-foreground/70 italic">
                          {t(
                            "Subject GRE scores can be added later — write them under Step 4 (Research experience) for now.",
                            "Предметные GRE можно добавить позже — впиши их в Шаге 4 (Исследовательский опыт).",
                          )}
                        </p>
                      )}
                    </div>
                    {/* Foreign-languages chip set moved to Step 1 (You)
                        on 2026-05-25 — it's identity context (what
                        languages a student speaks), not a test score,
                        and pairing it with English-test scores felt
                        forced. */}
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => goToStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> {t("Back", "Назад")}</Button>
                      <Button
                        variant="gold"
                        onClick={() => goToStep(3)}
                        disabled={
                          !gpa.trim() ||
                          (isGraduateApp && (!previousMajor.trim() || !fieldContinuity))
                        }
                      >
                        {t("Next", "Далее")} <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* 2026-05-29 v2 — NEW Step 3 (Narrative). Top 3
                    activities / experiences with per-row leadership.
                    careerGoal lives here as the closing question. Old
                    Step 3 (Goals) is now Step 4 below. */}
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
                        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{t("Narrative", "Нарратив")}</span>
                      </div>
                      <h2 className="font-heading text-[28px] sm:text-[40px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("What's your story?", "В чём твоя история?")}
                      </h2>
                    </div>

                    <div className="space-y-6">
                      {/* 2026-05-30 v3 switcharoo — grad applicants now
                          get the quant / work / research chips on Narrative
                          (moved up from Academics). Bachelor applicants
                          get the Top 3 numbered list with per-row "I led
                          this" toggle. Previous-degree + field-continuity
                          + bridge moved to Academics this batch — they
                          belong with the academic record. */}
                      {isGraduateApp && (
                        // 2026-05-30 v3 polish — drop the heavy bordered
                        // wrapper. The 3 chip rows now flow with the rest
                        // of the page; tighter vertical rhythm matches
                        // the sleek feel of bachelor's curriculum block.
                        <div className="space-y-5">
                          {/* 2026-05-30 — order swapped to Quant → Research →
                              Work per Samuel. Reads as a natural academic
                              progression (skill basis → research output →
                              work history); also keeps the two 3-option
                              chip rows adjacent which is visually cleaner
                              than 3 / 4 / 3. */}
                          {([
                            {
                              label: t("Math / quantitative background", "Математическая / quant подготовка"),
                              value: quantBackground,
                              set: setQuantBackground,
                              options: [
                                ["heavy",    t("Heavy (advanced stats / calculus)", "Сильная (статистика, calculus)")],
                                ["moderate", t("Moderate (basic stats / econ)",     "Умеренная (базовая статистика, econ)")],
                                ["light",    t("Very light / none",                  "Очень слабая / нет")],
                              ] as const,
                            },
                            {
                              label: t("Research experience", "Исследовательский опыт"),
                              value: researchExperience,
                              set: setResearchExperience,
                              options: [
                                ["extensive", t("Extensive (published papers)",      "Серьёзный (есть публикации)")],
                                ["moderate",  t("Moderate (thesis / lab assistant)", "Умеренный (диплом / lab-ассистент)")],
                                ["light",     t("Very light / none",                  "Очень слабый / нет")],
                              ] as const,
                            },
                            {
                              label: t("Full-time work experience", "Опыт работы (full-time)"),
                              value: workExperience,
                              set: setWorkExperience,
                              options: [
                                ["none",   t("None",      "Нет")],
                                ["1_2",    t("1–2 years", "1–2 года")],
                                ["3_5",    t("3–5 years", "3–5 лет")],
                                ["5_plus", t("5+ years",  "5+ лет")],
                              ] as const,
                            },
                          ] as const).map(({ label, value, set, options }) => (
                            <div key={label} className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-medium block">
                                {label} <span className="text-rose-500 font-bold ml-0.5">*</span>
                              </Label>
                              <div className="flex flex-wrap gap-1.5">
                                {options.map(([val, lbl]) => (
                                  <button
                                    key={val}
                                    type="button"
                                    // deno-lint-ignore no-explicit-any
                                    onClick={() => set(val as any)}
                                    aria-pressed={value === val}
                                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all min-h-[34px] ${
                                      value === val
                                        ? "bg-gold/20 text-brand-navy border-gold"
                                        : "bg-background text-foreground border-border/70 hover:border-gold-dark/60"
                                    }`}
                                  >
                                    {lbl}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Top 3 activities — bachelor-only per 2026-05-30
                          v3 audit. Grad applicants don't get a Top 3
                          rows surface; their structured chips above
                          replace it. */}
                      {!isGraduateApp && (
                        <div className="space-y-3">
                          <Label className="text-xs uppercase tracking-wider font-medium">
                            {t("Top 3 activities", "Топ-3 активности")}
                          </Label>
                          <p className="text-[12px] text-muted-foreground -mt-1">
                            {t(
                              "Clubs, sports, jobs, side projects — anything you spent real time on. Star the ones you led.",
                              "Клубы, спорт, работа, проекты — то, на что ты реально тратил(а) время. Отметь, где был(а) лидером.",
                            )}
                          </p>
                          {([
                            { n: 1, val: activity1, set: setActivity1, lead: activity1Leadership, setLead: setActivity1Leadership },
                            { n: 2, val: activity2, set: setActivity2, lead: activity2Leadership, setLead: setActivity2Leadership },
                            { n: 3, val: activity3, set: setActivity3, lead: activity3Leadership, setLead: setActivity3Leadership },
                          ] as const).map(({ n, val, set, lead, setLead }) => (
                            <div key={n} className="grid grid-cols-[28px_1fr_auto] gap-3 items-start">
                              <span className="font-heading text-[18px] font-bold text-gold-dark tabular-nums leading-[2.2]">
                                {n}.
                              </span>
                              <Input
                                value={val}
                                onChange={e => set(e.target.value)}
                                placeholder={
                                  n === 1
                                    ? t("e.g. Founded a debate club at school",
                                        "напр. Основал(а) клуб дебатов в школе")
                                    : n === 2
                                      ? t("e.g. Captained the basketball team for 2 years",
                                          "напр. Капитан баскетбольной команды 2 года")
                                      : t("e.g. Volunteered teaching English to refugees",
                                          "напр. Волонтёр преподавал(а) английский беженцам")
                                }
                                className="h-11 bg-card"
                              />
                              {/* 2026-05-30 v3 — "Led / Yes / No" was
                                  confusing per Samuel ("LED? I did not
                                  get that it meant leadership"). One
                                  clear toggle pill: "I led this". Gold
                                  fill + star when active. Absence ⇒
                                  did not lead — no explicit "no" needed. */}
                              <button
                                type="button"
                                onClick={() => setLead(lead === "yes" ? undefined : "yes")}
                                aria-pressed={lead === "yes"}
                                title={t(
                                  "Mark if you held a leadership role on this one",
                                  "Отметь, если был(а) в роли лидера",
                                )}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-[12px] font-semibold transition-all mt-1 ${
                                  lead === "yes"
                                    ? "bg-gold/20 text-brand-navy border-gold"
                                    : "bg-background text-foreground/55 border-border/70 hover:border-gold-dark/60 hover:text-foreground/80"
                                }`}
                              >
                                <span aria-hidden className="text-[14px] leading-none">{lead === "yes" ? "★" : "☆"}</span>
                                {t("I led this", "Я был(а) лидером")}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="careerGoalNarr" className="text-xs uppercase tracking-wider font-medium">
                          {t("Where do you see yourself in 10 years?", "Кем ты видишь себя через 10 лет?")}{" "}
                          <span className="text-muted-foreground/70 font-normal normal-case">{t("(optional)", "(по желанию)")}</span>
                        </Label>
                        <Textarea
                          id="careerGoalNarr"
                          // 2026-05-30 — rewrite #3. Dropped "Doctor at
                          // a clinic in Almaty" — Samuel flagged that
                          // clinic-doctor doesn't read aspirational in
                          // the CIS context; the prestige register for
                          // medicine here is "surgeon at a flagship
                          // hospital" or "researcher at a world-class
                          // lab", not "GP at the local clinic". Also
                          // fixed RU leak ("in public health" stayed EN
                          // on the previous round).
                          placeholder={t(
                            "e.g. Finished my Stanford PhD, leading public-health research · Neurosurgeon at a flagship hospital · Senior policy advisor at the UN · Filmmaker whose docs travel international festivals",
                            "напр. Защитил(а) PhD в Стэнфорде, веду исследования по public health · Нейрохирург во флагманском госпитале · Старший советник по политике в ООН · Режиссёр, чьи док-фильмы ездят по международным фестивалям",
                          )}
                          value={careerGoal}
                          onChange={(e) => setCareerGoal(e.target.value)}
                          className="min-h-[80px] resize-none bg-card"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => goToStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> {t("Back", "Назад")}</Button>
                      <Button
                        variant="gold"
                        onClick={() => goToStep(4)}
                        disabled={isGraduateApp && (!quantBackground || !workExperience || !researchExperience)}
                      >
                        {t("Next", "Далее")} <ArrowRight className="ml-2 w-4 h-4" />
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
                        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{t("Goals", "Цели")}</span>
                      </div>
                      <h2 className="font-heading text-[28px] sm:text-[40px] font-bold text-foreground tracking-[-0.02em] leading-[1.08]">
                        {t("Pick your direction.", "Выбери направление.")}
                      </h2>
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
                      {/* 2026-05-30 — Combobox upgrade per Samuel.
                          Free-typing filters the list AND becomes the
                          submitted value if no row matches. Picks
                          quantum-biophysics + Türkiye-side specialties
                          without forcing the user through an "Other"
                          escape hatch. */}
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">{t("What do you want to study?", "Что ты хочешь изучать?")} <span className="text-rose-500 font-bold ml-0.5">*</span></Label>
                        <MajorCombobox value={major} onChange={setMajor} t={t} language={language} />
                      </div>
                      {/* Self-fund Select retired 2026-05-09 — overlapped
                          with the "Scholarship need" 1–5 slider on step 3.
                          Budget is now derived from that slider downstream. */}
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">
                          {t("When do you plan to start?", "Когда планируешь начать?")}{" "}
                          <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </Label>
                        <Select value={timeline} onValueChange={setTimeline}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder={t("Select", "Выбери")} /></SelectTrigger>
                          <SelectContent>
                            {/* 2026-05-30 — value (token) stays canonical EN
                                for downstream consumers (prompt, hub-context
                                seeding). Display label flips to RU when
                                language=ru. */}
                            <SelectItem value="Fall 2026">{t("Fall 2026", "Осень 2026")}</SelectItem>
                            <SelectItem value="Spring 2027">{t("Spring 2027", "Весна 2027")}</SelectItem>
                            <SelectItem value="Fall 2027">{t("Fall 2027", "Осень 2027")}</SelectItem>
                            <SelectItem value="Spring 2028">{t("Spring 2028", "Весна 2028")}</SelectItem>
                            <SelectItem value="Flexible">{t("Flexible", "Гибкий")}</SelectItem>
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
                      <Label className="text-xs uppercase tracking-wider font-medium">
                        {t("Where do you want to study?", "Куда хочешь поступать?")}{" "}
                        <span className="text-rose-500 font-bold ml-0.5">*</span>
                      </Label>
                      {/* 2026-05-30 — made required. Empty targetCountries
                          fed Card 02 ("Where you belong") with no anchor
                          and the LLM either invented or fell back to
                          "Open" — strategy quality cratered. Still cap=3
                          so the dossier stays comparative without going
                          5-country-pile-on. */}
                      <p className="text-muted-foreground text-xs mt-1 mb-3">{t(`Pick up to ${COUNTRY_PICK_CAP}.`, `Выбери до ${COUNTRY_PICK_CAP}.`)}</p>
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
                                  ? "bg-gold/20 text-brand-navy border-gold"
                                  : isOther
                                    ? "bg-card text-foreground border-dashed border-border hover:border-gold-dark/60"
                                    : "bg-card text-foreground border-border/70 hover:border-gold-dark/60"
                              } ${atCap ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                              {selected && <Check className="w-3 h-3" />}
                              {isOther && !selected && <Plus className="w-3 h-3" />}
                              {!isOther && (
                                <span className="leading-none" aria-hidden>{countryFlag(token)}</span>
                              )}
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
                              className="inline-flex items-center gap-1.5 rounded-full border bg-gold/20 text-brand-navy border-gold px-3 py-1.5 text-xs font-medium min-h-[36px]"
                            >
                              <Check className="w-3 h-3" />
                              <span className="leading-none" aria-hidden>{countryFlag(token)}</span>
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
                                    <span className="mr-2 leading-none" aria-hidden>{c.flag}</span>
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
                    {/* 2026-05-29 v2 — "Any scholarships on your radar?"
                        deleted per Samuel. Friction without signal — the
                        strategy report needs to teach scholarships, not
                        ask the user to name them first. knownScholarships
                        state retained in cached drafts; just no UI input. */}
                    {/* Priorities sliders — folded into Step 02 on 2026-05-20
                        when 4 steps collapsed to 3. Three sliders that
                        shape the brief: prestige, scholarship need, visa
                        accessibility. Header sets a soft divider between
                        the "direction" half above and "priorities" below
                        so the merged step still reads as two intents. */}
                    {/* Priorities — slimmed 2026-05-25 to shorten the
                        page. Previous each-row-in-its-own-card layout
                        added ~120px of padding/borders the page didn't
                        need; now an inline row per priority with the
                        same controls but tighter vertical rhythm. */}
                    <div className="pt-2">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark/80 font-medium mb-3">{t("What matters to you", "Что важно для тебя")}</p>
                      <div className="space-y-3.5">
                        {[
                          // 2026-05-30 — slider icons swapped per Samuel:
                          //   GraduationCap → Trophy   (Prestige reads as
                          //     ranking/achievement, not a degree itself)
                          //   Shield        → Banknote (money, not safety)
                          //   CheckCircle2  → Plane    (visa = movement)
                          { label: t("Prestige", "Престиж"), value: prestige, set: setPrestige, icon: Trophy, low: t("Any school", "Любой вуз"), high: t("Top 50 only", "Только топ-50") },
                          { label: t("Scholarship need", "Нужна стипендия"), value: scholarship, set: setScholarship, icon: Banknote, low: t("Self-fund OK", "Готов(а) платить"), high: t("Must be free", "Только бесплатно") },
                          { label: t("Visa accessibility", "Доступность визы"), value: visaAccess, set: setVisaAccess, icon: Plane, low: t("Don't mind", "Не важно"), high: t("Easy access", "Простая виза") },
                        ].map(item => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <item.icon className="w-3.5 h-3.5 text-gold-dark" />
                                <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
                              </div>
                              <span className="text-[11px] font-bold text-gold-dark tabular-nums">{item.value[0]}/5</span>
                            </div>
                            <Slider min={1} max={5} step={1} value={item.value} onValueChange={item.set} className="w-full" />
                            <div className="flex justify-between mt-1 text-[10.5px] text-muted-foreground">
                              <span>{item.low}</span>
                              <span>{item.high}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2026-05-29 v2 — single hasLeadership chip removed;
                        the new Narrative page (Step 3) captures per-row
                        leadership for each of the Top 3 activities, which
                        is the higher-signal version of the same question.
                        hasLeadership is derived from those rows in the
                        profile build-up below.
                        careerGoal + EC chips also moved up to Narrative —
                        Goals is now strictly direction (major, timeline,
                        countries, priorities) so the page reads cleanly. */}
                    <div className="space-y-5">{/* placeholder section so spacing stays consistent before Generate */}</div>
                    <div className="hidden">
                      {/* Keep the EC chip + careerGoal markup referenced
                          below in saveProfile / composeExtracurriculars so
                          the variables don't go unused while we transition.
                          Hidden from rendering but keeps the implicit
                          dependencies typed. */}
                      <textarea defaultValue={careerGoal} readOnly />
                      {/* 2026-05-26 degree-branched intake. Bachelor's track
                          keeps the EC chips + textarea — undergraduate
                          admissions and undergrad scholarships care about
                          activities, leadership, hobbies. Master's track
                          replaces EC with work / professional projects.
                          PhD track replaces EC with research experience,
                          publications, and target supervisors. All three
                          paths write to the same `extracurriculars` field
                          downstream so the brief generator + Discover read
                          a single canonical free-text block; the LABEL on
                          the field is what shifts. */}
                      <div className="space-y-2">
                        <Label htmlFor="extracurriculars" className="text-xs uppercase tracking-wider font-medium">
                          {t("Top 3 activity themes", "Топ-3 темы активностей")}
                        </Label>
                        {/* 2026-05-29 — EC chips now apply to ALL degrees
                            (was bachelor-only), cap at 3 per Samuel's spec
                            for "top 3 ECs". toggleECTag still allows
                            picking more than 3, but we surface a count
                            hint and visually disable further picks. */}
                        {true && (
                          <div className="space-y-1.5">
                            <p className="text-muted-foreground text-xs">
                              {selectedECTags.length >= 3
                                ? t("3 picked — tap one to swap.", "Выбрано 3 — нажми, чтобы поменять.")
                                : t("Pick up to 3.", "Выбери до 3.")}
                            </p>
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
                                        ? "bg-gold/20 text-brand-navy border-gold"
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
                                          ? "bg-gold/20 text-brand-navy border-gold"
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
                        )}
                        {/* 2026-05-29 — extracurriculars textarea dropped.
                            Grad applicants get structured chips on Step 2
                            (Quant/Work/Research) instead. Bachelor applicants
                            keep the EC chip set above. */}
                      </div>
                      {/* 2026-05-29 — Background + Dream School textareas
                          dropped per Samuel's wizard rewrite spec. They
                          were covert-intake personality signals that the
                          new structured intake covers more cleanly. State
                          hooks remain for cached-draft backward compat. */}
                    </div>

                    {/* Generate handler shared by Skip + Generate buttons.
                        Same as old Step 3 Generate but moved here so the
                        optional context fields are guaranteed-persisted
                        before the brief streams. */}
                    {(() => {
                      const onGenerate = () => {
                        // 2026-05-29 v2 — Top 3 activities → flat string
                        // for the extracurriculars field the LLM already
                        // reads. Per-row leadership rolls into the line
                        // so the strategy report can call out WHICH item
                        // the user led on, not just whether they led.
                        const composeActivities = (): string => {
                          const rows: Array<{ text: string; led: "yes" | "no" | undefined }> = [
                            { text: activity1.trim(), led: activity1Leadership },
                            { text: activity2.trim(), led: activity2Leadership },
                            { text: activity3.trim(), led: activity3Leadership },
                          ];
                          const formatted = rows
                            .filter(r => r.text.length > 0)
                            .map((r, i) => `${i + 1}. ${r.text}${r.led === "yes" ? " (led)" : ""}`)
                            .join("\n");
                          return formatted;
                        };
                        const activitiesText = composeActivities();
                        const extracurricularsCombined = [activitiesText, composeExtracurriculars(selectedECTags, extracurriculars)]
                          .filter(Boolean)
                          .join("\n\n") || undefined;
                        // Derive hasLeadership from the per-row narrative
                        // for backward compat with intake-to-prompt-context.
                        const derivedLeadership: "yes" | "no" | undefined =
                          [activity1Leadership, activity2Leadership, activity3Leadership].some(l => l === "yes")
                            ? "yes"
                            : [activity1Leadership, activity2Leadership, activity3Leadership].some(l => l === "no")
                              ? "no"
                              : hasLeadership;
                        try {
                          saveProfile(projectToDiscoverProfile({
                            fullName, email, nationality, gradeLevel,
                            gpa, gpaScale, ielts, toefl, sat, gre, gmat, major, budget,
                            targetCountries,
                            careerGoal,
                            extracurriculars: extracurricularsCombined,
                            background, namedSchools,
                            foreignLanguages: foreignLanguages.length > 0 ? foreignLanguages : undefined,
                            firstToApplyAbroad,
                            ieltsState, toeflState, satState, greState, gmatState,
                            knownScholarships,
                          }));
                        } catch { /* localStorage may be unavailable; brief still renders */ }
                        // Keep derivedLeadership reachable as a side-effect
                        // so the profile object below picks it up via the
                        // hasLeadership closure variable.
                        if (derivedLeadership !== hasLeadership) setHasLeadership(derivedLeadership);
                        setScreen("dashboard");
                      };
                      // 2026-05-27: archetype micro-reveal. Runs the
                      // deterministic detector against the current form
                      // state and shows a single warm line above the
                      // Generate button — "Reading you as the ___" with
                      // the archetype tagline. When the detector falls
                      // back (no archetype clears the 60-confidence
                      // floor) we show a softer line instead of forcing
                      // a confident identity claim. Gated on the user
                      // having filled at least one narrative field so it
                      // doesn't feel premature; sparse forms see no
                      // reveal at all. Per the 2026-05-27 competitor
                      // audit — no scholarship-consulting platform
                      // surfaces this kind of named-identity moment to
                      // the user.
                      // 2026-05-28 v2: the biographical archetype reveal
                      // card was retired with the rest of the archetype
                      // library — Samuel flagged the labels as "too rigid,
                      // AI sloppy, cheesy". The wizard final step now just
                      // shows the Generate CTA; the LLM-coined Applicant
                      // Type label is surfaced inside the dossier itself.
                      return (
                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                          <Button variant="outline" onClick={() => goToStep(3)}>
                            <ArrowLeft className="mr-2 w-4 h-4" /> {t("Back", "Назад")}
                          </Button>
                          <Button
                            variant="gold"
                            size="lg"
                            onClick={onGenerate}
                            disabled={!major.trim() || !timeline.trim() || targetCountries.length === 0}
                          >
                            {t("Give me my strategy", "Дай мне стратегию")}
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                        </div>
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
              <StrategyView
                profile={profile}
                language={language}
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
