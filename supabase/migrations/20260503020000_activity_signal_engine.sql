-- =============================================================================
-- Activity & Signal Engine — the data moat foundation
-- =============================================================================
-- Every meaningful interaction (view, save, dismiss, click, share) becomes
-- a row in scholarship_events. A nightly aggregate refresh denormalizes
-- the counts onto scholarship_stats so listing queries don't have to
-- JOIN+GROUP BY on a fast-growing event log.
--
-- This is the spine for:
--   • Social-proof badges on cards ("47 tracking")
--   • Trending This Week surfaces
--   • Quality detection (high view → low save = likely bad fit)
--   • Future: collaborative-filter boost in match-scholarships
--
-- Privacy posture: anon visitors are tracked by a stable localStorage UUID
-- (anonymous_id). We do not store IP addresses or fingerprints. Authed
-- users are tracked by user_id; anon and authed events are aggregated
-- together for stats but never joined to identifiable PII.
-- =============================================================================

-- ─── Append-only event log ───────────────────────────────────────────────
-- Lots of writes, very few updates (none, ideally). We optimize for fast
-- INSERT and the daily aggregate scan; per-row reads are uncommon.
CREATE TABLE IF NOT EXISTS public.scholarship_events (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id  uuid NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  -- Authed user (nullable — anon traffic is the majority pre-PMF)
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Anon stable id from localStorage; we accept arbitrary text but expect a UUID
  anonymous_id    text,
  event_type      text NOT NULL CHECK (event_type IN ('viewed','saved','unsaved','dismissed','clicked','shared','applied')),
  -- Optional context payload — surface that triggered the event ('detail', 'card', 'match', 'pipeline')
  source          text,
  -- Free-form extra context (search query, filter state, anything debugging-relevant)
  context         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- The two indexes that matter:
--   1. By scholarship + day → powers the daily aggregate refresh
--   2. By user/anon → powers "what have I tracked" personalization
CREATE INDEX IF NOT EXISTS idx_events_scholarship_day
  ON public.scholarship_events (scholarship_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_anon_recent
  ON public.scholarship_events (anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_user_recent
  ON public.scholarship_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ─── Denormalized stats per scholarship ──────────────────────────────────
-- Refreshed by refresh_scholarship_stats() (daily cron + on demand).
-- We DO NOT denormalize on every event write — too hot. Instead, aggregate
-- once per day, accept eventual consistency for the social-proof numbers.
CREATE TABLE IF NOT EXISTS public.scholarship_stats (
  scholarship_id   uuid PRIMARY KEY REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  view_count_7d    int NOT NULL DEFAULT 0,
  view_count_30d   int NOT NULL DEFAULT 0,
  view_count_total int NOT NULL DEFAULT 0,
  save_count_7d    int NOT NULL DEFAULT 0,
  save_count_30d   int NOT NULL DEFAULT 0,
  save_count_total int NOT NULL DEFAULT 0,
  share_count_total int NOT NULL DEFAULT 0,
  -- Trending score: recency-weighted velocity (saves heavier than views).
  -- Higher = more momentum. Used to sort the Trending This Week surface.
  trending_score   numeric(8,3) NOT NULL DEFAULT 0,
  last_refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stats_trending
  ON public.scholarship_stats (trending_score DESC)
  WHERE trending_score > 0;

-- ─── Fire-and-forget tracker RPC ─────────────────────────────────────────
-- Frontend calls this directly via supabase.rpc(). SECURITY DEFINER so
-- anon callers can write to scholarship_events (which has tight RLS).
-- Returns void — we don't care about the result, this is best-effort.
CREATE OR REPLACE FUNCTION public.track_scholarship_event(
  p_scholarship_id uuid,
  p_event_type     text,
  p_anonymous_id   text DEFAULT NULL,
  p_source         text DEFAULT NULL,
  p_context        jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sanity: drop the event if scholarship doesn't exist (don't error)
  IF NOT EXISTS (SELECT 1 FROM public.scholarships WHERE scholarship_id = p_scholarship_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.scholarship_events
    (scholarship_id, user_id, anonymous_id, event_type, source, context)
  VALUES
    (p_scholarship_id, auth.uid(), p_anonymous_id, p_event_type, p_source, p_context);
END;
$$;

-- ─── Aggregate refresh function ──────────────────────────────────────────
-- Re-computes scholarship_stats from scholarship_events. Designed to run
-- via pg_cron daily; safe to run on demand from /admin too.
CREATE OR REPLACE FUNCTION public.refresh_scholarship_stats()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Compute fresh aggregates and upsert in one pass
  WITH agg AS (
    SELECT
      s.scholarship_id,
      COUNT(*) FILTER (WHERE e.event_type = 'viewed' AND e.created_at >= now() - interval '7 days')   AS view_count_7d,
      COUNT(*) FILTER (WHERE e.event_type = 'viewed' AND e.created_at >= now() - interval '30 days')  AS view_count_30d,
      COUNT(*) FILTER (WHERE e.event_type = 'viewed')                                                  AS view_count_total,
      COUNT(*) FILTER (WHERE e.event_type = 'saved'  AND e.created_at >= now() - interval '7 days')   AS save_count_7d,
      COUNT(*) FILTER (WHERE e.event_type = 'saved'  AND e.created_at >= now() - interval '30 days')  AS save_count_30d,
      COUNT(*) FILTER (WHERE e.event_type = 'saved')                                                   AS save_count_total,
      COUNT(*) FILTER (WHERE e.event_type = 'shared')                                                  AS share_count_total
    FROM public.scholarships s
    LEFT JOIN public.scholarship_events e ON e.scholarship_id = s.scholarship_id
    GROUP BY s.scholarship_id
  )
  INSERT INTO public.scholarship_stats AS ss (
    scholarship_id, view_count_7d, view_count_30d, view_count_total,
    save_count_7d, save_count_30d, save_count_total, share_count_total,
    trending_score, last_refreshed_at
  )
  SELECT
    a.scholarship_id, a.view_count_7d, a.view_count_30d, a.view_count_total,
    a.save_count_7d, a.save_count_30d, a.save_count_total, a.share_count_total,
    -- Trending = saves(7d) * 5 + views(7d) * 1 + shares(total) * 3
    -- Saves are the strongest signal of intent; shares are virality.
    -- 7-day windows give the chart freshness over historical winners.
    (a.save_count_7d * 5.0 + a.view_count_7d * 1.0 + a.share_count_total * 3.0)::numeric(8,3) AS trending_score,
    now()
  FROM agg a
  ON CONFLICT (scholarship_id) DO UPDATE SET
    view_count_7d     = EXCLUDED.view_count_7d,
    view_count_30d    = EXCLUDED.view_count_30d,
    view_count_total  = EXCLUDED.view_count_total,
    save_count_7d     = EXCLUDED.save_count_7d,
    save_count_30d    = EXCLUDED.save_count_30d,
    save_count_total  = EXCLUDED.save_count_total,
    share_count_total = EXCLUDED.share_count_total,
    trending_score    = EXCLUDED.trending_score,
    last_refreshed_at = EXCLUDED.last_refreshed_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─── Auto-bump scholarship_stats on save (so social proof is near-realtime) ──
-- Saves are the highest-intent event; we don't want to wait until tomorrow's
-- cron to show "47 tracking → 48 tracking". This trigger keeps save_count_*
-- fresh on every application_tracker.shortlisted=true insert/update.
CREATE OR REPLACE FUNCTION public.bump_save_count_on_tracker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only count rows where shortlisted=true; un-shortlisting doesn't decrement
  -- (we keep the historical signal).
  IF NEW.shortlisted = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND COALESCE(OLD.shortlisted, false) = false)) THEN
    INSERT INTO public.scholarship_stats (scholarship_id, save_count_7d, save_count_30d, save_count_total, last_refreshed_at)
    VALUES (NEW.scholarship_id, 1, 1, 1, now())
    ON CONFLICT (scholarship_id) DO UPDATE SET
      save_count_7d    = public.scholarship_stats.save_count_7d + 1,
      save_count_30d   = public.scholarship_stats.save_count_30d + 1,
      save_count_total = public.scholarship_stats.save_count_total + 1,
      last_refreshed_at = now();

    -- Also drop a 'saved' event into the log (fire-and-forget; same
    -- canonical source of truth as the explicit RPC).
    INSERT INTO public.scholarship_events (scholarship_id, user_id, event_type, source)
    VALUES (NEW.scholarship_id, NEW.user_id, 'saved', 'tracker');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracker_bump_saves ON public.application_tracker;
CREATE TRIGGER trg_tracker_bump_saves
  AFTER INSERT OR UPDATE OF shortlisted ON public.application_tracker
  FOR EACH ROW EXECUTE FUNCTION public.bump_save_count_on_tracker();

-- ─── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.scholarship_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_stats  ENABLE ROW LEVEL SECURITY;

-- Events: no direct INSERT from client — only via track_scholarship_event RPC.
-- Authed users may read their own events (for "you tracked this 3 days ago"
-- replay if we want it later). Admins read everything.
DROP POLICY IF EXISTS "user_reads_own_events" ON public.scholarship_events;
CREATE POLICY "user_reads_own_events"
  ON public.scholarship_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_reads_all_events" ON public.scholarship_events;
CREATE POLICY "admin_reads_all_events"
  ON public.scholarship_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Stats: public read so anon visitors see "X tracking" badges.
-- No client writes — only the trigger + cron + admin via service role.
DROP POLICY IF EXISTS "public_reads_stats" ON public.scholarship_stats;
CREATE POLICY "public_reads_stats"
  ON public.scholarship_stats FOR SELECT TO anon, authenticated
  USING (true);

GRANT EXECUTE ON FUNCTION public.track_scholarship_event(uuid, text, text, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_scholarship_stats() TO service_role;
GRANT SELECT ON public.scholarship_stats TO anon, authenticated;
GRANT ALL ON public.scholarship_events, public.scholarship_stats TO service_role;

-- ─── Bootstrap: seed the stats table with zeros so reads JOIN cleanly ────
INSERT INTO public.scholarship_stats (scholarship_id)
SELECT scholarship_id FROM public.scholarships
ON CONFLICT (scholarship_id) DO NOTHING;
