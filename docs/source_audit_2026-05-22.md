# Scholarship Source Audit — 2026-05-22

**Policy version:** `v1-2026-05-22`
**Plan reference:** `~/.claude/plans/oh-wait-i-also-floofy-scott.md` (D5–D6, M2-refined ingestion)
**Scope:** All 377 unique entries in `public.scholarship_sources` across seed migrations v1–v6 + the 2026-05-05 aggregator add.

---

## TL;DR

The source registry overgrew during May 2026 to 377 entries. Most kept (governments + flagship universities + international-eligible foundations). A bounded set deactivated under policy `v1-2026-05-22` — never deleted; preserved with `deactivation_reason` for future revisit.

Two-pass execution to respect brand-quality review:

| Pass | Scope | Status |
|---|---|---|
| **Pass 1 — high-confidence cuts** | Non-whitelist aggregators, listicle-shaped sources, narrow-demographic foundations demoted to `demographic_tagged` sub-tier | Executed in `20260522120500_apply_source_policy_v1_pass1.sql` |
| **Pass 2 — university curation** | 173 → ~25: only top-50 global with named flagship program kept; rest deactivated as `over_granular_university` | Pending user green-light on proposed keep-list (this doc, §3) |

---

## Methodology

Per the Discover v1 plan (D4 — M2-refined):

- **T1 (`official_program`)** = official program site (Chevening, DAAD, MEXT, etc.). Data extraction source.
- **T2 (`funder_portal`)** = government/funder portal listing many programs. Data extraction source.
- **T3 (`aggregator_discovery_only`)** = whitelisted aggregator. Discovery-only. URL never stored as a row's `official_url`.
- **T4** = listicle / blogspam. Banned outright.

Every existing source is mapped to a tier. A source falls out (deactivated) when:
1. **It's a T3 not in the hard-cap whitelist** (the cap is the 4 OpportunitiesForYouth + OpportunitiesTracker entries from migration `20260505240000`).
2. **It's a T4** — listicle, blogspam, "Top 10 X scholarships" round-up content.
3. **It's a university scholarship page that doesn't name a specific program** (just a generic "we offer aid" hub). Deferred to Pass 2 for case-by-case review.
4. **It's a demographic-narrow foundation** that excludes most students; in v1 these get demoted (not killed) into a `demographic_tagged` sub-tier so personalization can surface them to matching profiles instead of polluting the global feed.

No source row is ever DELETEd. Killed = `is_active = false` + `deactivation_reason` + `deactivated_at` + `deactivation_policy_version = 'v1-2026-05-22'`. Reversible via `/admin/sources` reactivate button.

---

## Pass 1 — High-confidence cuts (executed by `20260522120500_apply_source_policy_v1_pass1.sql`)

### 1.1 Aggregator policy — hard-cap whitelist

**T3 whitelist (kept active, marked `source_tier = 'aggregator_discovery_only'`):**

| Name | URL |
|---|---|
| Opportunities for Youth — Scholarships | https://opportunitiesforyouth.org/category/scholarships/ |
| Opportunities for Youth — Fellowships | https://opportunitiesforyouth.org/category/fellowship/ |
| Opportunities Tracker — Scholarships | https://opportunitiestracker.ug/category/scholarships/ |
| Opportunities Tracker — Fellowships | https://opportunitiestracker.ug/category/fellowships/ |

**T3 deactivations (17 entries — `is_active = false`, reason = `pass1_non_whitelist_aggregator`):**

