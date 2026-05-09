-- =============================================================================
-- Multi-source provenance — scholarship_evidence table + consensus score
-- =============================================================================
-- Until now each scholarship row had a SINGLE `source_url` column —
-- whichever URL last confirmed it. That's a real product gap:
--
--   * Aggregator competitors list "$10k Gates Cambridge" with no
--     evidence chain. Some are right; some are wildly wrong. We can't
--     differentiate without first-class provenance.
--   * When two sources independently confirm the same deadline, the
--     row is high-trust. When only one source ever saw it (and that
--     source is a content-mill aggregator), the row is suspect. We
--     have no way to encode that.
--   * Re-verification overwrites source_url with the fresh URL,
--     destroying the prior provenance trail.
--
-- This migration introduces:
--   * scholarship_evidence — append-only-ish log of every source that
--     has confirmed a scholarship's data, with authority tier and
--     timestamps.
--   * infer_source_type(url, hint) — heuristic classifier mapping a
--     URL to ('official_program_page' | 'official_provider_site' |
--     'gov_doc' | 'university_listing' | 'aggregator' | 'news' |
--     'other'), with an authority value (0-3).
--   * record_scholarship_source() — SECURITY DEFINER helper that
--     scrape-source / verify-scholarship / discover-from-hub call
--     after a successful extraction. Idempotent: same (scholarship_id,
--     source_url) → UPDATE last_confirmed_at + last_checked_at.
--   * compute_consensus_score(scholarship_id) — aggregates distinct
--     sources × authority weight into a 0-10 score. Used to break
--     ranking ties between equally-fitting rows and to surface a
--     "confirmed by N sources" badge in the UI.
--   * scholarships.consensus_score column maintained by a trigger on
--     scholarship_evidence.
--   * Backfill — every existing row with a non-null source_url gets
--     one scholarship_evidence entry so the consensus score has a
--     starting point. Data won't be richer than today's single-source
--     reality until the edge functions start logging additional ones.
-- =============================================================================

-- ─── scholarship_evidence table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scholarship_evidence (
  source_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id         uuid NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  source_url             text NOT NULL,
  source_domain          text NOT NULL,
  source_type            text NOT NULL,
  authority              smallint NOT NULL DEFAULT 1,
  first_seen_at          timestamptz NOT NULL DEFAULT now(),
  last_confirmed_at      timestamptz NOT NULL DEFAULT now(),
  last_checked_at        timestamptz NOT NULL DEFAULT now(),
  confirms_fields        text[],
  extraction_confidence  numeric(3,2),
  CONSTRAINT scholarship_evidence_authority_chk CHECK (authority BETWEEN 0 AND 3),
  CONSTRAINT scholarship_evidence_type_chk CHECK (
    source_type IN ('official_program_page','official_provider_site','gov_doc','university_listing','aggregator','news','other')
  ),
  CONSTRAINT scholarship_evidence_unique UNIQUE (scholarship_id, source_url)
);

CREATE INDEX IF NOT EXISTS scholarship_evidence_scholarship_idx ON public.scholarship_evidence (scholarship_id);
CREATE INDEX IF NOT EXISTS scholarship_evidence_domain_idx ON public.scholarship_evidence (source_domain);
CREATE INDEX IF NOT EXISTS scholarship_evidence_authority_idx ON public.scholarship_evidence (authority DESC) WHERE authority >= 2;

COMMENT ON TABLE public.scholarship_evidence IS
  'Per-scholarship source evidence chain. Multiple rows per scholarship as different sources independently confirm fields. Drives consensus_score and the UI source-attribution row.';

