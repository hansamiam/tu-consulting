-- Widen the audit cron picker to match Discover.tsx visibility, not just
-- is_published=true. Closes a silent gap: ~13 rows were USER-VISIBLE on
-- topuni.org but never audited (e.g. Joint Japan/World Bank — deadline
-- May 29; Makerere MasterCard — June 5; Sir Harry Evans — July 10).
--
-- Discover query (src/pages/Discover.tsx:2855):
--   .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
--   .gte("application_deadline", today)
--
-- Picker now mirrors that. NULLS FIRST on last_audit_at still drains
-- the never-audited backlog before recycling.
--
-- Applied via MCP apply_migration; this file is in-tree for traceability.

CREATE OR REPLACE FUNCTION public.pick_deadline_audit_candidates(p_limit int DEFAULT 10)
RETURNS TABLE (
  scholarship_id uuid,
  scholarship_name text,
  application_deadline date,
  canonical_deadline_iso date,
  deadline_type text,
  best_url text,
  last_audit_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.scholarship_id,
    s.scholarship_name,
    s.application_deadline,
    s.canonical_deadline_iso,
    s.deadline_type,
    COALESCE(s.canonical_official_url, s.official_url, s.source_url) AS best_url,
    la.audited_at AS last_audit_at
  FROM public.scholarships s
  LEFT JOIN public.latest_deadline_audit la USING (scholarship_id)
  WHERE
    (s.lifecycle_status IN ('active','reopens_annually') OR s.lifecycle_status IS NULL)
    AND s.application_deadline >= CURRENT_DATE
    AND COALESCE(s.canonical_official_url, s.official_url, s.source_url) IS NOT NULL
  ORDER BY
    la.audited_at ASC NULLS FIRST,
    s.application_deadline ASC NULLS LAST
  LIMIT GREATEST(p_limit, 1);
$$;

COMMENT ON FUNCTION public.pick_deadline_audit_candidates(int) IS
  '2026-05-27 v2: candidate picker uses Discover-visibility filter, not '
  'is_published, so user-visible-but-unpublished rows also get audited. '
  'Lifecycle + future-deadline + has-URL = visible; NULLS FIRST on '
  'last_audit_at drains the never-audited.';
