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

/* DB row shape — mirror of application_tracker columns we care about */
interface DbRow {
  scholarship_id: string;
  status: AppStatus | null;
  notes: string | null;
  shortlisted: boolean;
  hidden: boolean;
}

function entryFromDb(r: DbRow): TrackerEntry {
  return { status: r.status, notes: r.notes, shortlisted: r.shortlisted, hidden: r.hidden };
}

function entryIsEmpty(e: TrackerEntry): boolean {
  return !e.status && !e.notes && !e.shortlisted && !e.hidden;
}

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
  // Mutators
  setStatus: (id: string, status: AppStatus | null) => void;
  setNote: (id: string, note: string) => void;
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
      const { data, error } = await supabase
        .from("application_tracker")
        .select("scholarship_id, status, notes, shortlisted, hidden")
        .eq("user_id", user.id)
        .returns<DbRow[]>();
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
      const rows = Array.from(pending.entries()).map(([scholarship_id, e]) => ({
        user_id: user.id,
        scholarship_id,
        status: e.status ?? null,
        notes: e.notes ?? null,
        shortlisted: !!e.shortlisted,
        hidden: !!e.hidden,
      }));
      pendingRef.current = new Map();
      setIsSyncing(true);
      const { error } = await supabase
        .from("application_tracker")
        .upsert(rows, { onConflict: "user_id,scholarship_id" });
      setIsSyncing(false);
      if (error) {
        console.warn("[application_tracker] flush failed; will retry on next change", error.message);
        // Restore the rows back into pending so they retry on next mutation
        for (const r of rows) {
          pendingRef.current.set(r.scholarship_id, {
            status: r.status as AppStatus | null,
            notes: r.notes,
            shortlisted: r.shortlisted,
            hidden: r.hidden,
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
      const nextEntry: TrackerEntry = {
        status: patch.status ?? cur.status ?? null,
        notes: "notes" in patch ? patch.notes : cur.notes ?? null,
        shortlisted: "shortlisted" in patch ? !!patch.shortlisted : !!cur.shortlisted,
        hidden: "hidden" in patch ? !!patch.hidden : !!cur.hidden,
      };
      const nextMap = new Map(prev.byScholarship);
      if (entryIsEmpty(nextEntry)) {
        nextMap.delete(id);
        // Mark as null-out for DB
        pendingRef.current.set(id, { status: null, notes: null, shortlisted: false, hidden: false });
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

  return {
    state,
    status,
    notes,
    shortlist: state.shortlist,
    hidden: state.hidden,
    statusMap,
    notesMap,
    setStatus,
    setNote,
    toggleShortlist,
    toggleHidden,
    isSyncing,
    lastSyncedAt,
    isAuthed,
  };
}
