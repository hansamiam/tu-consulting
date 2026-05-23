-- ============================================================================
-- Migration: 20260522191000_apply_source_policy_v1_pass2_university_curation
-- Purpose:   Pass 2 university cut. Deactivate 134 generic university aid
--            pages, keep 52 named flagship + partial-coverage programs.
-- Spec:      docs/source_audit_2026-05-22.md §1.5a (50 flagship in university
--            category — HKPFS lives in government) + §1.5b (2 partial)
-- Risk:      Reversible. 134 rows flipped to is_active=false with
--            deactivation_reason='pass2_over_granular_university_aid_page'.
--            Single UPDATE to reverse.
-- Applied:   2026-05-22T17:55Z via Supabase MCP
-- ============================================================================
--
-- Why source_id over URL: The original DRAFT used URL string matching, which
-- is fragile to URL canonicalization drift (trailing slash, http→https, query
-- params). Source UUIDs are stable across name/URL edits and let us treat the
-- keep list as a strict set rather than a regex.
--
-- Keep list audit trail: see docs/source_audit_2026-05-22.md §1.5a + §1.5b.
-- Each source_id below corresponds to a row that the 2026-05-22 web-verified
-- audit confirmed as a named, full-coverage (or named partial-coverage) flagship.

UPDATE public.scholarship_sources
SET is_active = false,
    deactivation_reason = 'pass2_over_granular_university_aid_page',
    deactivated_at = now(),
    deactivation_policy_version = 'v1-2026-05-22',
    updated_at = now()
