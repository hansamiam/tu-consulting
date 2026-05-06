-- Aggregator URL detection — server-side flag for low-quality
-- official_url values pointing at third-party scholarship round-up
-- sites instead of the actual provider. Mirrors the client-side
-- isAggregatorUrl() check in src/pages/Discover.tsx so the data
-- layer can surface these rows for admin attention without us
-- having to scan urls manually.
--
-- Pattern: a few well-known aggregator hostnames. These pages list
-- many scholarships but aren't the official source for any single
-- one — sending applicants there usually wastes a click + a doubt
-- before they find the real provider page. Round 32 added scrape-
-- time + render-time defenses; this migration adds a stable column
-- so post-scrape inspection is one query, not a regex over a JSON
-- column.
--
-- The column is filled by a trigger on every INSERT/UPDATE so any
-- future scrape that lands an aggregator URL gets flagged
-- immediately. Backfill the existing rows once on migration apply.

-- 1. Add the flag column. Default null = "not yet checked";
--    true = flagged as aggregator; false = passes the check.
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS official_url_is_aggregator boolean;

-- 2. The hostname-set lives in a SQL function so client + server
--    references agree. When the list grows, we update one place.
CREATE OR REPLACE FUNCTION public.is_aggregator_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  host text;
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN false;
  END IF;
  -- Extract hostname from URL. Strip protocol, then take everything
  -- before the first "/" or ":" or "?" or "#". Lowercase + drop
  -- a leading "www." so the comparison is normalised.
  host := lower(regexp_replace(url, '^https?://', ''));
  host := split_part(host, '/', 1);
  host := split_part(host, ':', 1);
  host := split_part(host, '?', 1);
  host := split_part(host, '#', 1);
  IF host LIKE 'www.%' THEN host := substring(host from 5); END IF;

  -- Direct match or subdomain match (e.g. news.scholars4dev.com).
  RETURN host = ANY(ARRAY[
    'scholars4dev.com',
    'opportunitiesforyouth.org',
    'opportunitiestracker.ug',
    'opportunitydesk.org',
    'scholarshipsdb.net',
    'scholarship-positions.com',
    'after12.in',
    'buddy4study.com'
  ])
  OR host LIKE '%.scholars4dev.com'
  OR host LIKE '%.opportunitiesforyouth.org'
  OR host LIKE '%.opportunitiestracker.ug'
  OR host LIKE '%.opportunitydesk.org'
  OR host LIKE '%.scholarshipsdb.net'
  OR host LIKE '%.scholarship-positions.com'
  OR host LIKE '%.after12.in'
  OR host LIKE '%.buddy4study.com';
END
$$;

-- 3. Trigger keeps the flag fresh on every write. Cheap (function
--    is IMMUTABLE, no extra round-trips) so safe to run on every
--    INSERT/UPDATE. Only fires when official_url actually changes.
CREATE OR REPLACE FUNCTION public.tg_update_aggregator_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.official_url_is_aggregator := public.is_aggregator_url(NEW.official_url);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS scholarships_aggregator_flag_trg ON public.scholarships;
CREATE TRIGGER scholarships_aggregator_flag_trg
  BEFORE INSERT OR UPDATE OF official_url ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_update_aggregator_flag();

-- 4. Backfill the existing rows so the flag is correct from day one
--    rather than only on next-touch.
UPDATE public.scholarships
SET official_url_is_aggregator = public.is_aggregator_url(official_url)
WHERE official_url_is_aggregator IS DISTINCT FROM public.is_aggregator_url(official_url);

-- 5. Index for the admin queue: "show me every aggregator-URL row
--    so I can find a better source." Partial index — only carries
--    flagged rows so it stays small.
CREATE INDEX IF NOT EXISTS idx_scholarships_aggregator_url
  ON public.scholarships(official_url_is_aggregator)
  WHERE official_url_is_aggregator = true;

-- 6. Telemetry — log how many rows the backfill flagged so the
--    admin can see the scope of the problem in one query.
DO $$
DECLARE
  flagged_count int;
BEGIN
  SELECT count(*) INTO flagged_count
  FROM public.scholarships
  WHERE official_url_is_aggregator = true;
  RAISE NOTICE 'aggregator_url_flag: % rows flagged as pointing to third-party aggregators', flagged_count;
END
$$;
