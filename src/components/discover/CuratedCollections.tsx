import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award, Clock, Sparkles, GraduationCap, Globe, Cpu, Heart,
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
  target_demographics: string[] | null;
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
  // Demographic-eligibility collections — surface programs designed for
  // specific groups. Each tile pre-applies the demographic filter so
  // clicking lands directly in the curated subset.
  {
    id: "women-stem",
    label: "Women in STEM",
    sub: "Programs designed for women in tech / engineering / science",
    Icon: Sparkles,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics)
      && (s.target_demographics.includes("underrepresented-stem") || s.target_demographics.includes("women")),
    apply: set => set({ demographic: "underrepresented-stem" }),
  },
  {
    id: "first-generation",
    label: "First-generation friendly",
    sub: "First in your family to go abroad",
    Icon: Sparkles,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics) && s.target_demographics.includes("first-generation"),
    apply: set => set({ demographic: "first-generation" }),
  },
  {
    id: "refugees",
    label: "For refugees + displaced students",
    sub: "Specifically supports refugee + displaced applicants",
    Icon: Sparkles,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics)
      && (s.target_demographics.includes("refugee") || s.target_demographics.includes("displaced")),
    apply: set => set({ demographic: "refugee" }),
  },
  {
    id: "need-based",
    label: "Need-based",
    sub: "Means-tested + financial-need programs",
    Icon: Sparkles,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics) && s.target_demographics.includes("low-income"),
    apply: set => set({ demographic: "low-income" }),
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
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3.5">
        {/* Compact pill rail — text + count + icon, single row, horizontally
            scrollable on mobile, wrap-row on desktop. Replaces the previous
            gradient-tile grid that consumed ~110px of vertical space. The
            same intents land in roughly half the height, so actual results
            are reachable above the fold on common viewports. */}
        <div className="-mx-5 sm:mx-0 px-5 sm:px-0 flex items-center gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap scrollbar-hide">
          <span className="hidden sm:inline shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80 mr-1">
            Quick filter
          </span>
          {tilesWithCount.map(({ preset }, i) => (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.025 * i, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => preset.apply(p => onApply(p))}
              className="group shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:border-gold/50 hover:bg-gold/5 px-3 py-1.5 transition-all whitespace-nowrap"
            >
              <preset.Icon className="h-3 w-3 text-foreground/55 group-hover:text-gold-dark transition-colors" />
              <span className="text-[12px] font-medium text-foreground/85 group-hover:text-foreground transition-colors">
                {preset.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Hide the horizontal scrollbar on mobile but keep the swipe affordance. */}
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{scrollbar-width:none}`}</style>
    </section>
  );
};
