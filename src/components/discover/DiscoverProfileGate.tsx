import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface DiscoverProfile {
  fullName: string;
  email: string;
  nationality: string;
  // Optional academic fields (kept for downstream ranking — filled later in /discover/app)
  educationLevel?: string;
  targetDegree?: string;
  gpa?: string;
  /** Scale on which `gpa` is reported. "4.0" | "5.0" | "10.0" | "100".
   *  Used by Discover scoring to normalize against scholarship min_gpa
   *  thresholds correctly. Pre-fix this slot defaulted to "4.0" on
   *  every read, so post-Soviet / Continental / percentage GPAs were
   *  scored as if they were US 4.0 inputs (overflow + wrong matches). */
  gpaScale?: string;
  // Test scores collected independently — many programs require
  // specifically TOEFL or specifically SAT, so a single "english test"
  // field would either lose information or break eligibility checks.
  ieltsScore?: string;
  toeflScore?: string;
  satScore?: string;
  budgetRange?: string;
  fieldOfInterest?: string;
  /* Self-identified demographic tags — used to boost match scores
   * for programs designed for that group. Optional; users who don't
   * fill it just don't get the demographic boost. Canonical kebab-
   * case from the same set as scholarships.target_demographics. */
  demographics?: string[];
  /* Where the student wants to STUDY (vs nationality, which is where
   * they're from). Captured by TopUni AI's intake; powers semantic
   * scholarship matching. Empty array = no preference, score against
   * all hosts. Mirrors student_profiles.target_countries text[]. */
  targetCountries?: string[];
  /* Optional intake fields collected on the Step 4 "Tell us more"
   * page in TopUni AI. All skippable; users who want to fly through
   * the wizard never see them. Each one materially sharpens the
   * brief's personalisation (career goal feeds the strategy,
   * extracurriculars feed the essay-angle suggestion, etc.). */
  careerGoal?: string;
  extracurriculars?: string;
  background?: string;
  namedSchools?: string;
  /** v7 brief-spec signal (2026-05-22). Gates the WHAT-YOU'RE-AVOIDING
   *  branch of the brief — when "not_at_all" / "some_idea", the brief
   *  surfaces the indecision itself as the load-bearing gap (named
   *  warmly, not as a flaw). When "pretty_sure" / "certain", the brief
   *  picks from a closed library of named gaps instead. Also gates the
   *  Open Question + Tight Lane applicant-archetype detection in the
   *  Phase 2 follow-up. Optional — defaults downstream to "some_idea"
   *  (most-common case, fires the major-uncertainty branch which works
   *  for the largest cohort). */
  majorCertainty?: "not_at_all" | "some_idea" | "pretty_sure" | "certain";
  /** Foreign languages chip multi-select on Step 1. Form deliberately
   *  excludes English + CIS native languages (Russian/Kazakh/Kyrgyz/
   *  Uzbek/Tajik) — anything stored IS distinctive by definition.
   *  The brief celebrates whatever's here without per-nationality
   *  baseline filtering. */
  foreignLanguages?: string[];
  /** First-in-family-to-apply-abroad chip single-select on Step 1.
   *  Drives firstAbroadFramingFor() in supabase/functions/_shared/
   *  cultural-context.ts — CIS = "first to leave home" framing,
   *  US/LatAm = "first-gen college" framing, default = "first global
   *  step." Nullable. */
  // Legacy tokens siblings_have / parents_have are accepted on read
  // (drafts from before 2026-05-25) and normalized to "no" at parse time.
  firstToApplyAbroad?: "yes" | "no" | "unsure" | "siblings_have" | "parents_have";
}

const STORAGE_KEY = "topuni_discover_profile";
// Bumped on every saveProfile write. Read by useActivityFeed so the
// brief-staleness event fires even when the DB-side updated_at is
// dormant (the wizard primarily persists profile to localStorage and
// only round-trips to student_profiles at AuthCallback time).
const PROFILE_CHANGED_TS_KEY = "topuni_profile_changed_at";

export const getStoredProfile = (): DiscoverProfile | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const getProfileChangedAt = (): number | null => {
  try {
    const raw = localStorage.getItem(PROFILE_CHANGED_TS_KEY);
    if (!raw) return null;
    const t = Number.parseInt(raw, 10);
    return Number.isFinite(t) ? t : null;
  } catch { return null; }
};

