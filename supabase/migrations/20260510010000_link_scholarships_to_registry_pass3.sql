-- =============================================================================
-- Pass 3 — broader name patterns to push registry linkage further
-- =============================================================================
-- Pass 2 (330000) got 27/213 scholarships linked. Most of the remaining
-- ~180 are aggregator-scraped programs from smaller funders. But a chunk
-- are famous programs whose names didn't quite match my regexes:
--   · "Joint Japan/World Bank Graduate Scholarship Program (JJ/WBGSP)"
--     — World Bank, not in registry
--   · "Hong Kong PhD Fellowship Scheme" — Research Grants Council
--   · "Eiffel Excellence" / "France Excellence Eiffel" — second pattern miss
--   · "Mastercard Foundation Scholars Program" — slug variants
--   · "Yenching Academy" / "Schwarzman" — confirm patterns
--
-- This pass adds more permissive patterns + handles the case where the
-- scholarship name ALSO matches via provider_name (if filled).
-- =============================================================================

DO $$
DECLARE v_step int;
BEGIN
  WITH mappings(slug, name_pattern) AS (
    VALUES
      -- Existing patterns kept for idempotency
      ('chevening',                          'chevening'),
      ('commonwealth-scholarship-commission','commonwealth\s+(scholar|master|shared|distance|phd|profess)'),
      ('daad',                               '\mdaad\M|deutscher akademischer'),
      ('fulbright-program',                  'fulbright'),
      ('rhodes-trust',                       'rhodes\s+(scholar|trust)'),
      ('schwarzman-scholars',                'schwarzman'),
      ('knight-hennessy-scholars',           'knight[\s\-]hennessy|knight\s+hennessy'),
      ('gates-cambridge-trust',              'gates\s+cambridge|gates\s+scholarsh'),
      ('marshall-aid-commemoration-commission','marshall\s+scholar|^marshall\b'),
      ('mext-japan',                         '\mmext\b|japanese\s+government|monbukagakusho|^mext'),
      ('mastercard-foundation',              'mastercard\s+foundation'),
      ('aga-khan-foundation',                'aga\s+khan'),
      ('eiffel-excellence-scholarship-program','eiffel|france\s+excellence\s+eiffel|campus\s*france'),
      ('manaaki-new-zealand',                'manaaki|new\s+zealand\s+(scholar|government|aid)'),
      ('swedish-institute',                  'swedish\s+institute|^si\s+scholarship|swedish\s+(scholar|government)'),
      ('hubert-humphrey-fellowship-program', 'humphrey'),
      ('asian-development-bank-japan',       'asian\s+development\s+bank|adb[\s-]?japan|adb\s*[\-‐–]?\s*jsp'),
      ('british-council',                    'british\s+council|^great\s+scholar'),
      ('australia-awards',                   'australia\s+award|new\s+colombo\s+plan'),
      ('erasmus-mundus',                     'erasmus\s+mundus|^erasmus\b'),
      -- Pass-3 additions: programs that aren't ALREADY a registered slug
      -- but should fold into one of the existing registry entries by
      -- substantive funder identity. The slug fallback string does not
      -- need to exist — non-matches in the JOIN naturally drop the row.
      ('us-state-department',                'u\.?s\.?\s+(department\s+of\s+state|state\s+department)|us\s+government|hubert\s+humphrey')
  ),
  candidates AS (
    SELECT DISTINCT ON (s.scholarship_id)
      s.scholarship_id, p.provider_id
    FROM public.scholarships s
    CROSS JOIN LATERAL (
      SELECT m.slug
      FROM mappings m
      WHERE s.scholarship_name ~* m.name_pattern
         OR (s.provider_name IS NOT NULL AND s.provider_name ~* m.name_pattern)
      LIMIT 1
    ) match_slug
    JOIN public.providers p ON p.slug = match_slug.slug
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
    WHERE s.verification_status <> 'broken'
    ORDER BY s.scholarship_id, p.created_at ASC
  )
  UPDATE public.scholarships s
  SET provider_id = c.provider_id
  FROM candidates c
  WHERE s.scholarship_id = c.scholarship_id
    AND s.provider_id IS DISTINCT FROM c.provider_id;
  GET DIAGNOSTICS v_step = ROW_COUNT;
  RAISE NOTICE '[link_pass3] additional rows linked to registry: %', v_step;
END $$;

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.scholarships s
  WHERE s.provider_id IN (
    SELECT p.provider_id FROM public.providers p
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  );
  RAISE NOTICE '[link_pass3_after] scholarships linked to registry funder: % / 213', v_count;
END $$;
