-- 2026-05-20: respect manual-curation mode in refresh_lifecycle_status().
--
-- The daily 03:00 UTC refresh cron has been failing every night for the
-- last 2 days with:
--   ERROR:  duplicate key value violates unique constraint
--   "uniq_scholarships_canonical_key_live"
--   DETAIL:  Key (canonical_key)=(daad research germany) already exists.
--
-- Cause: the function bulk-flipped rows to whatever
-- public.scholarship_lifecycle(application_deadline, deadline_type)
-- computed — which meant rows currently 'inactive' (manual-curation
-- gate) but with a future deadline got auto-promoted back to 'active'.
-- Two such rows sharing a canonical_key broke the partial unique
-- index (uniq_scholarships_canonical_key_live) and the entire UPDATE
-- aborted.
--
-- New behavior: only flip DOWNWARD as deadlines pass
-- (active / reopens_annually → closed_recent → closed_archived).
-- Never flip inactive → active. Manual-curation owns the
-- inactive → active transition via /admin/curate. Same blast radius
-- on the daily timeline-advance side (closed-recent transitions still
-- happen), zero risk of canonical-key conflicts.

CREATE OR REPLACE FUNCTION public.refresh_lifecycle_status()
 RETURNS void
 LANGUAGE sql
AS $function$
  UPDATE public.scholarships
  SET lifecycle_status = public.scholarship_lifecycle(application_deadline, deadline_type),
      next_open_at = public.scholarship_next_open(application_deadline, deadline_type)
  WHERE
    lifecycle_status IN ('active','reopens_annually','closed_recent','closed_archived')
    AND lifecycle_status IS DISTINCT FROM 'superseded'
    AND (
      lifecycle_status IS DISTINCT FROM public.scholarship_lifecycle(application_deadline, deadline_type)
      OR next_open_at IS DISTINCT FROM public.scholarship_next_open(application_deadline, deadline_type)
    );
$function$;
