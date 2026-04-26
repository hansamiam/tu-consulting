import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Globe, Sparkles, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DiscoverProfile {
  fullName: string;
  email: string;
  nationality: string;
  educationLevel: string;
  targetDegree: string;
  gpa: string;
  ieltsScore: string;
  budgetRange: string;
  fieldOfInterest: string;
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

const FIELDS = [
  "Business & Management", "Computer Science & IT", "Engineering",
  "Medicine & Health", "Natural Sciences", "Social Sciences",
  "Arts & Humanities", "Law", "Education", "Architecture", "Other",
];

interface Props {
  open: boolean;
  onComplete: (profile: DiscoverProfile) => void;
  language: "en" | "ru";
}

export const DiscoverProfileGate = ({ open, onComplete, language }: Props) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<DiscoverProfile>({
    fullName: "", email: "", nationality: "", educationLevel: "",
    targetDegree: "", gpa: "", ieltsScore: "", budgetRange: "", fieldOfInterest: "",
  });

  const update = (key: keyof DiscoverProfile, val: string) =>
    setProfile(p => ({ ...p, [key]: val }));

  const canProceed = step === 0
    ? profile.fullName && profile.email && profile.nationality
    : profile.educationLevel && profile.targetDegree && profile.fieldOfInterest;

  const handleSubmit = () => {
    saveProfile(profile);
    onComplete(profile);
  };

  const features = [
    { icon: "🎯", text: "Personalized university recommendations" },
    { icon: "💰", text: "Cost calculator with scholarship data" },
    { icon: "📊", text: "Side-by-side university comparison" },
  ];

  return (
    <Dialog open={open} modal>
      <DialogContent className="max-w-lg [&>button]:hidden" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-heading">
                {step === 0 ? "Unlock TopUni Discover" : "Almost there!"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {step === 0
                  ? "Create your profile to access all premium features"
                  : "Tell us about your academic goals"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {features.map((f, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1.5 py-1 px-2.5 bg-muted/30">
                {f.icon} {f.text}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {[0, 1].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-accent" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
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
            </motion.div>
          ) : (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Current Education *</Label>
                  <Select value={profile.educationLevel} onValueChange={v => update("educationLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="bachelor">Bachelor's</SelectItem>
                      <SelectItem value="master">Master's</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Target Degree *</Label>
                  <Select value={profile.targetDegree} onValueChange={v => update("targetDegree", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bachelor">Bachelor's</SelectItem>
                      <SelectItem value="master">Master's</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Field of Interest *</Label>
                <Select value={profile.fieldOfInterest} onValueChange={v => update("fieldOfInterest", v)}>
                  <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>
                    {FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">GPA (optional)</Label>
                  <Input type="number" step="0.1" min="0" max="4" placeholder="e.g. 3.5" value={profile.gpa} onChange={e => update("gpa", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">IELTS Score (optional)</Label>
                  <Input type="number" step="0.5" min="0" max="9" placeholder="e.g. 6.5" value={profile.ieltsScore} onChange={e => update("ieltsScore", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Annual Budget (USD)</Label>
                <Select value={profile.budgetRange} onValueChange={v => update("budgetRange", v)}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-5000">Under $5,000</SelectItem>
                    <SelectItem value="5000-15000">$5,000 – $15,000</SelectItem>
                    <SelectItem value="15000-30000">$15,000 – $30,000</SelectItem>
                    <SelectItem value="30000-50000">$30,000 – $50,000</SelectItem>
                    <SelectItem value="50000+">$50,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 mt-4">
          {step === 1 && (
            <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
              Back
            </Button>
          )}
          {step === 0 ? (
            <Button onClick={() => setStep(1)} disabled={!canProceed} className="flex-1 gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed} className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Sparkles className="h-4 w-4" /> Unlock Discover
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
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
