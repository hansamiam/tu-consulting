-- Inferred deadlines must yield when authoritative data lands; new
-- discoveries with stale canonical dates must roll forward automatically.
--
-- Setup (2026-05-27 morning):
--   · migration 20260527075000 adds is_deadline_inferred + bumps every
--     annual program's application_deadline to the next future cycle
--     using canonical_deadline_iso.
--   · trigger trg_promote_canonical_deadline (20260524180000) auto-fills
--     application_deadline from canonical_deadline_iso — but ONLY when
--     application_deadline IS NULL.
--
-- Gaps (this migration fixes 2026-05-27 evening):
--
--   GAP 1 — Supersession. Inferred rows now carry a non-NULL
--   application_deadline (the fake forward-rolled date). When the
--   provider later publishes the real deadline, canonical-extract
--   updates canonical_deadline_iso → but the existing trigger sees
--   `application_deadline IS NOT NULL` and skips. The row stays pinned
--   to the fake "typically [Month]" date forever.
--
--   GAP 2 — Ongoing inference. The roll-forward logic only ran as a
--   one-time backfill. New annual scholarships discovered later with a
--   past canonical_deadline_iso would land a past application_deadline,
--   fail the published-gate, and stay invisible.
--
-- Fix (one comprehensive trigger function):
--   · Future canonical date + (NULL or inferred) application_deadline
--     → adopt the canonical date, clear inferred flag.
--   · Past canonical date + annual deadline_type
--     → roll forward to the next future occurrence, mark inferred.
--   · Past canonical date + non-annual
--     → leave alone (rolling/one-time/fixed shouldn't be invented).
--   · Authoritative non-inferred application_deadline already present
--     → leave alone (verify-scholarship is the source of truth there).
--
-- Authoritative behaviour preserved:
--   · application_deadline filled by verify-scholarship's LLM is
--     untouched.
--   · Malformed canonical dates still skip (the EXCEPTION block stays).
--   · Dedupe is unchanged — discovery still upserts on canonical_key.

CREATE OR REPLACE FUNCTION public.promote_canonical_deadline_to_application_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_canon         date;
  v_rolled        date;
  v_years_to_add  int;
BEGIN
  IF NEW.canonical_deadline_iso IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.canonical_deadline_iso IS NOT DISTINCT FROM OLD.canonical_deadline_iso)
  THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_canon := NEW.canonical_deadline_iso::date;
  EXCEPTION WHEN OTHERS THEN
    -- canonical_deadline_iso is text; malformed → skip, don't block write.
    RETURN NEW;
  END;

  -- ── Future canonical date ───────────────────────────────────────────
  IF v_canon >= CURRENT_DATE THEN
    -- Case A: row has no deadline yet → adopt as authoritative.
    IF NEW.application_deadline IS NULL THEN
      NEW.application_deadline   := v_canon;
      NEW.is_deadline_inferred   := false;
      RETURN NEW;
    END IF;

    -- Case B: row's current deadline was inferred → supersede with
    -- authoritative date, clear flag.
    IF COALESCE(NEW.is_deadline_inferred, false) THEN
      NEW.application_deadline := v_canon;
      NEW.is_deadline_inferred := false;
      RETURN NEW;
    END IF;

    -- Case C: row already carries a non-inferred deadline → leave alone.
    -- verify-scholarship's LLM extraction is the source of truth.
    RETURN NEW;
  END IF;

  -- ── Past canonical date ─────────────────────────────────────────────
  -- Only roll forward for annual / reopens_annually programs. Rolling /
  -- one-time / fixed programs shouldn't have invented dates.
  IF lower(coalesce(NEW.deadline_type, '')) NOT IN ('annual', 'reopens_annually') THEN
    RETURN NEW;
  END IF;

  -- Compute next future occurrence of canonical's month-day.
  v_years_to_add := EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM v_canon)::int;
  v_rolled := (v_canon + (v_years_to_add * INTERVAL '1 year'))::date;
  IF v_rolled < CURRENT_DATE THEN
    v_rolled := (v_canon + ((v_years_to_add + 1) * INTERVAL '1 year'))::date;
  END IF;

  -- Only set the rolled value if the row has no authoritative deadline.
  -- If a non-inferred application_deadline is already present, leave it.
  IF NEW.application_deadline IS NULL
     OR COALESCE(NEW.is_deadline_inferred, false)
  THEN
    NEW.application_deadline := v_rolled;
    NEW.is_deadline_inferred := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger definition unchanged — only the function body evolved.
DROP TRIGGER IF EXISTS trg_promote_canonical_deadline ON public.scholarships;
CREATE TRIGGER trg_promote_canonical_deadline
  BEFORE INSERT OR UPDATE OF canonical_deadline_iso ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_canonical_deadline_to_application_deadline();

COMMENT ON FUNCTION public.promote_canonical_deadline_to_application_deadline() IS
  '2026-05-27 pm: Single source of truth for canonical→application '
  'deadline promotion. Adopts future canonical dates as authoritative; '
  'rolls forward past canonical dates for annual programs (marks '
  'is_deadline_inferred=true); supersedes inferred rows when a future '
  'authoritative date arrives (clears the flag); never overwrites a '
  'verified non-inferred deadline.';
