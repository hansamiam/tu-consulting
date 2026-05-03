import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListChecks, FileText, BookOpen, FileSignature, Mail,
  Loader2, Check, Circle, AlertCircle, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Category = "documents" | "tests" | "essays" | "recommendations" | "portal" | "logistics";

export interface ChecklistItem {
  id: string;
  category: Category;
  title: string;
  detail?: string;
  critical?: boolean;
  est_minutes?: number;
}

const CATEGORY_META: Record<Category, { en: string; ru: string; Icon: typeof FileText }> = {
  documents:       { en: "Documents",       ru: "Документы",      Icon: FileText },
  tests:           { en: "Tests",           ru: "Тесты",          Icon: BookOpen },
  essays:          { en: "Essays",          ru: "Эссе",           Icon: FileSignature },
  recommendations: { en: "Recommendations", ru: "Рекомендации",   Icon: Mail },
  portal:          { en: "Portal actions",  ru: "Портал",         Icon: ListChecks },
  logistics:       { en: "Logistics",       ru: "Логистика",      Icon: ListChecks },
};

const lsKey = (scholarshipId: string) => `topuni-checklist-progress:${scholarshipId}`;

/**
 * <ScholarshipChecklist /> — calls generate-scholarship-checklist with a
 * scholarshipId, renders the resulting items grouped by category. Each
 * item has a checkbox; completion is mirrored locally in localStorage for
 * instant UX, then upserted into application_tracker.completed_checklist_ids
 * for authed users so progress survives a device switch.
 *
 * The checklist itself is universal (same items for every applicant) so
 * the cache lives server-side keyed only on scholarship_id. The user's
 * progress is per-user.
 */
export const ScholarshipChecklist = ({
  scholarshipId, language = "en",
}: {
  scholarshipId: string;
  language?: "en" | "ru";
}) => {
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const { user } = useAuth();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);

  // Load completion state from localStorage on mount; for authed users also
  // pull from application_tracker.completed_checklist_ids and merge.
  useEffect(() => {
    if (!scholarshipId) return;
    let cancelled = false;
    try {
      const raw = localStorage.getItem(lsKey(scholarshipId));
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }

    if (user?.id) {
      (async () => {
        const { data } = await supabase
          .from("application_tracker")
          .select("completed_checklist_ids")
          .eq("user_id", user.id)
          .eq("scholarship_id", scholarshipId)
          .maybeSingle();
        if (cancelled || !data?.completed_checklist_ids) return;
        // Merge server set with local set — defensive against an offline
        // user adding a check before the server pull lands.
        setCompleted(prev => {
          const merged = new Set(prev);
          for (const id of data.completed_checklist_ids as string[]) merged.add(id);
          return merged;
        });
      })();
    }
    return () => { cancelled = true; };
  }, [scholarshipId, user?.id]);

  // Fetch the checklist itself (cached server-side; first-view generates).
  useEffect(() => {
    if (!scholarshipId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<{
          items: ChecklistItem[]; _cached?: boolean; _generated_at?: string;
        }>("generate-scholarship-checklist", { body: { scholarshipId, language } });
        if (cancelled) return;
        if (error) throw new Error(error.message);
        if (!data?.items) throw new Error("Empty payload");
        setItems(data.items);
        setCached(!!data._cached);
        setGenerated(data._generated_at ?? null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scholarshipId, language]);

  // Persist completion changes — both localStorage (instant) and DB (debounced
  // upsert per-toggle is fine; the table is small and writes are tiny).
  const persistCompleted = (next: Set<string>) => {
    try {
      localStorage.setItem(lsKey(scholarshipId), JSON.stringify(Array.from(next)));
    } catch { /* ignore */ }
    if (user?.id) {
      // Fire-and-forget; the next mount will reconcile if this fails.
      void supabase
        .from("application_tracker")
        .upsert(
          {
            user_id: user.id,
            scholarship_id: scholarshipId,
            completed_checklist_ids: Array.from(next),
          },
          { onConflict: "user_id,scholarship_id" },
        );
    }
  };

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistCompleted(next);
      return next;
    });
  };

  // Group items by category for the section render.
  const grouped = useMemo(() => {
    const map: Record<Category, ChecklistItem[]> = {
      documents: [], tests: [], essays: [], recommendations: [], portal: [], logistics: [],
    };
    for (const it of items) map[it.category].push(it);
    return map;
  }, [items]);

  const total = items.length;
  const done = items.filter(it => completed.has(it.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("Building your application checklist…", "Готовим чек-лист для заявки…")}
          </p>
        </div>
        <div className="space-y-2 mt-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-3 rounded bg-muted/50 animate-pulse" style={{ width: `${100 - i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    // Soft-fail — checklist is enrichment, not a blocking surface.
    return null;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("Application checklist", "Чек-лист заявки")}
        </p>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          <span className={`font-bold ${done === total ? "text-success" : "text-foreground"}`}>{done}</span>
          {" "}/{" "}{total} {t("done", "готово")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-gradient-to-r from-gold-dark to-gold"
        />
      </div>

      <div className="space-y-4">
        {(Object.keys(grouped) as Category[]).map(cat => {
          const groupItems = grouped[cat];
          if (groupItems.length === 0) return null;
          const meta = CATEGORY_META[cat];
          const groupDone = groupItems.filter(it => completed.has(it.id)).length;
          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <meta.Icon className="w-3 h-3 text-gold-dark" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/85">
                  {meta[language]}
                </p>
                <span className="text-[10px] tabular-nums text-muted-foreground/60 ml-auto">
                  {groupDone}/{groupItems.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {groupItems.map(it => {
                  const isDone = completed.has(it.id);
                  return (
                    <li key={it.id}>
                      <label className="group flex items-start gap-2.5 px-2.5 py-2 -mx-2.5 rounded-md cursor-pointer hover:bg-muted/40 transition-colors">
                        <button
                          type="button"
                          onClick={() => toggle(it.id)}
                          className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isDone
                              ? "bg-gold-dark border-gold-dark"
                              : "border-foreground/25 group-hover:border-foreground/50"
                          }`}
                          aria-label={isDone ? t("Mark incomplete", "Отметить как незавершённое") : t("Mark complete", "Отметить как готовое")}
                        >
                          {isDone ? <Check className="w-3 h-3 text-white" /> : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className={`text-[13px] leading-snug transition-colors ${isDone ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}>
                              {it.title}
                            </span>
                            {it.critical && !isDone && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-destructive">
                                <AlertCircle className="w-2.5 h-2.5" />
                                {t("required", "обязательно")}
                              </span>
                            )}
                            {typeof it.est_minutes === "number" && !isDone && (
                              <span className="text-[10px] tabular-nums text-muted-foreground/70">
                                ~{it.est_minutes}m
                              </span>
                            )}
                          </div>
                          {it.detail && !isDone && (
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{it.detail}</p>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {generated && (
        <p className="text-[10px] text-muted-foreground/60 mt-4 text-right">
          {cached ? t("Cached", "Кэш") : t("Generated", "Создано")}
          {" · "}
          {new Date(generated).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );
};
