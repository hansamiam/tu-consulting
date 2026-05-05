import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Lock, ArrowRight } from "lucide-react";

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

export const getStoredProfile = (): DiscoverProfile | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveProfile = (profile: DiscoverProfile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

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
