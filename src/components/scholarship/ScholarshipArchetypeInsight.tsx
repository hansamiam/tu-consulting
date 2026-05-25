/**
 * <ScholarshipArchetypeInsight /> — the "Personalized for you" section
 * at the top of the scholarship detail sheet.
 *
 * Three states. The component picks the right one based on whether the
 * user has built a profile yet and whether they're a paid member.
 *
 *   1. NO PROFILE     → CTA card prompting the wizard. "Will this
 *                       scholarship work for you?" + Build my profile.
 *   2. PROFILE + FREE → Members-only paywall card. Their profile is
 *                       saved, the matched read exists, but they need
 *                       Membership to unlock it.
 *   3. PROFILE + MEMBER → The actual single-sentence personalized
 *                         observation, pull-quote framed.
 *
 * Word "archetype" is INTERNAL vocabulary only — never user-facing.
 * Externally it's "your profile" / "your background" / "your read".
 *
 * Template variables (member render only): cells include {{nationality}},
 * {{targetCountry}}, {{major}}, {{firstName}} etc, substituted from the
 * wizard profile at render time. Zero LLM cost per view.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserArchetype } from "@/hooks/useUserArchetype";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";
import { isAdminUser } from "@/lib/adminMode";

interface Props {
  scholarshipId: string;
}

/** Substitute {{var}} placeholders with profile values. Each var maps
 *  to a wizard intake field — pseudo-LLM personalization at $0/view.
 *  Falls back to a neutral phrase per var when the profile lacks it. */
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

const SectionHeader = () => (
  <h3 className="font-heading text-[22px] sm:text-[24px] font-bold tracking-tight text-foreground m-0 mb-3">
    Personalized for you
  </h3>
);

/** State 1 — user hasn't built a profile yet. CTA into the wizard. */
const BuildProfileCard = () => (
  <section className="not-prose mb-8">
    <SectionHeader />
    <div className="rounded-2xl border-2 border-dashed border-gold/45 bg-gradient-to-br from-gold/[0.06] via-card to-card p-6 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
          <Award className="w-5 h-5 text-gold-dark" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-gold-dark m-0 mb-2">
            Personalized analysis
          </p>
          <h4 className="font-heading text-[20px] sm:text-[22px] font-bold leading-tight tracking-tight text-foreground m-0 mb-2.5">
            Get your personalized scholarship strategy.
          </h4>
          <p className="text-[14px] leading-[1.55] text-foreground/75 m-0 mb-5 max-w-prose">
            Build your profile (60 seconds) and we&apos;ll show you what to
            lead with, what to prepare first, and where this fund&apos;s
            panel actually looks.
          </p>
          <Button variant="gold" asChild className="gap-1.5">
            <Link to="/topuni-ai">
              Build my profile
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

/** State 2 — profile exists, user is free-tier. Membership paywall. */
const PaywallCard = () => (
  <section className="not-prose mb-8">
    <SectionHeader />
    <div className="rounded-2xl border-2 border-dashed border-gold/45 bg-gradient-to-br from-gold/[0.06] via-card to-card p-6 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
          <Lock className="w-5 h-5 text-gold-dark" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-gold-dark m-0 mb-2">
            Members only
          </p>
          <h4 className="font-heading text-[20px] sm:text-[22px] font-bold leading-tight tracking-tight text-foreground m-0 mb-2.5">
            Your personalized strategy is members-only.
          </h4>
          <p className="text-[14px] leading-[1.55] text-foreground/75 m-0 mb-5 max-w-prose">
            We&apos;ve already matched this scholarship to your background.
            Members unlock the strategy read for every scholarship in the
            catalog.
          </p>
          <Button variant="gold" asChild className="gap-1.5">
            <Link to="/pricing">
              Become a member
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

/** State 3 — member with profile. Renders the actual insight. */
const MemberInsight = ({ text }: { text: string }) => (
  <section className="not-prose mb-8">
    <SectionHeader />
    <blockquote className="m-0 border-l-2 border-gold/70 pl-4 py-1">
      <p className="font-heading italic text-[15.5px] leading-[1.55] text-foreground m-0 max-w-2xl">
        {text}
      </p>
    </blockquote>
  </section>
);

export const ScholarshipArchetypeInsight = ({ scholarshipId }: Props) => {
  const archetypeId = useUserArchetype();
  const { user, subscription } = useAuth();
  const isMember = !!subscription && (
    subscription.is_active ||
    subscription.is_founding_member ||
    isAdminUser(user)
  );
  const [text, setText] = useState<string | null>(null);

  // Only fetch the cell if we'll actually render it (member with a
  // profile). Free-tier and no-profile users never need the DB read.
  useEffect(() => {
    if (!scholarshipId || !archetypeId || !isMember) {
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
  }, [scholarshipId, archetypeId, isMember]);

  // State routing keyed on whether the user has built a profile —
  // NOT on whether a row exists in archetype_assignments. The
  // telemetry table only gets writes for briefs generated after
  // 2026-05-25; existing users with prior briefs have a saved
  // DiscoverProfile in localStorage but no telemetry row yet.
  // useUserArchetype falls back to running the deterministic detector
  // client-side, so archetypeId is non-null whenever a profile exists.
  const hasProfile = !!getStoredProfile();
  if (!hasProfile) return <BuildProfileCard />;
  if (!isMember) return <PaywallCard />;
  // Member with profile but no cell (eligibility-skipped pair) — render
  // nothing rather than a misleading CTA. The mini-guide below still
  // carries static value for the user.
  if (!text) return null;
  return <MemberInsight text={text} />;
};
