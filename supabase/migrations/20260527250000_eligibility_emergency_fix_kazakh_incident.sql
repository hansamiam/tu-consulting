-- EMERGENCY 2026-05-27: Kazakh user saw African-only scholarships ranked
-- high. Root cause: scoreScholarship() in Discover.tsx skipped the country
-- check ENTIRELY when eligible_countries was NULL → silent base-45 free
-- pass. Continent-name entries (["Africa","Asia","Latin America"]) also
-- silently failed match.
--
-- Data fix here; matcher tightening + expandEligibleCountries helper in
-- src/pages/Discover.tsx companion PR.
--
-- Applied via MCP apply_migration; this file is in-tree for traceability.

-- MasterCard UP 2027 — Africa-only per official UP page
UPDATE public.scholarships
SET eligible_countries = ARRAY[
      'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon',
      'Central African Republic','Chad','Comoros','Congo','Democratic Republic of the Congo',
      'Republic of the Congo','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini',
      'Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya',
      'Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius',
      'Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe',
      'Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan',
      'Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe'
    ],
    eligibility_audit_status = 'verified',
    eligibility_audit_notes  = 'Africa-only per official UP MasterCard Scholars Program page. Fixed 2026-05-27.'
WHERE scholarship_id = '799608c4-18c0-455a-90d1-32eed11149d5'::uuid;

-- ZUKOnnect — expand ["Africa","Asia","Latin America"] into country list
UPDATE public.scholarships
SET eligible_countries = ARRAY[
      'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Central African Republic',
      'Chad','Comoros','Congo','Democratic Republic of the Congo','Djibouti','Egypt','Eritrea','Eswatini',
      'Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho',
      'Liberia','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia',
      'Niger','Nigeria','Rwanda','Senegal','Sierra Leone','Somalia','South Africa','South Sudan',
      'Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe',
      'Afghanistan','Bangladesh','Bhutan','Cambodia','China','India','Indonesia','Iran','Iraq',
      'Jordan','Kazakhstan','Kyrgyzstan','Laos','Lebanon','Malaysia','Maldives','Mongolia',
      'Myanmar','Nepal','Pakistan','Palestine','Philippines','Sri Lanka','Syria','Tajikistan',
      'Thailand','Timor-Leste','Turkmenistan','Uzbekistan','Vietnam','Yemen',
      'Argentina','Belize','Bolivia','Brazil','Chile','Colombia','Costa Rica','Cuba','Dominican Republic',
      'Ecuador','El Salvador','Guatemala','Guyana','Haiti','Honduras','Jamaica','Mexico','Nicaragua',
      'Panama','Paraguay','Peru','Suriname','Trinidad and Tobago','Uruguay','Venezuela'
    ],
    eligibility_audit_status = 'verified',
    eligibility_audit_notes  = 'Expanded continent names into country list. Fixed 2026-05-27.'
WHERE scholarship_id = '295fb47e-6e3a-4b40-b9bd-e99795e1d751'::uuid;

-- Makerere MasterCard — Sub-Saharan Africa
UPDATE public.scholarships
SET eligible_countries = ARRAY[
      'Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Central African Republic',
      'Chad','Comoros','Congo','Democratic Republic of the Congo','Djibouti','Equatorial Guinea',
      'Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast',
      'Kenya','Lesotho','Liberia','Madagascar','Malawi','Mali','Mauritania','Mauritius','Mozambique',
      'Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone',
      'Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Uganda','Zambia','Zimbabwe'
    ],
    eligibility_audit_status = 'verified',
    eligibility_audit_notes  = 'Sub-Saharan Africa per Makerere MasterCard Foundation Scholars Program. Fixed 2026-05-27.'
WHERE scholarship_id = '5aa24550-0eee-4b93-ad59-c4c733ab21ef'::uuid;

-- Future African Leader — was ["International"], restrict to Africa per GBSN
UPDATE public.scholarships
SET eligible_countries = ARRAY[
      'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon',
      'Central African Republic','Chad','Comoros','Congo','Democratic Republic of the Congo',
      'Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia',
      'Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya',
      'Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia',
      'Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone',
      'Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda',
      'Zambia','Zimbabwe'
    ],
    eligibility_audit_status = 'verified',
    eligibility_audit_notes  = 'African-citizenship requirement per GBSN. Was ["International"] which acted as open-to-all. Fixed 2026-05-27.'
WHERE scholarship_id = '4f3249f9-e640-44cb-b471-7f36e607ad90'::uuid;

-- Lincoln Africa — verified the existing Africa list
UPDATE public.scholarships
SET eligibility_audit_status = 'verified',
    eligibility_audit_notes  = 'Africa-only per Lincoln. Verified after 2026-05-27 review.'
WHERE scholarship_id = 'e1ac7c4b-5dc9-47b2-9ff9-d843170166d6'::uuid;

-- All remaining NULL eligible_countries rows: sentinel ["unknown"] so the
-- matcher's new NULL-guard kicks in instead of silently passing them.
UPDATE public.scholarships
SET eligible_countries = ARRAY['unknown'],
    eligibility_audit_status = 'broken',
    eligibility_audit_notes  = 'eligible_countries was NULL — matcher silently treated as open-to-all (now sentinel ["unknown"] so the new NULL-guard kicks in). Verify country list before promoting back to verified. Fixed 2026-05-27.'
WHERE eligible_countries IS NULL
  AND (lifecycle_status IN ('active','reopens_annually') OR lifecycle_status IS NULL)
  AND application_deadline >= CURRENT_DATE;
