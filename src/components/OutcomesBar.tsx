/**
 * OutcomesBar — compact trust signal showing aggregate $ won across
 * all TopUni members. Powered by the `topuni_outcomes_aggregate()`
 * SECURITY DEFINER function (migration 20260505180000_outcome_tracking).
 *
 * Renders nothing until at least one accepted scholarship has a
 * captured award amount. Also renders nothing if the RPC fails
 * (e.g. migration not yet applied) — this is the graceful-degradation
 * surface that activates the moment outcomes start flowing.
 *
 * Use this anywhere the community-aggregate trust signal is helpful:
 * landing pages, pricing, brief footers, etc.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

interface OutcomesAggregate {
  total_awarded_usd: number;
  accepted_count: number;
  member_count: number;
}

const fmtMoney = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `$${Math.round(v / 1000)}K`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v}`;
};

interface Props {
  language?: "en" | "ru";
  /** "inline" = single sentence in a chip; "card" = padded card. */
  variant?: "inline" | "card";
  className?: string;
}

export const OutcomesBar = ({ language = "en", variant = "inline", className = "" }: Props) => {
  const [agg, setAgg] = useState<OutcomesAggregate | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("topuni_outcomes_aggregate");
      if (cancelled) return;
      if (error) {
        // Migration not applied yet, function missing, RLS denied —
        // any failure is silent: the bar simply doesn't render.
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.accepted_count === 0) return;
      setAgg(row as OutcomesAggregate);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!agg) return null;

  const ru = language === "ru";
  const total = fmtMoney(agg.total_awarded_usd);
  const headline = ru
    ? `${total} выиграно членами TopUni`
    : `${total} won by TopUni members`;
  const sub = ru
    ? `${agg.accepted_count} стипендий · ${agg.member_count} студентов`
    : `${agg.accepted_count} scholarships · ${agg.member_count} students`;

  if (variant === "card") {
    return (
      <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/8 border border-gold/30 ${className}`}>
        <Trophy className="w-4 h-4 text-gold-dark shrink-0" />
        <div className="text-left leading-tight">
          <p className="font-heading font-semibold text-foreground text-sm tabular-nums">{headline}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">{sub}</p>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-gold-dark ${className}`}>
      <Trophy className="w-3 h-3" />
      <span className="tabular-nums">{headline}</span>
      <span className="text-muted-foreground tabular-nums">· {sub}</span>
    </span>
  );
};
