# TopUni Match Scoring

How the "Best match" score is computed for every scholarship × profile combo.

The goal: a 0-1 composite score that is **transparent, reproducible, and
honest**. Same inputs always produce the same output. Every component of
the score has a one-line human-readable reason that the UI surfaces.

The math runs in pure SQL inside the `match_scholarships` RPC. The
`match_score_breakdown` RPC returns the same components per row for the
hover popover.

---

## The composite score

```
composite = similarity
          + deadline_boost      (0 to +0.040)
          + value_boost         (0 to +0.040)
          + recency_boost       (-0.020 to +0.020)
          - country_crowding    (0.030 per rank above #3 within same country)
```

`similarity` ranges [0, 1] from cosine similarity of the user's profile
embedding vs. the scholarship's embedding. Boosts are deliberately small
(max ~0.10 cumulative) so similarity stays dominant — boosts only flip
the order when matches are within ~10% of each other, which is exactly
the regime where downstream signals matter.

Eligible rows always rank above ineligible rows at any score (separate
sort key in the RPC).

---

## Sub-score 1 — `similarity` (semantic match)

Cosine similarity between the profile-derived query embedding (built
in `topuni-ai-pathway` and `match-scholarships`) and the
`scholarships.embedding` column populated by `embed-scholarships`.

| similarity range | reason shown to user |
|---|---|
| ≥ 0.85 | Strong semantic match — your profile aligns closely with the funded fields and goals. |
| 0.70 – 0.85 | Good semantic match — the program targets students with backgrounds like yours. |
| 0.55 – 0.70 | Moderate match — overlap with your stated targets, worth exploring. |
| < 0.55 | Weaker match — out of your stated focus area but may still apply. |

---

## Sub-score 2 — `deadline_boost` (urgency)

Piecewise linear function over `application_deadline`. Encourages "act
now" when deadline is imminent without dominating semantic match.

| Time to deadline | Boost | Reason |
|---|---|---|
| Past or null | 0 | No fixed deadline / passed |
| ≤ 7 days | +0.020 | Last-week urgency |
| 8 – 30 days | +0.040 | Prime apply window |
| 31 – 90 days | +0.025 | Within 90 days — slight boost |
| 91 – 180 days | +0.010 | Within 6 months — minor boost |
| > 180 days | 0 | Far out — no boost |

---

## Sub-score 3 — `value_boost` (funding magnitude)

Logarithmic so a $200K award doesn't drown out a $50K award; both get
meaningful but bounded boosts.

```
value_boost = LEAST(0.040, ln(estimated_total_value_usd + 1) / 200.0)
```

Examples:

| estimated_total_value_usd | boost |
|---|---|
| 0 / null | 0 |
| $30,000 | +0.029 |
| $50,000 | +0.029 |
| $100,000 | +0.030 |
| $200,000 | +0.034 |
| $1,000,000 | +0.038 (capped near 0.040) |

---

## Sub-score 4 — `recency_boost` (data freshness)

Penalizes stale data and slightly rewards recent re-verification.

| Last verified | Boost |
|---|---|
| Within 30 days | +0.020 |
| 31 – 90 days | +0.010 |
| 91 – 365 days | 0 |
| > 365 days | −0.020 |
| Never | 0 |

---

## Sub-score 5 — `country_crowding` (diversity)

Computed per query, not per row in isolation. After ranking the
candidate set by `(passes_eligibility DESC, similarity DESC)`, each row
gets its rank within its `host_country`. Rows above #3 within the same
country get an exponential demotion:

```
country_crowding_penalty = MAX(0, country_rank - 3) * 0.030
```

| Country rank | Penalty |
|---|---|
| #1 - #3 | 0 |
| #4 | 0.030 |
| #5 | 0.060 |
| #6 | 0.090 |
| ... | grows linearly |

This guarantees a 25-row result set isn't 22 UK programs.

---

## What the user sees

Hovering a score on Discover or in the brief opens a popover with:

- The composite score (e.g. "Match: 78 / 100")
- A 4-row breakdown:
  - Semantic match — sub-score + reason
  - Eligibility — pass/fail + reason
  - Deadline urgency — boost amount + reason
  - Data freshness — boost or penalty + reason
- Country crowding is explained globally (in this doc, not the popover) —
  per-row visibility would be misleading because it depends on the full
  candidate set.

---

## Reproducibility

The math is deterministic. The same `(profile, scholarship)` pair
produces the same composite score every time, modulo:

- Embedding regeneration when `last_verified_date` advances past
  `embedded_at` (then the similarity sub-score may shift slightly).
- Calendar advancing (deadline buckets shift; recency boost decays).

These are intentional — scores should rise/fall with deadline urgency
and freshness without manual intervention.

If you need to A/B test a weighting change, fork
`public.match_scholarships` to a `_v2` variant and switch callers via a
flag. Don't tune weights inline; that breaks reproducibility for
existing user reports.
