-- Discover v1 — sync is_aggregator_url() with the full aggregator domain list
--
-- The Postgres function covered 8 domains; the inline regex in the G1-G11
-- publish-gate migration covered 13+ more. Result: when F13 (or any other
-- consumer) called is_aggregator_url() to decide whether to store a URL as
-- "official", it would falsely return false for IEFA, fastweb,
-- scholarship-portal, etc. — letting aggregator URLs through as official URLs
-- (the F10 anti-pattern).
--
-- Discovered during the 2026-05-23 gate backfill: 16 rows had iefa.org /
-- fastweb.com URLs stored as `official_url` because the function approved
-- them. The gate's inline regex caught them at backfill time, but F13's
-- per-candidate URL check (which calls this function) had let them through
-- originally.
--
-- This migration replaces the function with the full domain list. Safe to
-- apply — making the check stricter only catches more pollution, never
-- approves new bad URLs.

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
    -- Added 2026-05-23 to match the G1-G11 backfill regex
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
    'studyabroadaid.com'
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
