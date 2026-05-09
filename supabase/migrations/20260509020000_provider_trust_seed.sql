-- =============================================================================
-- Provider trust-tier seed
-- =============================================================================
-- Seeds the providers table with metadata (trust_tier, provider_type,
-- host_country, official_website, established_year) for ~50 well-known
-- funders so they're tagged as 'high' trust the moment the previous
-- migration's backfill creates the row. The slug is derived via
-- provider_slug() in lockstep with the backfill so the INSERT ... ON
-- CONFLICT (slug) path lands on the same record either way.
--
-- Trust tier semantics:
--   * 'high'   — verified national government / major foundation /
--                long-established intergovernmental program. Match
--                ranking gives these a small boost (added in 030000).
--   * 'medium' — well-known but smaller scope (regional foundation,
--                single-university program with strong reputation).
--   * 'low'    — known to exist but minimal trust signal.
--   * 'unknown' — default, rendered with no special badge.
--
-- Updates only the metadata fields — never overwrites scholarships_count,
-- total_award_volume_usd, etc. (those are owned by refresh_provider_stats).
--
-- Adding a new famous provider later: just append another INSERT block
-- with the canonical name + slug from canonicalize_provider() and
-- provider_slug() output. ON CONFLICT (slug) DO UPDATE keeps it idempotent.
-- =============================================================================

