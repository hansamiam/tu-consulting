-- 2026-05-24: expand is_aggregator_url() denylist to match the
-- TS-side AGGREGATOR_HOSTS list in supabase/functions/_shared/aggregator-hosts.ts.
-- New entries:
--   - oyaop.com — now an active discovery hub. Its listing URLs must
--     never be stored as a row's official_url; canonical-extract's
--     G3b gate uses this function to reject aggregator URLs.
--   - mastersportal.com / bachelorsportal.com / phdportal.com — the
--     Studyportals family (studyportals.com already listed). 3+ rows
--     in source_url hit mastersportal.com already.
--   - scholarshipowl.com — email-capture-wall lead-gen aggregator.
--   - scholarshippoints.com / niche.com / chegg.com — US scholarship
--     search portals that frequently rank above the real funder page.
--     Preempt catalog pollution.
--
-- Same regex/check pattern as the previous expand migration
-- (20260523000000). Safe to apply — stricter denylist only catches more
-- pollution, never approves new bad URLs.

CREATE OR REPLACE FUNCTION public.is_aggregator_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  host text;
  aggregator_domains text[] := ARRAY[
    -- Original 8
    'scholars4dev.com',
    'opportunitiesforyouth.org',
    'opportunitiestracker.ug',
    'opportunitydesk.org',
    'scholarshipsdb.net',
    'scholarship-positions.com',
    'after12.in',
    'buddy4study.com',
    -- 2026-05-23 batch (sync'd with G1-G11 backfill regex)
    'opportunitiesforafricans.com',
    'scholarshippanda.com',
    'iefa.org',
    'mladiinfo.eu',
    'profellow.com',
    'fastweb.com',
    'scholarshipportal.com',
    'scholarshipsads.com',
    'opportunitiescorner.info',
    'afterschoolafrica.com',
    'topuniversities.com',
    'studyportals.com',
    'iie.org',
    'erudera.com',
    'studyabroad.com',
    'opportunitiesforinternationalstudents.com',
    'studyabroadaid.com',
    'opportunitytracker.ug',
    -- 2026-05-24 batch
    'oyaop.com',
    'mastersportal.com',
    'bachelorsportal.com',
    'phdportal.com',
    'scholarshipowl.com',
    'scholarshippoints.com',
    'niche.com',
    'chegg.com'
  ];
  d text;
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN false;
  END IF;
  host := lower(regexp_replace(url, '^https?://', ''));
  host := split_part(host, '/', 1);
  host := split_part(host, ':', 1);
  host := split_part(host, '?', 1);
  host := split_part(host, '#', 1);
  IF host LIKE 'www.%' THEN host := substring(host from 5); END IF;

  FOREACH d IN ARRAY aggregator_domains LOOP
    IF host = d OR host LIKE ('%.' || d) THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END
$function$;
