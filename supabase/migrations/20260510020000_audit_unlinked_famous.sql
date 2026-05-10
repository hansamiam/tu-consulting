-- Audit only: which scholarships look like they SHOULD be linked to a
-- registry funder but aren't yet?
DO $$
DECLARE r record; v_i int := 0;
BEGIN
  FOR r IN
    SELECT scholarship_name, provider_name
    FROM public.scholarships s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.providers p
      JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
      WHERE s.provider_id = p.provider_id
    )
    AND verification_status <> 'broken'
    AND (
      scholarship_name ~* '(commonwealth|chevening|fulbright|rhodes|schwarzman|gates|knight|marshall|mext|daad|aga khan|eiffel|manaaki|swedish institute|humphrey|asian development|british council|australia awards|erasmus|new zealand|france excellence)'
    )
    ORDER BY scholarship_name
  LOOP
    v_i := v_i + 1;
    IF v_i > 30 THEN EXIT; END IF;
    RAISE NOTICE '[unlinked %] name=% | provider=%', v_i, r.scholarship_name, r.provider_name;
  END LOOP;
  RAISE NOTICE '[unlinked_total] checked first %, more may exist', v_i;
END $$;
