-- 2026-05-18: Archive one more non-degree row — Regent Global-Pankaj
-- Award to End Conflict 2026. Same pattern as the ICMM Young Leaders
-- row archived earlier: targets attendance at the One Young World
-- Summit, not a degree program. The prompt update should catch this
-- pattern going forward, but this row landed before the prompt deploy.

UPDATE scholarships SET lifecycle_status = 'inactive', updated_at = now()
WHERE scholarship_name = 'Regent Global–Pankaj Award to End Conflict 2026'
AND lifecycle_status IN ('active','reopens_annually');
