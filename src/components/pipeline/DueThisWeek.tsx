import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Check, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ChecklistItem } from "./ScholarshipChecklist";

/**
 * <DueThisWeek /> — top-of-Pipeline aggregate that surfaces concrete
 * weekly actions across ALL the user's tracked scholarships, not just
 * the one they happen to be looking at. Pulls each tracked scholarship's
 * cached checklist (server-side cache hit, no LLM cost) + the user's
 * completion state, then renders the top 6 unchecked critical items
 * sorted by deadline urgency × work-remaining.
 *
 * Renders nothing if the user isn't authed (no DB rows to read), if they
 * have no tracked scholarships with deadlines in the next 60 days, or if
 * every critical item is already checked off.
 */

interface ScholarshipMeta {
  scholarship_id: string;
  scholarship_name: string;
  application_deadline: string | null;
  host_country: string | null;
}

interface AggregatedItem {
  scholarship: ScholarshipMeta;
  daysUntilDeadline: number | null;
  item: ChecklistItem;
  /** Composite urgency score for sorting. */
  score: number;
}

const lsCompletedKey = (scholarshipId: string) => `topuni-checklist-progress:${scholarshipId}`;

function readLocalCompleted(scholarshipId: string): Set<string> {
  try {
    const raw = localStorage.getItem(lsCompletedKey(scholarshipId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

export const DueThisWeek = ({
  trackedScholarships, language = "en", onSelectScholarship,
}: {
  trackedScholarships: ScholarshipMeta[];
  language?: "en" | "ru";
  /** Click handler for the "open this scholarship's detail" affordance. */
  onSelectScholarship?: (scholarshipId: string) => void;
}) => {
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const { user } = useAuth();

  const [aggregated, setAggregated] = useState<AggregatedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Filter to scholarships with upcoming deadlines (next 60 days). The "this
  // week" header is about momentum — even items 30-60 days out get
  // surfaced if they have heavy unchecked critical work.
  const urgentScholarships = useMemo(() => {
    const now = Date.now();
    return trackedScholarships
      .map(s => {
        if (!s.application_deadline) return { s, days: null };
        const days = Math.ceil((new Date(s.application_deadline).getTime() - now) / 86400_000);
        return { s, days };
      })
      .filter(({ days }) => days === null || (days > 0 && days <= 60))
      .sort((a, b) => {
        if (a.days === null) return 1;
        if (b.days === null) return -1;
        return a.days - b.days;
      })
      .slice(0, 12); // cap fetch fan-out
  }, [trackedScholarships]);

  useEffect(() => {
    if (urgentScholarships.length === 0) {
      setAggregated([]);
      setHasFetched(true);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Pull cached checklists in parallel — server-side cache means hits
      // are fast and identical across users.
      const checklistResults = await Promise.all(
        urgentScholarships.map(async ({ s, days }) => {
          try {
            const { data } = await supabase.functions.invoke<{ items: ChecklistItem[] }>(
              "generate-scholarship-checklist",
              { body: { scholarshipId: s.scholarship_id, language } },
            );
            return { s, days, items: data?.items ?? [] };
          } catch {
            return { s, days, items: [] };
          }
        }),
      );

      // Merge in completion state — for authed users prefer the DB row;
      // anon users use localStorage only.
      let serverCompleted = new Map<string, Set<string>>();
      if (user?.id) {
        const ids = urgentScholarships.map(({ s }) => s.scholarship_id);
        const { data } = await supabase
          .from("application_tracker")
          .select("scholarship_id, completed_checklist_ids")
          .eq("user_id", user.id)
          .in("scholarship_id", ids);
        if (Array.isArray(data)) {
          for (const row of data) {
            serverCompleted.set(
              row.scholarship_id,
              new Set((row.completed_checklist_ids as string[]) ?? []),
            );
          }
        }
      }

      // Aggregate every UNCHECKED CRITICAL item, weighted by deadline.
      const list: AggregatedItem[] = [];
      for (const { s, days, items } of checklistResults) {
        const completed = new Set([
          ...readLocalCompleted(s.scholarship_id),
          ...(serverCompleted.get(s.scholarship_id) ?? []),
        ]);
        for (const item of items) {
          if (completed.has(item.id)) continue;
          if (!item.critical) continue; // surface only blocking items
          // Score: closer deadline = higher score; null deadline = floor of 0.
          const urgency = days === null ? 0.1 : Math.max(0, 1 - days / 60);
          // Bias toward items that take real effort (so we don't spam "click submit" type items)
          const effortBoost = item.est_minutes ? Math.min(0.3, item.est_minutes / 240) : 0;
          list.push({
            scholarship: s,
            daysUntilDeadline: days ?? null,
            item,
            score: urgency + effortBoost,
          });
        }
      }
      list.sort((a, b) => b.score - a.score);
      if (!cancelled) {
        setAggregated(list.slice(0, 6));
        setLoading(false);
        setHasFetched(true);
      }
    })();

    return () => { cancelled = true; };
  }, [urgentScholarships.map(x => x.s.scholarship_id).join(","), language, user?.id]);

  if (!hasFetched && loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-dark" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
            {t("Pulling your due-this-week list…", "Собираем список на эту неделю…")}
          </p>
        </div>
      </div>
    );
  }

  if (!hasFetched || aggregated.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-card to-card overflow-hidden mb-8"
    >
      <div className="px-5 sm:px-7 pt-5 pb-3 border-b border-border/60 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5 text-gold-dark" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-0.5">
              {t("Due this week", "На этой неделе")}
            </p>
            <h3 className="font-heading text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
              {aggregated.length} {t("blocking items across your applications", "обязательных пунктов по заявкам")}
            </h3>
          </div>
        </div>
      </div>

      <ol className="divide-y divide-border/60">
        {aggregated.map((entry, i) => (
          <motion.li
            key={`${entry.scholarship.scholarship_id}:${entry.item.id}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.04 * i }}
            className="px-5 sm:px-7 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => onSelectScholarship?.(entry.scholarship.scholarship_id)}
          >
            <span className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-destructive" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] text-foreground leading-snug font-medium">{entry.item.title}</p>
              {entry.item.detail && (
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{entry.item.detail}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                <span className="text-foreground/65 truncate">
                  {entry.scholarship.scholarship_name}
                </span>
                {entry.daysUntilDeadline !== null && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className={`tabular-nums font-semibold ${
                      entry.daysUntilDeadline <= 7 ? "text-destructive"
                      : entry.daysUntilDeadline <= 30 ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                    }`}>
                      {entry.daysUntilDeadline} {t("days left", "дн. осталось")}
                    </span>
                  </>
                )}
                {entry.item.est_minutes && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground tabular-nums">~{entry.item.est_minutes}m</span>
                  </>
                )}
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1" />
          </motion.li>
        ))}
      </ol>

      <div className="px-5 sm:px-7 py-2.5 bg-muted/20 border-t border-border/40 text-[10px] text-muted-foreground">
        {t("Sorted by deadline urgency. Click any item to open the full checklist.",
           "Сортировка по срочности дедлайна. Нажмите на пункт чтобы открыть полный чек-лист.")}
      </div>
    </motion.div>
  );
};
