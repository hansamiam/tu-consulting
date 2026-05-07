-- =============================================================================
-- Canonicalize target_fields across the catalog
-- =============================================================================
-- The LLM emits "Computer Science", "CS", "CSE", "Computer Science and
-- Engineering", "Computing", "Software Engineering" as separate string
-- values. Until now we stored each one as-is, fragmenting:
--   * Discover field filter (a student picking "Computer Science" missed
--     every row tagged "CS" or "Computing"),
--   * field-hub long-tail SEO pages (/scholarships/computer-science only
--     pulls one variant),
--   * match scoring (the student profile's canonical field doesn't tag-
--     match the scholarship's raw LLM output),
--   * saved-search consistency.
--
-- Adds:
--   * `canonicalize_field_of_study(text)` SQL function — mirror of
--     canonicalizeFieldOfStudy() in _shared/scholarshipFields.ts. Same
--     synonym table; same comparison-key normalization.
--   * `canonicalize_field_array(text[])` helper that maps + dedups.
--   * UPDATE pass over public.scholarships rewriting target_fields.
--
-- Going forward, scrape-source's cleanTargetFields() applies the same
-- canonicalization at extract time, and verify-scholarship reuses the
-- same helper at re-verify time.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.canonicalize_field_of_study(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  trimmed text;
  norm text;
  result text;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;
  trimmed := btrim(p_raw);
  IF length(trimmed) = 0 THEN RETURN NULL; END IF;

  -- Mirror normalizeFieldComparisonKey in scholarshipFields.ts.
  norm := lower(trimmed);
  norm := regexp_replace(norm, '[-_]+', ' ', 'g');
  norm := regexp_replace(norm, '\s+', ' ', 'g');
  norm := replace(norm, '&', 'and');
  norm := regexp_replace(norm, '\s+(and\s+)?related\s+fields?$', '', 'i');
  norm := regexp_replace(norm, '\s+studies$', '', 'i');
  norm := regexp_replace(norm, '\s+(and\s+)?related$', '', 'i');
  norm := regexp_replace(norm, '\s+fields?$', '', 'i');
  norm := regexp_replace(norm, 's$', '');
  norm := btrim(norm);

  IF length(norm) = 0 THEN RETURN NULL; END IF;

  -- Synonym table — keep in sync with FIELD_SYNONYMS_MAP in
  -- supabase/functions/_shared/scholarshipFields.ts AND with
  -- src/pages/Discover.tsx.
  result := CASE norm
    WHEN 'stem' THEN 'STEM'
    WHEN 'science technology engineering and math' THEN 'STEM'
    WHEN 'science technology engineering and mathematic' THEN 'STEM'
    WHEN 'women in stem' THEN 'STEM'
    WHEN 'women in science' THEN 'STEM'
    WHEN 'women in technology' THEN 'STEM'

    WHEN 'comp sci' THEN 'Computer Science'
    WHEN 'computer science' THEN 'Computer Science'
    WHEN 'computer science and engineering' THEN 'Computer Science'
    WHEN 'computer science and information technology' THEN 'Computer Science'
    WHEN 'computing' THEN 'Computer Science'
    WHEN 'software engineering' THEN 'Computer Science'
    WHEN 'cs' THEN 'Computer Science'
    WHEN 'cse' THEN 'Computer Science'

    WHEN 'ai' THEN 'Artificial Intelligence'
    WHEN 'artificial intelligence' THEN 'Artificial Intelligence'

    WHEN 'ml' THEN 'Machine Learning'
    WHEN 'machine learning' THEN 'Machine Learning'

    WHEN 'ee' THEN 'Electrical Engineering'
    WHEN 'electrical engineering' THEN 'Electrical Engineering'

    WHEN 'me' THEN 'Mechanical Engineering'
    WHEN 'mechanical engineering' THEN 'Mechanical Engineering'

    WHEN 'ce' THEN 'Civil Engineering'
    WHEN 'civil engineering' THEN 'Civil Engineering'

    WHEN 'biz' THEN 'Business'
    WHEN 'business' THEN 'Business'
    WHEN 'business administration' THEN 'Business'
    WHEN 'mba' THEN 'Business'

    WHEN 'ir' THEN 'International Relations'
    WHEN 'international relation' THEN 'International Relations'
    WHEN 'international relations' THEN 'International Relations'
    WHEN 'intl relation' THEN 'International Relations'
    WHEN 'global affair' THEN 'International Relations'
    WHEN 'global affairs' THEN 'International Relations'

    WHEN 'policy' THEN 'Public Policy'
    WHEN 'public policy' THEN 'Public Policy'

    WHEN 'polisci' THEN 'Political Science'
    WHEN 'poli sci' THEN 'Political Science'
    WHEN 'political science' THEN 'Political Science'

    WHEN 'med' THEN 'Medicine'
    WHEN 'medical' THEN 'Medicine'
    WHEN 'medicine' THEN 'Medicine'

    WHEN 'healthcare' THEN 'Public Health'
    WHEN 'public health' THEN 'Public Health'
    WHEN 'global health' THEN 'Public Health'

    WHEN 'humanitie' THEN 'Humanities'
    WHEN 'humanities' THEN 'Humanities'

    WHEN 'lit' THEN 'Literature'
    WHEN 'literature' THEN 'Literature'
    WHEN 'english' THEN 'Literature'
    WHEN 'creative writing' THEN 'Literature'

    WHEN 'fine art' THEN 'Art'
    WHEN 'visual art' THEN 'Art'
    WHEN 'art' THEN 'Art'
    ELSE NULL
  END;

  IF result IS NOT NULL THEN RETURN result; END IF;

  -- Fall back to Title Case of trimmed input. initcap() handles the
  -- common case; we don't try to preserve internal punctuation here
  -- since the LLM rarely uses it inside a single field name.
  RETURN initcap(trimmed);
END
$$;

GRANT EXECUTE ON FUNCTION public.canonicalize_field_of_study(text) TO service_role;

-- ─── Array helper: map + dedup ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.canonicalize_field_array(p_arr text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw text;
  canon text;
  out text[] := ARRAY[]::text[];
  seen text[] := ARRAY[]::text[];
BEGIN
  IF p_arr IS NULL THEN RETURN NULL; END IF;

  FOREACH raw IN ARRAY p_arr LOOP
    -- Split comma/slash/semicolon run-ons inside a single entry, mirror
    -- the JS cleanTargetFields() behavior so we don't end up with
    -- "Computer Science, Engineering" as one element.
    FOR canon IN
      SELECT public.canonicalize_field_of_study(piece)
      FROM unnest(regexp_split_to_array(raw, '\s*[,/;]\s*')) AS piece
      WHERE length(btrim(piece)) > 0
    LOOP
      IF canon IS NULL THEN CONTINUE; END IF;
      -- Case-insensitive dedup
      IF NOT (lower(canon) = ANY (SELECT lower(s) FROM unnest(seen) AS s)) THEN
        out := array_append(out, canon);
        seen := array_append(seen, canon);
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(out, 1) IS NULL THEN RETURN NULL; END IF;
  RETURN out;
END
$$;

GRANT EXECUTE ON FUNCTION public.canonicalize_field_array(text[]) TO service_role;

-- ─── Backfill existing rows ────────────────────────────────────────
-- Only touch rows whose target_fields actually changes. Avoid waking
-- the data_completeness_score trigger for no-op rewrites.
WITH candidates AS (
  SELECT scholarship_id,
         target_fields AS old_fields,
         public.canonicalize_field_array(target_fields) AS new_fields
  FROM public.scholarships
  WHERE target_fields IS NOT NULL
    AND cardinality(target_fields) > 0
)
UPDATE public.scholarships sc
SET target_fields = c.new_fields
FROM candidates c
WHERE sc.scholarship_id = c.scholarship_id
  AND c.old_fields IS DISTINCT FROM c.new_fields;
