---
name: V1 ship cuts
description: Discover = scholarship decision engine (not list); Academy→ComingSoon; consulting packages hidden; Founding 100 chip in nav.
type: feature
---
**V1 product surface (post-cut, Apr 2026)**

- `/discover` (and `/scholarships` alias, both EN/RU) → `src/pages/Discover.tsx` — **scholarship decision engine**, not a directory. Profile-driven (country, degree, GPA+scale, IELTS, SAT, budget) → ranked recommendations with match score 0-100, eligibility status (eligible/likely/missing/not_eligible), priority (strong_match/competitive/low_priority), reward & effort. Free preview = top 3, rest paywalled to Founding. Detail dialog has why-fits/how-to-win/next-step free; strategy_notes + rejection reasons gated.
- Schema: `scholarships` extended with provider_name, official_url, host_country, eligible_countries[], target_degree_level[], target_fields[], award_amount_text, award_type[], estimated_total_value_usd, min_gpa/gpa_scale/min_ielts/min_toefl/min_sat, citizenship_requirements, deadline_type, required_documents[], essay/interview/sep_app flags, selectivity_level, effort_level/reason, ideal_candidate_profile, common_rejection_reasons, strategy_notes, best_for_tags[], why_this_fits, how_to_win, what_to_prepare_first, next_step, risk_note, last_verified_date. coverage_type CHECK relaxed to allow full_ride/full_tuition/tuition_only/partial/stipend/stipend_only/unknown. university_id is now nullable (for DAAD/MEXT type body-providers).
- Data: ALL prior thin/duplicate rows deleted. 11 hand-curated verified scholarships seeded: UofT Pearson, UBC ILOT, NUS Global Merit, NTU ASEAN, HKU Foundation, Tartu Estonian Govt, UvA AES, TU Delft van Effen, Nazarbayev NU Full, DAAD MA, MEXT. Old archived scholarship/discover code in `src/_archive/discover-v1/` (untouched).
- `/academy` is now a **Coming Soon landing** (`src/pages/Academy.tsx`) with waitlist email capture (`waitlist_emails`) + Founding upsell.
- Consulting packages section (`#packages`) in both `Offerings.tsx` and `OfferingsRu.tsx` wrapped in `{false && (...)}` — preserved but hidden.
- `Navigation.tsx` primary nav: Home · TopUni AI · Discover · Prep · Academy · Consulting. Live "Founding · X/100 left" chip via `<FoundingSpotsChip />`.
- Single Founding tier ($9/mo, $90/yr, 100 spots cap) is the only paid offering.
- Prep "Focus 4": Diagnostic, Practice, Essay Grader, Study Plan. 17 archived in `_archive/prep-v1` behind `<ComingSoon />`.

**To restore later:** flip the `{false && ` wrappers in Offerings, restore Academy.tsx from archive, swap Discover.tsx back to old universal university DB from `_archive/discover-v1/Discover.page.tsx`.
