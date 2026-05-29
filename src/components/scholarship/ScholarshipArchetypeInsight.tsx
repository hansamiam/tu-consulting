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
 *  Always returns a string with neutral fallbacks for any missing field.
 *  The aggressive "return null when sparse" gate from PR #159 has been
 *  reverted: per 2026-05-27 testing, it killed renders for users whose
 *  cell text didn't reference critical vars at all (the gate's
 *  `usesCritical` check was correct but the surface still felt empty
 *  to Sam, who expected to SEE insights for the paywall-down preview).
 *  Slightly-degraded fallback sentences are better than empty space. */
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
            Scholarship strategy
          </p>
          <h4 className="font-heading text-[20px] sm:text-[22px] font-bold leading-tight tracking-tight text-foreground m-0 mb-2.5">
            Get your scholarship strategy.
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

// 2026-05-29: paywall restored ahead of membership launch. Anon + free
// users see the BuildProfileCard / PaywallCard. isAdminUser already
// bypasses via the canRead check below.
const PUBLIC_INSIGHTS_TEMP = false;

export const ScholarshipArchetypeInsight = ({ scholarshipId }: Props) => {
  const detectedArchetype = useUserArchetype();
  const { user, subscription } = useAuth();
  const isMember = !!subscription && (
    subscription.is_active ||
    subscription.is_founding_member ||
    isAdminUser(user)
  );
  const canRead = PUBLIC_INSIGHTS_TEMP || isMember;
  // Coverage of the (scholarship × archetype) matrix is uneven — some
  // archetypes (tight-lane, recoverer, contrarian, family-anchor,
  // caregiver, working-kid) have 30–85% null cells across the catalog,
  // while open-question is 100% populated on every scholarship that has
  // any insight at all.
  //
  // TEMP 2026-05-27 (paired with PUBLIC_INSIGHTS_TEMP): cascade fetch.
  // Try the detected archetype first; if its cell is null/empty, fall
  // back to open-question so the surface always renders during the
  // paywall-down preview window. Revert when PUBLIC_INSIGHTS_TEMP
  // flips back to false (members should see the bare empty state for
  // sparse cells, not a generic fallback, so the matrix coverage gap
  // is visible to us and we keep generating cells).
  const archetypeId = detectedArchetype || (PUBLIC_INSIGHTS_TEMP ? "open-question" : null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!scholarshipId || !archetypeId || !canRead) {
      console.log("[insight] skip-fetch", { scholarshipId, archetypeId, canRead });
      setText(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const fetchCell = async (aid: string) => {
        const { data, error } = await supabase
          .from("scholarship_archetype_insights" as never)
          .select("insight_text")
          .eq("scholarship_id", scholarshipId)
          .eq("archetype_id", aid)
          .maybeSingle();
        if (error) {
          console.warn("[insight] fetch error", { scholarshipId, archetypeId: aid, error });
          return null;
        }
        const t = (data as { insight_text?: string | null } | null)?.insight_text ?? null;
        return t && t.trim() ? t : null;
      };

      let t = await fetchCell(archetypeId);
      if (cancelled) return;
      if (!t && PUBLIC_INSIGHTS_TEMP && archetypeId !== "open-question") {
        // Cascade fallback. The detected archetype has no cell for this
        // scholarship — try open-question (100% coverage) so the
        // preview surface still renders something.
        console.log("[insight] cascade-to-open-question", { scholarshipId, tried: archetypeId });
        t = await fetchCell("open-question");
        if (cancelled) return;
      }
      if (!t) {
        console.log("[insight] cell-empty", { scholarshipId, archetypeId });
        setText(null);
        return;
      }
      setText(fillTemplate(t));
    })();
    return () => { cancelled = true; };
  }, [scholarshipId, archetypeId, canRead]);

  // State routing keyed on whether the user has built a profile —
  // NOT on whether a row exists in archetype_assignments. The
  // telemetry table only gets writes for briefs generated after
  // 2026-05-25; existing users with prior briefs have a saved
  // DiscoverProfile in localStorage but no telemetry row yet.
  // useUserArchetype falls back to running the deterministic detector
  // client-side, so archetypeId is non-null whenever a profile exists.
  const hasProfile = !!getStoredProfile();
  if (!hasProfile && !PUBLIC_INSIGHTS_TEMP) return <BuildProfileCard />;
  if (!canRead) return <PaywallCard />;
  // Always render the section during PUBLIC_INSIGHTS_TEMP preview.
  // If the cascade fetch hasn't returned yet OR genuinely produced nothing
  // (network failure, RLS issue, every cell null — all unexpected during
  // the preview window since open-question has 100% coverage), render a
  // generic strategic nudge instead of nothing. Blank space was hiding
  // the surface entirely and made the preview look broken.
  if (!text) {
    return <MemberInsight text={fillTemplate(
      "Strong programs reward {{firstName}} for specific, well-researched applications — lead with your strongest evidence in {{major}} and concrete reasons this fund fits where you're headed."
    )} />;
  }
  return <MemberInsight text={text} />;
};
