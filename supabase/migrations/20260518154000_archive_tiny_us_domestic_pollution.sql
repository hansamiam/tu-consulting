-- 2026-05-18: more US-domestic-only tiny-grant pollution from the
-- post-hub-discovery scrape wave. The scrape-source prompt was telling
-- the LLM to omit these, but the LLM kept extracting them anyway. In
-- the same commit as this migration: a server-side min-value gate
-- was added in validateExtracted() — any row with a KNOWN value below
-- $3K gets dropped before insert.

UPDATE scholarships SET lifecycle_status = 'inactive', updated_at = now()
WHERE scholarship_name IN (
  'Act of Kindness Scholarship',                    -- $1000 NPVA US essay contest
  'Aaliyah Lee Scholarship',                        -- $1000 NPVA US essay contest
  'Delete Cyberbullying Social Media Scholarship',  -- $1000 US-only
  'Undergraduate programs taught in English',       -- generic placeholder, Ton Duc Thang
  'Six Scholarship for exclusive Space Executive Master Programmes'  -- malformed name, $4.4K
)
AND lifecycle_status IN ('active','reopens_annually');
