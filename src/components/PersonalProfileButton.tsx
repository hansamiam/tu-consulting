import { useState } from "react";
import { Sparkles, User as UserIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersonalProfile } from "@/hooks/usePersonalProfile";
import { PersonalProfileDialog } from "@/components/PersonalProfileDialog";

/**
 * <PersonalProfileButton /> — the surface that lets a visitor set or
 * edit their match profile. Drop into any listing page header.
 *
 * Two visual states:
 *  • "Set your profile" pill (idle, gold-bordered) when no profile yet
 *  • "Match: ON" pill (set, emerald-tinted) once a profile exists
 *
 * On click → opens PersonalProfileDialog. On save → every
 * ScholarshipCard on the page re-renders with personalized scores.
 */

interface Props {
  language?: "en" | "ru";
  /** Variant for header bars vs floating action. */
  variant?: "inline" | "floating";
}

const COPY = {
  en: {
    set: "Match my profile",
    on: "Match · ON",
    sub: "30 sec · stays on your device",
  },
  ru: {
    set: "Матчинг по профилю",
    on: "Матчинг · ВКЛ",
    sub: "30 сек · только на этом устройстве",
  },
} as const;

export function PersonalProfileButton({ language = "en", variant = "inline" }: Props) {
  const t = COPY[language];
  const [open, setOpen] = useState(false);
  const { profile, isUseful } = usePersonalProfile();
  const set = isUseful && !!profile;

  if (variant === "floating") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg ring-1 transition-all
            ${set
              ? "bg-emerald-600 text-white ring-emerald-500/30 hover:bg-emerald-700"
              : "bg-gold text-primary ring-gold/40 hover:bg-gold-light"}`}
          aria-label={set ? t.on : t.set}
        >
          {set ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span className="text-sm font-semibold">{set ? t.on : t.set}</span>
        </button>
        <PersonalProfileDialog open={open} onOpenChange={setOpen} language={language} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors
          ${set
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15"
            : "bg-gold/10 text-gold-dark border-gold/35 hover:bg-gold/15"}`}
      >
        {set ? <Check className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
        {set ? t.on : t.set}
        <Badge variant="outline" className="text-[9px] tracking-[0.14em] uppercase font-medium border-0 bg-transparent px-0">
          {t.sub}
        </Badge>
      </button>
      <PersonalProfileDialog open={open} onOpenChange={setOpen} language={language} />
    </>
  );
}
