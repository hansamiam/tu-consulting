-- =============================================================================
-- Smart cadence — auto-tune scrape frequency per source by yield
-- =============================================================================
-- Today's pipeline crawls every source on its own static frequency_hours
-- (default 24h). Two efficiency gaps:
--
--   · Productive sources sit idle when they could be re-checked sooner.
--     A daily-updating government grants page wastes ~22 of every 24 hours
--     of fresh-content discovery time when scraped daily.
--
--   · Dead sources keep burning Firecrawl + AI budget. A "scholarships"
--     page that hasn't published a new program in 90 days gets crawled
--     daily forever — paying ~$0.01/day for content_unchanged short-circuits
--     that produce no value.
--
-- This migration adds tune_source_cadence() — a daily SQL function that:
--
--   1. Looks at each source's last 30 days of scrape_runs.
--   2. Counts how many runs produced a new auto-published row.
--   3. Bumps frequency_hours up (slower) or down (faster) within a
--      bounded range based on the yield rate.
--
-- Bounds: minimum 6h (4× per day max for any source), maximum 168h (weekly).
-- Default cap of 24h preserved for never-evaluated sources.
--
-- Outcomes:
--
--   · Yield ≥ 50% of runs produce new rows → frequency_hours = 6 (4×/day)
--   · Yield 20-50%                          → frequency_hours = 12 (2×/day)
--   · Yield 5-20%                           → frequency_hours = 24 (daily)
--   · Yield < 5%                            → frequency_hours = 72 (every 3 days)
--   · Zero rows in last 30d                 → frequency_hours = 168 (weekly)
--
-- Conservative: only adjusts active, healthy sources. Quarantined and
-- degraded sources keep their existing frequency (the health system already
-- handles them via the dispatcher's effective-cadence multiplier).
--
-- The dispatcher reads frequency_hours each tick, so the new cadence
-- takes effect on the very next dispatcher cron tick after this function
-- runs. No edge function deploy required.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tune_source_cadence()
RETURNS TABLE (
  out_source_id  uuid,
  out_name       text,
  out_old_freq   int,
  out_new_freq   int,
  out_yield_pct  numeric,
  out_reason     text
)
LANGUAGE plpgsql
AS $$
DECLARE
  src record;
  v_total_runs int;
  v_yield_runs int;
  v_yield_rate numeric;
  v_new_freq int;
  v_reason text;
BEGIN
  FOR src IN
    SELECT s.source_id, s.name, s.frequency_hours, s.health_status
    FROM public.scholarship_sources s
    WHERE s.is_active = true
      AND s.health_status = 'healthy'
  LOOP
    -- Count completed runs in last 30 days (excl. failed + skipped — those
    -- aren't a yield signal, they're a health signal handled separately).
    SELECT COUNT(*),
           SUM(CASE WHEN auto_published > 0 THEN 1 ELSE 0 END)
      INTO v_total_runs, v_yield_runs
    FROM public.scrape_runs
    WHERE source_id = src.source_id
      AND status IN ('success', 'content_unchanged')
      AND started_at > now() - interval '30 days';

    -- Skip sources without enough samples to tune confidently. With < 5
    -- runs in the last 30 days we don't have enough signal — leave the
    -- cadence alone so a brand-new source gets its full default cycle.
    IF v_total_runs IS NULL OR v_total_runs < 5 THEN
      CONTINUE;
    END IF;

    v_yield_runs := COALESCE(v_yield_runs, 0);
    v_yield_rate := v_yield_runs::numeric / v_total_runs::numeric;

    -- Map yield rate → cadence band. Same conservative thresholds the
    -- function header documents.
    IF v_yield_runs = 0 THEN
      v_new_freq := 168;  -- weekly
      v_reason := format('zero new rows in %s runs over 30d → weekly', v_total_runs);
    ELSIF v_yield_rate >= 0.50 THEN
      v_new_freq := 6;
      v_reason := format('high yield %s%% (%s/%s) → 4×/day', round(v_yield_rate * 100), v_yield_runs, v_total_runs);
    ELSIF v_yield_rate >= 0.20 THEN
      v_new_freq := 12;
      v_reason := format('moderate yield %s%% (%s/%s) → 2×/day', round(v_yield_rate * 100), v_yield_runs, v_total_runs);
    ELSIF v_yield_rate >= 0.05 THEN
      v_new_freq := 24;
      v_reason := format('low yield %s%% (%s/%s) → daily', round(v_yield_rate * 100), v_yield_runs, v_total_runs);
    ELSE
      v_new_freq := 72;
      v_reason := format('very low yield %s%% (%s/%s) → every 3 days', round(v_yield_rate * 100), v_yield_runs, v_total_runs);
    END IF;

    -- Only emit a row when the cadence actually changed — otherwise the
    -- function output is dominated by no-ops on a stable catalog.
    IF v_new_freq IS DISTINCT FROM src.frequency_hours THEN
      UPDATE public.scholarship_sources
      SET frequency_hours = v_new_freq
      WHERE source_id = src.source_id;

      out_source_id := src.source_id;
      out_name := src.name;
      out_old_freq := src.frequency_hours;
      out_new_freq := v_new_freq;
      out_yield_pct := round(v_yield_rate * 100, 1);
      out_reason := v_reason;
      RETURN NEXT;
    END IF;
  END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION public.tune_source_cadence() TO service_role;

-- Schedule daily at 04:30 UTC — 30 minutes after evaluate_source_health
-- runs, so cadence tuning sees the latest health status (won't re-tune
-- a freshly-quarantined source).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('tune-source-cadence') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'tune-source-cadence'
    );
    PERFORM cron.schedule(
      'tune-source-cadence',
      '30 4 * * *',
      $job$ SELECT public.tune_source_cadence(); $job$
    );
  END IF;
END
$$;

-- Run once now so any existing sources with > 30d of run history get
-- tuned immediately. New sources without enough runs are skipped by
-- the < 5 sample guard inside the function.
SELECT public.tune_source_cadence();
