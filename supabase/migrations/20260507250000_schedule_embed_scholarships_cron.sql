-- =============================================================================
-- Schedule pg_cron job for embed-scholarships
-- =============================================================================
-- The embed-scholarships edge function exists but was never scheduled in
-- a migration — it has been invoked manually only. That's fine when the
-- queue is small (a handful of new rows/day), but breaks down when:
--
--   * A new scrape run lands 50+ new rows that need vectorising
--   * The embedding source schema changes (20260505070000, 20260507230000)
--     and we mass-invalidate the entire ~6K-row catalog
--
-- Without an automatic schedule, the queue stays full and match_scholarships
-- returns stale similarity scores (or no row at all when embedding IS NULL).
--
-- Schedule: every 4 hours, max 500 rows per tick. Cost cap:
-- 6 ticks/day × 500 rows × $0.0002 = $0.60/day max. The function rate-limits
-- itself via maxRows in the request body and returns early when nothing's
-- in the queue, so cost in steady state is ~zero.
--
-- Burst capacity: 500 × 6 = 3,000 rows/day. The 6K mass-invalidation from
-- 20260507230000 drains in ~2 days. Acceptable for a one-shot.
--
-- Same auth pattern as 20260504030000.
-- =============================================================================

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('embed-scholarships-cron'); EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'embed-scholarships-cron',
  '15 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/embed-scholarships',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{"max_rows": 500}'::jsonb
  );
  $$
);
