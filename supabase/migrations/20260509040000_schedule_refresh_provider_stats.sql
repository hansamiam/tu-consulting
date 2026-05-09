-- =============================================================================
-- Schedule daily refresh of provider aggregate stats
-- =============================================================================
-- refresh_provider_stats() recomputes scholarships_count,
-- active_scholarships_count, total_award_volume_usd,
-- avg_completeness_score, and next_deadline per provider. Cheap (~one
-- aggregating UPDATE) but needs to run after lifecycle/verify/scrape
-- crons have changed underlying scholarships data.
--
-- Cadence: 03:45 UTC daily — slots in after the lifecycle cron (03:00)
-- and the scholarship_stats refresh (03:30) so the snapshots reflect
-- the most-recently-derived state.
--
-- Idempotent: cron.unschedule first to drop any prior schedule under
-- the same name.
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_provider_stats_daily') THEN
    PERFORM cron.unschedule('refresh_provider_stats_daily');
  END IF;
END $$;

SELECT cron.schedule(
  'refresh_provider_stats_daily',
  '45 3 * * *',
  $$ SELECT public.refresh_provider_stats(); $$
);
