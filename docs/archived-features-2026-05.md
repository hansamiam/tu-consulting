Archived features — May 2026
============================

Features pulled from the user-facing surface during the May 2026 ship sprint. Code stays in tree (filter pipeline, scoring branches, type fields, helper functions all intact) so revival is a re-render, not a rebuild.

Bring these back when the gating reason has been addressed AND we have headroom to add surface area.

---

## Eligibility / demographic tags (2026-05-27)

**Pulled:**
- Eligibility filter dropdown in the Discover filter panel (`src/pages/Discover.tsx` ~line 2480).
- Demographic chip on the scholarship row band, e.g. "Women" next to the country flag (`src/pages/Discover.tsx` ~line 2171).
- Wizard self-ID chip group ("Eligibility groups (optional) — Women / Refugee / Disability") (`src/pages/Discover.tsx` ~line 3990).

**Left intact:**
- `target_demographics: string[] | null` column on the `scholarships` table and the Scholarship TS type.
- `demographicOpts` array — kept so the filter UI can be restored verbatim.
- `filters.demographic` filter pipeline branch — never triggered while UI is hidden.
- `scoreOne` demographic-overlap boost — never fires because `profile.demographics` is now always empty.
- `humanizeDemographic` helper — still imported / used by `addUtilityLabel`.

**Why pulled:** Data trust. `target_demographics` tagging on scholarship rows isn't reliable enough to surface as a filter or a chip. Examples of the failure class: a row tagged "Women" that's actually open to all applicants, or a row missing the tag for a genuinely women-only program. Until we run a re-tagging pass (or migrate to LLM-extracted tags with an editorial gate) the filter selects against a noisy field and the chip on the card makes a claim we can't back.

**Revival trigger:**
- A retagging pass over every published row's `target_demographics` (canonical kebab-case set + spot-check by editorial).
- OR an extraction pipeline that re-derives these tags from `canonical_overview` / `canonical_eligibility` with a confidence score, and we only show the chip / use the filter when confidence is high.

Restoration is a re-render: uncomment the three blocks (search for "pulled 2026-05-27" in `Discover.tsx`), no logic changes required.
