-- =============================================================================
-- Schedule pg_cron job for refresh_scholarship_stats
-- =============================================================================
-- The activity_signal_engine (20260503020000) defined refresh_scholarship_stats()
-- and a comment that said "designed to run via pg_cron daily" — but never
-- actually scheduled it. The result: save_count_30d grew monotonically
-- because the shortlist trigger ONLY increments (never ages out old
-- saves). After 90 days, the "30-day" save count is effectively a
-- "90-day" save count.
--
-- view_count_* and trending_score are even worse: nothing increments them
-- without the refresh, so they sit at 0 until something runs the
-- aggregate. This was invisible until 20260508010000 wired
-- save_count_30d into the match_scholarships RPC's engagement_boost —
-- now stale numbers actively warp ranking.
--
-- Schedule: daily at 03:30 UTC, between the lifecycle cron at 03:00 and
-- the verify cron at 05:00. Re-aggregating against the current event log
-- is cheap (one full scan of scholarship_events with a hash aggregate);
-- on a healthy 10K-event log this takes <1s.
--
-- Direct SQL call — no HTTP — so this works whether or not the
-- app.cron_token GUC is set.
-- =============================================================================

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('refresh-scholarship-stats'); EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'refresh-scholarship-stats',
  '30 3 * * *',
  $$ SELECT public.refresh_scholarship_stats(); $$
);

-- Run once now so the table has fresh aggregates immediately rather than
-- waiting for the first cron tick. Especially important since the
-- engagement_boost in match_scholarships starts reading these numbers as
-- soon as 20260508010000 is applied.
SELECT public.refresh_scholarship_stats();
