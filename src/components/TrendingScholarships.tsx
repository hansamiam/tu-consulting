import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowRight, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScholarshipCard, ScholarshipCardSkeleton, type ScholarshipCardData, type ScholarshipCardStats } from "@/components/ScholarshipCard";
import { ShareScholarshipModal } from "@/components/ShareScholarshipModal";
import { Badge } from "@/components/ui/badge";

/**
 * <TrendingScholarships /> — surfaces the live highest-momentum scholarships.
 *
 * Data path:
 *   1. Try scholarship_stats sorted by trending_score DESC.
 *   2. If no rows have trending_score > 0 (cold start, common pre-PMF),
 *      fall back to is_featured=true rows. Same visual surface, always
 *      populated.
 *   3. Hydrate the matching scholarship rows in the same query.
 *
 * Cold-start handling is the key to making this not embarrassing on day 1.
 * As real interactions accumulate the trending score outranks the featured
 * fallback automatically — the same surface improves without redeploys.
 *
 * Drop on Discover, Index, or any landing — handles its own loading + empty.
 */

interface Props {
  limit?: number;
  language?: "en" | "ru";
  /** Compact = uses compact ScholarshipCard layout (sidebars, narrow). */
  compact?: boolean;
  /** Hide the kicker header entirely (when embedding in another section). */
  hideHeader?: boolean;
}

const COPY = {
  en: {
    kicker: "Trending this week",
    h2: "What other applicants are tracking right now",
    fallback: "Editor's picks",
    fallbackSub: "Hand-curated flagship programs while activity data accumulates.",
    seeAll: "Browse all",
    sub: "Live momentum from saves, shares, and views across the platform.",
  },
  ru: {
    kicker: "Тренд недели",
    h2: "Что отслеживают другие кандидаты прямо сейчас",
    fallback: "Выбор редакции",
    fallbackSub: "Курируемые флагманские программы, пока накапливается активность.",
    seeAll: "Все стипендии",
    sub: "Живая динамика сохранений, шеров и просмотров на платформе.",
  },
} as const;

type Row = ScholarshipCardData & { _stats?: ScholarshipCardStats };

export function TrendingScholarships({ limit = 4, language = "en", compact = false, hideHeader = false }: Props) {
  const t = COPY[language];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [shareTarget, setShareTarget] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // ── Path 1: by trending_score from the stats table ───────────────
      const { data: trending } = await supabase
        .from("scholarship_stats")
        .select("scholarship_id, save_count_total, save_count_7d, view_count_7d, trending_score")
        .gt("trending_score", 0)
        .order("trending_score", { ascending: false })
        .limit(limit);

      let result: Row[] = [];

      if (trending && trending.length > 0) {
        const ids = trending.map((s) => s.scholarship_id);
        const { data: hydrated } = await supabase
          .from("scholarships")
          .select("scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, target_degree_level, target_fields, is_featured, why_this_fits")
          .in("scholarship_id", ids);
        const byId = new Map<string, ScholarshipCardData>(((hydrated as ScholarshipCardData[]) ?? []).map((r) => [r.scholarship_id, r]));
        // Preserve the trending_score order
        for (const stat of trending) {
          const row = byId.get(stat.scholarship_id);
          if (!row) continue;
          result.push({ ...row, _stats: stat as ScholarshipCardStats });
        }
        if (!cancelled) setUsingFallback(false);
      }

      // ── Path 2: fallback to featured rows ────────────────────────────
      if (result.length === 0) {
        const { data: featured } = await supabase
          .from("scholarships")
          .select("scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, target_degree_level, target_fields, is_featured, why_this_fits")
          .eq("is_featured", true)
          .order("estimated_total_value_usd", { ascending: false, nullsFirst: false })
          .limit(limit);
        result = (featured as ScholarshipCardData[] ?? []).map((r) => ({ ...r }));
        if (!cancelled) setUsingFallback(true);
      }

      if (!cancelled) {
        setRows(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  const detailPath = language === "ru" ? "/discover/ru" : "/discover";
  const showingFallback = usingFallback && rows.length > 0;

  return (
    <section className="space-y-5">
      {!hideHeader && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-3 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-[10px] tracking-[0.18em] ${showingFallback ? "text-gold-dark border-gold/40" : "text-orange-600 border-orange-300"}`}>
                {showingFallback ? <><Crown className="w-3 h-3 mr-1" />{t.fallback}</> : <><Flame className="w-3 h-3 mr-1" />{t.kicker}</>}
              </Badge>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {showingFallback ? t.fallback : t.h2}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              {showingFallback ? t.fallbackSub : t.sub}
            </p>
          </div>
          <Link to={detailPath} className="text-sm text-muted-foreground hover:text-gold-dark transition-colors inline-flex items-center gap-1 self-end">
            {t.seeAll} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {loading ? (
        <div className={`grid ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"} gap-4`}>
          {Array.from({ length: limit }).map((_, i) => <ScholarshipCardSkeleton key={i} index={i} />)}
        </div>
      ) : rows.length === 0 ? (
        // True empty — the DB is empty. Won't happen in practice.
        null
      ) : (
        <div className={`grid ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"} gap-4`}>
          {rows.map((r, i) => (
            <ScholarshipCard
              key={r.scholarship_id}
              row={r}
              language={language}
              index={i}
              compact={compact}
              stats={r._stats}
              onShare={(row) => setShareTarget(row as Row)}
            />
          ))}
        </div>
      )}

      {shareTarget && (
        <ShareScholarshipModal
          open={!!shareTarget}
          onOpenChange={(o) => !o && setShareTarget(null)}
          scholarshipName={shareTarget.scholarship_name}
          providerName={shareTarget.provider_name}
          scholarshipId={shareTarget.scholarship_id}
          language={language}
        />
      )}
    </section>
  );
}
