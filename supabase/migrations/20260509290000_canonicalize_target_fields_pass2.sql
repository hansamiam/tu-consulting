-- =============================================================================
-- target_fields canonicalization pass 2 — sweep the long tail
-- =============================================================================
-- Pass 1 (280000) caught the obvious dupes but left ~30 single-occurrence
-- labels untouched: "Any" (28 rows!), underscore variants from raw DB
-- extraction (Social_sciences, Human_rights), and program-specific garbage
-- like "Selected Areas Of Study In Czech Language". Sweep them into the
-- canonical buckets.
-- =============================================================================

CREATE OR REPLACE FUNCTION public._canonicalize_field(f text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH normalized AS (
    SELECT lower(replace(replace(trim(f), '_', ' '), '-', ' ')) AS n
  )
  SELECT CASE
    WHEN n IN ('engineering', 'engineerings', 'engineering technology', 'building', 'agricultural and veterinary sciences', 'agriculture')
      THEN 'Engineering'

    WHEN n IN ('computer science', 'computer sciences', 'cs', 'software', 'software engineering', 'computing',
              'information technology', 'it', 'data science', 'ai', 'artificial intelligence',
              'computer science & ai', 'computer science and ai', 'technology', 'information technology and computer science')
      THEN 'Computer Science'

    WHEN n IN ('medicine', 'medical', 'health', 'public health', 'medical sciences', 'healthcare',
              'medicine, public health', 'biomedical')
      THEN 'Medicine & Public Health'

    WHEN n IN ('law', 'legal', 'legal studies', 'jurisprudence', 'human rights')
      THEN 'Law'

    WHEN n IN ('business', 'business administration', 'mba', 'management', 'business management',
              'business and economics', 'communications')
      THEN 'Business'

    WHEN n IN ('economics', 'economic', 'economic policy', 'finance', 'financial economics')
      THEN 'Economics'

    WHEN n IN ('public policy', 'policy', 'policy studies', 'government', 'public administration',
              'multidisciplinary leadership development')
      THEN 'Public Policy'

    WHEN n IN ('international relations', 'international', 'global affairs', 'diplomacy',
              'international studies', 'global studies', 'international affairs')
      THEN 'International Relations'

    WHEN n IN ('humanities', 'humanity', 'arts', 'literature', 'arts & humanities', 'liberal arts',
              'philosophy', 'history', 'art', 'visual and performing arts', 'music',
              'humanities and social sciences')
      THEN 'Humanities'

    WHEN n IN ('natural sciences', 'natural science', 'physics', 'chemistry', 'biology',
              'biotech', 'biotechnology', 'science', 'earth environmental sciences')
      THEN 'Natural Sciences'

    WHEN n IN ('mathematics', 'maths', 'math', 'statistics', 'statistic', 'applied mathematics')
      THEN 'Mathematics'

    WHEN n IN ('environment', 'environmental', 'environmental studies', 'environmental science',
              'environmental sciences', 'sustainability', 'sustainable', 'climate', 'climate change',
              'ecology', 'ecological')
      THEN 'Environmental Studies'

    WHEN n IN ('education', 'teaching', 'pedagogy', 'pedagogical', 'educational')
      THEN 'Education'

    WHEN n IN ('architecture', 'design', 'urban planning', 'urban design', 'architecture & design',
              'architecture, design', 'planning and design')
      THEN 'Architecture & Design'

    WHEN n IN ('stem', 'science technology engineering mathematics',
              'science technology engineering and mathematics')
      THEN 'STEM'

    WHEN n IN ('women in stem', 'women in tech', 'women in science', 'women in technology')
      THEN 'Women in STEM'

    WHEN n IN ('social sciences', 'social science', 'sociology', 'anthropology',
              'political science', 'political sciences')
      THEN 'Social Sciences'

    WHEN n IN ('development', 'development studies', 'developing solutions', 'international development',
              'development related fields')
      THEN 'Development Studies'

    WHEN n IN ('research', 'research studies', 'academic research')
      THEN 'Research'

    WHEN n IN ('leadership', 'leaders')
      THEN 'Leadership'

    WHEN n IN ('cultural studies', 'cultural', 'culture')
      THEN 'Cultural Studies'

    -- "Any", "All Fields", multidisciplinary, "all higher education fields",
    -- and program-specific catch-alls all collapse to "All Fields"
    WHEN n IN ('all fields', 'multidisciplinary', 'multi disciplinary', 'open to all', 'any field',
              'any', 'all disciplines', 'all higher education fields')
      THEN 'All Fields'

    -- Garbage patterns from raw DB scraping (long descriptive strings,
    -- program-specific labels that aren't real disciplines): also collapse
    -- to "All Fields" rather than expose them in the filter dropdown.
    WHEN n LIKE 'selected %' OR n LIKE '%programmes' OR length(n) > 40
      THEN 'All Fields'

    ELSE initcap(replace(replace(trim(f), '_', ' '), '-', ' '))
  END
  FROM normalized
$$;

-- Re-rewrite every row with the v2 mapper.
DO $$
DECLARE v_count int;
BEGIN
  WITH rewritten AS (
    SELECT
      scholarship_id,
      ARRAY(
        SELECT DISTINCT public._canonicalize_field(unnest_field)
        FROM unnest(target_fields) AS unnest_field
        WHERE unnest_field IS NOT NULL AND length(btrim(unnest_field)) > 0
      ) AS canon
    FROM public.scholarships
    WHERE target_fields IS NOT NULL
  )
  UPDATE public.scholarships s
  SET target_fields = rewritten.canon
  FROM rewritten
  WHERE s.scholarship_id = rewritten.scholarship_id
    AND s.target_fields IS DISTINCT FROM rewritten.canon;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[canonicalize_v2] target_fields rewritten: % row(s)', v_count;
END $$;

DO $$
DECLARE r record;
BEGIN
  RAISE NOTICE '─── Distinct target_fields AFTER pass-2 ───';
  FOR r IN
    SELECT unnest(target_fields) AS f, count(*) AS n
    FROM public.scholarships
    WHERE target_fields IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
  LOOP
    RAISE NOTICE '[after] % (%)', r.f, r.n;
  END LOOP;
END $$;
