-- =============================================================================
-- Sanity-clean absurd estimated_total_value_usd values
-- =============================================================================
-- The original ingest cap was $5M, which still let through values like $80M /
-- $100M from rows scraped before the cap was added — those numbers come from
-- the LLM picking up endowment / aggregate-fund references on the source page
-- and treating them as the per-recipient award. Even at $5M, the cap was
-- generous: real per-recipient scholarships top out at ~$400-600k (Schwarzman,
-- Knight-Hennessy, MIT-tier). Anything north of $2M is structurally suspicious.
--
-- This migration drops obviously-bogus stored values to NULL so the display
-- falls back to the coverage label (always meaningful) instead of showing
-- inflated dollar figures. Going forward, scrape-source's clampNumeric
-- rejects (rather than clamps) values above the same threshold.
--
-- We also strip "$XXM"/"$XXXM" tokens from award_amount_text where they
-- appear, so the compact award label doesn't surface them in the fallback
-- substring path. Shaped as text replacement, not deletion — the rest of the
-- award text might still describe the funding meaningfully.
-- =============================================================================

UPDATE public.scholarships
SET estimated_total_value_usd = NULL
WHERE estimated_total_value_usd > 2000000;

-- Strip lone "$NNM" / "$NN.NM" tokens from award_amount_text. We don't touch
-- "$XXX,XXX" or "$XXK" — those are realistic.
UPDATE public.scholarships
SET award_amount_text = btrim(regexp_replace(
  award_amount_text,
  '\$\s?\d+(\.\d+)?\s?M\M',  -- $80M, $1.2M, $100 M
  '',
  'g'
))
WHERE award_amount_text ~ '\$\s?\d+(\.\d+)?\s?M\M';

-- Collapse any double-spaces left behind, drop empty results.
UPDATE public.scholarships
SET award_amount_text = NULLIF(btrim(regexp_replace(award_amount_text, '\s+', ' ', 'g')), '')
WHERE award_amount_text IS NOT NULL;
