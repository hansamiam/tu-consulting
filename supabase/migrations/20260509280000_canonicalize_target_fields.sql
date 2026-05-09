-- =============================================================================
-- Canonicalize target_fields[] — kill duplicates from heuristic fills
-- =============================================================================
-- User report: filter shows Environmental + Environment, International +
-- International Relations, Humanity + Humanities + Social Sciences as
-- separate options. They came from a mix of LLM extractions and the
-- heuristic regex passes (180000 / 200000) using slightly different
-- labels for the same concept.
--
-- Approach: build a synonym map and rewrite every target_fields[] entry
-- to its canonical form. Run array_remove on duplicates inside each row.
-- Idempotent: applying twice is a no-op.
-- =============================================================================

-- Audit before
DO $$
DECLARE r record;
BEGIN
  RAISE NOTICE '─── Distinct target_fields BEFORE canonicalization ───';
  FOR r IN
    SELECT unnest(target_fields) AS f, count(*) AS n
    FROM public.scholarships
    WHERE target_fields IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
  LOOP
    RAISE NOTICE '[before] % (%)', r.f, r.n;
  END LOOP;
END $$;

-- Synonym → canonical map. Keep canonical labels short and Title Case.
CREATE OR REPLACE FUNCTION public._canonicalize_field(f text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    -- Engineering family
    WHEN lower(f) IN ('engineering', 'engineerings', 'engineering technology')
      THEN 'Engineering'

    -- Computer Science / AI / Software
    WHEN lower(f) IN ('computer science', 'computer sciences', 'cs', 'software', 'software engineering', 'computing', 'information technology', 'it', 'data science', 'ai', 'artificial intelligence', 'computer science & ai', 'computer science and ai')
      THEN 'Computer Science'

    -- Medicine / Public Health (collapse to one bucket; granular subfields lost
    -- to keep the filter list tractable)
    WHEN lower(f) IN ('medicine', 'medical', 'health', 'public health', 'medical sciences', 'healthcare', 'medicine, public health')
      THEN 'Medicine & Public Health'

    -- Law
    WHEN lower(f) IN ('law', 'legal', 'legal studies', 'jurisprudence')
      THEN 'Law'

    -- Business / MBA / Management
    WHEN lower(f) IN ('business', 'business administration', 'mba', 'management', 'business management')
      THEN 'Business'

    -- Economics
    WHEN lower(f) IN ('economics', 'economic', 'economic policy', 'finance', 'financial economics')
      THEN 'Economics'

    -- Public Policy / Government
    WHEN lower(f) IN ('public policy', 'policy', 'policy studies', 'government', 'public administration')
      THEN 'Public Policy'

    -- International Relations / Global Affairs / Diplomacy
    WHEN lower(f) IN ('international relations', 'international', 'global affairs', 'diplomacy', 'international studies', 'global studies', 'international affairs')
      THEN 'International Relations'

    -- Humanities / Arts / Literature — single bucket
    WHEN lower(f) IN ('humanities', 'humanity', 'arts', 'literature', 'arts & humanities', 'liberal arts', 'philosophy', 'history')
      THEN 'Humanities'

    -- Natural Sciences (Physics, Chemistry, Biology, etc.)
    WHEN lower(f) IN ('natural sciences', 'natural science', 'physics', 'chemistry', 'biology', 'biotech', 'biotechnology')
      THEN 'Natural Sciences'

    -- Mathematics / Statistics
    WHEN lower(f) IN ('mathematics', 'maths', 'math', 'statistics', 'statistic', 'applied mathematics')
      THEN 'Mathematics'

    -- Environment / Sustainability — collapse all variants
    WHEN lower(f) IN ('environment', 'environmental', 'environmental studies', 'environmental science', 'environmental sciences', 'sustainability', 'sustainable', 'climate', 'climate change', 'ecology', 'ecological')
      THEN 'Environmental Studies'

    -- Education / Teaching
    WHEN lower(f) IN ('education', 'teaching', 'pedagogy', 'pedagogical', 'educational')
      THEN 'Education'

    -- Architecture / Design / Urban Planning
    WHEN lower(f) IN ('architecture', 'design', 'urban planning', 'urban design', 'architecture & design', 'architecture, design')
      THEN 'Architecture & Design'

    -- STEM
    WHEN lower(f) IN ('stem', 'science technology engineering mathematics', 'science technology engineering and mathematics')
      THEN 'STEM'

    -- Women in STEM
    WHEN lower(f) IN ('women in stem', 'women in tech', 'women in science', 'women in technology')
      THEN 'Women in STEM'

    -- Social Sciences (incl. Sociology, Anthropology, etc.)
    WHEN lower(f) IN ('social sciences', 'social science', 'sociology', 'anthropology', 'political science', 'political sciences')
      THEN 'Social Sciences'

    -- Development Studies
    WHEN lower(f) IN ('development', 'development studies', 'developing solutions', 'international development')
      THEN 'Development Studies'

    -- Research
    WHEN lower(f) IN ('research', 'research studies', 'academic research')
      THEN 'Research'

    -- Leadership
    WHEN lower(f) IN ('leadership', 'leaders')
      THEN 'Leadership'

    -- Cultural Studies
    WHEN lower(f) IN ('cultural studies', 'cultural', 'culture')
      THEN 'Cultural Studies'

    -- All Fields (multidisciplinary, open-to-any)
    WHEN lower(f) IN ('all fields', 'multidisciplinary', 'multi-disciplinary', 'open to all', 'any field', 'all disciplines')
      THEN 'All Fields'

    -- Unknown — strip whitespace and Title Case the first letter
    ELSE initcap(trim(f))
  END
$$;

-- Rewrite every row's target_fields[] using the canonical mapper.
-- array_agg DISTINCT collapses duplicates within a single row (e.g.
-- ['Environmental', 'Environment'] → ['Environmental Studies']).
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
  RAISE NOTICE '[canonicalize] target_fields rewritten: % row(s)', v_count;
END $$;

-- Audit after
DO $$
DECLARE r record;
BEGIN
  RAISE NOTICE '─── Distinct target_fields AFTER canonicalization ───';
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
