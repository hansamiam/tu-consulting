-- Service-role grants on universities + scholarships_url_check_queue.
--
-- Background: the original migrations enabled RLS on these tables/views
-- but only granted SELECT to `authenticated`. service_role has the
-- BYPASSRLS attribute (so RLS policies don't block it), but Postgres
-- still requires a table-level GRANT before the role can SELECT anything
-- at all. Without the GRANT, calls return "permission denied for table X"
-- — which is exactly what enrich-universities-cron and
-- scholarship-url-health-cron were seeing when fired manually.
--
-- These two GRANTs unblock both crons without changing any RLS policy
-- (the public/authenticated paths are unaffected; this just adds the
-- service_role row to the privilege list).
--
-- Pair with: any future table that backend crons need to read should
-- have an explicit service_role GRANT in its creation migration. The
-- common ones (scholarships, providers, scholarship_stats, etc.)
-- already do — these two were the gap.

-- ─── universities table — full CRUD for service_role ─────────────
-- enrich-universities-cron does SELECT to find stale rows + UPDATE to
-- write back enriched fields. The full INSERT/UPDATE/DELETE grant
-- future-proofs other backend jobs (canonical-extract for universities,
-- merge dedups, etc.) without needing follow-up migrations.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universities TO service_role;

-- ─── scholarships_url_check_queue view — read-only for service_role ──
-- scholarship-url-health-cron only reads from this view to find rows
-- ripe for re-checking; the actual writes go to public.scholarships
-- which already has service_role grants from earlier migrations.
GRANT SELECT ON public.scholarships_url_check_queue TO service_role;

-- ─── Defensive: companion tables that share the universities lineage ──
-- programs + admission_requirements were created in the same migration
-- as universities (20260304125441) with the same RLS-on-but-no-service-
-- grant pattern. If any future cron touches them, the same 500 will
-- fire. Adding the grants now is cheap and prevents the next debugging
-- cycle.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_requirements TO service_role;
