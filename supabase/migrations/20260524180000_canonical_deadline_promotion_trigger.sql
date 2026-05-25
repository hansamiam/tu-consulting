-- Silent failure 2026-05-24: canonical-extract writes canonical_deadline_iso
-- but never propagates it to application_deadline. Discover's server-side
-- filter is `.gte("application_deadline", today)`, so a row with a freshly-
-- extracted canonical_deadline_iso but no application_deadline stays
-- invisible. 121 of 151 active rows were stuck in this state today, of
-- which 7 had future canonical dates ready to promote.
--
-- This trigger closes the gap: whenever canonical_deadline_iso lands on a
-- row whose application_deadline is NULL, copy the canonical value over.
-- Does NOT overwrite existing application_deadline values — those come
-- from verify-scholarship's LLM extraction + rollForwardAnnualDeadline and
-- represent a separately-validated source of truth. Only fills the gap.
--
-- One-time backfill (the 7 rows) ran via direct UPDATE before this
-- migration; this trigger handles future writes.

CREATE OR REPLACE FUNCTION public.promote_canonical_deadline_to_application_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.canonical_deadline_iso IS NOT NULL
     AND NEW.application_deadline IS NULL
     AND (TG_OP = 'INSERT' OR NEW.canonical_deadline_iso IS DISTINCT FROM OLD.canonical_deadline_iso)
  THEN
    BEGIN
      NEW.application_deadline := NEW.canonical_deadline_iso::date;
    EXCEPTION WHEN OTHERS THEN
      -- canonical_deadline_iso is a text column; if it's malformed, skip
      -- promotion rather than blocking the canonical update. canonical-
      -- extract already validates the YYYY-MM-DD shape, so this should
      -- only fire on legacy bad data.
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_canonical_deadline ON public.scholarships;

CREATE TRIGGER trg_promote_canonical_deadline
  BEFORE INSERT OR UPDATE OF canonical_deadline_iso ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_canonical_deadline_to_application_deadline();

COMMENT ON FUNCTION public.promote_canonical_deadline_to_application_deadline() IS
  'Auto-fills application_deadline from canonical_deadline_iso when the row '
  'has no application_deadline yet. Closes the gap where canonical-extract '
  'finds a deadline that verify-scholarship/scrape-source missed, leaving '
  'the row invisible to Discover.';
