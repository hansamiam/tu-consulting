-- =============================================================================
-- URL health cron — bump to twice-daily so the catalog stays current
-- =============================================================================
-- Original schedule (20260502042613): weekly Mon 04:00 UTC, BATCH_SIZE=80.
-- That means 80 rows / week = ~1.2 years to rotate a 6K-row catalog.
-- Dead URLs sit live for 6+ months on average. Worst-case violation of
-- the trust contract — students click and land on dead pages.
--
-- Plan: twice-daily schedule (04:00 and 16:00 UTC) + BATCH_SIZE=500
-- (already raised in the function code). Throughput: 1000 rows/day,
-- catalog rotation in ~6 days, matching the queue's 6-day freshness
-- threshold so the queue stays drained and overdue rows surface fast.
--
-- Cost: ~free. Fetch + 64KB body per URL × 1000 = trivial bandwidth.
-- Edge function runtime is bounded by the 6s per-URL timeout × 500 /
-- concurrency-8 ≈ 60s; if it brushes the gateway limit it returns
-- partial telemetry and the next tick picks up where we left off.
-- =============================================================================

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('scholarship-url-health-cron'); EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'scholarship-url-health-cron',
  '0 4,16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scholarship-url-health-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
