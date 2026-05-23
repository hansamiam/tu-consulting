-- 2026-05-22 — add major_certainty column to student_profiles.
--
-- Part of the v7 brief-spec rollout. The TopUni AI brief's
-- "WHAT YOU'RE AVOIDING" card branches on this signal:
--
--   not_at_all / some_idea  → primary gap = major-uncertainty itself
--                             (named warmly, not as a flaw)
--   pretty_sure / certain   → gap picked from a closed library
--                             (test-scores, activity-depth, etc.)
--
-- Also gates the Open Question + Tight Lane applicant-archetype
-- detection in the Phase 2 follow-up.
--
-- Stored as text (not a Postgres enum) because the spec's 4-value
-- set may evolve and migrating Postgres enums in-place is painful.
-- App-side validates the legal-values set via the TS union in
-- DiscoverProfile + the BriefContext.profile.majorCertainty type.
-- A check constraint is added so the DB still rejects garbage
-- values if a non-app writer ever touches the table directly.
--
-- The column is NULLABLE because:
--   1. Existing rows pre-migration don't have a value.
--   2. The wizard UI is being rolled out and earlier intake versions
--      can't fill the field — the brief generator falls back to
--      "some_idea" (the most-common-cohort default) when null.
--
-- Pre-flight: no RLS change needed — student_profiles already
-- enforces auth.uid() = user_id on every operation.

alter table public.student_profiles
  add column if not exists major_certainty text
    check (major_certainty in ('not_at_all', 'some_idea', 'pretty_sure', 'certain'));

comment on column public.student_profiles.major_certainty is
  'How sure the student is about their intended major. 4-level enum. Gates the TopUni AI brief''s WHAT-YOU''RE-AVOIDING branch and the Open Question / Tight Lane archetype detection. Nullable; null defaults to "some_idea" at brief-generation time.';
