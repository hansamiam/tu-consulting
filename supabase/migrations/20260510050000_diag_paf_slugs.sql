-- Show all 22 registry slugs to find the actual seeded names.
DO $$
DECLARE r record; v_i int := 0;
BEGIN
  FOR r IN SELECT provider_slug FROM public.provider_authoritative_facts ORDER BY provider_slug
  LOOP
    v_i := v_i + 1;
    RAISE NOTICE '[paf %] %', v_i, r.provider_slug;
  END LOOP;
END $$;
