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
      .select("full_name, email, nationality, grade_level, gpa, ielts, toefl, sat, major, field_of_study, budget, updated_at")
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
