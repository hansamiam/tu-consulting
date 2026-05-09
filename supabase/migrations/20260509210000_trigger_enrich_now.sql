-- =============================================================================
-- Manual trigger — fire enrich-scholarships-content-cron immediately
-- =============================================================================
-- Heuristic backfills (180000, 200000) closed structural gaps but the
-- narrative fields (why_this_fits, ideal_candidate_profile, how_to_win,
-- common_rejection_reasons, weak_candidate_warning, strategy_notes,
-- best_for_tags, what_to_prepare_first) are still ~50/213 populated.
-- These need LLM generation via enrich-scholarship-content. The cron is
-- scheduled for 04:30 UTC daily but we want a fill RIGHT NOW so the
-- catalog is presentable.
--
-- Uses pg_net.http_post + app.cron_token GUC (same auth pattern as the
-- scheduled cron). Re-runnable — every invocation processes 100 more rows
-- so running this migration twice handles the full catalog.
-- =============================================================================

DO $$
DECLARE
  v_token text;
  v_request_id bigint;
BEGIN
  v_token := current_setting('app.cron_token', true);
  IF v_token IS NULL OR length(btrim(v_token)) = 0 THEN
    RAISE NOTICE '[trigger] app.cron_token is NOT set — skipping. Set GUC and re-run.';
    RETURN;
  END IF;

  SELECT net.http_post(
    url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/enrich-scholarships-content-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_token,
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 240000
  ) INTO v_request_id;

  RAISE NOTICE '[trigger] enrich cron fired — request_id=% (will run async, ~120s, processes 100 rows)', v_request_id;
END $$;
