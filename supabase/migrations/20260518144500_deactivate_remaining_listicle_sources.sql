-- 2026-05-18: Preventive cleanup of one more listicle source caught by
-- a heuristic name/URL scan after the scholarshipsads pollution event.
--
-- "Top 15+ UK Scholarships for International Students" on scholars4dev
-- is a listicle round-up — same anti-pattern. Deactivate before it
-- gets scraped and produces ~15 thin rows.

UPDATE scholarship_sources
SET is_active = false,
    updated_at = now()
WHERE source_id = 'd6a56afb-0884-4156-9795-93dce5443862';