WHERE category = 'university'
  AND is_active = true
  AND source_id NOT IN (
    -- ── §1.5a Flagship full coverage (50 university rows) ──
    -- HKPFS sits in category=government, so it is keep-by-default and not in this list.

    -- UK (8)
    'b19296e9-05ef-4641-b853-b10c094b893d', -- Rhodes Scholarship (Oxford)
    '7290c932-97bb-4aca-b400-5c03c574aff9', -- Gates Cambridge Scholarship
    'd2e82ee4-8e61-46f5-a0a5-f688da3d1f90', -- Cambridge Trust Scholarships
    '150543c0-6d48-4914-944f-da2dc68a4329', -- Oxford Reach Scholars
    'a0e29433-a522-4c92-87ef-947cb09bafb2', -- Oxford Clarendon Fund
    '91dc3155-20f8-4cc2-81bd-458ad3ac46bd', -- Imperial College President's PhD Scholarship
    '98fbf0ed-b5d6-4d6f-8265-94c2cc62dfdb', -- LSE Scholarships for Master's Students
    '1e5342c9-c7f2-41e6-a3ca-7c18e031cbe3', -- Weidenfeld-Hoffmann Trust Scholarships

    -- US (14)
    '8149b99f-1c9c-4fa2-a912-bf976d8f60e9', -- Knight-Hennessy Scholars (Stanford)
    'f3e6886a-2d58-4e0a-a181-5c55e8a71a4c', -- Yale World Fellows
    '3597e4c8-db7a-40c9-9f5b-a3ad1d74c460', -- Harvard Kennedy School Scholarships
    '5707f3b5-b1a5-4ade-a707-3ce11cf855d8', -- Princeton MPP / MPA Fellowship
    'ac7153a0-f9ee-45f0-b58c-bcd8c77bbded', -- MIT Presidential Fellowship
    '34182589-de52-4c29-9d74-04457a2cd361', -- Stanford GSE Fellowship
    'fd303dee-3cdb-45fe-a59c-f263480e5544', -- Duke Robertson Scholars
    '9603ad6b-04f0-41a6-aa7c-a9b94c309c48', -- A.B. Duke (Angier B. Duke) Scholarship
    'adc75dc9-8f14-4cd7-ac35-67dcb9c1a5cb', -- Danforth Scholars Program (WashU)
    'dc93fe94-f6bd-4ea9-a8a4-27c7652901c5', -- Morehead-Cain Scholarship (UNC Chapel Hill)
    'b124f131-ac3a-409d-aa63-9ca63e52caff', -- Jefferson Scholars (UVA)
    '9eb55a2d-e09c-4bab-a299-9449980d227a', -- Vanderbilt Cornelius Vanderbilt Scholarship
    '12271d9e-c09f-4877-b1c9-3e04c26668a9', -- Notre Dame Hesburgh Scholars
    '64ba33cd-6d7e-4e2f-95b3-579bc099e6d4', -- AU Emerging Global Leader Scholarship (EGLS)

    -- China (2)
    '56aae912-9eaf-4906-b047-514cb20072f6', -- Schwarzman Scholars (Tsinghua)
    '1a1a4b8b-5b45-40ed-9a0e-28e0c7c84175', -- Yenching Academy (Peking University)

    -- Hong Kong (3 university; HKPFS is government)
    '003fe84c-c776-4f08-89aa-ab93abd6712a', -- HKU Presidential PhD Scholarship
    '0b6aa8f0-aabd-4015-922e-b0c435c2694e', -- CUHK Vice-Chancellor's PhD Scholarship
    'a0fa9601-08a1-4655-89be-368edc0f4483', -- HKUST RedBird PhD Award

    -- Singapore (1)
    'a02c7643-a849-4404-8c9f-3ecacd494659', -- Lee Kuan Yew School (LKYSPP)

    -- South Korea (1)
    '32c5067a-40c0-4edd-89b1-f6bb0b2983d5', -- KAIST International Student Scholarship

    -- Canada (3)
    '914ed0d5-b868-44b8-88e5-88de753935e5', -- University of Toronto Lester B. Pearson Scholarships
    '5dcc94ce-c09b-4f58-8c64-110e1eb80fdf', -- McGill Entrance Scholarships
    '6c33a209-4388-4639-bbff-1f6595c1e73a', -- McCall MacBain Scholarships (McGill)

    -- Australia (3)
    '43e2a6ce-fe3f-4f20-9937-90df15e7441e', -- University of Melbourne Graduate Research
    '6a13b967-d3ff-40de-8556-984280512b73', -- University of Sydney International Scholarships
    'c0ca6277-4c3d-4b59-9e31-17be865767df', -- ANU University Research Scholarship (URS)

    -- Switzerland (2)
    'd607ed9d-978a-4d1e-bdbb-8e60bb346644', -- EPFL Excellence Fellowships
    '70acdddd-c447-4231-878c-37ff2224c075', -- ETH Zurich Excellence Scholarship

    -- Spain (2)
    'cbe1fc4a-39e6-4e73-8599-c2e4cc3e03f2', -- IE University International Scholarships
    '9dde0842-d373-4afc-8231-9efb37ad7d44', -- IESE MBA Scholarships

    -- Italy (1)
    '36046945-4491-4a75-9c48-21a23bd61266', -- Bocconi University Scholarships

    -- France (3)
    '2870bbf2-0b85-4d22-81d9-9b29cd0ff6e0', -- HEC Paris Scholarships
    'ef278758-88dc-496b-9bd7-e9eedf40a713', -- INSEAD Scholarships
    '252b38bc-8fbd-4b28-a796-4684f7213c25', -- Sciences Po Émile Boutmy Scholarship

    -- Netherlands (2 flagship; Leiden + Radboud in §1.5b below)
    '238d1719-3a60-46d6-b6c4-a7121bb23762', -- Amsterdam Excellence Scholarship (UvA)
    '55c17a96-3d8d-4231-9f47-71fa79c6b09b', -- Maastricht NL-High Potential Scholarship

    -- Sweden (1)
    '88f4d45e-2211-44dc-a845-acd6c1f8bc25', -- Karolinska Institutet Global Scholarship

    -- UAE (2)
    '21cc161c-1978-4d21-9169-fc3bd5d76a3f', -- NYU Abu Dhabi Scholarships
    '16f2d83a-e6ec-4f69-b83e-b4e45304b50a', -- MBZUAI PhD Scholarship

    -- Saudi Arabia (1)
    '6d53f881-c67f-4e5e-b460-a2418e835fde', -- KAUST Fellowship

    -- Kazakhstan (1)
    '51f368b0-6d0f-4468-b789-0f1242bc382b', -- Nazarbayev University International Scholarship

    -- ── §1.5b Notable Named, Partial Coverage (2 rows) ──
    -- These keep is_active=true but carry sub_tier='partial_coverage_named'
    -- (set by 20260522190000_add_sub_tier_column).
    'e33fb911-d624-40e0-bb45-852f237b0768', -- Leiden University Excellence Scholarship (LExS)
    'c8a8d809-5f99-439f-b1d3-0c81a66d4147'  -- Radboud Scholarship Programme (RSP)
  );

-- Post-application verification (run separately):
-- SELECT COUNT(*) FILTER (WHERE is_active) AS active,
--        COUNT(*) FILTER (WHERE deactivation_reason = 'pass2_over_granular_university_aid_page') AS pass2_kills
-- FROM scholarship_sources WHERE category = 'university';
-- Expected: active=52, pass2_kills=134
