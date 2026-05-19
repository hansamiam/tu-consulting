-- 2026-05-18: Rename target_demographics tag "first-generation" → "first-gen"
-- per user direction "shorten the first generation tag to 'first-gen'
-- cuz its too long". Two-step: drop the CHECK constraint, migrate
-- existing rows via array_replace, re-add constraint with the new short
-- token. Mirrored in scrape-source SYSTEM_PROMPT + cleanTargetDemographics
-- alias map + frontend humanizeDemographic so every layer agrees on
-- the canonical form.

ALTER TABLE public.scholarships DROP CONSTRAINT IF EXISTS target_demographics_valid;

UPDATE public.scholarships
SET target_demographics = array_replace(target_demographics, 'first-generation', 'first-gen'),
    updated_at = now()
WHERE 'first-generation' = ANY(target_demographics);

UPDATE public.scholarships
SET best_for_tags = array_replace(best_for_tags, 'first-generation', 'first-gen'),
    updated_at = now()
WHERE 'first-generation' = ANY(best_for_tags);

ALTER TABLE public.scholarships ADD CONSTRAINT target_demographics_valid
  CHECK (
    target_demographics IS NULL OR (
      target_demographics <@ ARRAY[
        'women','men','lgbtq','first-gen','low-income','refugee','displaced',
        'indigenous','underrepresented-stem','underrepresented-minority',
        'disability','military-veteran','rural','mature-student'
      ]
      AND cardinality(target_demographics) <= 8
    )
  );
