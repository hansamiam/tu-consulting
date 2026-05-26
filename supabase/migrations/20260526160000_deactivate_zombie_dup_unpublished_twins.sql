-- 2026-05-26 Sam cofounder review: Schwarzman appeared twice in the
-- strategy report. The publish-gate filter (prior migration) stops the
-- bug user-facing, but the underlying corrupt rows are still in the DB
-- polluting the embedding pool and could pop back if a publish flag
-- toggles. Deprecate the unpublished twins of currently-published rows.
-- Reversible (lifecycle_status can be reset to 'active'). Six rows:
--   - Axel Adler (Sweden)
--   - Chevening Scholarships (United Kingdom)
--   - Gates Cambridge (United Kingdom)
--   - Paul & Daisy Soros (United States)
--   - Schwarzman Scholars (China)  ← the one Sam reported
--   - Stipendium Hungaricum (Hungary)
--
-- The remaining ~23 dup groups where ALL versions are unpublished are
-- left alone (no user-facing risk; they may be in-review state).
-- Long-term fix is canonical_key normalization so the dup detector
-- catches them at insert time — separate PR.
UPDATE public.scholarships
SET lifecycle_status = 'deprecated'
WHERE scholarship_id IN (
  '200d1635-4b2d-4f22-ace3-b7eb7f084bed',  -- Axel Adler dup
  '8ff75131-d7d8-4674-a7e9-e1903960b89a',  -- Chevening dup
  'd31c0693-a16e-4c02-84db-018193646e68',  -- Gates Cambridge dup
  'bcbaa978-4594-4a86-830d-0f7c4fd5bde2',  -- Paul & Daisy Soros dup
  '84206074-36aa-4145-871b-93940bf1d327',  -- Schwarzman dup (Sam reported)
  'f8f64b04-1be1-47f6-9161-3f5d487263b1'   -- Stipendium Hungaricum dup
)
AND is_published = false;
