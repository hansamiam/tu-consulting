-- =============================================================================
-- Per-scholarship deep-dive v6: dual-card shape (how_to_win + why_fits)
-- =============================================================================
-- Replaces the v1-v5 4-panel shape (`match.breakdown` / `strategy.headline` /
-- `odds.typical_admit_profile`) with two stacked insight cards used by the
-- Membership-gated deep-dive modal:
--
--   B1 — "How to win this scholarship"  (always renders for paying members)
--   B2 — "Why this fits you"            (renders only if member has a brief)
--
-- B1 is cached per (scholarship × nationality_bucket) because the insight
-- varies regionally (visa realism, language exemptions, application
-- conventions) but is NOT individually unique per student.
--
-- B2 is cached per (scholarship × profile_hash) because the insight cites
-- the student's intake by name.
--
-- Both card types share this table; `card_type` discriminates and is part
-- of the PK. `nationality_bucket` is NOT NULL (PK columns must be) and
-- defaults to 'all' — B2 rows always carry 'all' since they're not
-- bucket-keyed; B1 rows carry one of the 5 real region values.
--
-- v5 cached rows are dropped — their JSON shape is incompatible with the
-- new dual-card output and they were anon-cached (cheap to regenerate).
-- =============================================================================

-- Drop incompatible legacy cache first so the PK swap operates on zero rows.
DELETE FROM public.scholarship_deep_dives;

-- Add v6 columns. All NOT NULL columns get defaults so the PK swap is safe.
ALTER TABLE public.scholarship_deep_dives
  ADD COLUMN card_type text NOT NULL DEFAULT 'how_to_win'
    CHECK (card_type IN ('how_to_win', 'why_fits')),
  ADD COLUMN nationality_bucket text NOT NULL DEFAULT 'all'
    CHECK (nationality_bucket IN ('central_asia', 'mena', 'se_asia', 'us_latam', 'other', 'all')),
  ADD COLUMN tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('standard', 'premium')),
  ADD COLUMN banned_vocab_hits jsonb,
  ADD COLUMN expires_at timestamptz;

-- Swap PK to discriminate by card_type + bucket.
--   B1 row example: (<uuid>, 'how_to_win', 'central_asia', 'b1-generic')
--   B2 row example: (<uuid>, 'why_fits',   'all',          '<sha256(profile)>')
ALTER TABLE public.scholarship_deep_dives DROP CONSTRAINT scholarship_deep_dives_pkey;
ALTER TABLE public.scholarship_deep_dives ADD PRIMARY KEY
  (scholarship_id, card_type, nationality_bucket, profile_hash);

-- Bump default schema_version so new rows are tagged correctly. The edge
-- function in PR 2 will set this explicitly on every write.
ALTER TABLE public.scholarship_deep_dives ALTER COLUMN schema_version SET DEFAULT 6;
