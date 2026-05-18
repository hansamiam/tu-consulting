-- target_fields cleanup: fixes title-cased "And" junk and merges
-- "All Subjects" / "All Fields" / similar catch-all variants into a
-- single canonical bucket. Adds an IMMUTABLE normalize_target_field()
-- helper that future writes can call from a trigger if desired (not
-- wired yet — keeping changes small for this pass).
--
-- Before:
--   "All Subjects" (2), "All Fields" (90), "Biology And Health",
--   "Human And Social Sciences", "Law And Political Science",
--   "Economics And Management", "All Disciplines Except Clinical
--   Medical Research", "Global Master's Programmes", ...
-- After:
--   "All Fields" (94), "Biology & Health", "Human & Social Sciences",
--   "Law & Political Science", "Economics & Management", ...

CREATE OR REPLACE FUNCTION normalize_target_field(raw text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN LOWER(raw) IN ('all subjects', 'all fields', 'all disciplines', 'open to all fields',
                        'all disciplines except clinical medical research',
                        'global master''s programmes', 'global master''s programs',
                        'multiple', 'any field') THEN 'All Fields'
    WHEN raw ~ '\sAnd\s' THEN REGEXP_REPLACE(raw, '\sAnd\s', ' & ', 'g')
    ELSE raw
  END;
$$;

UPDATE scholarships
SET target_fields = (
  SELECT ARRAY_AGG(DISTINCT normalize_target_field(f) ORDER BY normalize_target_field(f))
  FROM UNNEST(target_fields) AS f
  WHERE f IS NOT NULL AND TRIM(f) <> ''
)
WHERE target_fields IS NOT NULL
  AND lifecycle_status = 'active'
  AND EXISTS (
    SELECT 1 FROM UNNEST(target_fields) AS f
    WHERE f ~ '\sAnd\s'
       OR LOWER(f) IN ('all subjects', 'all disciplines',
                       'all disciplines except clinical medical research',
                       'global master''s programmes', 'global master''s programs',
                       'multiple', 'any field')
  );
