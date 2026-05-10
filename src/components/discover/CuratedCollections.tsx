import { useMemo } from "react";
import { motion } from "framer-motion";
import { canonicalCountry } from "@/lib/countryAccent";
import { normalizeFieldKey } from "@/pages/Discover";
import {
  Award, Clock, GraduationCap, Globe, Cpu, Users, HandCoins,
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
}

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
  },
  {
    id: "closing-soon",
    // Label aligned with the underlying filter — `closingSoon: true`
    // narrows to <=90 day deadlines (Discover.tsx). Pre-fix the chip
    // claimed "30 days" but clicking it surfaced the 90-day cohort, so
    // the count next to the chip didn't match the result count after
    // clicking. Either rename or change the filter — renaming is less
    // invasive and 90 days is the operationally useful "apply now" range.
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
  },
  {
    id: "phd-funded",
    label: "PhD with funding",
    labelRu: "PhD с финансированием",
    sub: "Stipend + tuition for doctorates",
    Icon: GraduationCap,
    accentCls: "from-primary/10 to-primary/[0.03] border-primary/25",
    predicate: s =>
      (s.target_degree_level || []).map(d => d.toLowerCase()).some(d => d.includes("phd") || d.includes("doctor"))
      && s.coverage_type === "full_ride",
    apply: set => set({ degree: "PhD", coverage: "full_ride" }),
  },
  // "Master's tracks" tile retired 2026-05-09 — too generic; the host-country
  // tiles + the degree dropdown cover the same intent more precisely, and
  // the chip pulled most of the catalog without filtering anything useful.
  {
    id: "korea-route",
    label: "South Korea",
    labelRu: "Южная Корея",
    sub: "Korean Government Scholarship + KAIST track",
    Icon: Globe,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    // 2026-05-10 audit fix: predicate now uses canonicalCountry to
    // match what the apply patch produces. Pre-fix the predicate
    // counted raw "Korea" + "South Korea" string matches but the
    // filter only matches canonical "South Korea", so the chip's
    // count was higher than the filtered result count.
    predicate: s => !!s.host_country && canonicalCountry(s.host_country) === "South Korea",
    apply: set => set({ hostCountry: "South Korea" }),
  },
  {
    id: "japan-route",
    label: "Japan",
    labelRu: "Япония",
    sub: "MEXT + university programs",
    Icon: Globe,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => !!s.host_country && canonicalCountry(s.host_country) === "Japan",
    apply: set => set({ hostCountry: "Japan" }),
  },
  // "us-route" preset retired 2026-05-10 — generic "Top US programs" was
  // too broad to function as a discovery shortcut. Users wanting the US
  // pick it from the host-country filter directly. Quick filters now
  // earn their slot by either (a) acting as a strategy shortcut
  // ("fully funded", "closing soon", "PhD with funding") or (b)
  // surfacing a less-obvious cohort ("women in STEM", "first-gen",
  // "refugees", "need-based"). A flat country preset doesn't qualify.
  {
    id: "uk-route",
    label: "United Kingdom",
    labelRu: "Великобритания",
    sub: "Russell Group + Oxbridge",
    Icon: Globe,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    // 2026-05-10 audit fix: same canonicalCountry alignment as Korea.
    predicate: s => !!s.host_country && canonicalCountry(s.host_country) === "United Kingdom",
    apply: set => set({ hostCountry: "United Kingdom" }),
  },
  {
    id: "computer-science",
    label: "Computer Science & AI",
    labelRu: "Computer Science и AI",
    sub: "Tech-focused funding",
    Icon: Cpu,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    // 2026-05-10 audit fix: predicate now mirrors the FILTER's
    // normalizeFieldKey logic. Pre-fix the predicate caught a broad
    // regex of tech-adjacent words (engineer, ai, machine) but the
    // filter only matched rows whose target_fields normalized to
    // "computer science". Chip count > filtered result count.
    predicate: s => (s.target_fields || []).some(f => {
      if (!f) return false;
      return f.split(/\s*[,/;]\s*/).some(part => {
        const k = normalizeFieldKey(part);
        return k === "computer science" || k === "computer science and it";
      });
    }),
    apply: set => set({ field: "Computer Science" }),
  },
  // "public-health" preset retired 2026-05-10 — too narrow a field-axis
  // to earn the slot; users in those fields find their programs through
  // the field filter directly. Field-shortcut quick filters reserved
  // for the few categories with clear demand pull.
  // Demographic-eligibility collections — surface programs designed for
  // specific groups. Each tile pre-applies the demographic filter so
  // clicking lands directly in the curated subset.
  {
    id: "women",
    // Renamed 2026-05-10 from "Women in STEM" to plain "Women" — was too
    // narrow and missed women-only programs outside tech (e.g. business,
    // medicine, leadership). The apply key "women-any" is a virtual
    // demographic value that the Discover filter pipeline expands into
    // an OR-match across both "women" and "underrepresented-stem" tags
    // so this chip surfaces ALL women-cohort programs, not just STEM.
    label: "Women",
    labelRu: "Для женщин",
    sub: "Programs designed for women — STEM, business, leadership, more",
    Icon: Users,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics)
      && (s.target_demographics.includes("underrepresented-stem") || s.target_demographics.includes("women")),
    apply: set => set({ demographic: "women-any" }),
  },
  {
    id: "first-generation",
    label: "First-generation friendly",
    labelRu: "Первое поколение",
    sub: "First in your family to go abroad",
    Icon: Users,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics) && s.target_demographics.includes("first-generation"),
    apply: set => set({ demographic: "first-generation" }),
  },
  {
    id: "refugees",
    label: "For refugees + displaced students",
    labelRu: "Беженцы и вынужденные переселенцы",
    sub: "Specifically supports refugee + displaced applicants",
    Icon: Users,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics)
      && (s.target_demographics.includes("refugee") || s.target_demographics.includes("displaced")),
    // 2026-05-10 audit fix: apply uses "refugee-any" virtual value so
    // the filter pipeline OR-matches both refugee + displaced tags,
    // mirroring the predicate. Pre-fix the chip counted both but the
    // filter only matched "refugee", losing displaced-tagged rows.
    apply: set => set({ demographic: "refugee-any" }),
  },
  {
    id: "need-based",
    label: "Need-based",
    labelRu: "По нуждаемости",
    sub: "Means-tested + financial-need programs",
    Icon: HandCoins,
    accentCls: "from-foreground/[0.06] to-foreground/[0.02] border-border",
    predicate: s => Array.isArray(s.target_demographics) && s.target_demographics.includes("low-income"),
    apply: set => set({ demographic: "low-income" }),
  },
];

// Chips with fewer than this many matching scholarships are hidden from
// the rail. Pulls the bar above "shows up but barely useful" — the user
// only wants chips that actually surface a solid batch.
const MIN_CHIP_RESULTS = 4;

export const CuratedCollections = ({
  rows, onApply, lang = "en",
}: {
  rows: Row[];
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
        {/* Compact pill rail — text + count + icon, single row, horizontally
            scrollable on mobile, wrap-row on desktop. Replaces the previous
            gradient-tile grid that consumed ~110px of vertical space. The
            same intents land in roughly half the height, so actual results
            are reachable above the fold on common viewports. */}
        <div className="-mx-5 sm:mx-0 px-5 sm:px-0 flex items-center gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap scrollbar-hide">
          {/* "QUICK FILTER" uppercase label retired (round 33). The
              chips are self-explanatory and the label was a tracking-
              heavy editorial mark that competed with the actual chips
              for attention. Letting the chips speak for themselves. */}
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
                {lang === "ru" && preset.labelRu ? preset.labelRu : preset.label}
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
