-- =============================================================================
-- Schedule funder-truth-probe daily — auto-update authoritative facts
-- =============================================================================
-- The funder-truth-probe edge function (added 2026-05-09) fetches each
-- registered funder's canonical site, scans for discontinuation /
-- between-cycles signals, and updates provider_authoritative_facts.
-- Combined with the cross-reference anomaly rule from 20260509120000,
-- this is what makes the catalog self-correct against ground truth.
--
-- Cadence: daily at 02:30 UTC. Slots in BEFORE the anomaly cron at
-- 03:30 UTC so the anomaly rule sees fresh authoritative-facts state.
--
-- The function caps probes at 8 funders per tick (rotates through the
-- registry by least-recently-checked) so Firecrawl credits last. Net
-- effect: each registered funder gets re-probed ~every 3-4 days.
--
-- Idempotent: cron.unschedule first.
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'funder_truth_probe_daily') THEN
    PERFORM cron.unschedule('funder_truth_probe_daily');
  END IF;
END $$;

SELECT cron.schedule(
  'funder_truth_probe_daily',
  '30 2 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/funder-truth-probe',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_token')
      ),
      body    := '{}'::jsonb
    );
  $$
);
