-- BEFORE INSERT/UPDATE trigger that normalizes target_fields at write
-- time. Mirrors the existing scholarships_normalize_tags pattern so
-- future LLM extractions can't reintroduce the "X And Y" /
-- "All Subjects" / "Multiple" / etc. noise we cleaned up in
-- 20260518100000_normalize_target_fields_cleanup.sql.
--
-- Belt-and-braces: the data is clean today, but every new write from
-- enrich-scholarship-content / canonical-extract is one regression
-- away from polluting it again.

CREATE OR REPLACE FUNCTION scholarships_normalize_target_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.target_fields IS NOT NULL THEN
    NEW.target_fields := (
      SELECT ARRAY(
        SELECT DISTINCT normalize_target_field(f)
        FROM UNNEST(NEW.target_fields) AS f
        WHERE f IS NOT NULL AND TRIM(f) <> ''
        ORDER BY normalize_target_field(f)
      )
    );
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS scholarships_normalize_target_fields_trg ON scholarships;
CREATE TRIGGER scholarships_normalize_target_fields_trg
  BEFORE INSERT OR UPDATE OF target_fields ON scholarships
  FOR EACH ROW
  EXECUTE FUNCTION scholarships_normalize_target_fields();
