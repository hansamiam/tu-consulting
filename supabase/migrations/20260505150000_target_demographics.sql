-- =============================================================================
-- target_demographics — first-class column for demographic eligibility
-- =============================================================================
-- The user pointed out that gender / category eligibility ("Women", "LGBTQ+",
-- "First-generation", "Indigenous") was getting dumped into
-- citizenship_requirements where it doesn't belong (citizenship is country
-- of citizenship, not demographic identity). cleanCitizenshipRequirements()
-- now NULLs those values, but losing them entirely is wrong: they're real
-- eligibility constraints that a student should know about and we should
-- match against.
--
-- This migration:
--   1. Adds target_demographics text[] column with a CHECK constraint on
--      a known set of canonical tags. Free-text is rejected at insert.
--   2. Backfills existing rows: scans scholarship_name + eligibility_requirements
--      + citizenship_requirements for matching tokens and populates the array.
--   3. Index for fast filtering ("show me women-focused scholarships").
--
-- The canonical tag set is deliberately small and stable. Each tag has a
-- specific meaning and rendering. New tags require a migration so the UI,
-- matching, and SYSTEM_PROMPT stay in sync.
-- =============================================================================

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS target_demographics text[];

-- ─── Canonical tag set ──────────────────────────────────────────────────────
-- Each tag is a kebab-case identifier. Display strings live in src/lib/
-- demographicLabels.ts (kept in sync manually).
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.scholarships
      ADD CONSTRAINT target_demographics_valid CHECK (
        target_demographics IS NULL
        OR (
          target_demographics <@ ARRAY[
            'women',
            'men',
            'lgbtq',
            'first-generation',
            'low-income',
            'refugee',
            'displaced',
            'indigenous',
            'underrepresented-stem',
            'underrepresented-minority',
            'disability',
            'military-veteran',
            'rural',
            'mature-student'
          ]::text[]
          AND cardinality(target_demographics) <= 8
        )
      );
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_scholarships_target_demographics
  ON public.scholarships USING GIN (target_demographics)
  WHERE target_demographics IS NOT NULL;

COMMENT ON COLUMN public.scholarships.target_demographics IS
  'Canonical demographic eligibility tags. Constrained set of values. Used for matching against student self-identification + dedicated UI chips. Separate from citizenship_requirements (which is for country eligibility).';

-- ─── Backfill from existing text fields ──────────────────────────────────────
-- Pattern-match scholarship_name + eligibility_requirements + citizenship_requirements
-- for known demographic anchors. Conservative — only confident matches.
WITH detected AS (
  SELECT
    scholarship_id,
    ARRAY(
      SELECT tag FROM (
        SELECT 'women' AS tag WHERE
          scholarship_name ~* '\m(wom[ae]n|female|girl|she |her |feminine|gender equity|gender equality|girl-up)\M'
          OR eligibility_requirements ~* '\m(wom[ae]n only|female only|female applicants|female candidates|girl-only)\M'
          OR citizenship_requirements ~* '^\s*(women|female applicants?|female)\s*\.?\s*$'
        UNION ALL SELECT 'lgbtq' WHERE
          scholarship_name ~* '\m(lgbtq|lgbt|queer|trans|gay|lesbian|pride)\M'
          OR eligibility_requirements ~* '\m(lgbtq|lgbt|queer|trans applicants|gay applicants|lesbian applicants)\M'
          OR citizenship_requirements ~* '^\s*(lgbtq[+]?|queer|trans)\s*\.?\s*$'
        UNION ALL SELECT 'first-generation' WHERE
          scholarship_name ~* '\m(first[- ]generation|first[- ]gen)\M'
          OR eligibility_requirements ~* '\m(first[- ]generation|first[- ]gen|first in family)\M'
          OR citizenship_requirements ~* '^\s*(first-generation|first generation)\s*\.?\s*$'
        UNION ALL SELECT 'low-income' WHERE
          scholarship_name ~* '\m(low[- ]income|underprivileged|need[- ]based)\M'
          OR eligibility_requirements ~* '\m(low[- ]income|financial need|need[- ]based|under \$\d+|household income)\M'
          OR citizenship_requirements ~* '^\s*low[- ]income\s*\.?\s*$'
        UNION ALL SELECT 'refugee' WHERE
          scholarship_name ~* '\m(refugee|asylum|displaced)\M'
          OR eligibility_requirements ~* '\m(refugee status|asylum seekers?|UNHCR)\M'
          OR citizenship_requirements ~* '^\s*refugees?\s*\.?\s*$'
        UNION ALL SELECT 'displaced' WHERE
          scholarship_name ~* '\m(displaced|internally displaced|idp)\M'
          OR eligibility_requirements ~* '\m(displaced|internally displaced)\M'
          OR citizenship_requirements ~* '^\s*displaced\s*\.?\s*$'
        UNION ALL SELECT 'indigenous' WHERE
          scholarship_name ~* '\m(indigenous|native american|first nations|aboriginal|maori)\M'
          OR eligibility_requirements ~* '\m(indigenous|native american|first nations|aboriginal|maori|tribal)\M'
          OR citizenship_requirements ~* '^\s*indigenous\s*\.?\s*$'
        UNION ALL SELECT 'underrepresented-stem' WHERE
          (scholarship_name ~* '\m(women in stem|women in tech|girls who code|stem women)\M'
           OR eligibility_requirements ~* '\m(underrepresented in (stem|tech|engineering|science)|women in (stem|engineering|technology|computing))\M')
        UNION ALL SELECT 'underrepresented-minority' WHERE
          eligibility_requirements ~* '\m(underrepresented minorit|urm|under[- ]represented minority|black|hispanic|latino|latina)\M'
          AND scholarship_name !~* 'history|studies'
        UNION ALL SELECT 'disability' WHERE
          scholarship_name ~* '\m(disability|disabled|deaf|blind|wheelchair)\M'
          OR eligibility_requirements ~* '\m(students with (disabilities|disability)|deaf|blind|hearing impair|visual impair)\M'
          OR citizenship_requirements ~* '^\s*(disabled|disability)\s*\.?\s*$'
        UNION ALL SELECT 'military-veteran' WHERE
          scholarship_name ~* '\m(veteran|military|army|navy|air force|servicem[ae]n)\M'
          OR eligibility_requirements ~* '\m(veteran|military service|active duty|servicemember)\M'
          OR citizenship_requirements ~* '^\s*veterans?\s*\.?\s*$'
        UNION ALL SELECT 'rural' WHERE
          scholarship_name ~* '\m(rural|agricultural|farming community)\M'
          OR eligibility_requirements ~* '\m(rural area|rural background|rural community)\M'
        UNION ALL SELECT 'mature-student' WHERE
          eligibility_requirements ~* '\m(mature students?|adult learners?|over (25|30)\b|returning students?)\M'
      ) tags
    ) AS demographics
  FROM public.scholarships
)
UPDATE public.scholarships s
SET target_demographics = NULLIF(d.demographics, ARRAY[]::text[])
FROM detected d
WHERE s.scholarship_id = d.scholarship_id
  AND d.demographics IS NOT NULL
  AND cardinality(d.demographics) > 0;

-- Touch updated_at on backfilled rows so deep-dive cache invalidates.
UPDATE public.scholarships
SET updated_at = now()
WHERE updated_at < now() - interval '1 minute';
