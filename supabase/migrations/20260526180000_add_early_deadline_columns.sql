-- 2026-05-26 Sam: US undergrad admissions have TWO deadlines per school
-- (Early Action/Decision in Nov, Regular Decision in early Jan). Catalog
-- previously stored only one date — the early-deadline strategy lived in
-- free-text strategy_notes / how_to_win. Adding structured columns so:
--   1. The brief generator can cite both deadlines deterministically
--      ("ED is Nov 1 — bind only if X is your clear top choice")
--   2. Discover can filter / sort by upcoming early deadlines
--   3. The deadline-urgency boost in match_scholarships can consider both
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS early_deadline date,
  ADD COLUMN IF NOT EXISTS early_decision_type text;

COMMENT ON COLUMN public.scholarships.early_deadline IS
  'Optional early application deadline (EA/ED/REA/SCEA). Independent of application_deadline which always reflects the regular/main deadline. NULL for scholarships without an early round.';

COMMENT ON COLUMN public.scholarships.early_decision_type IS
  'Type of early round: ED (binding), EA (non-binding), REA (Restrictive Early Action), SCEA (Single Choice Early Action), ED_I, ED_II. NULL when no early round.';

ALTER TABLE public.scholarships
  DROP CONSTRAINT IF EXISTS scholarships_early_decision_type_check;
ALTER TABLE public.scholarships
  ADD CONSTRAINT scholarships_early_decision_type_check
  CHECK (early_decision_type IS NULL OR early_decision_type IN ('ED','EA','REA','SCEA','ED_I','ED_II','priority'));