INSERT INTO public.providers (slug, canonical_name, trust_tier, provider_type, host_country, official_website, established_year, description)
VALUES
  -- ─── Government scholarship programs ────────────────────────────────
  ('chevening', 'Chevening Scholarships', 'high', 'government', 'United Kingdom', 'https://www.chevening.org', 1983,
    'UK government''s flagship international awards programme. Funded by the Foreign, Commonwealth & Development Office.'),
  ('fulbright-program', 'Fulbright Program', 'high', 'government', 'United States', 'https://us.fulbrightonline.org', 1946,
    'Flagship international educational exchange program of the U.S. government, administered by the Bureau of Educational and Cultural Affairs.'),
  ('daad', 'DAAD', 'high', 'government', 'Germany', 'https://www.daad.de/en', 1925,
    'German Academic Exchange Service. World''s largest funding organisation for international academic exchange.'),
  ('mext', 'MEXT', 'high', 'government', 'Japan', 'https://www.mext.go.jp/en', 2001,
    'Japanese Ministry of Education, Culture, Sports, Science and Technology — funds the MEXT scholarship for international students.'),
  ('eiffel-excellence-scholarship-program', 'Eiffel Excellence Scholarship Program', 'high', 'government', 'France', 'https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence', 1999,
    'French Ministry for Europe and Foreign Affairs scholarship for foreign students enrolled in master''s or doctoral programs.'),
  ('china-scholarship-council', 'China Scholarship Council', 'high', 'government', 'China', 'https://www.csc.edu.cn/en', 1996,
    'Chinese government scholarship body funding international students at Chinese universities and Chinese students abroad.'),
  ('korean-government-scholarship-program', 'Korean Government Scholarship Program', 'high', 'government', 'South Korea', 'https://www.studyinkorea.go.kr', 1967,
    'GKS / KGSP scholarship for international students pursuing degrees at Korean universities.'),
  ('australia-awards', 'Australia Awards', 'high', 'government', 'Australia', 'https://www.australiaawards.gov.au', 1950,
    'Australian government scholarships covering tertiary study, training and professional development for participants from developing countries.'),
  ('new-zealand-scholarships', 'New Zealand Scholarships', 'high', 'government', 'New Zealand', 'https://www.mfat.govt.nz/en/aid-and-development/scholarships', 1993,
    'New Zealand Ministry of Foreign Affairs and Trade scholarships for students from developing countries.'),
  ('vanier-canada-graduate-scholarships', 'Vanier Canada Graduate Scholarships', 'high', 'government', 'Canada', 'https://vanier.gc.ca/en/home-accueil.html', 2008,
    'Canadian federal government scholarship attracting and retaining world-class doctoral students.'),
  ('singapore-international-graduate-award', 'Singapore International Graduate Award', 'high', 'government', 'Singapore', 'https://www.a-star.edu.sg/Scholarships/for-graduate-studies/singapore-international-graduate-award-singa', 2003,
    'A*STAR + Singapore universities joint program funding international PhD students in science and engineering.'),
  ('swedish-institute-scholarships', 'Swedish Institute Scholarships', 'high', 'government', 'Sweden', 'https://si.se/en/apply/scholarships', 1945,
    'Swedish Institute scholarships for international master''s students, prioritising students from developing countries.'),
  ('orange-knowledge-programme', 'Orange Knowledge Programme', 'high', 'government', 'Netherlands', 'https://www.studyinholland.nl', 2017,
    'Dutch government global development scholarship program (Nuffic-administered), successor to NFP.'),
  ('belgian-development-cooperation-scholarship', 'Belgian Development Cooperation Scholarship', 'high', 'government', 'Belgium', 'https://www.ares-ac.be', 1999,
    'ARES-administered scholarships for development cooperation, funding students from partner countries.'),
  ('inlaks-shivdasani-foundation', 'Inlaks Shivdasani Foundation', 'high', 'foundation', 'India', 'https://inlaksfoundation.org', 1976,
    'Indian foundation funding outstanding Indian students at top global universities.'),

  -- ─── Major private foundations ──────────────────────────────────────
  ('bill-melinda-gates-foundation', 'Bill & Melinda Gates Foundation', 'high', 'foundation', 'United States', 'https://www.gatesfoundation.org', 2000,
    'Largest private foundation in the world. Funds Gates Cambridge Scholarship and many global health/education programs.'),
  ('gates-cambridge-scholarship', 'Gates Cambridge Scholarship', 'high', 'foundation', 'United Kingdom', 'https://www.gatescambridge.org', 2000,
    'Postgraduate scholarship at the University of Cambridge funded by the Bill & Melinda Gates Foundation.'),
  ('schwarzman-scholars', 'Schwarzman Scholars', 'high', 'foundation', 'China', 'https://www.schwarzmanscholars.org', 2016,
    'Master''s program at Tsinghua University in Beijing funded by Stephen A. Schwarzman.'),
  ('rhodes-trust', 'Rhodes Scholarships', 'high', 'foundation', 'United Kingdom', 'https://www.rhodeshouse.ox.ac.uk', 1902,
    'World''s oldest international graduate scholarship programme, supporting study at the University of Oxford.'),
  ('marshall-scholarships', 'Marshall Scholarships', 'high', 'foundation', 'United Kingdom', 'https://www.marshallscholarship.org', 1953,
    'British government-funded scholarship for high-achieving American students to study at any UK university.'),
  ('knight-hennessy-scholars', 'Knight-Hennessy Scholars', 'high', 'foundation', 'United States', 'https://knight-hennessy.stanford.edu', 2016,
    'Stanford University''s flagship full-tuition graduate fellowship, funded by Phil Knight and John Hennessy.'),
  ('mastercard-foundation-scholars-program', 'Mastercard Foundation Scholars Program', 'high', 'foundation', 'Canada', 'https://mastercardfdn.org/scholars', 2012,
    'Pan-African scholarship program supporting young people across Africa to pursue secondary and university education.'),
  ('aga-khan-foundation', 'Aga Khan Foundation', 'high', 'foundation', 'Switzerland', 'https://www.akdn.org/our-agencies/aga-khan-foundation', 1967,
    'International development agency funding scholarships for postgraduate study by students from developing countries.'),
  ('open-society-foundations', 'Open Society Foundations', 'high', 'foundation', 'United States', 'https://www.opensocietyfoundations.org', 1979,
    'George Soros-founded global foundation funding scholarships, civil society, and human rights work in 120+ countries.'),
  ('rotary-foundation', 'Rotary Foundation', 'high', 'foundation', 'United States', 'https://www.rotary.org/en/about-rotary/rotary-foundation', 1917,
    'International humanitarian foundation funding peace fellowships, global grants, and Rotary scholarships.'),
  ('jack-kent-cooke-foundation', 'Jack Kent Cooke Foundation', 'high', 'foundation', 'United States', 'https://www.jkcf.org', 2000,
    'US foundation supporting high-achieving low-income students through college scholarship and graduate award programs.'),
  ('coca-cola-scholars-foundation', 'Coca-Cola Scholars Foundation', 'high', 'foundation', 'United States', 'https://www.coca-colascholarsfoundation.org', 1986,
    'Achievement-based scholarship awarded annually to 150 high school seniors in the U.S.'),

  -- ─── Intergovernmental / consortia ──────────────────────────────────
  ('erasmus-mundus', 'Erasmus Mundus', 'high', 'consortium', 'European Union', 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters', 2004,
    'European Commission flagship joint master''s programme delivered by international consortia of universities.'),
  ('unesco', 'UNESCO', 'high', 'ngo', 'France', 'https://www.unesco.org', 1945,
    'United Nations Educational, Scientific and Cultural Organization. Co-funds and administers fellowships globally.'),
  ('united-nations', 'United Nations', 'high', 'ngo', 'United States', 'https://www.un.org', 1945,
    'United Nations system administers fellowship and scholarship programs through agencies including UNDP, UNICEF, WHO.'),
  ('world-bank', 'World Bank', 'high', 'ngo', 'United States', 'https://www.worldbank.org', 1944,
    'International financial institution running the Joint Japan/World Bank Graduate Scholarship Program (JJ/WBGSP) and Robert S. McNamara Fellowships.'),
  ('commonwealth-scholarship-commission', 'Commonwealth Scholarship Commission', 'high', 'government', 'United Kingdom', 'https://cscuk.fcdo.gov.uk', 1959,
    'UK government-backed body funding scholarships for citizens of Commonwealth countries to study in the UK.'),
  ('asian-development-bank', 'Asian Development Bank', 'high', 'ngo', 'Philippines', 'https://www.adb.org', 1966,
    'Regional development bank running the ADB-Japan Scholarship Program for postgraduate study in Asia-Pacific.'),

  -- ─── Top university scholarship programs ────────────────────────────
  ('harvard-university', 'Harvard University', 'high', 'university', 'United States', 'https://college.harvard.edu', 1636,
    'Oldest US institution of higher learning. Need-based aid covers full tuition for families earning under thresholds.'),
  ('mit', 'Massachusetts Institute of Technology', 'high', 'university', 'United States', 'https://www.mit.edu', 1861,
    'MIT need-based aid commits to meeting 100 percent of demonstrated financial need without loans.'),
  ('stanford-university', 'Stanford University', 'high', 'university', 'United States', 'https://www.stanford.edu', 1885,
    'Stanford need-based aid + merit fellowships including Knight-Hennessy Scholars.'),
  ('princeton-university', 'Princeton University', 'high', 'university', 'United States', 'https://www.princeton.edu', 1746,
    'Need-based aid commits to no-loan packages and 100 percent of demonstrated need for all admitted students.'),
  ('yale-university', 'Yale University', 'high', 'university', 'United States', 'https://www.yale.edu', 1701,
    'Need-blind admission and need-based aid covering 100 percent of demonstrated need for all admitted students.'),
  ('university-of-oxford', 'University of Oxford', 'high', 'university', 'United Kingdom', 'https://www.ox.ac.uk', 1096,
    'Hosts Rhodes, Clarendon, Reach Oxford and many subject-specific graduate scholarships.'),
  ('university-of-cambridge', 'University of Cambridge', 'high', 'university', 'United Kingdom', 'https://www.cam.ac.uk', 1209,
    'Hosts Gates Cambridge, Cambridge Trust, and college-level scholarships for international students.'),
  ('eth-zurich', 'ETH Zurich', 'high', 'university', 'Switzerland', 'https://ethz.ch', 1855,
    'ETH Excellence Scholarship & Opportunity Programme funding outstanding international master''s students.'),
  ('national-university-of-singapore', 'National University of Singapore', 'high', 'university', 'Singapore', 'https://www.nus.edu.sg', 1905,
    'NUS scholarships including the Global Merit Scholarship and ASEAN Undergraduate Scholarship.'),

  -- ─── Major regional / national programs ─────────────────────────────
  ('hubert-h-humphrey-fellowship-program', 'Hubert H. Humphrey Fellowship Program', 'high', 'government', 'United States', 'https://www.humphreyfellowship.org', 1978,
    'US government-funded non-degree academic and professional development program for mid-career professionals from developing countries.'),
  ('joint-japan-world-bank-graduate-scholarship-program', 'Joint Japan/World Bank Graduate Scholarship Program', 'high', 'consortium', 'United States', 'https://www.worldbank.org/en/programs/scholarships', 1987,
    'World Bank + Japan PHRD scholarships for development-related graduate study at participating universities.'),
  ('canadian-commonwealth-scholarship-program', 'Canadian Commonwealth Scholarship Program', 'high', 'government', 'Canada', 'https://www.educanada.ca/scholarships-bourses/can/institutions/commonwealth-commonwealth.aspx', 1959,
    'Canadian government scholarships for citizens of other Commonwealth countries to study in Canada.'),
  ('clarendon-fund', 'Clarendon Fund', 'high', 'foundation', 'United Kingdom', 'https://www.ox.ac.uk/clarendon', 2001,
    'Oxford University Press-funded scholarships for outstanding graduate students at Oxford.'),
  ('reach-oxford-scholarship', 'Reach Oxford Scholarship', 'high', 'university', 'United Kingdom', 'https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/oxford-support', 1989,
    'Oxford undergraduate scholarship for students from low-income countries unable to study in their own country.')

ON CONFLICT (slug) DO UPDATE
  SET canonical_name    = EXCLUDED.canonical_name,
      trust_tier        = EXCLUDED.trust_tier,
      provider_type     = EXCLUDED.provider_type,
      host_country      = EXCLUDED.host_country,
      official_website  = EXCLUDED.official_website,
      established_year  = EXCLUDED.established_year,
      description       = EXCLUDED.description;

-- Provide a path: well-known providers that exist on the seed list might
-- not yet have any scholarships in the catalog. The backfill in 010000
-- only INSERTs providers when an existing scholarship's name maps there.
-- This seed pre-creates them so when scrape-source picks one up later,
-- the row is already trust-tier 'high' and links instantly.
