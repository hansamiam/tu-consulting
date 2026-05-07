-- =============================================================================
-- Backfill host_country from scholarship + provider name patterns
-- =============================================================================
-- The LLM extractor sometimes leaves host_country empty even when the
-- program name clearly implies its country (Chevening = UK, DAAD =
-- Germany, Fulbright = US, MEXT = Japan, East-West Center = US/Hawaii).
-- Without host_country the silhouette + colour treatment fall through
-- to the generic "Multiple countries" globe — losing the visual identity.
--
-- This migration:
--
--   1. Adds infer_host_country(scholarship_name, provider_name) SQL
--      function — mirror of inferHostCountryFromNames() in
--      _shared/scholarshipFields.ts. Keep the two in sync.
--
--   2. UPDATE pass over public.scholarships filling NULL/empty
--      host_country from the function. Conservative — only touches rows
--      where host_country is null OR empty OR 'Unknown'/'Various'.
--
-- Going forward, scrape-source calls inferHostCountryFromNames() at
-- ingest time, so new rows benefit from the same patterns without
-- needing a re-backfill.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.infer_host_country(
  p_name text,
  p_provider text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hay text;
BEGIN
  hay := COALESCE(p_name, '') || ' | ' || COALESCE(p_provider, '');
  IF length(trim(hay)) < 4 THEN RETURN NULL; END IF;

  -- Patterns ordered by specificity — most-specific first. Keep in
  -- sync with COUNTRY_PATTERNS in _shared/scholarshipFields.ts.

  -- ─── United Kingdom ──────────────────────────────────────────────
  IF hay ~* '\mchevening\M' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mgates cambridge\M' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mrhodes scholar' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mclarendon\M' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mweidenfeld[\-\s]?hoffmann' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mcommonwealth scholarship' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mmarshall scholar' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\moxford\M|\mcambridge\M' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mbritish\s+council\M' THEN RETURN 'United Kingdom'; END IF;
  IF hay ~* '\mcambridge trust\M' THEN RETURN 'United Kingdom'; END IF;

  -- ─── Germany ─────────────────────────────────────────────────────
  IF hay ~* '\mdaad\M|\mdeutscher? akademisch' THEN RETURN 'Germany'; END IF;
  IF hay ~* '\mheinrich b[oö]ll\M' THEN RETURN 'Germany'; END IF;
  IF hay ~* '\mkonrad[\-\s]?adenauer\M' THEN RETURN 'Germany'; END IF;
  IF hay ~* '\mfriedrich[\-\s]?ebert\M' THEN RETURN 'Germany'; END IF;
  IF hay ~* '\mrosa luxemburg\M' THEN RETURN 'Germany'; END IF;
  IF hay ~* '\mhans[\-\s]?b[oö]ckler\M' THEN RETURN 'Germany'; END IF;
  IF hay ~* '\mhumboldt\M.*(scholar|stipend|fellow)' THEN RETURN 'Germany'; END IF;
  IF hay ~* '\mdeutschlandstipendium\M' THEN RETURN 'Germany'; END IF;

  -- ─── United States ───────────────────────────────────────────────
  IF hay ~* '\mfulbright\M' THEN RETURN 'United States'; END IF;
  IF hay ~* '\meast[\-\s]?west center\M' THEN RETURN 'United States'; END IF;
  IF hay ~* '\mknight[\-\s]?hennessy\M' THEN RETURN 'United States'; END IF;
  IF hay ~* '\mp\.?d\.?soros\M|\mpaul.{0,4}daisy soros\M' THEN RETURN 'United States'; END IF;
  IF hay ~* '\mjack kent cooke\M' THEN RETURN 'United States'; END IF;
  IF hay ~* '\mgates millennium\M' THEN RETURN 'United States'; END IF;
  IF hay ~* '\mcoca[\-\s]?cola scholar' THEN RETURN 'United States'; END IF;
  IF hay ~* '\mhispanic scholarship fund\M' THEN RETURN 'United States'; END IF;
  IF hay ~* '\m(harvard|yale|princeton|stanford|mit|columbia|cornell|dartmouth|brown|penn|nyu|ucla|berkeley|chicago|northwestern|duke)\M' THEN RETURN 'United States'; END IF;

  -- ─── France ──────────────────────────────────────────────────────
  IF hay ~* '\meiffel\s+excellence\M|\meiffel\s+scholar' THEN RETURN 'France'; END IF;
  IF hay ~* '\mcampus\s?france\M' THEN RETURN 'France'; END IF;
  IF hay ~* '\msorbonne\M|\mpsl\M|\msciences\s+po\M' THEN RETURN 'France'; END IF;

  -- ─── Japan ───────────────────────────────────────────────────────
  IF hay ~* '\mmext\M|\mmonbukagakusho\M' THEN RETURN 'Japan'; END IF;
  IF hay ~* '\mjasso\M' THEN RETURN 'Japan'; END IF;
  IF hay ~* '\m(tokyo|kyoto|osaka|waseda|keio)\s+university\M' THEN RETURN 'Japan'; END IF;

  -- ─── China ───────────────────────────────────────────────────────
  IF hay ~* '\mschwarzman\s+scholar' THEN RETURN 'China'; END IF;
  IF hay ~* '\myenching\s+(academy|scholar)\M' THEN RETURN 'China'; END IF;
  IF hay ~* '\m(tsinghua|peking|fudan|shanghai jiao tong)\M' THEN RETURN 'China'; END IF;
  IF hay ~* '\m(chinese|china)\s+government\s+scholarship\M' THEN RETURN 'China'; END IF;

  -- ─── South Korea ─────────────────────────────────────────────────
  IF hay ~* '\mkgsp\M|\mkorean? government scholarship\M|\mglobal korea scholarship\M' THEN RETURN 'South Korea'; END IF;
  IF hay ~* '\m(seoul national|kaist|postech|yonsei)\M' THEN RETURN 'South Korea'; END IF;

  -- ─── Canada ──────────────────────────────────────────────────────
  IF hay ~* '\mvanier\s+canada\M|\mvanier\s+scholar' THEN RETURN 'Canada'; END IF;
  IF hay ~* '\mtrudeau\s+(scholar|foundation)\M' THEN RETURN 'Canada'; END IF;
  IF hay ~* '\m(university of toronto|mcgill|ubc|waterloo)\M' THEN RETURN 'Canada'; END IF;

  -- ─── Australia ───────────────────────────────────────────────────
  IF hay ~* '\maustralia\s+awards?\M|\mdfat\M.*scholar' THEN RETURN 'Australia'; END IF;
  IF hay ~* '\m(university of melbourne|sydney|anu|monash|unsw|uq\M|queensland)\M' THEN RETURN 'Australia'; END IF;

  -- ─── Switzerland / Sweden / Netherlands / Singapore / NZ / Brazil / Malaysia
  IF hay ~* '\m(swiss\s+government|eth\s+z[uü]rich|epfl)\M' THEN RETURN 'Switzerland'; END IF;
  IF hay ~* '\mswedish\s+institute\M' THEN RETURN 'Sweden'; END IF;
  IF hay ~* '\morange\s+knowledge\M|\mholland\s+scholar' THEN RETURN 'Netherlands'; END IF;
  IF hay ~* '\m(singapore international|nus|smu|nanyang technological|national university of singapore)\M' THEN RETURN 'Singapore'; END IF;
  IF hay ~* '\mnew zealand\s+(government|aid|scholar)' THEN RETURN 'New Zealand'; END IF;
  IF hay ~* '\m(university of auckland|otago|victoria university of wellington)\M' THEN RETURN 'New Zealand'; END IF;
  IF hay ~* '\mfapesp\M|\mcapes\M|\mcnpq\M' THEN RETURN 'Brazil'; END IF;
  IF hay ~* '\mkhazanah\M' THEN RETURN 'Malaysia'; END IF;

  -- ─── Multi-country ───────────────────────────────────────────────
  IF hay ~* '\merasmus\s+mundus\M' THEN RETURN 'Multiple countries'; END IF;
  IF hay ~* '\maga\s+khan\s+(foundation|development)' THEN RETURN 'Multiple countries'; END IF;
  IF hay ~* '\mrotary\s+peace\s+(fellow|scholar)' THEN RETURN 'Multiple countries'; END IF;
  IF hay ~* '\mmastercard\s+foundation\s+scholar' THEN RETURN 'Multiple countries'; END IF;

  -- ─── Generic provider keywords (last) ────────────────────────────
  IF hay ~* '\m(government of |republic of )?ireland\M' THEN RETURN 'Ireland'; END IF;
  IF hay ~* '\m(government of |united states of )?(america|usa)\M' THEN RETURN 'United States'; END IF;

  RETURN NULL;
END
$$;

GRANT EXECUTE ON FUNCTION public.infer_host_country(text, text) TO service_role;

-- ─── Backfill existing rows ────────────────────────────────────────
-- Only touch rows where host_country is missing-as-data: NULL, empty
-- string, or known catch-all sentinels. Don't override an existing
-- specific country even if the inference would say something different
-- (the LLM may have caught a nuance the regex misses).
WITH inferred AS (
  SELECT
    s.scholarship_id,
    public.infer_host_country(s.scholarship_name, s.provider_name) AS new_country
  FROM public.scholarships s
  WHERE s.host_country IS NULL
     OR trim(s.host_country) = ''
     OR lower(trim(s.host_country)) IN ('unknown', 'various', 'n/a', 'tbd')
)
UPDATE public.scholarships sc
SET host_country = inferred.new_country
FROM inferred
WHERE sc.scholarship_id = inferred.scholarship_id
  AND inferred.new_country IS NOT NULL;
