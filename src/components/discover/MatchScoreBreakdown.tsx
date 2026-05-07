import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MinusCircle, AlertCircle, HelpCircle, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * <MatchScoreBreakdown /> — hover/focus popover that explains a scholarship's
 * composite match score using the same math as the match_scholarships RPC.
 *
 * Lazy-loads the breakdown from the public.match_score_breakdown SQL
 * function on first hover. Cached locally per scholarship_id so re-hovers
 * are instant.
 *
 * Pure data → no external state dependency. Pass scholarship_id +
 * the profile's query embedding (already computed by the host page when
 * it called match_scholarships) and we render the breakdown.
 *
 * If the embedding isn't available, we show a softer "rule-based" panel
 * derived from per-row signals (deadline urgency + value + verification
 * freshness) so the popover stays useful.
 *
 * See docs/MATCH_SCORING.md for the full algorithm + weights.
 */

interface BreakdownRow {
  similarity: number;
  similarity_reason: string;
  passes_eligibility: boolean;
  eligibility_reason: string;
  deadline_boost: number;
  deadline_reason: string;
  value_boost: number;
  value_reason: string;
  recency_boost: number;
  recency_reason: string;
  /* Trust factors — added in 20260507220000. Older deployments returning
   * the legacy 11-column shape leave these undefined; the row renderer
   * skips zero/undefined entries. */
  confidence_adj?: number;
  confidence_reason?: string;
  completeness_boost?: number;
  completeness_reason?: string;
  composite_score: number;
}

interface FallbackInputs {
  /** Pre-computed match score from the parent (whatever logic the parent used). */
  match: number;
  application_deadline?: string | null;
  estimated_total_value_usd?: number | null;
  last_verified_at?: string | null;
  verification_status?: string | null;
  passes_eligibility?: boolean;
  why_this_fits?: string | null;
  /** Reasons strings already computed by the client-side scorer. */
  reasons?: string[];
  warnings?: string[];
}

interface Props {
  scholarshipId: string;
  /** When supplied, we call match_score_breakdown. Most Discover surfaces
   *  don't have an embedding handy — when omitted we render the softer
   *  rule-based fallback panel from the FallbackInputs. */
  queryEmbedding?: number[] | null;
  /** Inputs for the fallback rendering. Always required so the popover
   *  has *something* to render even before the RPC resolves. */
  fallback: FallbackInputs;
  /** Compact mode trims spacing — for use inline in lists. */
  compact?: boolean;
}

