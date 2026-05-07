-- =============================================================================
-- Backfill estimated_total_value_usd for known programs
-- =============================================================================
-- Way too many catalog rows show "Tuition covered" or "Stipend" with NULL
-- estimated_total_value_usd, because the LLM left the field blank when
-- the page didn't print a $ figure. But for the famous programs the
-- realistic full-cycle total is publicly known and stable year-over-year.
--
-- Without this floor, sorting by funding value pushes Chevening / Rhodes /
-- Schwarzman to the bottom because their structured value is null. The
-- "Funding potential" hero stat in the brief sums NULL → useless.
--
-- This migration:
--
--   1. Adds known_program_value_usd(name, provider) SQL function —
--      mirror of knownProgramValueUsd() in _shared/scholarshipFields.ts.
--      Keep in sync.
--
--   2. UPDATE pass over public.scholarships filling NULL/zero
--      estimated_total_value_usd from the function output.
--
-- Going forward, scrape-source applies the same fallback at ingest, so
-- new well-known programs benefit without needing re-backfill.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.known_program_value_usd(
  p_name text,
  p_provider text
) RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hay text;
BEGIN
  hay := COALESCE(p_name, '') || ' | ' || COALESCE(p_provider, '');
  IF length(trim(hay)) < 4 THEN RETURN NULL; END IF;

  -- Patterns ordered as in TS knownProgramValueUsd. Keep in sync.

  -- ─── United Kingdom ──────────────────────────────────────────────
  IF hay ~* '\mchevening\M'                               THEN RETURN 60000;  END IF;
  IF hay ~* '\mrhodes scholar'                            THEN RETURN 90000;  END IF;
  IF hay ~* '\mgates cambridge\M'                         THEN RETURN 95000;  END IF;
  IF hay ~* '\mclarendon\M'                               THEN RETURN 80000;  END IF;
  IF hay ~* '\mcommonwealth scholarship\M'                THEN RETURN 50000;  END IF;
  IF hay ~* '\mweidenfeld[\-\s]?hoffmann\M'               THEN RETURN 80000;  END IF;
  IF hay ~* '\mcambridge trust\M'                         THEN RETURN 70000;  END IF;
  IF hay ~* '\mmarshall scholar'                          THEN RETURN 100000; END IF;

  -- ─── United States ───────────────────────────────────────────────
  IF hay ~* '\mfulbright\M'                               THEN RETURN 55000;  END IF;
  IF hay ~* '\mknight[\-\s]?hennessy\M'                   THEN RETURN 250000; END IF;
  IF hay ~* '\mjack kent cooke\M'                         THEN RETURN 220000; END IF;
  IF hay ~* '\mp\.?d\.?soros\M'                           THEN RETURN 90000;  END IF;
  IF hay ~* '\mgates millennium\M'                        THEN RETURN 200000; END IF;
  IF hay ~* '\meast[\-\s]?west center\M'                  THEN RETURN 70000;  END IF;
  IF hay ~* '\mhispanic scholarship fund\M'               THEN RETURN 10000;  END IF;
  IF hay ~* '\mcoca[\-\s]?cola scholar'                   THEN RETURN 20000;  END IF;

  -- ─── Germany ─────────────────────────────────────────────────────
  IF hay ~* '\mdaad\M'                                    THEN RETURN 30000;  END IF;
  IF hay ~* '\mdeutschlandstipendium\M'                   THEN RETURN 8000;   END IF;
  IF hay ~* '\mheinrich b[oö]ll\M'                        THEN RETURN 25000;  END IF;
  IF hay ~* '\mkonrad[\-\s]?adenauer\M'                   THEN RETURN 25000;  END IF;

  -- ─── Asia ────────────────────────────────────────────────────────
  IF hay ~* '\mschwarzman scholar'                        THEN RETURN 125000; END IF;
  IF hay ~* '\myenching\s+(academy|scholar)'              THEN RETURN 100000; END IF;
  IF hay ~* '\mmext\M|\mmonbukagakusho\M'                 THEN RETURN 50000;  END IF;
  IF hay ~* '\mkgsp\M|\mglobal korea scholarship\M'       THEN RETURN 35000;  END IF;

  -- ─── Europe / France ─────────────────────────────────────────────
  IF hay ~* '\meiffel\M.*scholar'                         THEN RETURN 18000;  END IF;
  IF hay ~* '\merasmus\s+mundus\M'                        THEN RETURN 50000;  END IF;

  -- ─── Canada / Australia ──────────────────────────────────────────
  IF hay ~* '\mvanier\s+canada\M|\mvanier\s+scholar'      THEN RETURN 150000; END IF;
  IF hay ~* '\mtrudeau\s+(scholar|foundation)\M'          THEN RETURN 250000; END IF;
  IF hay ~* '\maustralia\s+awards?\M'                     THEN RETURN 80000;  END IF;

  -- ─── Multi-country ───────────────────────────────────────────────
  IF hay ~* '\maga\s+khan\s+(foundation|development)'     THEN RETURN 60000;  END IF;
  IF hay ~* '\mmastercard\s+foundation\s+scholar'         THEN RETURN 120000; END IF;
  IF hay ~* '\mrotary\s+peace\s+(fellow|scholar)'         THEN RETURN 75000;  END IF;

  RETURN NULL;
END
$$;

GRANT EXECUTE ON FUNCTION public.known_program_value_usd(text, text) TO service_role;

-- ─── Backfill existing rows ────────────────────────────────────────
-- Only touch rows where estimated_total_value_usd is missing (NULL or 0).
-- Don't overwrite an existing nonzero value — the page-extracted figure
-- is presumably more accurate than our floor.
WITH inferred AS (
  SELECT
    s.scholarship_id,
    public.known_program_value_usd(s.scholarship_name, s.provider_name) AS new_value
  FROM public.scholarships s
  WHERE s.estimated_total_value_usd IS NULL
     OR s.estimated_total_value_usd = 0
)
UPDATE public.scholarships sc
SET estimated_total_value_usd = inferred.new_value
FROM inferred
WHERE sc.scholarship_id = inferred.scholarship_id
  AND inferred.new_value IS NOT NULL;
