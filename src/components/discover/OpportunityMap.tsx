import { useMemo } from "react";
import { motion } from "framer-motion";
import { Compass, Award, Globe2, Calendar } from "lucide-react";

/* OpportunityMap — abundance-oriented metric strip rendered above the
   Discover card grid. The frame the student sees first should be
   "the world is open to you," not "rank yourself against the database."
   Four computed counts:
     · Opportunities to explore (universe size)
     · Fully funded (coverage_type === "full_ride")
     · Destination countries (unique host_country values)
     · Open deadlines (rolling or > today)

   Numbers come from the full scored/filtered list, with a quiet
   "in your view" badge when filters are tighter than the universe. */

type Row = {
  scholarship_id: string;
  host_country: string | null;
  coverage_type: string;
  application_deadline: string | null;
};

export const OpportunityMap = ({
  total, filtered, isRu, hasActiveFilters,
}: {
  /** All scored opportunities for the profile (universe of options). */
  total: Row[];
  /** Same set after the user's filters apply. */
  filtered: Row[];
  isRu?: boolean;
  hasActiveFilters?: boolean;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const stats = useMemo(() => {
    const source = hasActiveFilters && filtered.length > 0 ? filtered : total;
    const fullyFunded = source.filter(s => s.coverage_type === "full_ride").length;
    const countries = new Set(source.map(s => s.host_country).filter(Boolean)).size;
    const now = Date.now();
    const openDeadlines = source.filter(s => {
      if (!s.application_deadline) return true; // rolling = always open
      const t = new Date(s.application_deadline).getTime();
      return !Number.isNaN(t) && t > now;
    }).length;
    return {
      total: source.length,
      fullyFunded,
      countries,
      openDeadlines,
    };
  }, [total, filtered, hasActiveFilters]);

  const tiles: Array<{ Icon: typeof Compass; label: string; value: number; sub?: string }> = [
    {
      Icon: Compass,
      label: t("Opportunities to explore", "Возможностей для изучения"),
      value: stats.total,
      sub: hasActiveFilters && filtered.length !== total.length
        ? t(`of ${total.length} for your profile`, `из ${total.length} под ваш профиль`)
        : t("matched to your profile", "под ваш профиль"),
    },
    {
      Icon: Award,
      label: t("Fully funded", "Полное финансирование"),
      value: stats.fullyFunded,
      sub: t("tuition + living", "обучение + проживание"),
    },
    {
      Icon: Globe2,
      label: t("Destination countries", "Стран-направлений"),
      value: stats.countries,
      sub: t("around the world", "по всему миру"),
    },
    {
      Icon: Calendar,
      label: t("Open deadlines", "Открытых дедлайнов"),
      value: stats.openDeadlines,
      sub: t("ready to apply now", "можно подать сейчас"),
    },
  ];

  return (
    <div className="bg-canvas-soft/40 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3.5"
          >
            <div className="h-10 w-10 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
              <tile.Icon className="h-4 w-4 text-gold-dark" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading font-bold tabular-nums text-foreground text-2xl leading-none tracking-[-0.02em]">
                  {tile.value}
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/85 mt-1.5 leading-tight truncate">
                {tile.label}
              </p>
              {tile.sub && (
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{tile.sub}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