| Name | URL | Reason for cut | Revisit if |
|---|---|---|---|
| After School Africa | afterschoolafrica.com/category/scholarships-for-africans/ | Africa-narrow scope; OpportunitiesTracker covers same beat | Africa launch becomes priority |
| DAAD Funding Guide | www2.daad.de/.../scholarship-database/ | Aggregator format; DAAD's flagship program is already a T1 source | — |
| FastWeb International Scholarship Search | fastweb.com/.../international-students | US-domestic-leaning listicle aggregator | — |
| IEFA International Education Financial Aid | iefa.org/scholarships | Stale listicle; little curation | — |
| IIE Funding Database | iie.org/programs/iie-funding-database/ | Hub aggregator; specific IIE programs (Fulbright, Scholar Rescue) are T1 sources | — |
| Mladiinfo Eastern Europe | mladiinfo.eu/ | Listicle; covers Europe broadly without verification | — |
| Mladiinfo Scholarships | mladiinfo.eu/category/scholarships/ | Same as above; category page | — |
| Opportunities Corner | opportunitiescorner.info/scholarships/ | Low-quality aggregator; high SEO spam ratio | — |
| Opportunities for Africans | opportunitiesforafricans.com/category/scholarships/ | Africa-narrow; covered by OpportunitiesTracker | Africa launch becomes priority |
| Opportunity Desk | opportunitydesk.org/category/scholarships/ | Major incumbent; we're competing with them, not ingesting them | — |
| ProFellow | profellow.com/fellowships/ | Paywalled-curation aggregator; quality variable | — |
| Scholars4Dev | scholars4dev.com/.../scholarships-mastersdegree/ | Listicle format; explicitly killed in prior cleanup migrations (May 18) | — |
| Scholarship Panda | scholarshippanda.com/ | Low quality | — |
| ScholarshipPortal | scholarshipportal.com/ | Studyportals-owned; pure listicle directory | — |
| Scholarships Ads | scholarshipsads.com/ | Killed in prior cleanup (May 18); confirming | — |
| Studyportals Scholarship Search | studyportals.com/scholarships/ | Studyportals network; pure aggregator | — |
| Top Universities Scholarships | topuniversities.com/scholarships | QS-owned listicle; SEO-heavy, low data quality | — |

### 1.2 Foundation demographic-tagging (demote to `demographic_tagged` sub-tier)

These remain active but are tagged so the personalization engine surfaces them to matching profiles only (not polluting the global feed). Migration sets `source_tier = 'funder_portal'` AND adds `demographic_tag` column (separate migration if needed) OR uses the existing `parser_hint` field.

| Name | Demographic | Action |
|---|---|---|
| AAUW American Fellowships | US women only | Demote — narrow citizenship + gender |
| AAUW International Fellowships | Women, non-US for US study | Demote — gender-specific |
| AbbVie Immunology Scholarship | US students with chronic conditions | Demote — narrow medical demographic |
| Adobe Research Women-in-Technology Scholarship | Women in CS/STEM PhD | Demote — gender-specific |
| African Leadership Academy Scholarships | Pan-African secondary | Demote — regional + level-narrow |
| African Women in STEM Scholarship Network | African women in STEM | Demote — regional + gender |
| AHEAD Disability in Higher Education Network | US disabled students | Demote — narrow + US-only |
| American Indian Graduate Center Fellowships | Native American/Alaska Native | Demote — narrow ethnic group |
| Anita Borg Memorial Scholarship (Google) | Women in computing | Demote — gender-specific |
| Asian Pacific Fund Scholarships | Asian-American US students | Demote — narrow + US-only |
| Atlassian Diversity Scholarship | Underrepresented in tech | Demote — narrow |
| AWS Generative AI Scholarship | Underrepresented in AI/ML | Demote — narrow |
| Beinecke Scholarship | US college juniors, arts/humanities/soc-sci PhD | Demote — narrow + US-only |
| Cobell Scholarship | Native American post-secondary | Demote — narrow ethnic group |
| Disability Rights Education Fund | US disability rights | Demote — narrow + US-only |
| GLAAD Rising Stars Grants | LGBTQ+ US media students | Demote — narrow + US-only |
| Generation Google Scholarship India | Women in CS in India | Demote — country + gender |
| Google Generation Scholarship Asia Pacific | Women in computing APAC | Demote — regional + gender |
| Google Generation Scholarship EMEA | Women in computing EMEA | Demote — regional + gender |
| Google Lime Scholarship | STEM + disability for US/Canada | Demote — narrow + region |
| Grace Hopper Celebration Scholarships | Women in computing | Demote — gender-specific |
| Hispanic Scholarship Fund | Hispanic/Latino US students | Demote — narrow + US-only |
| L'Oreal-UNESCO For Women in Science | Women researchers | Demote — gender-specific |
| Lighthouse Guild Scholarships | Visually impaired US students | Demote — narrow + US-only |
| Mandela Rhodes Scholarship | Africa-only, postgrad at SA universities | Demote — regional |
| Margaret McNamara Education Grants | Women from developing countries | Demote — gender-specific |
| Meta Engineering Scholarship | Underrepresented in CS | Demote — narrow |
| Microsoft AI Scholars Program | STEM diversity multi-program | Demote — narrow |

