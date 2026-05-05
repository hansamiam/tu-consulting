-- =============================================================================
-- Source quality alerting — auto-quarantine bad sources
-- =============================================================================
-- The user's worry: a month from now a scrape source could silently start
-- producing junk (page restructured, paywall added, content moved). Without
-- a system, the bad rows accumulate, the verify cron tries to verify them
-- (and fails or produces misinformation), and the catalog poisons quietly.
--
-- This migration:
--
--   1. Adds scholarship_sources.health_status enum: healthy | degraded | quarantined.
--   2. Adds scholarship_sources.last_evaluated_at + reason columns so admin
--      can see WHY a source got flagged.
--   3. SQL function evaluate_source_health() that scores each source over
--      its last 30 days of activity:
--         - healthy:     auto-publish rate >= 60% AND no recent broken rows
--         - degraded:    auto-publish rate 30-60% OR 1-2 broken rows in last
--                        30 days. Still scrapes but at half frequency.
--         - quarantined: auto-publish rate < 30% OR 3+ broken rows. Skipped
--                        entirely until admin re-enables.
--   4. The scrape cron filters out quarantined sources so we never burn
--      Firecrawl/AI budget on a known-bad source.
--   5. pg_cron at 04:00 UTC daily refreshes health.
-- =============================================================================

ALTER TABLE public.scholarship_sources
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS health_reason text,
  ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz;

DO $$ BEGIN
  BEGIN
    ALTER TABLE public.scholarship_sources
      ADD CONSTRAINT scholarship_sources_health_status_chk
      CHECK (health_status IN ('healthy', 'degraded', 'quarantined'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_scholarship_sources_health
  ON public.scholarship_sources(health_status);

-- ─── Health evaluator ───────────────────────────────────────────────────────
-- Scores each source by its last-30-day staging activity + verification
-- outcome on the rows it produced. Conservative thresholds.
CREATE OR REPLACE FUNCTION public.evaluate_source_health()
RETURNS TABLE (out_source_id uuid, out_name text, out_status text, out_reason text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total int;
  v_auto int;
  v_broken int;
  v_rate numeric;
  src record;
  new_status text;
  new_reason text;
BEGIN
  FOR src IN
    SELECT s.source_id, s.name FROM public.scholarship_sources s
    WHERE s.is_active = true OR s.is_active IS NULL
  LOOP
    SELECT COUNT(*),
           SUM(CASE WHEN ss.status = 'auto_published' THEN 1 ELSE 0 END)
      INTO v_total, v_auto
    FROM public.scholarships_staging ss
    WHERE ss.source_id = src.source_id
      AND ss.created_at > now() - interval '30 days';

    SELECT COUNT(*) INTO v_broken
    FROM public.scholarships sc
    WHERE sc.source_url IN (
      SELECT url FROM public.scholarship_sources WHERE source_id = src.source_id
    )
    AND sc.verification_status = 'broken';

    IF v_total IS NULL OR v_total = 0 THEN
      new_status := COALESCE(
        (SELECT health_status FROM public.scholarship_sources WHERE source_id = src.source_id),
        'healthy'
      );
      new_reason := 'No recent activity in last 30 days';
    ELSE
      v_rate := v_auto::numeric / v_total::numeric;

      IF v_rate < 0.30 OR v_broken >= 3 THEN
        new_status := 'quarantined';
        new_reason := format(
          'auto-publish rate %s%% (%s/%s) over 30d, %s broken rows. Inspect source manually.',
          round(v_rate * 100), v_auto, v_total, v_broken
        );
      ELSIF v_rate < 0.60 OR v_broken >= 1 THEN
        new_status := 'degraded';
        new_reason := format(
          'auto-publish rate %s%% (%s/%s) over 30d, %s broken rows.',
          round(v_rate * 100), v_auto, v_total, v_broken
        );
      ELSE
        new_status := 'healthy';
        new_reason := format(
          'auto-publish rate %s%% (%s/%s) over 30d.',
          round(v_rate * 100), v_auto, v_total
        );
      END IF;
    END IF;

    UPDATE public.scholarship_sources
    SET health_status = new_status,
        health_reason = new_reason,
        last_evaluated_at = now()
    WHERE source_id = src.source_id;

    out_source_id := src.source_id;
    out_name := src.name;
    out_status := new_status;
    out_reason := new_reason;
    RETURN NEXT;
  END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_source_health() TO service_role;

-- Schedule via pg_cron at 04:00 UTC daily (after lifecycle refresh, before
-- enrich + verify crons so they see the latest health state).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('evaluate-source-health') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'evaluate-source-health'
    );
    PERFORM cron.schedule(
      'evaluate-source-health',
      '0 4 * * *',
      $job$ SELECT public.evaluate_source_health(); $job$
    );
  END IF;
END
$$;

-- Run once now to seed initial state.
SELECT public.evaluate_source_health();
