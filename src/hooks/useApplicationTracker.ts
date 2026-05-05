/**
 * useApplicationTracker
 *
 * Offline-first hook for the user's application tracker state —
 * status, notes, shortlist, hidden — across both anon (localStorage)
 * and authed (Postgres) users. Replaces the four separate localStorage
 * blobs `topuni-app-status`, `topuni-app-notes`, `topuni-shortlist`,
 * `topuni-hidden`.
 *
 * Behaviour:
 *  - Anon user: state lives in localStorage. Reads/writes are synchronous
 *    via React state + a localStorage mirror. Never touches the network.
 *  - Authed user: same localStorage mirror, plus a debounced upsert to
 *    `application_tracker` on each change. On mount we pull the user's
 *    rows once and merge — DB wins for fields it has, localStorage fills
 *    in unsync'd state from when the user was anon.
 *
 * Why mirror localStorage even when authed: zero-latency UI updates,
 * survives a page refresh before the DB upsert completes, lets a logged-
 * in user lose their connection mid-edit without losing work.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppStatus =
  | "researching"
  | "drafting"
  | "submitted"
  | "decision"
  | "rejected"
  | "accepted";

export interface TrackerEntry {
  status?: AppStatus | null;
  notes?: string | null;
  shortlisted?: boolean;
  hidden?: boolean;
  /** Captured when status='accepted' so we can show personal "stack won
   * so far" + aggregate "$X won by TopUni members" on marketing pages. */
  awardedAmountUsd?: number | null;
}

interface State {
  byScholarship: Map<string, TrackerEntry>;
  // Convenience derived sets — kept in sync with byScholarship for O(1) reads
  shortlist: Set<string>;
  hidden: Set<string>;
}

// Single localStorage key (was four). Stored as a JSON object.
const LS_KEY = "topuni-app-tracker-v2";

const emptyState = (): State => ({
  byScholarship: new Map(),
  shortlist: new Set(),
  hidden: new Set(),
});

function loadFromLocalStorage(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return loadAndMigrateLegacy();
    const parsed = JSON.parse(raw) as Record<string, TrackerEntry>;
    return rehydrate(parsed);
  } catch {
    return emptyState();
  }
}

/** One-time migration of the old 4-key shape into the new single blob.
 *  Reads both the `tu_*` family currently used by Discover.tsx AND the
 *  hypothetical `topuni-app-*` family in case any other surface used it. */
function loadAndMigrateLegacy(): State {
  try {
    const status = {
      ...JSON.parse(localStorage.getItem("tu_status_map") || "{}") as Record<string, AppStatus>,
      ...JSON.parse(localStorage.getItem("topuni-app-status") || "{}") as Record<string, AppStatus>,
    };
    const notes = {
      ...JSON.parse(localStorage.getItem("tu_notes_map") || "{}") as Record<string, string>,
      ...JSON.parse(localStorage.getItem("topuni-app-notes") || "{}") as Record<string, string>,
    };
    const shortlist = [
      ...JSON.parse(localStorage.getItem("tu_shortlist") || "[]") as string[],
      ...JSON.parse(localStorage.getItem("topuni-shortlist") || "[]") as string[],
    ];
    const hidden = [
      ...JSON.parse(localStorage.getItem("tu_hidden") || "[]") as string[],
      ...JSON.parse(localStorage.getItem("topuni-hidden") || "[]") as string[],
    ];
    const byScholarship: Record<string, TrackerEntry> = {};
    const ids = new Set<string>([
      ...Object.keys(status),
      ...Object.keys(notes),
      ...shortlist,
      ...hidden,
    ]);
    for (const id of ids) {
      byScholarship[id] = {
        status: status[id] ?? null,
        notes: notes[id] ?? null,
        shortlisted: shortlist.includes(id),
        hidden: hidden.includes(id),
        awardedAmountUsd: null,
      };
    }
    if (Object.keys(byScholarship).length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(byScholarship));
    }
    return rehydrate(byScholarship);
  } catch {
    return emptyState();
  }
}

