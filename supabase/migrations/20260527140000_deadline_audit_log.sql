-- Deadline audit infrastructure.
--
-- Why this exists (2026-05-27): four published rows were found with multi-
-- month-wrong application_deadline values — Rhodes was off by ~3 months
-- (we'd stored an opening date, not a close), HYI was off by ~10 months
-- (we'd stored the notification date). The fix-the-data PR (#173) repaired
-- those four rows and added the auto-supersede trigger so future provider
-- updates flow through, but did nothing about the other 80+ rows whose
-- deadlines were LLM-extracted by verify-scholarship — a function with a
-- documented silent-failure history (PR #10) in this same repo. Without an
-- ongoing audit loop the catalog will drift away from the truth as
-- providers update their cycle calendars and we have no way to know.
--
-- This migration is the read-side of the audit loop:
--   - deadline_audit_log: append-only ledger of each verification event
--   - suspicious_deadlines view: flags rows the catalog should be suspicious of
--   - latest_deadline_audit view: per-row most-recent audit, for the admin
--
-- The write side is the audit-deadlines edge function (separate deploy)
-- which web-searches each row, writes the result here, and is scheduled
-- nightly by audit-deadlines-cron.

-- ─── deadline_audit_log ─────────────────────────────────────────────────
-- Append-only. Never UPDATE; insert a new row for each re-audit so we
-- have a trail of "what did we believe, when, and based on what."
CREATE TABLE IF NOT EXISTS public.deadline_audit_log (
  audit_id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id      uuid          NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  audited_at          timestamptz   NOT NULL DEFAULT now(),

  -- Snapshot of what the catalog had at audit time so we can prove the
  -- audit was on stale data even if the live row has since been updated.
  stored_at_audit     date,
  canonical_at_audit  date,

  -- What the verifier observed on the provider's official site.
  observed_deadline   date,         -- null when no date was findable
  observed_source     text,         -- URL or "no source — model guessed"

  -- Disposition: 'match' / 'mismatch' / 'inconclusive' / 'rolling'.
  -- 'rolling' = provider explicitly says rolling/continuous and stored
  --              value should be NULL with deadline_type='rolling'.
  -- 'inconclusive' = verifier couldn't find a clean answer; do not act on it.
  status              text          NOT NULL CHECK (status IN ('match', 'mismatch', 'inconclusive', 'rolling')),

  -- 0.0–1.0 verifier confidence. ≥0.85 + status='mismatch' is the
  -- auto-flag threshold for the admin review surface.
  confidence          numeric(3,2)  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  -- Human-readable: which agent ran the audit and any one-line note.
  verifier            text          NOT NULL,  -- 'cron-llm-v1' / 'admin-manual' / 'researcher-batch-2026-05-27'
  notes               text
);

CREATE INDEX IF NOT EXISTS idx_deadline_audit_log_scholarship_at
  ON public.deadline_audit_log (scholarship_id, audited_at DESC);

CREATE INDEX IF NOT EXISTS idx_deadline_audit_log_status_at
  ON public.deadline_audit_log (status, audited_at DESC)
  WHERE status IN ('mismatch', 'rolling');

ALTER TABLE public.deadline_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role does all writes; admins read via the admin client. No
-- user-facing access — this is operational data.
DROP POLICY IF EXISTS deadline_audit_log_admin_read ON public.deadline_audit_log;
CREATE POLICY deadline_audit_log_admin_read
  ON public.deadline_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

COMMENT ON TABLE public.deadline_audit_log IS
  '2026-05-27: append-only audit ledger for scholarship deadlines. Each row is one verification event. Read by /admin/deadline-audit; written by audit-deadlines edge function (cron + on-demand).';

-- ─── latest_deadline_audit ──────────────────────────────────────────────
-- DISTINCT ON for per-row latest audit. Used by suspicious_deadlines and
-- by the admin surface to avoid scanning the full append-only log.
CREATE OR REPLACE VIEW public.latest_deadline_audit AS
SELECT DISTINCT ON (scholarship_id)
  scholarship_id,
  audit_id,
  audited_at,
  stored_at_audit,
  canonical_at_audit,
  observed_deadline,
  observed_source,
  status,
  confidence,
  verifier,
  notes
FROM public.deadline_audit_log
ORDER BY scholarship_id, audited_at DESC;

COMMENT ON VIEW public.latest_deadline_audit IS
  'Per-scholarship most-recent audit row. Cheap because the index on (scholarship_id, audited_at DESC) lets DISTINCT ON skip-scan.';

-- ─── suspicious_deadlines ───────────────────────────────────────────────
-- The catalog's "things to look at" list. Surfaces rows that exhibit
-- known-bad patterns OR have failed an audit OR have never been audited.
-- Read by the admin surface. NOT used for any user-visible filtering;
-- this is purely for operational triage.
CREATE OR REPLACE VIEW public.suspicious_deadlines AS
WITH base AS (
  SELECT
    s.scholarship_id,
    s.scholarship_name,
    s.provider_name,
    s.host_country,
    s.application_deadline,
    s.canonical_deadline_iso,
    s.deadline_type,
    s.is_deadline_inferred,
    s.is_published,
    s.verification_status,
    COALESCE(s.canonical_official_url, s.official_url, s.source_url) AS best_url,
    la.audited_at  AS last_audit_at,
    la.status      AS last_audit_status,
    la.observed_deadline AS last_observed_deadline,
    la.confidence  AS last_audit_confidence
  FROM public.scholarships s
  LEFT JOIN public.latest_deadline_audit la USING (scholarship_id)
  WHERE s.is_published = true
)
SELECT
  scholarship_id,
  scholarship_name,
  provider_name,
  host_country,
  application_deadline,
  canonical_deadline_iso,
  deadline_type,
  is_deadline_inferred,
  best_url,
  last_audit_at,
  last_audit_status,
  last_observed_deadline,
  last_audit_confidence,
  -- Reason codes (string array) so the admin UI can group / filter.
  ARRAY_REMOVE(ARRAY[
    -- R1: last audit said mismatch with reasonable confidence
    CASE WHEN last_audit_status = 'mismatch' AND COALESCE(last_audit_confidence, 0) >= 0.7
         THEN 'R1_audit_mismatch' END,

    -- R2: verifier observed rolling/no-deadline but row has a date
    CASE WHEN last_audit_status = 'rolling' AND application_deadline IS NOT NULL
         THEN 'R2_observed_rolling_but_dated' END,

    -- R3: stored ≠ canonical (>7d apart, both non-null) — internal
    -- disagreement between the two LLM extractors
    CASE WHEN application_deadline IS NOT NULL
          AND canonical_deadline_iso IS NOT NULL
          AND ABS(application_deadline - canonical_deadline_iso) > 7
         THEN 'R3_stored_vs_canonical_drift' END,

    -- R4: Feb 28 / Feb 29 stored deadline — common notification-date
    -- misread pattern (HYI was 4 months wrong because we'd stored its
    -- notification date). Skip rows where the provider name contains
    -- "feb"-y words to reduce false positives; for now keep it simple.
    CASE WHEN application_deadline IS NOT NULL
          AND EXTRACT(MONTH FROM application_deadline) = 2
          AND EXTRACT(DAY   FROM application_deadline) IN (28, 29)
         THEN 'R4_feb_28_29_pattern' END,

    -- R5: deadline_type='rolling' but a date is set — contradiction
    CASE WHEN deadline_type = 'rolling' AND application_deadline IS NOT NULL
         THEN 'R5_rolling_but_dated' END,

    -- R6: never audited (highest-volume class on first run, drops as
    -- the cron drains the backlog)
    CASE WHEN last_audit_at IS NULL
         THEN 'R6_never_audited' END,

    -- R7: stale audit (>60d since last verification). Bumps row back
    -- into the cron's candidate queue.
    CASE WHEN last_audit_at IS NOT NULL
          AND last_audit_at < now() - INTERVAL '60 days'
         THEN 'R7_audit_stale_60d' END,

    -- R8: deadline > today + 18 months on annual program (likely a
    -- year was misread — e.g. stored 2027-XX when 2026-XX was meant)
    CASE WHEN deadline_type = 'annual'
          AND application_deadline IS NOT NULL
          AND application_deadline > CURRENT_DATE + INTERVAL '18 months'
         THEN 'R8_year_too_far_out' END
  ], NULL) AS reasons
FROM base
WHERE
  -- Surface a row if it hits ANY rule
  (last_audit_status = 'mismatch' AND COALESCE(last_audit_confidence, 0) >= 0.7)
  OR (last_audit_status = 'rolling' AND application_deadline IS NOT NULL)
  OR (application_deadline IS NOT NULL
      AND canonical_deadline_iso IS NOT NULL
      AND ABS(application_deadline - canonical_deadline_iso) > 7)
  OR (application_deadline IS NOT NULL
      AND EXTRACT(MONTH FROM application_deadline) = 2
      AND EXTRACT(DAY   FROM application_deadline) IN (28, 29))
  OR (deadline_type = 'rolling' AND application_deadline IS NOT NULL)
  OR (last_audit_at IS NULL)
  OR (last_audit_at IS NOT NULL AND last_audit_at < now() - INTERVAL '60 days')
  OR (deadline_type = 'annual'
      AND application_deadline IS NOT NULL
      AND application_deadline > CURRENT_DATE + INTERVAL '18 months');

COMMENT ON VIEW public.suspicious_deadlines IS
  'Triage view for the deadline audit admin. Each row has a `reasons` array of rule codes (R1..R8) explaining why the row was surfaced. NOT used for user-facing filtering — operational only.';

-- ─── audit candidates picker function ──────────────────────────────────
-- The cron calls this to pick the next N rows to audit. Orders by
-- "longest-since-last-audit, NULL first" so first runs drain the
-- never-audited backlog, then the catalog cycles through periodically.
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
  WHERE s.is_published = true
    AND COALESCE(s.canonical_official_url, s.official_url, s.source_url) IS NOT NULL
  ORDER BY
    la.audited_at ASC NULLS FIRST,  -- never-audited first, then stalest
    s.application_deadline ASC NULLS LAST  -- tiebreak: nearest deadline first
  LIMIT GREATEST(p_limit, 1);
$$;

COMMENT ON FUNCTION public.pick_deadline_audit_candidates(int) IS
  'Cron picker for audit-deadlines. NULLS FIRST on last_audit_at drains the never-audited backlog before recycling. Tiebreak by nearest deadline so soon-due rows get re-verified first.';
