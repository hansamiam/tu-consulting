-- =============================================================================
-- Pass 2 — fix the linking heuristic so it actually relinks rows already
-- bound to a non-registry provider row.
-- =============================================================================

DO $$
DECLARE v_step int;
BEGIN
  WITH mappings(slug, name_pattern) AS (
    VALUES
      ('chevening',                          'chevening'),
      ('commonwealth-scholarship-commission','^commonwealth\s+'),
      ('daad',                               '^daad\b|deutscher akademischer'),
      ('fulbright-program',                  'fulbright'),
      ('rhodes-trust',                       'rhodes\s+scholar|rhodes\s+trust'),
      ('schwarzman-scholars',                'schwarzman'),
      ('knight-hennessy-scholars',           'knight[\s\-]hennessy'),
      ('gates-cambridge-trust',              'gates\s+cambridge'),
      ('marshall-aid-commemoration-commission','marshall\s+scholar'),
      ('mext-japan',                         'mext\b|^japanese\s+government'),
      ('mastercard-foundation',              'mastercard\s+foundation'),
      ('aga-khan-foundation',                '^aga\s+khan|akf\s+isp'),
      ('eiffel-excellence-scholarship-program','eiffel|france\s+excellence'),
      ('manaaki-new-zealand',                'manaaki|new\s+zealand'),
      ('swedish-institute',                  'swedish\s+institute|^si\s+scholarship'),
      ('hubert-humphrey-fellowship-program', 'humphrey'),
      ('asian-development-bank-japan',       'asian\s+development\s+bank|adb[\s-]?japan|adb\s+jsp|adb-jsp'),
      ('british-council',                    'british\s+council'),
      ('australia-awards',                   'australia\s+awards'),
      ('erasmus-mundus',                     'erasmus\s+mundus|^erasmus\b')
  ),
  candidates AS (
    SELECT DISTINCT ON (s.scholarship_id)
      s.scholarship_id, p.provider_id
    FROM public.scholarships s
    CROSS JOIN LATERAL (
      SELECT m.slug FROM mappings m WHERE s.scholarship_name ~* m.name_pattern LIMIT 1
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
  RAISE NOTICE '[link_pass2] scholarships re-linked to registry-tracked provider: %', v_step;
END $$;

DO $$
DECLARE v_schols_with_paf_provider int;
BEGIN
  SELECT count(*) INTO v_schols_with_paf_provider
  FROM public.scholarships s
  WHERE s.provider_id IN (
    SELECT p.provider_id FROM public.providers p
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  );
  RAISE NOTICE '[link_pass2] scholarships now linked to a registry funder: % / 213', v_schols_with_paf_provider;
END $$;
