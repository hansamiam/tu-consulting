-- =============================================================================
-- Backfill deadline_type — flip incorrectly-tagged "rolling" rows to "annual"
-- =============================================================================
-- ~90% of scraped scholarships landed with deadline_type='rolling' because
-- the LLM defaulted to "rolling" whenever the page didn't surface a
-- specific date — even for unmistakably-annual cycles like Chevening,
-- Rhodes, Fulbright. Net effect: the "Closing soon" filter shows
-- nothing, deadline-cron emails never fire for these rows, and students
-- think they have all the time in the world.
--
-- This migration:
--
--   1. UPDATE pass over public.scholarships flipping deadline_type
--      from 'rolling' or NULL → 'annual' for any row whose name OR
--      provider matches a known-annual program. Conservative — only
--      flips rows that currently say rolling/null/unknown.
--
--   2. lifecycle_status will refresh automatically on the next
--      refresh_lifecycle_status() cron tick (04:00 UTC daily) since
--      that function reads deadline_type as input.
--
-- Going forward, scrape-source applies the same rule at extraction
-- time so new rows don't need re-backfill.
--
-- Pattern set MUST stay in sync with the in-app heuristic at
-- scrape-source/index.ts (the "deadline_type override" block) and
-- with infer_host_country() — they share the same well-known-program
-- registry and should evolve together.
-- =============================================================================

UPDATE public.scholarships
SET deadline_type = 'annual'
WHERE (deadline_type IS NULL OR deadline_type IN ('rolling', 'unknown'))
  AND (
       (COALESCE(scholarship_name, '') || ' | ' || COALESCE(provider_name, ''))
       ~* '\m(chevening|rhodes|gates cambridge|clarendon|marshall scholar|commonwealth scholarship|fulbright|knight[\-\s]?hennessy|schwarzman|yenching|mext|kgsp|korean? government scholarship|vanier|trudeau|eiffel|daad|deutschlandstipendium|heinrich b[oö]ll|konrad[\-\s]?adenauer|friedrich[\-\s]?ebert|swiss government|swedish institute|orange knowledge|holland scholar|australia awards|erasmus mundus|aga khan|mastercard foundation scholar|p\.?d\.?soros|jack kent cooke|gates millennium|hispanic scholarship fund|east[\-\s]?west center)\M'
  );

-- Refresh lifecycle_status for the affected rows so the change is
-- visible without waiting for the nightly refresh cron.
UPDATE public.scholarships
SET lifecycle_status = public.scholarship_lifecycle(application_deadline, deadline_type)
WHERE deadline_type = 'annual'
  AND lifecycle_status IS DISTINCT FROM public.scholarship_lifecycle(application_deadline, deadline_type);