export const saveProfile = (profile: DiscoverProfile) => {
  // Compare to the previous payload — only bump the change timestamp
  // when the data actually shifted. Re-saving the identical profile
  // shouldn't fire a stale-brief signal.
  let prevSerialized: string | null = null;
  try { prevSerialized = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
  const nextSerialized = JSON.stringify(profile);
  localStorage.setItem(STORAGE_KEY, nextSerialized);
  if (prevSerialized !== nextSerialized) {
    try { localStorage.setItem(PROFILE_CHANGED_TS_KEY, Date.now().toString()); } catch { /* ignore */ }
    // Cross-tab + cross-component update broadcast. The native `storage`
    // event only fires in OTHER tabs — same-tab listeners (e.g. the
    // Discover effect that re-hydrates profile state on change) need
    // this custom event to pick up edits made in TopUni AI / Account /
    // wherever within the same tab. Mirrors the tu:tracker / tu:watchlist
    // pattern used elsewhere.
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent("tu:profile")); } catch { /* ignore */ }
    }
    // Cross-device sync — fire-and-forget round-trip to student_profiles
    // when authed. Pre-this commit, profile edits only ever lived in
    // localStorage; a user editing on mobile would see a stale profile
    // on desktop. Now every change touches the DB so the brief-staleness
    // signal works cross-device + a re-sign-in on a new device pulls
    // the latest profile back down.
    void syncProfileToDb(profile);
  }
};

/* ─── Cross-device sync helpers ─────────────────────────────────────
 * Map between the DiscoverProfile shape (localStorage / wizard state)
 * and the student_profiles table columns (DB). We keep the localStorage
 * shape stable for backwards compat with existing wizard / Discover
 * surfaces; the adapters below project on / off it as needed. */

interface StudentProfileRow {
  full_name?: string | null;
  email?: string | null;
  nationality?: string | null;
  grade_level?: string | null;
  gpa?: number | null;
  ielts?: number | null;
  toefl?: number | null;
  sat?: number | null;
  major?: string | null;
  field_of_study?: string | null;
  budget?: string | null;
  target_countries?: string[] | null;
  /** v7 brief spec: 4-level major-certainty enum stored as text so the
   *  DB doesn't pin us to a specific Postgres enum that's a pain to
   *  migrate when the spec evolves. The application validates the
   *  legal-values set in code. */
  major_certainty?: string | null;
  /** Sparse-input pass (2026-05-23) — see DiscoverProfile fields above. */
  foreign_languages_learned?: string[] | null;
  first_to_apply_abroad?: string | null;
  updated_at?: string | null;
}

const profileToDbColumns = (p: DiscoverProfile): StudentProfileRow => {
  const num = (v?: string) => {
    if (!v) return null;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    full_name: p.fullName || null,
    email: p.email || null,
    nationality: p.nationality || null,
    grade_level: p.targetDegree ?? p.educationLevel ?? null,
    gpa: num(p.gpa),
    ielts: num(p.ieltsScore),
    toefl: num(p.toeflScore),
    sat: p.satScore ? Math.round(num(p.satScore) ?? 0) || null : null,
    major: p.fieldOfInterest || null,
    field_of_study: p.fieldOfInterest || null,
    budget: p.budgetRange || null,
    target_countries: p.targetCountries && p.targetCountries.length > 0 ? p.targetCountries : null,
    major_certainty: p.majorCertainty || null,
    foreign_languages_learned: p.foreignLanguages && p.foreignLanguages.length > 0 ? p.foreignLanguages : null,
    first_to_apply_abroad: p.firstToApplyAbroad || null,
  };
};

const dbColumnsToProfile = (row: StudentProfileRow): Partial<DiscoverProfile> => {
  const out: Partial<DiscoverProfile> = {};
  if (row.full_name) out.fullName = row.full_name;
  if (row.email) out.email = row.email;
  if (row.nationality) out.nationality = row.nationality;
  if (row.grade_level) {
    out.targetDegree = row.grade_level;
    out.educationLevel = row.grade_level;
  }
  if (row.gpa != null) out.gpa = String(row.gpa);
  if (row.ielts != null) out.ieltsScore = String(row.ielts);
  if (row.toefl != null) out.toeflScore = String(row.toefl);
  if (row.sat != null) out.satScore = String(row.sat);
  if (row.major || row.field_of_study) out.fieldOfInterest = row.major || row.field_of_study || undefined;
  if (row.budget) out.budgetRange = row.budget;
  if (Array.isArray(row.target_countries) && row.target_countries.length > 0) out.targetCountries = row.target_countries;
  if (row.major_certainty) {
    const v = row.major_certainty as string;
    if (v === "not_at_all" || v === "some_idea" || v === "pretty_sure" || v === "certain") {
      out.majorCertainty = v;
    }
  }
  if (Array.isArray(row.foreign_languages_learned) && row.foreign_languages_learned.length > 0) {
    out.foreignLanguages = row.foreign_languages_learned;
  }
  if (row.first_to_apply_abroad) {
    const v = row.first_to_apply_abroad as string;
    // Normalize legacy siblings_have / parents_have → "no" on read
    // (pre-2026-05-25 drafts). Brief generator only branches on "yes".
    if (v === "yes" || v === "no" || v === "unsure") {
      out.firstToApplyAbroad = v;
    } else if (v === "siblings_have" || v === "parents_have") {
      out.firstToApplyAbroad = "no";
    }
  }
  return out;
};

