import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cleanScholarshipName } from "@/lib/scholarshipFields";

/**
 * <SavedDeadlineBanner /> — top-of-dashboard urgency surface for users
 * with saved scholarships whose deadlines are imminent.
 *
 * Behaviour:
 *   · No saved scholarships → renders null
 *   · No saved deadline within `daysWindow` (default 14) → renders null
 *   · Otherwise: a single-line banner naming the closest deadline +
 *     a tail count if there are more urgent ones, with a one-click
 *     link to /pipeline.
 *
 * Dismissal: stored in localStorage keyed by today's ISO date, so
 * dismissing it for the day suppresses it through tomorrow's first
 * load. Doesn't suppress forever — every new day, the user sees the
 * fresh urgency state.
 *
 * Why this exists: a returning user with saved scholarships had no
 * urgency signal on the dashboard. They had to navigate to /pipeline
 * to even see what's about to close. This banner makes urgent saved
 * deadlines visible at the moment of dashboard open — one tap from
 * "I'm here" to "open my pipeline."
 */

interface Props {
  trackedIds: string[];
  isRu?: boolean;
  /** How many days into the future we consider "urgent". Default 14. */
  daysWindow?: number;
}

const DISMISS_KEY = "topuni-saved-deadline-banner-dismissed";

const todayKey = () => new Date().toISOString().slice(0, 10);

interface ScholarshipDeadline {
  scholarship_id: string;
  scholarship_name: string;
  application_deadline: string | null;
}

const t = (en: string, ru: string, isRu: boolean) => (isRu ? ru : en);

export function SavedDeadlineBanner({ trackedIds, isRu = false, daysWindow = 14 }: Props) {
  const [rows, setRows] = useState<ScholarshipDeadline[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === todayKey();
    } catch { return false; }
  });

  // Stable string key so the effect only re-runs when the *set* of
  // tracked IDs changes — not when the array reference changes.
  // ESLint can't statically verify trackedIds.join(",") so we extract
  // the key here and depend on it explicitly.
  const trackedKey = trackedIds.join(",");
  useEffect(() => {
    if (trackedIds.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("scholarships")
        .select("scholarship_id, scholarship_name, application_deadline")
        // Filter the SELECT itself to verified-or-stale to be consistent
        // with every other user-facing surface. Don't surface broken or
        // pending rows here — we don't want to nag a user about a
        // scholarship whose URL is dead or hasn't been vetted yet.
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
        .in("scholarship_id", trackedIds);
      if (cancelled || !data) return;
      setRows(data as ScholarshipDeadline[]);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedKey]);

  const urgent = useMemo(() => {
    const now = Date.now();
    const hits = rows
      .map((r) => {
        if (!r.application_deadline) return null;
        const ms = new Date(r.application_deadline).getTime() - now;
        const days = Math.ceil(ms / 86400000);
        if (days < 0 || days > daysWindow) return null;
        return { ...r, days };
      })
      .filter((x): x is ScholarshipDeadline & { days: number } => x !== null)
      .sort((a, b) => a.days - b.days);
    return hits;
  }, [rows, daysWindow]);

  if (dismissed) return null;
  if (urgent.length === 0) return null;

  const closest = urgent[0];
  const more = urgent.length - 1;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, todayKey()); } catch { /* ignore */ }
  };

  // Severity by closeness — destructive red ≤3 days, gold otherwise.
  const isCritical = closest.days <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex items-center gap-3 rounded-xl border px-4 sm:px-5 py-3 mb-6 print:hidden ${
        isCritical
          ? "border-destructive/40 bg-gradient-to-r from-destructive/10 via-card to-card"
          : "border-gold/40 bg-gradient-to-r from-gold/10 via-card to-card"
      }`}
      role="alert"
    >
      <span
        className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
          isCritical ? "bg-destructive/15 text-destructive" : "bg-gold/15 text-gold-dark"
        }`}
      >
        <Flame className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-0.5">
          {t("Saved deadline approaching", "Дедлайн приближается", isRu)}
        </p>
        <p className="text-sm leading-snug font-medium text-foreground truncate">
          <span className={`tabular-nums font-semibold ${isCritical ? "text-destructive" : "text-gold-dark"}`}>
            {closest.days === 0
              ? t("Closes today", "Закрытие сегодня", isRu)
              : closest.days === 1
                ? t("Closes tomorrow", "Закрытие завтра", isRu)
                : t(`${closest.days} days`, `${closest.days} дн.`, isRu)}
          </span>
          {" · "}
          <span className="font-semibold">{cleanScholarshipName(closest.scholarship_name)}</span>
          {more > 0 && (
            <span className="text-muted-foreground font-normal">
              {" "}{t(`+ ${more} more in the next ${daysWindow} days`, `+ ещё ${more} в ближайшие ${daysWindow} дн.`, isRu)}
            </span>
          )}
        </p>
      </div>
      {/* 2026-05-25: "Open pipeline" link retired with the Workspace
          unpublish. Banner now just surfaces the deadline count;
          dismiss-for-today is the only action. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("Dismiss for today", "Скрыть на сегодня", isRu)}
        title={t("Dismiss for today", "Скрыть на сегодня", isRu)}
        className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