**Remain in main tier (international-eligible, ≥$10k funded, broad):**
- Aga Khan Foundation, OFID, Mastercard Foundation Scholars, World Bank JJWBGSP, Ford Foundation, DAFI/Einstein Refugee Initiative, IIE Scholar Rescue Fund, Schwarzman, Knight-Hennessy, Gates Cambridge, Rhodes, Marshall, Yenching, etc.

### 1.3 Government policy — keep all 84

No deactivations in government tier in Pass 1. Even small / Eastern European / Latin American programs stay active because they're real international-eligible funded scholarships from sovereign sources — the noisy ones get filtered out at the row level by the publish gate (G3 URL-health + G5 funding amount + G8 deadline freshness).

If a specific government source produces zero usable rows after the gate runs, it gets revisited in Pass 3 (post-launch).

### 1.4 NGO policy — keep all 43

Same logic as government — the publish gate enforces row-level quality. NGO sources rarely produce listicle pollution. Revisit if specific NGO sources show >50% gate-fail rate.

---

## Pass 2 — University curation (PENDING USER GREEN-LIGHT)

**173 university entries currently. Policy target: ~25 kept (top-50 global with named flagship program).**

### 1.5 Proposed Pass-2 university keep list (~27 entries)

These are the universities that have a **specifically named, flagship-level funded program** (not just a generic "we offer aid" page):

| Name | Country | Program named | Notes |
|---|---|---|---|
| Rhodes Scholarship (Oxford) | UK | Rhodes Scholarship | Flagship |
| Gates Cambridge Scholarship | UK | Gates Cambridge | Flagship |
| Cambridge Trust Scholarships | UK | Cambridge Trust | Multiple programs |
| Oxford Reach Scholars | UK | Reach Scholars | |
| Imperial College President's PhD Scholarship | UK | President's PhD | Imperial PhD specific |
| LSE Scholarships for Master's Students | UK | LSE master's aid | |
| Weidenfeld-Hoffmann Trust | UK | WH Scholars | Confirm in seed v3+ |
| Knight-Hennessy Scholars (Stanford) | US | Knight-Hennessy | Flagship |
| Yale World Fellows | US | World Fellows | Flagship |
| Harvard Kennedy School Scholarships | US | HKS aid | |
| Princeton SPIA MPP/MPA Fellowship | US | SPIA aid | |
| MIT Presidential Fellowship | US | MIT Presidential | |
| Stanford GSE Fellowship | US | GSE aid | |
| Duke Robertson Scholars | US | Robertson | Flagship dual-campus |
| Schwarzman Scholars (Tsinghua) | China | Schwarzman | Flagship |
| Yenching Academy (Peking) | China | Yenching | Flagship |
| Lee Kuan Yew School (LKYSPP) | Singapore | LKYSPP aid | |
| Hong Kong PhD Fellowship Scheme | Hong Kong | HKPFS | (Also listed under government — consolidate) |
| University of Toronto Lester B. Pearson | Canada | Pearson | Flagship undergrad full-ride |
| McGill Entrance Scholarships | Canada | McGill entrance | |
| University of Melbourne Graduate Research | Australia | Melbourne GRS | |
| EPFL Excellence Fellowships | Switzerland | EPFL Excellence | |
| ETH Zurich Excellence Scholarship | Switzerland | ETH Excellence | |
| IE University International Scholarships | Spain | IE | |
| Bocconi University Scholarships | Italy | Bocconi | |
| HEC Paris Scholarships | France | HEC | |
| INSEAD Scholarships | France | INSEAD | |
| IESE MBA Scholarships | Spain | IESE | |
| Karolinska Institutet Global Scholarship | Sweden | Karolinska Global | Health/medicine |
| Nazarbayev University International Scholarship | Kazakhstan | NU | Strategic for KZ origin students |
| AUCA Magister Scholarship | Kyrgyzstan | AUCA | Strategic for KG origin students |

