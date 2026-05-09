-- =============================================================================
-- Force lifecycle_status refresh — closed rows were surfacing in Discover
-- =============================================================================
-- User report: top 5 results in "Deadline first" sort were ALL closed.
-- Discover's read-side filter excludes lifecycle_status NOT IN
-- (active, reopens_annually), but only if the column is current. The
-- daily 03:00 UTC cron refreshes lifecycle but if app.cron_token isn't
-- set the cron silently fails, leaving rows with stale lifecycle.
-- =============================================================================

DO $$
DECLARE v_changed int;
BEGIN
  -- Snapshot before
  RAISE NOTICE '[lifecycle_pre] active=%, reopens_annually=%, closed_recent=%, closed_archived=%',
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'active'),
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'reopens_annually'),
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'closed_recent'),
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'closed_archived');

  -- Run the refresh
  PERFORM public.refresh_lifecycle_status();

  -- Snapshot after
  RAISE NOTICE '[lifecycle_post] active=%, reopens_annually=%, closed_recent=%, closed_archived=%',
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'active'),
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'reopens_annually'),
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'closed_recent'),
    (SELECT count(*) FROM public.scholarships WHERE lifecycle_status = 'closed_archived');

  -- Spot-check: rows with past deadline but still active (means
  -- scholarship_lifecycle() function is wrong, not just stale data)
  SELECT count(*) INTO v_changed
  FROM public.scholarships
  WHERE application_deadline IS NOT NULL
    AND application_deadline < now()
    AND lifecycle_status = 'active'
    AND deadline_type NOT IN ('annual', 'rolling');
  RAISE NOTICE '[lifecycle_check] past-deadline + still active + non-recurring: % rows', v_changed;
END $$;
