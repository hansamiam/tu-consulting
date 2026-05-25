/**
 * <ScholarshipArchetypeInsight /> — single-line "fortune cookie"
 * observation for the (scholarship × current-user archetype) pair.
 *
 * Reads from public.scholarship_archetype_insights, keyed on
 * (scholarship_id, archetype_id). Renders nothing when:
 *   · the user has no archetype yet (no brief generated)
 *   · the cell is null in DB (eligibility hard-gate skipped it, or
 *     the LLM validator rejected the output past max retries)
 *
 * Template variables — the "pseudo-LLM cheap personalization" layer:
 * cells can include {{nationality}}, {{targetCountry}}, {{major}},
 * {{firstName}} placeholders that get substituted at render time from
 * the user's wizard profile. Zero LLM cost per view, but the line
 * reads as if written for THIS user specifically.
 *
 * Voice rule: a single italic line, no eyebrow label, no card chrome.
 * The line speaks for itself — that's the whole point.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserArchetype } from "@/hooks/useUserArchetype";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";

interface Props {
  scholarshipId: string;
}

/** Substitute {{var}} placeholders with profile values. Falls back to
 *  a neutral phrase when the profile doesn't have that field, so the
 *  sentence still reads naturally for a non-signed-in or sparse user.
 *
 *  Each variable maps to a wizard intake field — this is the
 *  pseudo-LLM personalization layer: zero per-view cost, but the
 *  cell reads as if written for THIS user. */
function fillTemplate(text: string): string {
  const profile = (getStoredProfile() || {}) as Record<string, unknown>;
  const fullName = String(profile.fullName || "").trim();
  const firstName = fullName.split(/\s+/)[0] || "you";
  const nationality = String(profile.nationality || "").trim() || "your home country";
  const targets = Array.isArray(profile.targetCountries)
    ? (profile.targetCountries as string[]).filter(Boolean)
    : [];
  const targetCountry = targets[0] || "the host country";
  const major =
    String(profile.major || profile.fieldOfStudy || "").trim() || "your field";
  const careerGoal = String(profile.careerGoal || "").trim() || "your career direction";
  const namedSchools = String(profile.namedSchools || "").trim() || "your dream school";
  const gradeLevel = String(profile.gradeLevel || "").trim() || "your stage";
  const topActivity = String(profile.topActivity || "").trim() || "your top activity";
  const gpa = String(profile.gpa || "").trim();
  const ielts = String(profile.ielts || "").trim();
  const toefl = String(profile.toefl || "").trim();
  const englishScore = ielts ? `IELTS ${ielts}` : toefl ? `TOEFL ${toefl}` : "your English score";
  return text
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{nationality\}\}/g, nationality)
    .replace(/\{\{targetCountry\}\}/g, targetCountry)
    .replace(/\{\{major\}\}/g, major)
    .replace(/\{\{careerGoal\}\}/g, careerGoal)
    .replace(/\{\{namedSchools\}\}/g, namedSchools)
    .replace(/\{\{gradeLevel\}\}/g, gradeLevel)
    .replace(/\{\{topActivity\}\}/g, topActivity)
    .replace(/\{\{gpa\}\}/g, gpa || "your GPA")
    .replace(/\{\{englishScore\}\}/g, englishScore);
}

export const ScholarshipArchetypeInsight = ({ scholarshipId }: Props) => {
  const archetypeId = useUserArchetype();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!scholarshipId || !archetypeId) {
      setText(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("scholarship_archetype_insights" as never)
        .select("insight_text")
        .eq("scholarship_id", scholarshipId)
        .eq("archetype_id", archetypeId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setText(null);
        return;
      }
      const t = (data as { insight_text?: string | null } | null)?.insight_text ?? null;
      setText(t && t.trim() ? fillTemplate(t) : null);
    })();
    return () => { cancelled = true; };
  }, [scholarshipId, archetypeId]);

  if (!text) return null;

  // Pull-quote frame — subtle gold left border + a touch of padding so
  // the insight reads as its own section without an AI-slop eyebrow
  // ("Personalized for you" etc) above it. Matches the BriefStory
  // Pullquote treatment so users recognise the editorial register.
  return (
    <blockquote className="not-prose m-0 mb-2 border-l-2 border-gold/70 pl-4 py-1">
      <p className="font-heading italic text-[15.5px] leading-[1.55] text-foreground m-0 max-w-2xl">
        {text}
      </p>
    </blockquote>
  );
};