/** Push the local profile to student_profiles (authed users only).
 *  Fire-and-forget — sync failures are non-fatal; localStorage is the
 *  source of truth for the current session. */
export async function syncProfileToDb(profile: DiscoverProfile): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const cols = profileToDbColumns(profile);
    // Only upsert non-empty payloads. An anon-era profile saved
    // before sign-in might have just (fullName, email, nationality);
    // those are still worth round-tripping so the brief-staleness
    // mechanism works cross-device.
    if (!cols.full_name && !cols.email && !cols.nationality) return;
    await supabase.from("student_profiles").upsert(
      { user_id: user.id, ...cols, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  } catch {
    /* Sync failure is non-fatal — localStorage already holds the value. */
  }
}

/** On sign-in, pull the user's authoritative profile from the DB and
 *  merge into localStorage. DB wins for fields it has populated;
 *  localStorage fills in anything not yet round-tripped. Bumps the
 *  change timestamp so brief-staleness recomputes correctly. */
export async function pullProfileFromDb(userId: string): Promise<DiscoverProfile | null> {
  try {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("full_name, email, nationality, grade_level, gpa, ielts, toefl, sat, major, field_of_study, budget, target_countries, major_certainty, foreign_languages_learned, first_to_apply_abroad, updated_at")
      .eq("user_id", userId)
      .maybeSingle<StudentProfileRow>();
    if (error || !data) return null;
    const local = getStoredProfile() ?? { fullName: "", email: "", nationality: "" };
    const dbProfile = dbColumnsToProfile(data);
    const merged = { ...local, ...dbProfile } as DiscoverProfile;
    // Use saveProfile so the change timestamp + downstream sync fire
    // consistently. saveProfile's own DB sync becomes a no-op no-change
    // round-trip in the common case (we just wrote the same payload).
    saveProfile(merged);
    return merged;
  } catch {
    return null;
  }
}

const NATIONALITIES = [
  "Afghan", "Azerbaijani", "Bangladeshi", "Chinese", "Georgian", "Indian",
  "Indonesian", "Iranian", "Iraqi", "Kazakh", "Korean", "Kyrgyz", "Malaysian",
  "Mongolian", "Nepali", "Nigerian", "Pakistani", "Russian", "Saudi Arabian",
  "Sri Lankan", "Tajik", "Thai", "Turkish", "Turkmen", "Ukrainian",
  "Uzbek", "Vietnamese", "Other",
];

interface Props {
  open: boolean;
  onComplete: (profile: DiscoverProfile) => void;
  onOpenChange?: (open: boolean) => void;
  language?: "en" | "ru";
}

export const DiscoverProfileGate = ({ open, onComplete, onOpenChange }: Props) => {
  const [profile, setProfile] = useState<DiscoverProfile>({
    fullName: "", email: "", nationality: "",
  });

  const update = (key: keyof DiscoverProfile, val: string) =>
    setProfile(p => ({ ...p, [key]: val }));

  const canSubmit = !!(profile.fullName && profile.email && profile.nationality);

  const handleSubmit = () => {
    if (!canSubmit) return;
    saveProfile(profile);
    onComplete(profile);
  };

  const features = [
    { icon: "🎯", text: "Personalized university recommendations" },
    { icon: "💰", text: "Cost calculator with scholarship data" },
    { icon: "📊", text: "Side-by-side university comparison" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-heading">Unlock TopUni Discover</DialogTitle>
              <DialogDescription className="text-sm">
                Create your profile to access all premium features
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ul className="space-y-1.5 mb-2">
          {features.map((f, i) => (
            <li key={i} className="text-sm text-foreground/80 flex items-center gap-2">
              <span>{f.icon}</span> {f.text}
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Full Name *</Label>
            <Input placeholder="Your full name" value={profile.fullName} onChange={e => update("fullName", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-medium">Email *</Label>
            <Input type="email" placeholder="your@email.com" value={profile.email} onChange={e => update("email", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-medium">Nationality *</Label>
            <Select value={profile.nationality} onValueChange={v => update("nationality", v)}>
              <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2 mt-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          Free access during beta. No credit card required.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export const LockedOverlay = ({ children, isLocked }: { children: React.ReactNode; isLocked: boolean }) => {
  if (!isLocked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="blur-[6px] pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px] rounded-lg">
        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full shadow-lg">
          <Lock className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Complete profile to unlock</span>
        </div>
      </div>
    </div>
  );
};