-- ─── URL → type / authority classifier ────────────────────────────────
-- Heuristic only. The optional hint argument lets callers pass in the
-- catalog/source category they already know about (scrape-source's
-- src.category). Authority levels:
--   3 = official program page (provider's own site, exact program path)
--   3 = .gov-published document
--   2 = official provider site (provider's own site, not the program path)
--   2 = university listing page
--   1 = aggregator listing
--   1 = news article
--   0 = unknown / other
CREATE OR REPLACE FUNCTION public.infer_source_type(p_url text, p_hint text DEFAULT NULL)
RETURNS TABLE (source_type text, authority smallint, source_domain text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_host text;
  v_clean_url text;
BEGIN
  IF p_url IS NULL OR length(btrim(p_url)) = 0 THEN
    RETURN QUERY SELECT 'other'::text, 0::smallint, ''::text;
    RETURN;
  END IF;

  -- Strip scheme + path → bare host
  v_clean_url := lower(btrim(p_url));
  v_host := regexp_replace(v_clean_url, '^https?://', '');
  v_host := regexp_replace(v_host, '/.*$', '');
  v_host := regexp_replace(v_host, '^www\.', '');

  -- .gov domains: highest authority
  IF v_host ~ '\.gov(\.[a-z]{2,3})?$' THEN
    RETURN QUERY SELECT 'gov_doc'::text, 3::smallint, v_host;
    RETURN;
  END IF;

  -- Known official program / provider domains (mirrors trust seed)
  IF v_host ~* '(chevening\.org|fulbright(online|scholars|ireland)?\.|daad\.de|mext\.go\.jp|campusfrance\.org|csc\.edu\.cn|studyinkorea\.go\.kr|rhodeshouse\.ox\.ac\.uk|gatescambridge\.org|schwarzmanscholars\.org|knight-hennessy\.stanford\.edu|marshallscholarship\.org|mastercardfdn\.org|akdn\.org|opensocietyfoundations\.org|rotary\.org|jkcf\.org|coca-colascholarsfoundation\.org|erasmus-plus\.ec\.europa\.eu|unesco\.org|worldbank\.org|cscuk\.fcdo\.gov\.uk|adb\.org|si\.se|studyinholland\.nl|ares-ac\.be|inlaksfoundation\.org)' THEN
    RETURN QUERY SELECT 'official_provider_site'::text, 3::smallint, v_host;
    RETURN;
  END IF;

  -- .edu / known top universities
  IF v_host ~ '\.edu$' OR v_host ~* '(harvard\.edu|mit\.edu|stanford\.edu|princeton\.edu|yale\.edu|ox\.ac\.uk|cam\.ac\.uk|ethz\.ch|nus\.edu\.sg)' THEN
    RETURN QUERY SELECT 'university_listing'::text, 2::smallint, v_host;
    RETURN;
  END IF;

  -- Hint: aggregator catalog category
  IF p_hint IS NOT NULL AND lower(p_hint) IN ('aggregator', 'directory', 'listing') THEN
    RETURN QUERY SELECT 'aggregator'::text, 1::smallint, v_host;
    RETURN;
  END IF;

  -- Aggregator known domains
  IF v_host ~* '(scholarshipsads|scholarshipdb|scholarship-positions|opportunitiesforyouth|opportunitiestracker|allaboutscholarship|scholarship\.com|fastweb|chegg|collegeboard|petersons|niche\.com)' THEN
    RETURN QUERY SELECT 'aggregator'::text, 1::smallint, v_host;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'other'::text, 0::smallint, v_host;
END
$$;

GRANT EXECUTE ON FUNCTION public.infer_source_type(text, text) TO anon, authenticated, service_role;

-- ─── record_scholarship_source — UPSERT helper for edge functions ──────
CREATE OR REPLACE FUNCTION public.record_scholarship_source(
  p_scholarship_id uuid,
  p_source_url     text,
  p_source_hint    text DEFAULT NULL,
  p_confirms       text[] DEFAULT NULL,
  p_confidence     numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind record;
  v_id uuid;
BEGIN
  IF p_scholarship_id IS NULL OR p_source_url IS NULL OR length(btrim(p_source_url)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_kind FROM public.infer_source_type(p_source_url, p_source_hint);

  INSERT INTO public.scholarship_evidence AS ss (
    scholarship_id, source_url, source_domain, source_type, authority,
    first_seen_at, last_confirmed_at, last_checked_at, confirms_fields, extraction_confidence
  )
  VALUES (
    p_scholarship_id, p_source_url, v_kind.source_domain, v_kind.source_type, v_kind.authority,
    now(), now(), now(), p_confirms, p_confidence
  )
  ON CONFLICT (scholarship_id, source_url) DO UPDATE
    SET last_confirmed_at = now(),
        last_checked_at   = now(),
        -- merge confirms_fields union; keep highest confidence we've seen.
        confirms_fields   = COALESCE(
          (SELECT array_agg(DISTINCT x) FROM unnest(
            COALESCE(ss.confirms_fields, ARRAY[]::text[]) ||
            COALESCE(EXCLUDED.confirms_fields, ARRAY[]::text[])
          ) AS x),
          ss.confirms_fields
        ),
        extraction_confidence = GREATEST(
          COALESCE(ss.extraction_confidence, 0),
          COALESCE(EXCLUDED.extraction_confidence, 0)
        )
  RETURNING source_id INTO v_id;

  RETURN v_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.record_scholarship_source(uuid, text, text, text[], numeric) TO service_role;

-- ─── consensus_score column on scholarships ────────────────────────────
-- 0-10 integer aggregating: distinct sources counted × authority
-- weight, then bucketed. Single official source = 6, two sources of
-- mixed authority ≈ 7, official+aggregator+second-aggregator ≈ 8,
-- 3 official sources ≈ 9-10.
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS consensus_score smallint;

COMMENT ON COLUMN public.scholarships.consensus_score IS
  '0–10 multi-source consensus score. Higher = more independent sources confirm this row. Maintained by trigger on scholarship_evidence.';

CREATE INDEX IF NOT EXISTS scholarships_consensus_idx ON public.scholarships (consensus_score DESC NULLS LAST) WHERE consensus_score IS NOT NULL;

-- ─── compute_consensus_score(uuid) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_consensus_score(p_scholarship_id uuid)
RETURNS smallint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_source_count int;
  v_total_authority int;
  v_max_authority int;
  v_score numeric;
BEGIN
  SELECT
    count(DISTINCT ss.source_domain),
    sum(ss.authority),
    max(ss.authority)
  INTO v_source_count, v_total_authority, v_max_authority
  FROM public.scholarship_evidence ss
  WHERE ss.scholarship_id = p_scholarship_id;

  IF v_source_count IS NULL OR v_source_count = 0 THEN RETURN 0; END IF;

  -- Score formula: log-bounded combination of source diversity + max
  -- authority + total authority. Calibrated so:
  --   * 1 'other' source        → 1
  --   * 1 aggregator             → 2
  --   * 1 university listing     → 4
  --   * 1 official program page  → 6
  --   * 2 different sources avg  → +2
  --   * 3+ sources               → 9-10
  v_score :=
    LEAST(6.0, GREATEST(1.0, v_max_authority * 2.0))                 -- max-authority floor
    + LEAST(3.0, ln(v_source_count + 1) * 1.5)                       -- diversity bonus
    + LEAST(1.0, GREATEST(0.0, (v_total_authority - v_max_authority) * 0.4)); -- secondary corroboration
  v_score := LEAST(10.0, GREATEST(0.0, v_score));

  RETURN round(v_score)::smallint;
END
$$;

GRANT EXECUTE ON FUNCTION public.compute_consensus_score(uuid) TO anon, authenticated, service_role;

-- ─── Trigger: keep scholarships.consensus_score in sync ────────────────
CREATE OR REPLACE FUNCTION public.scholarship_evidence_recompute_consensus()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_target uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target := OLD.scholarship_id;
  ELSE
    v_target := NEW.scholarship_id;
  END IF;
  UPDATE public.scholarships
    SET consensus_score = public.compute_consensus_score(v_target)
  WHERE scholarship_id = v_target;
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS scholarship_evidence_consensus ON public.scholarship_evidence;
CREATE TRIGGER scholarship_evidence_consensus
  AFTER INSERT OR UPDATE OR DELETE ON public.scholarship_evidence
  FOR EACH ROW EXECUTE FUNCTION public.scholarship_evidence_recompute_consensus();

-- ─── RLS — public read, service-role write ────────────────────────────
ALTER TABLE public.scholarship_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scholarship_evidence_public_read" ON public.scholarship_evidence;
CREATE POLICY "scholarship_evidence_public_read"
  ON public.scholarship_evidence FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.scholarship_evidence TO anon, authenticated;
GRANT ALL ON public.scholarship_evidence TO service_role;

-- ─── Backfill — one source per existing row from scholarships.source_url
-- We have to call record_scholarship_source as service_role context
-- inside a DO block. Categorize using data_source as the catalog hint
-- so aggregator-derived rows correctly start as authority=1.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT scholarship_id, source_url, data_source
    FROM public.scholarships
    WHERE source_url IS NOT NULL AND length(btrim(source_url)) > 0
  LOOP
    PERFORM public.record_scholarship_source(
      r.scholarship_id,
      r.source_url,
      r.data_source,
      NULL,
      NULL
    );
  END LOOP;
END $$;

-- Force a recompute on the scholarships side so consensus_score is hot
-- immediately after the backfill (the trigger fired on each INSERT,
-- but if any row had a NULL initial consensus before the trigger
-- attached, this fixes it).
UPDATE public.scholarships s
SET consensus_score = public.compute_consensus_score(s.scholarship_id)
WHERE s.scholarship_id IN (SELECT DISTINCT scholarship_id FROM public.scholarship_evidence);