const fmtBoost = (n: number): string => {
  if (n === 0) return "0";
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n * 100).toFixed(1)}%`;
};

const StatusIcon = ({ status }: { status: "good" | "warn" | "miss" | "info" }) => {
  if (status === "good") return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
  if (status === "warn") return <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />;
  if (status === "miss") return <MinusCircle className="w-3.5 h-3.5 text-destructive" />;
  return <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />;
};

export const MatchScoreBreakdown = ({
  scholarshipId, queryEmbedding, fallback, compact,
}: Props) => {
  const [data, setData] = useState<BreakdownRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scholarshipId || !queryEmbedding || queryEmbedding.length === 0) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: rpcData } = await supabase.rpc("match_score_breakdown", {
        scholarship_id: scholarshipId,
        query_embedding: queryEmbedding as unknown as string,
      });
      if (cancelled) return;
      if (Array.isArray(rpcData) && rpcData[0]) {
        setData(rpcData[0] as BreakdownRow);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scholarshipId, queryEmbedding]);

  // Rule-based fallback when we don't have the RPC result yet (or no embedding).
  //
  // The popover used to show only four generic factor rows (eligibility,
  // deadline, funding, freshness). But the actual client-side scorer in
  // Discover.tsx evaluates 7-10 signals — country match, degree match,
  // field match, GPA threshold, IELTS threshold, selectivity, deadline,
  // semantic similarity. The user saw "78" big and four bullets that
  // didn't explain how the 78 was reached. Now we lead with the
  // per-factor reasons + warnings the scorer actually computed (which
  // already encode the high-leverage signals), then add the factual
  // context rows beneath. The popover finally tells the story of how
  // the score came out the way it did.
  const fallbackRows = (() => {
    const rows: { label: string; status: "good" | "warn" | "miss" | "info"; reason: string; delta?: string }[] = [];

    // Profile-fit signals come first — these are the dominant scoring
    // factors (country, degree, field, GPA, IELTS, selectivity). Already
    // computed by the parent's scoreScholarship; just need to surface
    // them. Cap each at 3 so the popover stays readable.
    if (Array.isArray(fallback.reasons)) {
      for (const r of fallback.reasons.slice(0, 3)) {
        rows.push({ label: "Profile fit", status: "good", reason: r });
      }
    }
    if (Array.isArray(fallback.warnings)) {
      for (const w of fallback.warnings.slice(0, 2)) {
        rows.push({ label: "Watch out", status: "warn", reason: w });
      }
    }

    // Factual context — surfaces what the score-maths boosts/penalties
    // were keyed on, so a user sees the freshness signal + deadline
    // urgency in addition to their profile fit.
    if (fallback.application_deadline) {
      const days = Math.ceil((new Date(fallback.application_deadline).getTime() - Date.now()) / 86400_000);
      let status: "good" | "warn" | "miss" | "info" = "info";
      let reason = "Deadline far out — no urgency boost.";
      let delta = "+0.0%";
      if (days < 0) { status = "miss"; reason = "Deadline has passed."; delta = "0"; }
      else if (days <= 7) { status = "warn"; reason = `Deadline in ${days} days — last-week urgency.`; delta = "+2.0%"; }
      else if (days <= 30) { status = "warn"; reason = `Deadline in ${days} days — prime apply window.`; delta = "+4.0%"; }
      else if (days <= 90) { status = "good"; reason = `Deadline in ${days} days — slight urgency boost.`; delta = "+2.5%"; }
      else if (days <= 180) { status = "good"; reason = `Deadline within 6 months — minor boost.`; delta = "+1.0%"; }
      rows.push({ label: "Deadline urgency", status, reason, delta });
    }

    if (typeof fallback.estimated_total_value_usd === "number" && fallback.estimated_total_value_usd > 0) {
      const v = fallback.estimated_total_value_usd;
      const boost = Math.min(0.040, Math.log(v + 1) / 200);
      let reason = "Lower funding tier — minimal boost.";
      if (v >= 100000) reason = "High-value award — gets a small boost.";
      else if (v >= 30000) reason = "Solid funding amount — modest boost.";
      rows.push({ label: "Funding magnitude", status: "good", reason, delta: fmtBoost(boost) });
    }

    if (fallback.last_verified_at) {
      const days = Math.floor((Date.now() - new Date(fallback.last_verified_at).getTime()) / 86400_000);
      let status: "good" | "warn" | "miss" | "info" = "info";
      let reason = "Verified within the past year — neutral.";
      let delta = "0";
      if (days <= 30) { status = "good"; reason = "Verified in the last 30 days — full freshness boost."; delta = "+2.0%"; }
      else if (days <= 90) { status = "good"; reason = "Verified within 90 days — small freshness boost."; delta = "+1.0%"; }
      else if (days > 365) { status = "warn"; reason = "Last verified over a year ago — small recency penalty."; delta = "−2.0%"; }
      rows.push({ label: "Data freshness", status, reason, delta });
    }

    return rows;
  })();

  // Prefer RPC data when available; fall back to rule-based panel otherwise.
  const useRpc = !!data;
  const rows = useRpc ? [
    {
      label: "Semantic match",
      status: (data!.similarity >= 0.7 ? "good" : data!.similarity >= 0.55 ? "info" : "warn") as "good"|"warn"|"miss"|"info",
      reason: data!.similarity_reason,
      delta: `${(data!.similarity * 100).toFixed(0)}/100`,
    },
    {
      label: "Eligibility",
      status: (data!.passes_eligibility ? "good" : "warn") as "good"|"warn"|"miss"|"info",
      reason: data!.eligibility_reason,
    },
    {
      label: "Deadline urgency",
      status: (data!.deadline_boost > 0.02 ? "good" : "info") as "good"|"warn"|"miss"|"info",
      reason: data!.deadline_reason,
      delta: fmtBoost(data!.deadline_boost),
    },
    {
      label: "Funding magnitude",
      status: (data!.value_boost > 0.02 ? "good" : "info") as "good"|"warn"|"miss"|"info",
      reason: data!.value_reason,
      delta: fmtBoost(data!.value_boost),
    },
    {
      label: "Data freshness",
      status: (data!.recency_boost > 0 ? "good" : data!.recency_boost < 0 ? "warn" : "info") as "good"|"warn"|"miss"|"info",
      reason: data!.recency_reason,
      delta: fmtBoost(data!.recency_boost),
    },
    ...(typeof data!.confidence_adj === "number" && data!.confidence_adj < 0 ? [{
      label: "Extraction confidence",
      status: (data!.confidence_adj <= -0.025 ? "warn" : "info") as "good"|"warn"|"miss"|"info",
      reason: data!.confidence_reason ?? "",
      delta: fmtBoost(data!.confidence_adj),
    }] : []),
    ...(typeof data!.completeness_boost === "number" && data!.completeness_boost > 0 ? [{
      label: "Catalog completeness",
      status: "good" as "good"|"warn"|"miss"|"info",
      reason: data!.completeness_reason ?? "",
      delta: fmtBoost(data!.completeness_boost),
    }] : []),
  ] : fallbackRows;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -2, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`bg-popover border border-border rounded-xl shadow-lg ${compact ? "p-3" : "p-4"} w-[320px] z-50`}
      >
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Why we surfaced this
          </p>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
        <ul className="space-y-2 mb-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <StatusIcon status={r.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-semibold text-foreground leading-tight">{r.label}</span>
                  {"delta" in r && r.delta ? (
                    <span className="text-[10px] tabular-nums text-muted-foreground font-mono shrink-0">{r.delta}</span>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{r.reason}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[9px] text-muted-foreground/60 mt-2 pt-2 border-t border-border/40 leading-snug flex items-start gap-1.5">
          <Info className="w-2.5 h-2.5 mt-0.5 shrink-0" />
          Same math as our ranking. Hover any score for the breakdown.
        </p>
      </motion.div>
    </AnimatePresence>
  );
};
