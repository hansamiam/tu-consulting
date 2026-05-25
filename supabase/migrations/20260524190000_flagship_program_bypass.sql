-- 2026-05-24: Flagship-program bypass.
-- For genuinely prestigious annual scholarships (Chevening, Fulbright,
-- DAAD, Heinrich Böll, Swiss ESKAS, Erasmus Mundus, MasterCard
-- Foundation, MEXT, KGSP, Vanier, Eiffel, etc.) we want them to surface
-- on Discover even when the next cycle's deadline hasn't been published
-- yet. A student looking for "Fulbright 2027" should still see the row
-- with a "Reopens annually — date TBD" treatment instead of zero results
-- saying "we know nothing about Fulbright."
--
-- This migration:
--   1. Adds is_flagship_program boolean column.
--   2. Backfills TRUE for rows matching the known-flagship regex.
--   3. Adds a trigger to keep is_flagship_program in sync on insert/update.
--   4. Promotes flagship-active-no-deadline rows to lifecycle_status =
--      'reopens_annually' so the Discover query (which already allows
--      that bucket) can render them with the special TBD label.
--
-- The Discover query change lives in src/pages/Discover.tsx — it relaxes
-- the application_deadline filter for is_flagship_program=true rows.

-- 1. Column
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS is_flagship_program BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.scholarships.is_flagship_program IS
  'TRUE for canonical flagship scholarships (Chevening, Fulbright, DAAD, Heinrich Böll, Swiss ESKAS, Erasmus Mundus, MasterCard Foundation, MEXT, KGSP, etc). Used by Discover to surface these rows even when the next cycle deadline is not yet published.';

CREATE INDEX IF NOT EXISTS idx_scholarships_flagship_active
  ON public.scholarships (is_flagship_program)
  WHERE is_flagship_program = TRUE;

-- 2. Backfill via regex (mirror of KNOWN_ANNUAL_PROGRAMS_RE in
-- supabase/functions/_shared/scholarshipFields.ts — keep in sync).
UPDATE public.scholarships
SET is_flagship_program = TRUE
WHERE (COALESCE(scholarship_name, '') || ' | ' || COALESCE(provider_name, '')) ~*
      '\m(chevening|rhodes scholar|gates cambridge|clarendon|marshall scholar|commonwealth scholarship|fulbright|knight[-\s]?hennessy|schwarzman|yenching|mext|kgsp|korean government scholarship|vanier|trudeau|eiffel|daad|deutschlandstipendium|heinrich b[oö]ll|konrad[-\s]?adenauer|friedrich[-\s]?ebert|swiss government|swedish institute|orange knowledge|holland scholar|australia awards|erasmus mundus|aga khan|mastercard foundation|p\.?d\.?soros|jack kent cooke|gates millennium|hispanic scholarship fund|east[-\s]?west center|czech government scholar|joint japan/world bank)\M';

-- 3. Trigger to auto-set on subsequent inserts/updates.
CREATE OR REPLACE FUNCTION public.set_flagship_program_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_flagship_program := (COALESCE(NEW.scholarship_name, '') || ' | ' || COALESCE(NEW.provider_name, '')) ~*
    '\m(chevening|rhodes scholar|gates cambridge|clarendon|marshall scholar|commonwealth scholarship|fulbright|knight[-\s]?hennessy|schwarzman|yenching|mext|kgsp|korean government scholarship|vanier|trudeau|eiffel|daad|deutschlandstipendium|heinrich b[oö]ll|konrad[-\s]?adenauer|friedrich[-\s]?ebert|swiss government|swedish institute|orange knowledge|holland scholar|australia awards|erasmus mundus|aga khan|mastercard foundation|p\.?d\.?soros|jack kent cooke|gates millennium|hispanic scholarship fund|east[-\s]?west center|czech government scholar|joint japan/world bank)\M';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_flagship_program ON public.scholarships;

CREATE TRIGGER trg_set_flagship_program
  BEFORE INSERT OR UPDATE OF scholarship_name, provider_name ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_flagship_program_flag();

-- 4. Promote flagship-active-no-deadline rows to reopens_annually so the
-- Discover filter's lifecycle bucket picks them up. The deadline-bypass
-- predicate (Discover query) tests both is_flagship_program AND
-- lifecycle_status='reopens_annually', so only the deliberately-tagged
-- flagship rows benefit. Non-flagship reopens_annually rows still need
-- a future application_deadline to surface (unchanged behavior).
UPDATE public.scholarships
SET lifecycle_status = 'reopens_annually',
    updated_at = now()
WHERE is_flagship_program = TRUE
  AND lifecycle_status = 'active'
  AND application_deadline IS NULL;
