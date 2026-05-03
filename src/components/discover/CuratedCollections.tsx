import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award, Clock, Sparkles, GraduationCap, Globe, Cpu, Heart,
  Layers, ArrowRight,
} from "lucide-react";

/* CuratedCollections — curated entry tiles above the card grid. Each tile
   maps to a preset filter combo so students can dive into a natural search
   intent ("fully funded" / "closing soon" / "Korea & Japan") instead of
   building filters from scratch.

   Presets stay declarative: each tile carries a `predicate` that's evaluated
   once over the full ranked list to compute the badge count, plus an
   `apply` callback the host calls on click to mutate filter state. */

interface Row {
  scholarship_id: string;
  scholarship_name: string;
  host_country: string | null;
  coverage_type: string;
  application_deadline: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
}

export interface CollectionPreset {
  id: string;
  label: string;
  sub: string;
  /** Lucide icon component. */
  Icon: typeof Award;
  accentCls: string;
  /** Predicate over a row to count how many opportunities match. */
  predicate: (s: Row) => boolean;
  /** Mutator over the filter state shape used by Discover.tsx. */
  apply: (set: (patch: Record<string, unknown>) => void) => void;
}

const ASIA_TWO = new Set(["South Korea", "Korea", "Japan"]);

export const COLLECTION_PRESETS: CollectionPreset[] = [
  {
    id: "fully-funded",
    label: "Fully funded",
    sub: "Tuition + living covered",
    Icon: Award,
    accentCls: "from-gold/15 to-gold/5 border-gold/30",
    predicate: s => s.coverage_type === "full_ride",
    apply: set => set({ coverage: "full_ride" }),
  },
  {
    id: "closing-soon",
    label: "Closing in 30 days",
    sub: "Apply this month",
    Icon: Clock,
    accentCls: "from-destructive/10 to-destructive/[0.03] border-destructive/25",
    predicate: s => {
      if (!s.application_deadline) return false;
      const d = Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400_000);
      return d > 0 && d <= 30;
    },
    apply: set => set({ closingSoon: true }),
  },
  {
    id: "phd-funded",
    label: "PhD with funding",
    sub: "Stipend + tuition for doctorates",
    Icon: Sparkles,
    accentCls: "from-primary/10 to-primary/[0.03] border-primary/25",
    predicate: s =>
      (s.target_degree_level || []).map(d => d.toLowerCase()).some(d => d.includes("phd") || d.includes("doctor"))
      && s.coverage_type === "full_ride",
    apply: set => set({ degree: "PhD", coverage: "full_ride" }),
  },
  {
    id: "masters-tracks",
    label: "Master's tracks",
    sub: "1–2 year graduate programs",
    Icon: GraduationCap,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => (s.target_degree_level || []).map(d => d.toLowerCase()).some(d => d.includes("master")),
    apply: set => set({ degree: "master's" }),
  },
  {
    id: "korea-japan",
    label: "Korea & Japan",
    sub: "East-Asia routes",
    Icon: Globe,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => !!s.host_country && ASIA_TWO.has(s.host_country),
    apply: set => set({ hostCountry: "Japan" }), // best single-value approximation; user can switch to Korea via the dropdown
  },
  {
    id: "us-route",
    label: "United States",
    sub: "Top US programs",
    Icon: Globe,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => s.host_country === "United States" || s.host_country === "USA",
    apply: set => set({ hostCountry: "United States" }),
  },
  {
    id: "uk-route",
    label: "United Kingdom",
    sub: "Russell Group + Oxbridge",
    Icon: Globe,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => s.host_country === "United Kingdom" || s.host_country === "UK",
    apply: set => set({ hostCountry: "United Kingdom" }),
  },
  {
    id: "computer-science",
    label: "Computer Science & AI",
    sub: "Tech-focused funding",
    Icon: Cpu,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => (s.target_fields || []).some(f => /comp|software|tech|data|engineer|ai|machine/i.test(f || "")),
    apply: set => set({ field: "Computer Science & IT" }),
  },
  {
    id: "public-health",
    label: "Public Health & Development",
    sub: "Health, policy, dev studies",
    Icon: Heart,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => (s.target_fields || []).some(f => /public[\s_]?health|develop|policy|epidemic|nutrition|medic/i.test(f || "")),
    apply: set => set({ field: "Medicine & Health" }),
  },
];

export const CuratedCollections = ({
  rows, onApply,
}: {
  rows: Row[];
  /** Patch the filter state with the preset's payload. */
  onApply: (patch: Record<string, unknown>) => void;
}) => {
  // Compute per-tile count once. A tile with 0 matches is hidden so the
  // strip never advertises an empty drawer.
  const tilesWithCount = useMemo(() => {
    return COLLECTION_PRESETS
      .map(p => ({ preset: p, count: rows.filter(p.predicate).length }))
      .filter(({ count }) => count > 0);
  }, [rows]);

  if (tilesWithCount.length === 0) return null;

  return (
    <section className="bg-background border-b border-border/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
            Explore by route
          </p>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {tilesWithCount.length} curated collections
          </span>
        </div>

        {/* Horizontal scroll on mobile, wrap-grid on desktop. */}
        <div className="-mx-5 sm:mx-0 px-5 sm:px-0 flex gap-2.5 overflow-x-auto sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible scrollbar-hide pb-1">
          {tilesWithCount.map(({ preset, count }, i) => (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => preset.apply(p => onApply(p))}
              className={`group relative shrink-0 sm:shrink min-w-[180px] text-left rounded-xl bg-gradient-to-br ${preset.accentCls} border p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all`}
            >
              <div className="flex items-start justify-between mb-2">
                <preset.Icon className="h-4 w-4 text-foreground/70" />
                <span className="text-[11px] tabular-nums font-semibold text-foreground/85 bg-card/80 backdrop-blur-sm border border-border/60 rounded-full px-2 py-0.5">
                  {count}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground leading-tight tracking-tight">
                {preset.label}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">{preset.sub}</p>
              <div className="absolute right-3 bottom-3 text-foreground/30 group-hover:text-gold-dark transition-colors">
                <ArrowRight className="h-3 w-3" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Hide the horizontal scrollbar on mobile but keep the swipe affordance. */}
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{scrollbar-width:none}`}</style>
    </section>
  );
};
