import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/adminMode";

/**
 * <ScholarshipMiniGuide /> — the "Top Uni Insights" block at the bottom
 * of the Discover right-panel pull-up. Hand-written 3-bullet summary,
 * sourced from public.scholarship_mini_guides.top_insights (TEXT[3]).
 *
 * Three render states:
 *   1. PAYWALL DOWN + bullets present → render the 3 numbered bullets
 *   2. PAYWALL UP + free user        → "Become a member to unlock..."
 *   3. No bullets uploaded yet       → "Top Uni notes coming soon..."
 *
 * The legacy multi-section guide (who_fits / how_to_win / what_to_prepare
 * / typical_admit / watch_out in `content` JSONB) ran too long for this
 * surface — kept in the database for a future longer-form page, but no
 * longer rendered here.
 */

// TEMP 2026-05-27: paywall disabled — anyone can see Top Uni Insights.
// Flip to `false` to restore the members-only gate when the founding-20
// launch flips. Mirrors the same flag in ScholarshipArchetypeInsight.
const PUBLIC_INSIGHTS_TEMP = true;

interface Props {
  scholarshipId: string;
  language?: "en" | "ru";
  hostCountry?: string | null;
}

interface RelatedScholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
}

export const ScholarshipMiniGuide = ({ scholarshipId, language = "en", hostCountry = null }: Props) => {
  const [bullets, setBullets] = useState<string[] | null>(null);
  const [related, setRelated] = useState<RelatedScholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, subscription } = useAuth();
  const isMember = !!subscription && (
    subscription.is_active ||
    subscription.is_founding_member ||
    isAdminUser(user)
  );
  const canRead = PUBLIC_INSIGHTS_TEMP || isMember;
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  useEffect(() => {
    if (!scholarshipId) return;
    let cancelled = false;
    setLoading(true);
    setRelated(null);
    (async () => {
      const { data, error } = await supabase
        .from("scholarship_mini_guides")
        .select("top_insights")
        .eq("scholarship_id", scholarshipId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[top-uni-insights] fetch error", { scholarshipId, error });
        setBullets(null);
      } else {
        const row = data as { top_insights?: string[] | null } | null;
        const list = Array.isArray(row?.top_insights) ? row!.top_insights! : null;
        setBullets(list && list.length > 0 ? list : null);
        // No bullets for this scholarship yet — pick a related one that
        // DOES have bullets so the user has somewhere useful to click.
        if (!list || list.length === 0) {
          const pick = await findRelatedScholarship(scholarshipId, hostCountry);
          if (!cancelled && pick) setRelated(pick);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scholarshipId, hostCountry]);

  if (loading) return null;
  if (!canRead) return <PaywallCard t={t} />;
  if (!bullets) return <ComingSoonCard t={t} related={related} language={language} />;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="not-prose mb-8 max-w-2xl"
    >
      <SectionEyebrow t={t} />
      <ol className="space-y-4 m-0 pl-0 list-none">
        {bullets.slice(0, 3).map((b, i) => (
          <li key={i} className="grid grid-cols-[28px_1fr] gap-3.5 items-start">
            <span className="font-heading text-[20px] font-bold text-brand-navy tabular-nums leading-[1.25]">
              {i + 1}.
            </span>
            <p className="text-[15px] leading-[1.55] text-foreground/90 m-0">
              {b}
            </p>
          </li>
        ))}
      </ol>
    </motion.section>
  );
};

const SectionEyebrow = ({ t }: { t: (en: string, ru: string) => string }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <span className="h-px w-6 bg-gold/60" aria-hidden />
    <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gold-dark m-0">
      {t("Top Uni Insights", "Заметки Top Uni")}
    </p>
    <span className="h-px flex-1 bg-gold/15" aria-hidden />
  </div>
);

const ComingSoonCard = ({
  t,
  related,
  language,
}: {
  t: (en: string, ru: string) => string;
  related: RelatedScholarship | null;
  language: "en" | "ru";
}) => (
  <section className="not-prose mb-8 max-w-2xl">
    <SectionEyebrow t={t} />
    <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.02] px-5 py-6">
      <p className="font-heading text-[15px] leading-[1.55] text-foreground/70 m-0">
        {t(
          "Top Uni notes coming soon — we're writing the strategy read for this scholarship.",
          "Заметки Top Uni скоро — мы готовим стратегический разбор для этой стипендии."
        )}
      </p>
      {related && (
        <div className="mt-5 pt-5 border-t border-foreground/10">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-gold-dark m-0 mb-2.5">
            {t("In the meantime", "А пока что")}
          </p>
          <Link
            to={`/scholarships/${related.scholarship_id}${language === "ru" ? "/ru" : ""}`}
            className="group block rounded-xl border border-gold/30 bg-gradient-to-br from-gold/[0.05] via-card to-card hover:border-gold/55 hover:from-gold/[0.09] transition-all px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[14.5px] font-bold text-foreground leading-tight m-0 truncate">
                  {related.scholarship_name}
                </p>
                <p className="text-[12px] text-foreground/60 m-0 mt-0.5 truncate">
                  {[related.provider_name, related.host_country].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gold-dark shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      )}
    </div>
  </section>
);

async function findRelatedScholarship(
  excludeId: string,
  hostCountry: string | null,
): Promise<RelatedScholarship | null> {
  type Row = {
    scholarship_id: string;
    scholarships: {
      scholarship_name: string;
      provider_name: string | null;
      host_country: string | null;
      verified: boolean | null;
    } | null;
  };

  const baseSelect = "scholarship_id, scholarships!inner(scholarship_name, provider_name, host_country, verified)";

  // Same-country first
  if (hostCountry) {
    const { data } = await supabase
      .from("scholarship_mini_guides")
      .select(baseSelect)
      .not("top_insights", "is", null)
      .neq("scholarship_id", excludeId)
      .eq("scholarships.verified", true)
      .eq("scholarships.host_country", hostCountry)
      .limit(1);
    const row = (data as unknown as Row[] | null)?.[0];
    if (row?.scholarships) {
      return {
        scholarship_id: row.scholarship_id,
        scholarship_name: row.scholarships.scholarship_name,
        provider_name: row.scholarships.provider_name,
        host_country: row.scholarships.host_country,
      };
    }
  }

  // Fallback — any verified scholarship with bullets
  const { data } = await supabase
    .from("scholarship_mini_guides")
    .select(baseSelect)
    .not("top_insights", "is", null)
    .neq("scholarship_id", excludeId)
    .eq("scholarships.verified", true)
    .limit(1);
  const row = (data as unknown as Row[] | null)?.[0];
  if (!row?.scholarships) return null;
  return {
    scholarship_id: row.scholarship_id,
    scholarship_name: row.scholarships.scholarship_name,
    provider_name: row.scholarships.provider_name,
    host_country: row.scholarships.host_country,
  };
}

const PaywallCard = ({ t }: { t: (en: string, ru: string) => string }) => (
  <section className="not-prose mb-8">
    <div className="rounded-2xl border-2 border-dashed border-gold/45 bg-gradient-to-br from-gold/[0.06] via-card to-card p-6 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
          <Lock className="w-5 h-5 text-gold-dark" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-gold-dark m-0 mb-2">
            {t("Members only", "Только для участников")}
          </p>
          <h4 className="font-heading text-[20px] sm:text-[22px] font-bold leading-tight tracking-tight text-foreground m-0 mb-4">
            {t(
              "Become a member to unlock Top Uni Insights.",
              "Станьте участником, чтобы открыть заметки Top Uni."
            )}
          </h4>
          <Button variant="gold" asChild className="gap-1.5">
            <Link to="/pricing">
              {t("Become a member", "Стать участником")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);
