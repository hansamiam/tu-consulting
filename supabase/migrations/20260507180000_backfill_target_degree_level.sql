-- =============================================================================
-- Backfill target_degree_level from scholarship + provider name patterns
-- =============================================================================
-- Many catalog rows have target_degree_level NULL or [] even when the
-- name telegraphs the level — "PhD Fellowship in Computer Science",
-- "Master's Scholarship for Indonesian Students", "Erasmus Mundus Joint
-- Master Degree". Without this column populated, those rows never match
-- a degree filter on Discover and stay invisible to a user who selected
-- "Master's" or "PhD" in the dropdown — even though the program is
-- exactly that.
--
-- This migration:
--
--   1. Adds infer_degree_levels(scholarship_name, provider_name) SQL
--      function — returns text[] of canonical levels:
--      "phd", "postdoc", "master", "bachelor". Mirror of
--      inferDegreeLevelsFromNames() in _shared/scholarshipFields.ts.
--      Keep the two in sync.
--
--   2. UPDATE pass over public.scholarships filling target_degree_level
--      where it's NULL or empty array. Conservative — never overwrites
--      a populated array even if our inference would say something
--      different (the LLM may have caught something the regex misses).
--
-- Going forward, scrape-source + verify-scholarship apply the same
-- inference at extract/re-verify time.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.infer_degree_levels(
  p_name text,
  p_provider text
) RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hay text;
  out text[] := ARRAY[]::text[];
BEGIN
  hay := COALESCE(p_name, '') || ' | ' || COALESCE(p_provider, '');
  IF length(trim(hay)) < 4 THEN RETURN NULL; END IF;

  -- Order matters — postdoc must precede the doctoral pattern below
  -- because "post-doctoral" contains "doctoral" but is its own tier.
  IF hay ~* '\m(postdoc(toral)?|post[-\s]?doctoral)\M' THEN
    out := array_append(out, 'postdoc');
  END IF;

  IF hay ~* '\m(ph\.?d|doctoral|doctorate|doctor of philosophy|d\.?phil|dphil)\M' THEN
    out := array_append(out, 'phd');
  END IF;

  IF hay ~* '\m(master''?s?|m\.?sc|m\.?phil|m\.?eng|m\.?b\.?a|graduate fellowship|joint master|master degree)\M' THEN
    out := array_append(out, 'master');
  END IF;

  IF hay ~* '\m(bachelor''?s?|undergrad(uate)?|b\.?sc|b\.?eng|b\.?a\M|first[-\s]?cycle)\M' THEN
    out := array_append(out, 'bachelor');
  END IF;

  IF array_length(out, 1) IS NULL THEN RETURN NULL; END IF;
  RETURN out;
END
$$;

GRANT EXECUTE ON FUNCTION public.infer_degree_levels(text, text) TO service_role;

-- ─── Backfill existing rows ────────────────────────────────────────
-- Touch rows where target_degree_level is NULL OR empty array. Don't
-- overwrite a populated array — the LLM may have caught a nuance.
WITH inferred AS (
  SELECT
    s.scholarship_id,
    public.infer_degree_levels(s.scholarship_name, s.provider_name) AS new_levels
  FROM public.scholarships s
  WHERE s.target_degree_level IS NULL
     OR cardinality(s.target_degree_level) = 0
)
UPDATE public.scholarships sc
SET target_degree_level = inferred.new_levels
FROM inferred
WHERE sc.scholarship_id = inferred.scholarship_id
  AND inferred.new_levels IS NOT NULL;