**That's 31 candidates** — slightly above the ~25 target. Up to you to trim further or keep all 31.

### 1.6 Proposed Pass-2 university kills (~142 entries)

Generic "we offer aid" pages without a named flagship program. Examples:
- Aalto, Aarhus, ADA University Azerbaijan, AlmaU, American University Cairo/Beirut/Sharjah, ANU Scholarships, Bocconi (verify named?), Brown, Carnegie Mellon, Columbia, Cornell, Dartmouth (need-aware), Duke graduate aid, Edinburgh Global Research, Emory Scholars, Free University Berlin, Fudan, Glasgow, Hamad Bin Khalifa, Hanyang, Heidelberg, HKUST PG, IISc Bangalore, IIT Bombay, Imperial PhD Scholarships (the generic page; keep President's PhD), Johns Hopkins Bloomberg, KAIST, Keio, KIMEP, King's College London, KNUST Kumasi, Korea University, Kyoto, Leiden, Lund, Manchester, Mohammed VI Polytechnic, Monash, Mount Holyoke (US need-blind), Sciences Po, Sungkyunkwan, UBC, UCL, USC merit, Vanderbilt, Waseda, Wellesley intl, Wits, Yonsei, and ~100 more.

**The full list is in the policy migration's WHERE clause + audit table — every kill stamps `deactivation_reason = 'pass2_over_granular_university_aid_page'`.**

### 1.7 University keep-list — request for your review

Before I write the Pass 2 migration, the keep list above needs your eye. Specifically:
- Did I miss a university you want included? (e.g., specific Chinese universities, specific Russian universities for Russophone audience?)
- Should I drop any from the keep list as not-flagship-enough?
- Any "generic university aid" pages that secretly have a named program I missed?

---

## Reactivation protocol

Any deactivated source can be reactivated via `/admin/sources` (or directly by UPDATE on `is_active`). When reactivated:
- Append a footnote here under the relevant section: `Reactivated YYYY-MM-DD because <reason>.`
- The `deactivation_reason` + `deactivated_at` fields on the DB row stay populated for full history.

---

## Files this audit was derived from

- `supabase/migrations/20260503000100_seed_scholarship_sources.sql` (v1, 20 entries)
- `supabase/migrations/20260503030000_seed_scholarship_sources_v2.sql` (v2, 30 entries)
- `supabase/migrations/20260504040000_seed_scholarship_sources_v3.sql` (v3 expansion)
- `supabase/migrations/20260504070000_seed_scholarship_sources_v4.sql` (v4 expansion)
- `supabase/migrations/20260505010000_seed_scholarship_sources_v5.sql` (v5 expansion)
- `supabase/migrations/20260505030000_seed_scholarship_sources_v6.sql` (v6 expansion)
- `supabase/migrations/20260505240000_add_aggregator_sources.sql` (T3 whitelist add)
- `supabase/migrations/20260518144500_deactivate_remaining_listicle_sources.sql` (prior cleanup)
- `supabase/migrations/20260518161000_kill_aggregator_url_rows_and_dedupe.sql` (prior cleanup)
