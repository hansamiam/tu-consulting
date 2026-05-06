-- Scholarship cover image
--
-- Cover-image URL for the DetailSheet + ExpandedScholarshipDialog hero
-- band. Today the hero is a country-tinted gradient + landmark
-- silhouette + flag pattern — beautiful but generic. When a scrape or
-- enrichment pass finds a real program-specific image (poster, campus
-- photo, hero from the official page), we render that instead and
-- keep the country treatment as the fallback.
--
-- Nullable text. No constraint on URL shape — populated by trusted
-- enrichment paths only, never by user input.

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS cover_image_url text;
