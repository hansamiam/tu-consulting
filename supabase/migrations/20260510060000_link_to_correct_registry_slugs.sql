-- =============================================================================
-- Use the ACTUAL registry slugs (audit revealed my map was wrong)
-- =============================================================================
-- Registry slugs in provider_authoritative_facts (from 050000 audit):
--   aga-khan-foundation, australia-awards, chevening,
--   commonwealth-scholarship-commission, daad,
--   eiffel-excellence-scholarship-program, erasmus-mundus,
--   fulbright-program, gates-cambridge-scholarship,
--   hubert-h-humphrey-fellowship-program, inlaks-shivdasani-foundation,
--   knight-hennessy-scholars, korean-government-scholarship-program,
--   marshall-scholarships, mastercard-foundation-scholars-program,
--   mext, open-society-foundations, reach-oxford-scholarship,
--   rhodes-trust, schwarzman-scholars,
--   vanier-canada-graduate-scholarships, world-bank
-- =============================================================================

DO $$
DECLARE v_step int;
BEGIN
  WITH mappings(slug, name_pattern) AS (
    VALUES
      ('chevening',                              'chevening'),
      ('commonwealth-scholarship-commission',    'commonwealth\s+(scholar|master|shared|distance|phd|profess)'),
      ('daad',                                   '\mdaad\M|deutscher akademischer'),
      ('fulbright-program',                      'fulbright'),
      ('rhodes-trust',                           'rhodes\s+(scholar|trust)'),
      ('schwarzman-scholars',                    'schwarzman'),
      ('knight-hennessy-scholars',               'knight[\s\-]hennessy|knight\s+hennessy'),
      ('gates-cambridge-scholarship',            'gates\s+cambridge|gates\s+scholarsh'),
      ('marshall-scholarships',                  'marshall\s+scholar|^marshall\b'),
      ('mext',                                   '\mmext\b|japanese\s+government|monbukagakusho'),
      ('mastercard-foundation-scholars-program', 'mastercard\s+foundation|mastercard\s+scholar'),
      ('aga-khan-foundation',                    'aga\s+khan'),
      ('eiffel-excellence-scholarship-program',  'eiffel|france\s+excellence'),
      ('hubert-h-humphrey-fellowship-program',   'humphrey'),
      ('australia-awards',                       'australia\s+award'),
      ('erasmus-mundus',                         'erasmus\s+mundus|^erasmus\b'),
      ('inlaks-shivdasani-foundation',           'inlaks|shivdasani'),
      ('korean-government-scholarship-program',  'korean\s+government|kgsp\b|^global\s+korea'),
      ('open-society-foundations',               'open\s+society|osf\b|civil\s+society\s+leadership'),
      ('reach-oxford-scholarship',               'reach\s+oxford'),
      ('vanier-canada-graduate-scholarships',    'vanier'),
      ('world-bank',                             'world\s+bank|joint\s+japan/world|jj\/wbgsp')
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
  RAISE NOTICE '[link_correct] linked: %', v_step;
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
  RAISE NOTICE '[link_correct_after] scholarships linked: % / 213', v_count;
END $$;
