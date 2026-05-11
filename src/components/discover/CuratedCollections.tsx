import { useMemo } from "react";
import { motion } from "framer-motion";
import { canonicalCountry } from "@/lib/countryAccent";
import {
  Award, Clock, Globe,
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
  /** Russian label — falls back to `label` when missing. Added 2026-05-10
   *  after user flagged Discover quick-filter chips reading EN on the RU
   *  route ("alot of some of texts are still not translated properly"). */
  labelRu?: string;
  sub: string;
  /** Lucide icon component. */
  Icon: typeof Award;
  accentCls: string;
  /** Predicate over a row to count how many opportunities match. */
  predicate: (s: Row) => boolean;
  /** Mutator over the filter state shape used by Discover.tsx. */
  apply: (set: (patch: Record<string, unknown>) => void) => void;
  /** Inverse mutator — resets THIS chip's contribution back to default
   *  so toggling the chip off deactivates it cleanly. Required because
   *  the previous merge-only model left filters stuck on with no way
   *  to peel them back, leading to "click 2 chips → nothing matches"
   *  states the user couldn't recover from. */
  reset: (set: (patch: Record<string, unknown>) => void) => void;
  /** Returns true when the current filter state matches what this
   *  preset applies — drives the chip's active-state styling so users
   *  can SEE which filters are on. */
  isActive: (filters: Record<string, unknown>) => boolean;
}

// Trimmed to 3 chips per user direction. The previous 11-chip rail
// stacked filters silently with no active-state visualization or
// toggle-off path, which led to "click two chips → nothing matches"
// states the user couldn't recover from. Each remaining chip:
//   · applies a clean single-key patch
//   · resets that same key back to default on second click (toggle)
//   · reports its active state so the UI can highlight it
// Stacking still works (you can have "Fully funded" + "Closing soon"
// + "UK" all active) but every chip can be peeled back independently.
export const COLLECTION_PRESETS: CollectionPreset[] = [
  {
    id: "fully-funded",
    label: "Fully funded",
    labelRu: "Полное финансирование",
    sub: "Tuition + living covered",
    Icon: Award,
    accentCls: "from-gold/15 to-gold/5 border-gold/30",
    predicate: s => s.coverage_type === "full_ride",
    apply: set => set({ coverage: "full_ride" }),
    reset: set => set({ coverage: "all" }),
    isActive: f => f.coverage === "full_ride",
  },
  {
    id: "closing-soon",
    label: "Closing soon",
    labelRu: "Скоро закрываются",
    sub: "Deadlines in the next 90 days",
    Icon: Clock,
    accentCls: "from-destructive/10 to-destructive/[0.03] border-destructive/25",
    predicate: s => {
      if (!s.application_deadline) return false;
      const d = Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400_000);
      return d > 0 && d <= 90;
    },
    apply: set => set({ closingSoon: true }),
    reset: set => set({ closingSoon: false }),
    isActive: f => f.closingSoon === true,
  },
  {
    id: "uk-route",
    label: "United Kingdom",
    labelRu: "Великобритания",
    sub: "Russell Group + Oxbridge",
    Icon: Globe,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => !!s.host_country && canonicalCountry(s.host_country) === "United Kingdom",
    apply: set => set({ hostCountry: "United Kingdom" }),
    reset: set => set({ hostCountry: "all" }),
    isActive: f => f.hostCountry === "United Kingdom",
  },
];

// Chips with fewer than this many matching scholarships are hidden from
// the rail. Pulls the bar above "shows up but barely useful" — the user
// only wants chips that actually surface a solid batch.
const MIN_CHIP_RESULTS = 4;

export const CuratedCollections = ({
  rows, filters, onApply, lang = "en",
}: {
  rows: Row[];
  /** Current filter state — used so each chip can show its active state.
   *  Without this the user couldn't tell which chips were applied; clicks
   *  silently stacked and there was no toggle-off path. */
  filters: Record<string, unknown>;
  /** Patch the filter state with the preset's payload. */
  onApply: (patch: Record<string, unknown>) => void;
  /** Language for chip labels — RU users see Russian translations. */
  lang?: "en" | "ru";
}) => {
  // Compute per-tile count once. A tile with 0 matches is hidden so the
  // strip never advertises an empty drawer.
  const tilesWithCount = useMemo(() => {
    return COLLECTION_PRESETS
      .map(p => ({ preset: p, count: rows.filter(p.predicate).length }))
      .filter(({ count }) => count >= MIN_CHIP_RESULTS);
  }, [rows]);

  if (tilesWithCount.length === 0) return null;

  return (
    <section className="bg-background border-b border-border/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3.5">
        <div className="-mx-5 sm:mx-0 px-5 sm:px-0 flex items-center gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap scrollbar-hide">
          {tilesWithCount.map(({ preset }, i) => {
            const active = preset.isActive(filters);
            return (
              <motion.button
                key={preset.id}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.025 * i, ease: [0.16, 1, 0.3, 1] }}
                // Toggle behavior: clicking an active chip resets ONLY
                // that chip's filter key (not all filters), so users can
                // stack chips and peel any one back independently.
                onClick={() => (active ? preset.reset(onApply) : preset.apply(onApply))}
                aria-pressed={active}
                className={`group shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all whitespace-nowrap ${
                  active
                    ? "bg-gold/15 border-gold/50 text-gold-dark"
                    : "bg-card border-border hover:border-gold/50 hover:bg-gold/5 text-foreground/85"
                }`}
              >
                <preset.Icon className={`h-3 w-3 transition-colors ${active ? "text-gold-dark" : "text-foreground/55 group-hover:text-gold-dark"}`} />
                <span className="text-[12px] font-medium">
                  {lang === "ru" && preset.labelRu ? preset.labelRu : preset.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{scrollbar-width:none}`}</style>
    </section>
  );
};