function rehydrate(obj: Record<string, TrackerEntry>): State {
  const byScholarship = new Map<string, TrackerEntry>();
  const shortlist = new Set<string>();
  const hidden = new Set<string>();
  for (const [id, e] of Object.entries(obj)) {
    byScholarship.set(id, e);
    if (e.shortlisted) shortlist.add(id);
    if (e.hidden) hidden.add(id);
  }
  return { byScholarship, shortlist, hidden };
}

function saveToLocalStorage(state: State) {
  try {
    const obj: Record<string, TrackerEntry> = {};
    for (const [id, e] of state.byScholarship) obj[id] = e;
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
}

/* DB row shape — mirror of application_tracker columns we care about.
 * `awarded_amount_usd` is conditionally added once the schema supports
 * it (see hasAwardCol below); old deployments without the column return
 * the row without that key. */
interface DbRow {
  scholarship_id: string;
  status: AppStatus | null;
  notes: string | null;
  shortlisted: boolean;
  hidden: boolean;
  awarded_amount_usd?: number | null;
}

function entryFromDb(r: DbRow): TrackerEntry {
  return {
    status: r.status,
    notes: r.notes,
    shortlisted: r.shortlisted,
    hidden: r.hidden,
    awardedAmountUsd: r.awarded_amount_usd ?? null,
  };
}

function entryIsEmpty(e: TrackerEntry): boolean {
  return !e.status && !e.notes && !e.shortlisted && !e.hidden && !e.awardedAmountUsd;
}

/** Schema-feature flag: true once we've confirmed the
 * `awarded_amount_usd` column exists. Starts undefined, set to
 * true/false after the first SELECT. While false, the hook keeps
 * award amounts in localStorage only — stats work locally; cross-
 * device sync resumes once the migration lands and the next reload
 * succeeds with the column. */
let hasAwardCol: boolean | undefined;

export interface ApplicationTrackerApi {
  state: State;
  // Map-style getters
  status: Map<string, AppStatus>;
  notes: Map<string, string>;
  shortlist: Set<string>;
  hidden: Set<string>;
  // Record views — backwards compat with existing Discover.tsx call
  // sites that read `statusMap[id]` and `notesMap[id]`.
  statusMap: Record<string, AppStatus>;
  notesMap: Record<string, string>;
  awardedMap: Record<string, number>;
  // Mutators
  setStatus: (id: string, status: AppStatus | null) => void;
  setNote: (id: string, note: string) => void;
  setAwardedAmount: (id: string, amountUsd: number | null) => void;
  toggleShortlist: (id: string) => void;
  toggleHidden: (id: string) => void;
  // Sync state
  isSyncing: boolean;
  lastSyncedAt: number | null;
  isAuthed: boolean;
}

export function useApplicationTracker(): ApplicationTrackerApi {
  const { user } = useAuth();
  const isAuthed = !!user?.id;
  const [state, setState] = useState<State>(() => loadFromLocalStorage());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  // Pending DB upserts — debounced flush
  const pendingRef = useRef<Map<string, TrackerEntry>>(new Map());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* On auth change: pull DB rows and merge with local. DB wins for the
     intersection (it's the source of truth across devices); local
     fills in entries the DB doesn't yet have (e.g. anon-era state). */
  useEffect(() => {
    if (!isAuthed || !user?.id) return;
    let cancelled = false;
    setIsSyncing(true);
    (async () => {
      // Try with the new column first; if PostgREST reports the column
      // is missing (pre-migration deployments), fall back to the legacy
      // shape. `hasAwardCol` is cached for the rest of the session so
      // we don't pay this round-trip on every reload.
      let data: DbRow[] | null = null;
      let error: { message: string; code?: string } | null = null;
      if (hasAwardCol !== false) {
        const r = await supabase
          .from("application_tracker")
          .select("scholarship_id, status, notes, shortlisted, hidden, awarded_amount_usd")
          .eq("user_id", user.id)
          .returns<DbRow[]>();
        if (r.error && /awarded_amount_usd/i.test(r.error.message)) {
          hasAwardCol = false;
        } else {
          hasAwardCol = true;
          data = r.data;
          error = r.error;
        }
      }
      if (hasAwardCol === false) {
        const r = await supabase
          .from("application_tracker")
          .select("scholarship_id, status, notes, shortlisted, hidden")
          .eq("user_id", user.id)
          .returns<DbRow[]>();
        data = r.data;
        error = r.error;
      }
      if (cancelled) return;
      if (error) {
        console.warn("[application_tracker] pull failed", error.message);
        setIsSyncing(false);
        return;
      }
      // Merge: start with current local, overlay DB (DB wins for fields it has)
      setState((prev) => {
        const merged = new Map(prev.byScholarship);
        const localOnly: { id: string; e: TrackerEntry }[] = [];
        for (const r of data ?? []) {
          merged.set(r.scholarship_id, entryFromDb(r));
        }
        // Find local entries that aren't in the DB → push them up next flush
        for (const [id, e] of prev.byScholarship) {
          const inDb = (data ?? []).some((r) => r.scholarship_id === id);
          if (!inDb && !entryIsEmpty(e)) localOnly.push({ id, e });
        }
        for (const { id, e } of localOnly) pendingRef.current.set(id, e);
        const next = rehydrate(Object.fromEntries(merged));
        saveToLocalStorage(next);
        return next;
      });
      setLastSyncedAt(Date.now());
      setIsSyncing(false);
      if (pendingRef.current.size > 0) scheduleFlush();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, user?.id]);

  /* Debounced DB flush (authed users only). Coalesces rapid mutations
     into one upsert per scholarship. 600ms feels instant for the user
     while keeping the row-write rate reasonable. */
  const scheduleFlush = useCallback(() => {
    if (!isAuthed || !user?.id) return;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(async () => {
      flushTimer.current = null;
      const pending = pendingRef.current;
      if (pending.size === 0) return;
      // Build rows excluding awarded_amount_usd if the schema flag is
      // explicitly false (pre-migration). When the flag is true or
      // undecided we include it; on a column-missing error we flip
      // the flag and retry with the legacy shape.
      const buildRows = (includeAward: boolean) =>
        Array.from(pending.entries()).map(([scholarship_id, e]) => {
          const base = {
            user_id: user.id,
            scholarship_id,
            status: e.status ?? null,
            notes: e.notes ?? null,
            shortlisted: !!e.shortlisted,
            hidden: !!e.hidden,
          };
          return includeAward
            ? { ...base, awarded_amount_usd: e.awardedAmountUsd ?? null }
            : base;
        });
      pendingRef.current = new Map();
      setIsSyncing(true);
      let { error } = await supabase
        .from("application_tracker")
        .upsert(buildRows(hasAwardCol !== false), { onConflict: "user_id,scholarship_id" });
      if (error && /awarded_amount_usd/i.test(error.message)) {
        hasAwardCol = false;
        const retry = await supabase
          .from("application_tracker")
          .upsert(buildRows(false), { onConflict: "user_id,scholarship_id" });
        error = retry.error;
      }
      setIsSyncing(false);
      if (error) {
        console.warn("[application_tracker] flush failed; will retry on next change", error.message);
        // Restore the rows back into pending so they retry on next mutation.
        // Pull from the original pending map (we still have its entries via
        // the closure) so award amounts aren't lost on retry.
        for (const [scholarship_id, e] of pending) {
          pendingRef.current.set(scholarship_id, {
            status: e.status ?? null,
            notes: e.notes ?? null,
            shortlisted: !!e.shortlisted,
            hidden: !!e.hidden,
            awardedAmountUsd: e.awardedAmountUsd ?? null,
          });
        }
      } else {
        setLastSyncedAt(Date.now());
      }
    }, 600);
  }, [isAuthed, user?.id]);

  /* Apply a partial update to one scholarship's entry — local + queue DB */
  const updateEntry = useCallback((id: string, patch: TrackerEntry) => {
    setState((prev) => {
      const cur = prev.byScholarship.get(id) ?? {};
      // Status flipping away from 'accepted' should clear any previously
      // captured award amount — otherwise stale outcomes pollute stats.
      const nextStatus = "status" in patch ? patch.status : cur.status ?? null;
      const clearAward = nextStatus !== "accepted";
      const nextEntry: TrackerEntry = {
        status: nextStatus ?? null,
        notes: "notes" in patch ? patch.notes : cur.notes ?? null,
        shortlisted: "shortlisted" in patch ? !!patch.shortlisted : !!cur.shortlisted,
        hidden: "hidden" in patch ? !!patch.hidden : !!cur.hidden,
        awardedAmountUsd: clearAward
          ? null
          : "awardedAmountUsd" in patch
            ? patch.awardedAmountUsd ?? null
            : cur.awardedAmountUsd ?? null,
      };
      const nextMap = new Map(prev.byScholarship);
      if (entryIsEmpty(nextEntry)) {
        nextMap.delete(id);
        // Mark as null-out for DB
        pendingRef.current.set(id, { status: null, notes: null, shortlisted: false, hidden: false, awardedAmountUsd: null });
      } else {
        nextMap.set(id, nextEntry);
        pendingRef.current.set(id, nextEntry);
      }
      const next = rehydrate(Object.fromEntries(nextMap));
      saveToLocalStorage(next);
      return next;
    });
    scheduleFlush();
  }, [scheduleFlush]);

  const setStatus = useCallback((id: string, status: AppStatus | null) => updateEntry(id, { status }), [updateEntry]);
  const setNote = useCallback((id: string, note: string) => updateEntry(id, { notes: note }), [updateEntry]);
  const setAwardedAmount = useCallback((id: string, amountUsd: number | null) => updateEntry(id, { awardedAmountUsd: amountUsd }), [updateEntry]);
  const toggleShortlist = useCallback((id: string) => {
    setState((prev) => {
      const cur = prev.byScholarship.get(id);
      const next = !(cur?.shortlisted);
      // Defer to updateEntry path on next render via a microtask so we keep state coherent
      queueMicrotask(() => updateEntry(id, { shortlisted: next }));
      return prev;
    });
  }, [updateEntry]);
  const toggleHidden = useCallback((id: string) => {
    setState((prev) => {
      const cur = prev.byScholarship.get(id);
      const next = !(cur?.hidden);
      queueMicrotask(() => updateEntry(id, { hidden: next }));
      return prev;
    });
  }, [updateEntry]);

  /* Cleanup the debounce timer on unmount */
  useEffect(() => () => { if (flushTimer.current) clearTimeout(flushTimer.current); }, []);

  /* Convenience accessors used by old call sites (Discover.tsx) */
  const status = useMemo(() => {
    const m = new Map<string, AppStatus>();
    for (const [id, e] of state.byScholarship) if (e.status) m.set(id, e.status);
    return m;
  }, [state.byScholarship]);
  const notes = useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, e] of state.byScholarship) if (e.notes) m.set(id, e.notes);
    return m;
  }, [state.byScholarship]);

  /* Record views for legacy call sites */
  const statusMap = useMemo(() => {
    const r: Record<string, AppStatus> = {};
    for (const [id, e] of state.byScholarship) if (e.status) r[id] = e.status;
    return r;
  }, [state.byScholarship]);
  const notesMap = useMemo(() => {
    const r: Record<string, string> = {};
    for (const [id, e] of state.byScholarship) if (e.notes) r[id] = e.notes;
    return r;
  }, [state.byScholarship]);
  const awardedMap = useMemo(() => {
    const r: Record<string, number> = {};
    for (const [id, e] of state.byScholarship) if (e.awardedAmountUsd) r[id] = e.awardedAmountUsd;
    return r;
  }, [state.byScholarship]);

  return {
    state,
    status,
    notes,
    shortlist: state.shortlist,
    hidden: state.hidden,
    statusMap,
    notesMap,
    awardedMap,
    setStatus,
    setNote,
    setAwardedAmount,
    toggleShortlist,
    toggleHidden,
    isSyncing,
    lastSyncedAt,
    isAuthed,
  };
}
