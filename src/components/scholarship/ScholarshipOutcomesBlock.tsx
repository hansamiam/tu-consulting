/**
 * ScholarshipOutcomesBlock — per-scholarship trust signal driven by
 * `scholarship_outcomes()` RPC. Renders three numbers we can claim
 * truthfully because they come from member-captured tracker data:
 *
 *   "12 TopUni members applied · 3 received offers · $89K awarded"
 *
 * Hides itself when:
 *   - The RPC errors (pre-migration safe — function doesn't exist yet)
 *   - applied_count < threshold (3 by default — we don't want "1 student
 *     applied" trust theatre, we want the social proof to mean something)
 *
 * This is the surface OFY-shaped competitors structurally cannot match:
 * they have no membership, no tracker, no outcome capture. Every win a
 * TopUni member logs on /pipeline grows the trust footprint on the
 * exact /scholarships/:id page that aggregator sites are also ranking
 * for. Compounding flywheel built into the URL.
 */
import { useEffect, useState } from "react";
import { Trophy, Users, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OutcomesData {
  applied_count: number;
  accepted_count: number;
  total_awarded_usd: number;
  in_pipeline_count: number;
}

const fmtMoney = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `$${Math.round(v / 1000)}K`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v}`;
};

interface Props {
  scholarshipId: string;
  /** Minimum applied_count required before the block renders. Default 3
   * — high enough to dodge the "1 student applied" trust-theatre look. */
  threshold?: number;
  language?: "en" | "ru";
  className?: string;
}

export const ScholarshipOutcomesBlock = ({ scholarshipId, threshold = 3, language = "en", className = "" }: Props) => {
  const [data, setData] = useState<OutcomesData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rpcData, error } = await supabase.rpc("scholarship_outcomes", { p_scholarship_id: scholarshipId });
      if (cancelled) return;
      if (error) return; // Pre-migration / RLS / function-missing — silent.
      // PostgREST returns RECORD-returning functions as an array.
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!row) return;
      const applied = Number(row.applied_count ?? 0);
      if (applied < threshold) return;
      setData({
        applied_count: applied,
        accepted_count: Number(row.accepted_count ?? 0),
        total_awarded_usd: Number(row.total_awarded_usd ?? 0),
        in_pipeline_count: Number(row.in_pipeline_count ?? 0),
      });
    })();
    return () => { cancelled = true; };
  }, [scholarshipId, threshold]);

  if (!data) return null;

  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);

  return (
    <div className={`rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.05] via-card to-card p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-3.5 w-3.5 text-gold-dark" />
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
          {t("TopUni member outcomes", "Результаты участников TopUni")}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <Stat
          icon={<Users className="h-3.5 w-3.5 text-foreground/70" />}
          label={t("applied", "подали")}
          value={data.applied_count.toLocaleString()}
        />
        <Stat
          icon={<Trophy className="h-3.5 w-3.5 text-gold-dark" />}
          label={t("received offers", "получили оффер")}
          value={data.accepted_count.toLocaleString()}
          accent
        />
        <Stat
          label={t("awarded", "выиграно")}
          value={data.total_awarded_usd > 0 ? fmtMoney(data.total_awarded_usd) : "—"}
          accent={data.total_awarded_usd > 0}
        />
      </div>
      {data.in_pipeline_count > data.applied_count && (
        <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
          {t(
            `${data.in_pipeline_count - data.applied_count} more members are working on this right now.`,
            `Ещё ${data.in_pipeline_count - data.applied_count} участников работают над заявкой прямо сейчас.`,
          )}
        </p>
      )}
    </div>
  );
};

const Stat = ({ icon, label, value, accent = false }: { icon?: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <p className={`font-heading font-bold text-2xl tabular-nums tracking-tight leading-none ${accent ? "text-gold-dark" : "text-foreground"}`}>
      {value}
    </p>
  </div>
);
